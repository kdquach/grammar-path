# GrammarPath — Phase 3.4C.4B.4.1.1: Gemini Model Availability & Verification Specification
## Lifecycle Inspection, Model Pinning, Runtime Capability Probing, and Benchmark Architecture

**Author:** Antigravity (Principal Backend Architect & Cloud Infrastructure Lead)  
**Milestone:** Phase 3.4C.4B.4.1.1 (Design Corrections & Pilot Readiness Reconciliation)  
**Date:** November 14, 2026  
**Status:** Architecture & Verification Design (Design-Only — Zero API Generation Calls Executed)  

---

## 1. Executive Summary & Problem Reconciliation

In Phase 3.4C.4B.4.1, the generation design proposed `gemini-1.5-pro-002` and `gemini-1.5-flash-002`. An inspection of official Google Gemini API lifecycle documentation reveals that the `-002` point-version suffixes for the 1.5 generation are deprecated/obsolete in the active API ecosystem.

Furthermore, the existing codebase in `backend/src/lib/gemini.ts` contains an unmanaged fallback loop across preview and legacy models (`gemini-3-flash-preview`, `gemini-flash-lite-latest`, `gemini-3.1-flash-lite-preview`, `gemini-flash-latest`), which violates the non-negotiable architectural invariant: **NEVER SILENTLY DOWNGRADE MODELS**.

This report establishes:
1. An accurate inventory of active, stable General Availability (GA) vs. Preview models.
2. An explicit model assignment strategy for generation, review, and screening.
3. A design for a zero-generation runtime capability probe against the configured API key.
4. An explicit model pinning and fail-closed error policy.
5. An offline benchmark protocol to evaluate candidate models before production rollout.

---

## 2. Gemini Model Inventory & Lifecycle Classification

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ GOOGLE GEMINI API MODEL INVENTORY & CLASSIFICATION (CURRENT API LIFECYCLE)                             │
├──────────────────────────┬──────────┬──────────────┬──────────────────┬────────────────────────────────┤
│ Model Identifier         │ Status   │ Context Wdw  │ Best Suited For  │ Production Stance              │
├──────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ gemini-2.5-pro           │ Stable GA│ 1M tokens    │ Generation & Adv │ Primary Candidate for Blueprint│
│                          │          │              │ Linguistic Review│ Generation & Distractor Logic  │
├──────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ gemini-2.5-flash         │ Stable GA│ 1M tokens    │ High-speed Gen,  │ Primary Workhorse for Schema & │
│                          │          │              │ Structural Tasks │ First-Pass Generation/Review   │
├──────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ gemini-2.5-flash-lite    │ Stable GA│ 1M tokens    │ Fast screening,  │ Recommended for high-frequency │
│                          │          │              │ classification   │ lexical & keyword heuristics   │
├──────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ gemini-3-flash-preview   │ Preview  │ Variable     │ Experimental     │ FORBIDDEN in Production/Staging│
│                          │          │              │ Evaluation Only  │ (Non-deterministic lifecycle)  │
├──────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ gemini-1.5-pro (base)    │ Legacy GA│ 2M tokens    │ Long-context     │ Fallback only if 2.5 unavail;  │
│                          │          │              │ reasoning        │ requires explicit opt-in       │
└──────────────────────────┴──────────┴──────────────┴──────────────────┴────────────────────────────────┘
```

### Policy Distinction: Stable GA vs. Preview
- **Stable General Availability (GA) Models:** Must be used for all candidate generation and automated validation jobs. GA models provide formal SLA uptime, fixed pricing, and predictable deprecation notice windows.
- **Preview Models:** Strictly restricted to offline research. They must **never** be called during question bank pipeline execution due to unpredictable parameter changes, behavior drift, and sudden sunsetting.

---

## 3. Explicit Model Pinning & Anti-Downgrade Policy

### 3.1 Strict Invariant: Zero Silent Downgrades
The silent fallback loop in `src/lib/gemini.ts` (iterating through `DEFAULT_MODEL_CANDIDATES`) must be completely decommissioned. 

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ANTI-DOWNGRADE TRANSACTION RULE                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ If a generation task requests `gemini-2.5-pro` and the endpoint encounters an error,   │
│ timeout, or rate-limit, the system MUST NOT silently retry with `gemini-2.5-flash`     │
│ or `flash-lite`. It must log the explicit failure and transition the queue job to       │
│ `retry_scheduled` or `failed`.                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Role-Based Model Assignment
1. **Stage 5 (Question Generation from Blueprint):**
   - Designated Primary: `gemini-2.5-pro` (or `gemini-2.5-flash` if verified via benchmark).
   - Target Temperature: `0.30` (strict adherence to blueprint syntax and negative constraints).
2. **Stage 13 (Independent Linguistic Review):**
   - Designated Reviewer: Different model instance than generator (e.g. `gemini-2.5-flash` reviewing a `gemini-2.5-pro` output, preventing self-reinforcing blind spots).
3. **Metadata Persistence:**
   - Every generated question record stores the exact model string in `generationRun.modelName` (e.g., `"gemini-2.5-pro"`), cryptographically verified against the API response metadata.

---

## 4. Runtime Capability Probe Design (Zero-Generation Check)

Before enqueuing or executing generation batches, the system must verify that the configured `GEMINI_API_KEY` has access to the target model without generating billable tokens.

### Method: `GET /v1beta/models/{model}` Probe
Google Gemini exposes a metadata endpoint that returns model capabilities without triggering generation:

```typescript
export interface ModelCapabilityReport {
  modelName: string;
  isAvailable: boolean;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  httpStatus: number;
  error?: string;
}

