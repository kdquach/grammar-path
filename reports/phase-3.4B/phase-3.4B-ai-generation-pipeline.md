# GrammarPath Phase 3.4B — Report 5: AI Generation Pipeline & Asynchronous Ingestion Architecture
## Controlled Multi-Stage Generation, Dual-Pass Verification, and Resilience Strategy

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & AI Systems Engineer  
**Scope:** Offline Batch Generation, LLM Structured Output, Dual-Pass Blind Verification, and Failure Handling  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

In the current implementation, AI question generation is executed **synchronously within the HTTP request lifecycle** of `POST /api/v1/adaptive/toeic-practice`. This creates severe production risks:
1. **User Latency Spikes:** Learners wait 2.5 to 5.0 seconds for their practice modal to open.
2. **Rate Limit / Timeout Vulnerability:** External Gemini API capacity spikes or timeouts immediately degrade user sessions.
3. **Flawed Fallback Degradation:** When Gemini fails, the system falls back to heuristic regex cloze masking of Murphy textbook exercises, generating non-standard TOEIC distractors and casual British idioms.

Phase 3.4B completely decouples AI generation from the user-facing request loop. Question generation is converted into an **asynchronous offline pipeline** (CLI commands, scheduled background workers, or admin jobs) that populates `ToeicQuestionBankItem` in advance. Learner practice sessions are served with sub-50ms latency directly from pre-approved database rows.

---

## 2. Decoupled Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OFFLINE / ASYNCHRONOUS PIPELINE                      │
│             (CLI Script / Admin Job: generate-toeic-bank.ts)           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Stage 1: Curriculum Target Selection (Unit + Concept + Part 5)         │
│     │                                                                  │
│  Stage 2: Context Assembly (Theory rules + Business Scenarios)         │
│     │                                                                  │
│  Stage 3: LLM Generation (Gemini with strict JSON schema)              │
│     │                                                                  │
│  Stage 4: Automated Gate Verification (Syntax, Register, Duplicates)   │
│     │                                                                  │
│  Stage 5: Dual-Pass Blind Re-Evaluation (Independent Model Validation) │
│     │                                                                  │
│  Stage 6: Persistence to Database (Status: draft / validated)          │
│     │                                                                  │
│  Stage 7: Editorial Sign-Off / Approval Review                         │
│     │                                                                  │
│     ▼ Status = approved                                                │
│  [TOEIC QUESTION BANK: toeic_question_bank_items]                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Instant Read (< 50ms)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ONLINE LEARNER PRACTICE API                         │
│           (POST /api/v1/adaptive/toeic-practice or /toeic/practice)    │
├────────────────────────────────────────────────────────────────────────┤
│  1. Check rate limit (submissionRateLimiter)                           │
│  2. Fetch requested count of pre-approved items (status = 'approved')  │
│  3. Return anti-spoiler practice items instantly                       │
│  * ZERO EXTERNAL LLM CALLS ON THE HOT PATH *                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 11-Step Asynchronous Generation Workflow

The target pipeline executes 11 discrete steps per generation run:

### Step 1: Target Definition
The operator or batch runner specifies:
- `unitNumber` (e.g. Unit 5: Past simple).
- `difficulty` (`easy`, `medium`, `hard`).
- `targetCount` (e.g. 10 questions per run).
- Target TOEIC Part (`part_5` for Phase 3.4B).

### Step 2: Curriculum Context Assembly
The pipeline fetches canonical context from PostgreSQL:
- Target `GrammarConcept` name, code, and description.
- Target `TheorySection` headings and source content rules.
- Related illustrative examples.
- Selects a diverse business workplace domain (e.g., *Logistics & Shipping*, *Corporate Finance*, *HR & Recruitment*, *Facilities Management*, *Marketing & Sales*).

### Step 3: Candidate Generation (Gemini Structured Mode)
The pipeline constructs an authoritative prompt incorporating the target rule, business domain, and negative constraints:

```typescript
const prompt = `You are a Principal Assessment Specialist designing official-style TOEIC Part 5 items.
FOCUS GRAMMAR: Unit ${unitNumber} (${conceptName}).
RULE REFERENCE: ${ruleRef} (${ruleHeading}).
BUSINESS DOMAIN: ${domain}.
DIFFICULTY: ${difficulty.toUpperCase()}.

