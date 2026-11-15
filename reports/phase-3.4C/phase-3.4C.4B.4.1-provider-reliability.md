# GrammarPath — Phase 3.4C.4B.4.1: Provider Reliability Specification
## Gemini Model Pinning, Token/Cost Accounting, Fail-Closed Error Isolation, and Retry Policies

**Author:** Antigravity (Principal Backend Architect & Cloud Infrastructure Lead)  
**Milestone:** Phase 3.4C.4B.4.1 (AI TOEIC Question Generation Pipeline — Design & Readiness Audit)  
**Date:** November 14, 2026  
**Status:** Provider Reliability Specification (Design-Only)  

---

## 1. Executive Summary & Policy Mandates

To ensure assessment integrity, the AI question generation pipeline enforces strict provider reliability standards:
1. **Zero Silent Downgrades:** The system must never silently switch between models (e.g., falling back from a Pro model to a Flash or Lite model). Every generation run uses an explicitly pinned, recorded model.
2. **Fail-Closed Provider Handling:** An upstream API error, timeout, or rate-limit must fail the generation job without creating partial, unvalidated, or orphan database records.
3. **Comprehensive Token & Cost Tracking:** Every generation run must record prompt tokens, candidate tokens, total tokens, and computed cost in USD.

---

## 2. Pinned Model Architecture

### Deprecation of Silent Fallback Loop:
The existing implementation in `src/lib/gemini.ts` contains a fallback loop:
```typescript
// EXISTING VULNERABLE CODE (To be replaced):
const DEFAULT_MODEL_CANDIDATES = [
  { name: "gemini-3-flash-preview" },
  { name: "gemini-flash-lite-latest" },
  { name: "gemini-3.1-flash-lite-preview" },
  { name: "gemini-flash-latest" },
];
for (const candidate of candidates) { ... }
```
This loop is deprecated. Under the new architecture:
- Each generation task specifies an explicit `targetModel`.
- The system calls ONLY that specified model.
- If the model endpoint returns an error, the error is caught, classified, and propagated to the queue worker.

### Standard Model Profiles:
| Workload | Pinned Model Identifier | Context Window | Temperature | Justification |
| :--- | :--- | :---: | :---: | :--- |
| **Blueprint Question Generation** | `gemini-1.5-pro-002` | 128k | 0.30 | High reasoning capability, adherence to complex negative constraints and distractor blueprints. |
| **High-Volume Structural Screening** | `gemini-1.5-flash-002` | 32k | 0.20 | Fast, deterministic schema formatting and lexical verification. |

---

## 3. Retry, Timeout, and Rate-Limit Policy

### 3.1 Timeout Policy
- **Per-Attempt Timeout:** Exactly **15,000 ms** (15 seconds).
- **Enforcement:** `AbortController` signal passed to native `fetch`. If the deadline passes, the socket is forcibly terminated.

### 3.2 Exponential Backoff with Jitter
For transient upstream errors (HTTP 500, 502, 503, 504), the client executes up to **3 attempts**:
$$T_{\text{wait}} = \min\left(30\,000\,\text{ms},\; 2^{\text{attempt}} \times 1\,000\,\text{ms} + \text{random}(0, 500\,\text{ms})\right)$$

### 3.3 Rate-Limit Handling (HTTP 429)
When encountering HTTP 429 (`RESOURCE_EXHAUSTED`):
1. Inspect the response `Retry-After` header. If present, pause execution for that duration.
2. If `Retry-After` is missing, apply a mandatory **10,000 ms** backoff.
3. Queue job status transitions to `retry_scheduled` with `nextRetryAt` set.

---

## 4. Token & Cost Accounting Schema

To track operational expenditures and detect token anomalies, `ToeicQuestionGenerationRun` is augmented with telemetry fields:

```prisma
model ToeicQuestionGenerationRun {
  // Existing fields
  id                     String    @id @default(uuid()) @db.Uuid
  provider               String    @default("google_gemini")
  modelName              String    @map("model_name")
  promptVersion          String    @map("prompt_version")
  
  // NEW TELEMETRY FIELDS
  modelPinnedVersion     String?   @map("model_pinned_version") @db.VarChar(100)
  promptTokens           Int?      @map("prompt_tokens")
  candidatesTokens       Int?      @map("candidates_tokens")
  totalTokens            Int?      @map("total_tokens")
  estimatedCostUsd       Decimal?  @map("estimated_cost_usd") @db.Decimal(10, 6)
  upstreamLatencyMs      Int?      @map("upstream_latency_ms")
  httpStatusCode         Int?      @map("http_status_code")
  
  // Relations and timestamps
  ...
}
```

### Cost Computation Formula (Based on Gemini Pricing):
$$\text{Cost} = \left(\frac{\text{Prompt Tokens}}{1\,000\,000} \times C_{\text{in}}\right) + \left(\frac{\text{Candidate Tokens}}{1\,000\,000} \times C_{\text{out}}\right)$$
- For `gemini-1.5-pro`: $C_{\text{in}} = \$1.25/\text{M tokens}$, $C_{\text{out}} = \$5.00/\text{M tokens}$.
- For `gemini-1.5-flash`: $C_{\text{in}} = \$0.075/\text{M tokens}$, $C_{\text{out}} = \$0.30/\text{M tokens}$.

---

## 5. Fail-Closed Error Isolation

To prevent corrupted or incomplete records from persisting:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FAIL-CLOSED PERSISTENCE BOUNDARY                                                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. API Call Phase: No database records created in `toeic_question_bank_items`.         │
│ 2. Validation Phase: In-memory schema, syntax, distractor, and diversity validation.  │
│ 3. Database Write Phase: Executed ONLY if ALL validations pass, in an atomic           │
│    PostgreSQL transaction (`prisma.$transaction`).                                     │
│ 4. Error State: Any validation or provider failure logs error to `toeic_generation_jobs`│
│    and leaves `toeic_question_bank_items` completely untouched.                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Guaranteed Invariant:** A failed API request, malformed JSON payload, or ungrammatical LLM output can NEVER create a question bank item.