export async function probeModelCapability(
  targetModel: string,
  apiKey: string
): Promise<ModelCapabilityReport> {
  const normalizedModel = targetModel.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}?key=${apiKey}`;

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    return {
      modelName: normalizedModel,
      isAvailable: false,
      httpStatus: response.status,
      error: `Model probe failed with HTTP ${response.status}: ${response.statusText}`,
    };
  }

  const data = await response.json();
  const methods = data.supportedGenerationMethods || [];
  const supportsGenerate = methods.includes("generateContent");

  return {
    modelName: normalizedModel,
    isAvailable: supportsGenerate,
    displayName: data.displayName,
    inputTokenLimit: data.inputTokenLimit,
    outputTokenLimit: data.outputTokenLimit,
    supportedGenerationMethods: methods,
    httpStatus: 200,
  };
}
```

### Execution Gate:
If `isAvailable === false` or `supportsGenerate === false`, the offline queue worker aborts before starting any generation jobs.

---

## 5. Offline Model Benchmark Architecture

To empirically select the optimal model for Stage 5 and Stage 13 prior to production scaling, an offline benchmark protocol is designed:

### Benchmark Dataset:
- **Sample Size:** 4 standardized blueprints across 4 units (Unit 1, Unit 2, Unit 3, Unit 4).
- **Fixed Inputs:** Identical prompt skeletons, identical theory excerpts, identical distractor archetypes.
- **Compared Models:**
  1. `gemini-2.5-pro`
  2. `gemini-2.5-flash`
  3. `gemini-2.5-flash-lite`

### Evaluation Metrics (Evaluated per Model):
1. **Syntactic Flawlessness:** Rate of zero double-auxiliary stutters (`BLK_STUTTER_AUX`) and zero agreement failures.
2. **Collocational Naturalness:** Human and corpus-checked business collocation scores (0–10).
3. **Distractor Diagnostic Separation:** Ability to generate 3 distinct, plausible error archetypes rather than random words.
4. **Latency & Token Efficiency:** Average latency (ms) and output tokens generated per item.
5. **Cost per 1,000 Valid Items:** Computed from empirical token usage.

*Execution Note:* This benchmark protocol is fully specified and designed here; execution is deferred until implementation authorization.