Generate exactly ${batchSize} original TOEIC Part 5 questions.
CONSTRAINTS:
1. Authentic corporate/business workplace register.
2. Single sentence between 15 and 32 words with exactly one blank "_______".
3. Exactly 4 distinct options (A, B, C, D).
4. Exactly one unambiguously correct answer adhering to ${ruleHeading}.
5. Three plausible, distinct distractors that represent common non-native learner confusions.
6. Professional Vietnamese explanation citing rule ${ruleRef}.
7. Return strictly valid JSON adhering to the specified schema.`;
```

### Step 4: Structured Schema Validation
- Output is validated using Zod against `toeicBatchOutputSchema`.
- Rejects malformed JSON, missing options, invalid keys, or empty fields.

### Step 5: Answer Key & Explanation Consistency
- Verifies that `correctAnswer` key points to a valid option.
- Cloze text injection: checks that substituting the correct option produces a valid, grammatically complete sentence.

### Step 6: Distractor Plausibility Check
- Checks that all 4 option texts are unique.
- Verifies that distractors are real English words (dictionary check).
- Checks option length and part-of-speech parity.

### Step 7: Anti-Duplicate & Collision Check
- Compares prompt against existing prompts in `ToeicQuestionBankItem`.
- Discards any item with Jaccard word similarity > 75%.

### Step 8: TOEIC Format & Register Compliance
- Rejects prompts containing conversational textbook names (*Sarah*, *Kate*, *cinema*, *pub*).
- Validates sentence length (12–35 words).

### Step 9: Dual-Pass Blind Re-Evaluation (Anti-Ambiguity)
**Core Innovation:** Do not rely on the generator's self-assessment alone.
- A secondary blind LLM evaluator is prompted with **only the prompt and the 4 options** (without revealing the intended answer).
- Evaluator prompt: *"You are taking a TOEIC test. Read this sentence and select the single correct option from A, B, C, D. If multiple options are grammatically acceptable, report AMBIGUOUS."*
- If the blind evaluator selects a different option than the generator, or flags ambiguity, the question is **immediately rejected**.

### Step 10: Quality Score Assignment & Persistence
- If the item passes Steps 1–9, it is persisted to `ToeicQuestionBankItem` with `status: "validated"` and assigned an initial `qualityScore` (0.00 to 10.00).
- The run metadata is recorded in `ToeicQuestionGenerationRun`.

### Step 11: Editorial Approval & Publishing
- Validated items enter the editorial queue.
- Editors inspect and click "Approve" (or automated high-confidence auto-approval triggers if `qualityScore >= 9.5` and blind consensus is 100%).
- Status changes to `approved`, making the question instantly active for learner practice.

---

## 4. Resilience, Rate Limiting & Provider Failure Behavior

### 4.1 Zero Hot-Path Dependency
Because generation occurs asynchronously, **provider outages (Gemini 503, 429, timeouts) have ZERO impact on active learners**. Learners practice against the pre-approved database bank.

### 4.2 Batch Runner Backoff & Retries
In the offline generator script:
1. **Exponential Backoff:** If Gemini returns HTTP 429 (quota exceeded), the script waits with jittered exponential backoff: `2^attempt * 1500ms + randomJitter`.
2. **Model Fallback:** Follows the cascade in `gemini.ts`: `gemini-3-flash-preview` → `gemini-flash-lite-latest` → `gemini-3.1-flash-lite-preview` → `gemini-flash-latest`.
3. **Fail-Closed Principle:** If all models fail, the batch run logs the error and terminates safely. **It NEVER synthesizes low-quality fallback questions via regex.**

---

## 5. Summary of Architectural Advantages

| Metric | Existing Synchronous Generator | Target Asynchronous Pipeline |
| :--- | :--- | :--- |
| **Learner Practice Latency** | 2,500 – 5,000 ms (LLM wait) | **< 50 ms (Indexed DB query)** |
| **Uptime Dependency** | 100% dependent on Gemini API | **0% dependency during user practice** |
| **Question Quality** | Unvetted raw output served to users | **Multi-stage quality gates + blind consensus** |
| **Distractor Integrity** | Regex mutations create non-words | **Domain-tailored, dictionary-verified distractors** |
| **Cost Efficiency** | Regenerates identical units repeatedly | **One-time generation, amortized over all users** |
| **Auditability** | Ephemeral, unrecorded generation | **Full lineage via `ToeicQuestionGenerationRun`** |

