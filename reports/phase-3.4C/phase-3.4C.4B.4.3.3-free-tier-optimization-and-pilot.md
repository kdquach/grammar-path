# GrammarPath — Phase 3.4C.4B.4.3.3: Free-Tier Pipeline Optimization & Unit 3 Pilot Completion Report
## 15-Stage Pipeline API Call Map, U03-P01 Forensic Recovery, Batch Generation & Critic Architecture, and Zero-Mutation Quota Protocol

**Author:** Antigravity (Principal Assessment Architect & Security Lead)  
**Milestone:** Phase 3.4C.4B.4.3.3 (Free-Tier Pipeline Optimization & Unit 3 Pilot Completion)  
**Date:** November 15, 2026 (04:40 ICT / 21:40 UTC)  
**Status:** Offline Pipeline Optimization & Test Battery Complete — STRICTLY STOPPED Pending Quota Cooldown  

---

## 1. Executive Summary

In strict accordance with the user's explicit authorization to continue using Google AI Studio Free Tier with zero billing, zero Pay-As-You-Go activation, and zero paid API keys, this milestone completed:
1. **Verification of Current Staging Census:** Verified 43 records (41 baseline + 2 validated Unit 3 items `f691db84` and `c4fecf7a`), 12 approved items (all Unit 1), and zero practice retrieval leakage for Unit 3.
2. **Forensic Recovery of U03-P01:** Successfully recovered the exact Stage 5 generated output from `task-6469.log`. All 4 options, stem, bilingual explanations, and temporal anchors are preserved with zero model regeneration needed.
3. **Pipeline Optimization (75% API Call Reduction):**
   - Transformed the unbatched 12-call flow (6 generation + 6 critic) into a **3-call batch architecture**:
     - **Batch 1 Generation:** Blueprints `U03-P04`, `U03-P05`, `U03-P06` in 1 API call.
     - **Batch 2 Generation:** Blueprints `U03-P07`, `U03-P08` in 1 API call.
     - **Batch Blind Critic:** All 6 items (`U03-P01`, `U03-P04`, `U03-P05`, `U03-P06`, `U03-P07`, `U03-P08`) evaluated blindly in 1 API call.
   - Total calls required to complete all 8 blueprints: **EXACTLY 3 CALLS** (saving 9 calls).
4. **Offline Test Battery & Verification (Zero Gemini Calls):**
   - Created `DeterministicPipelineCache` with versioned hash-based invalidation.
   - Created `BatchToeicPipelineService` with resilient partial-batch error isolation and strict blind critic prompt sanitization.
   - Implemented 11 offline unit tests in `phase3-4c-batch-pipeline.test.ts`.
   - **42 / 42 tests passed with Exit Code 0** across all 6 test suites, with zero type errors and zero staging mutations.
5. **Quota Protocol & Mandatory Stop Condition:**
   - Evaluated upstream HTTP 429 `RESOURCE_EXHAUSTED` metadata from `generativelanguage.googleapis.com` with daily limit of 20 RPD on `gemini-3-flash`.
   - Authoritative cooldown expires in **~10.2 hours** (~15:00 ICT / 08:00 UTC).
   - In accordance with Section 5 and Section 9, zero exploratory probes were executed, and execution is strictly stopped awaiting cooldown.

---

## 2. 15-Stage Canonical Pipeline API Call Map

The 15 stages of the GrammarPath canonical pipeline were audited to classify model dependency, batchability, and caching viability:

```
+--------------------------------------------------------------------------------------------------------------------------+
| 15-STAGE CANONICAL PIPELINE API CALL MAP                                                                                 |
+----+----------------------------------------+------+------------+---------------------+-------------------+--------------+
| Stg| Stage Name                             | Cat  | Gemini API | Service & Method    | Deterministic/Safe| Caching Rule |
+----+----------------------------------------+------+------------+---------------------+-------------------+--------------+
| 1  | Curriculum Rule Extraction             | A    | NO         | Canonical: stage1   | Deterministic     | Hash Cached  |
| 2  | Learning Objective Definition          | A    | NO         | Canonical: stage2   | Deterministic     | Hash Cached  |
| 3  | Question Blueprint Creation            | A    | NO         | Canonical: stage3   | Deterministic     | Hash Cached  |
| 4  | Prompt Construction & Constraints      | A    | NO         | Canonical: stage4   | Deterministic     | Hash Cached  |
| 5  | Primary AI Generation                  | B    | **YES**    | Batch: genBatch     | Batched (3 & 2)   | No (Model)   |
| 6  | Schema & JSON Validation               | A    | NO         | Canonical: stage6   | Deterministic     | Hash Cached  |
| 7  | Answer-Key Verification                | A    | NO         | Canonical: stage7   | Deterministic     | Hash Cached  |
| 8  | Distractor Diagnostic Analysis         | A    | NO         | Canonical: stage8   | Deterministic     | Hash Cached  |
| 9  | Dual-Language Explanation Validation   | A    | NO         | Canonical: stage9   | Deterministic     | Hash Cached  |
| 10 | Concept & Boundary Mapping             | A    | NO         | Canonical: stage10  | Deterministic     | Hash Cached  |
| 11 | Contextual Diversity Evaluation        | A    | NO         | Canonical: stage11  | Deterministic     | Pool Cached  |
| 12 | Difficulty Calibration & Tagging       | A    | NO         | Canonical: stage12  | Deterministic     | Hash Cached  |
| 13 | Independent Blind Critic Review        | B    | **YES**    | Batch: evalCritic   | Batched (6 items) | No (Model)   |
| 14 | Human Editorial Approval Gate          | C    | NO         | Canonical: stage14  | Policy Gate       | Never Cached |
| 15 | Final Publication                      | C    | NO         | Canonical: stage15  | Policy Gate       | Never Cached |
+----+----------------------------------------+------+------------+---------------------+-------------------+--------------+
```

### Call Volume Reduction Summary:
- **Baseline Unbatched Architecture:** 6 remaining items $\times$ 2 calls = **12 calls**.
- **Batch-Optimized Architecture:**
  - `U03-P01`: Recovered offline from Stage 5 output = **0 calls**.
  - `U03-P02` & `U03-P03`: Already persisted in Staging = **0 calls**.
  - `U03-P04`, `U03-P05`, `U03-P06`: Batch 1 Generation = **1 call**.
  - `U03-P07`, `U03-P08`: Batch 2 Generation = **1 call**.
  - `U03-P01` + `U03-P04..P08`: Batch Blind Critic = **1 call**.
- **Net Required API Calls:** **EXACTLY 3 CALLS** (Saves 9 calls, a **75% reduction** in API consumption).

---

## 3. Forensic Recovery of Blueprint U03-P01

Blueprint `U03-P01-AFF-FACILITIES` generated an authentic, high-quality question in `task-6469` before the critic call was blocked by the daily quota. The full payload was forensically extracted from `task-6469.log`:

```json
{
  "blueprintId": "U03-P01-AFF-FACILITIES",
  "prompt": "Due to unexpected electrical maintenance in the primary building, the customer service division _______ from a temporary satellite facility throughout this week.",
  "options": [
    {
      "key": "A",
      "text": "operates",
      "isCorrect": false,
      "distractorRationale": "The simple present is used for permanent routines or facts, but the time marker 'throughout this week' indicates a temporary situation."
    },
    {
      "key": "B",
      "text": "is operating",
      "isCorrect": true,
      "distractorRationale": "The present continuous is the correct choice to describe a temporary operational arrangement happening for a limited time."
    },
    {
      "key": "C",
      "text": "operated",
      "isCorrect": false,
      "distractorRationale": "The simple past tense is inappropriate here because the maintenance and the temporary relocation are presented as current, ongoing events for the current week."
    },
    {
      "key": "D",
      "text": "to operate",
      "isCorrect": false,
      "distractorRationale": "An infinitive cannot function as the main finite verb of the sentence's predicate."
    }
  ],
  "explanationEn": "The sentence describes a temporary situation caused by maintenance, signaled by the time expression 'throughout this week'. In English grammar, the present continuous tense (is + verb-ing) is used to denote temporary actions or arrangements that are not part of a permanent routine. Since 'the customer service division' is a singular collective noun, 'is operating' is the correct form.",
  "explanationVi": "Câu này mô tả một tình huống tạm thời do việc bảo trì gây ra, được nhận biết qua cụm từ thời gian 'throughout this week' (suốt tuần này). Trong ngữ pháp tiếng Anh, thì hiện tại tiếp diễn (is + verb-ing) được dùng để chỉ các hành động hoặc sự sắp xếp tạm thời, không phải là thói quen lâu dài. Vì 'the customer service division' là danh từ số ít, 'is operating' là hình thức chính xác.",
  "clueAnchor": "throughout this week",
  "targetVerb": "operate"
}
```

### Forensic Quality Assessment:
- **Blank Formatting:** Exactly 1 blank with `_______` (7 underscores).
- **Target Verb:** `operate` (100% compliant with blueprint).
- **Temporal Anchor:** `throughout this week` (Unit 3 Section 3B temporary situation marker).
- **Distractor Plausibility:** Simple present (`operates`), simple past (`operated`), non-finite infinitive (`to operate`). Zero stative verb contamination.
- **Stage Progression:** Passed Stages 1–12 cleanly in `task-6469`.
- **Action:** Retained in memory/script; will be evaluated in the Batch Critic call without re-generation.

---

## 4. Batch Generation & Batch Blind Critic Implementation

### 4.1 Batch Generation (`BatchToeicPipelineService.generateBatchQuestions`)
- **Payload Architecture:** Accepts an array of `QuestionBlueprint` objects.
- **Prompt Structure:** Formats distinct sub-prompts for each blueprint, binding each to its `blueprintId`, target verb, skeleton, and distractor archetypes.
- **Output Schema:** Enforces a JSON object `{ "items": BatchGeneratedItem[] }`.
- **Partial Failure Resilience:** Validates each item in the batch independently against `RawGeneratedQuestionSchema`. If item $K$ fails a check, item $K$ is recorded in `failedItems`, while all valid items are returned in `successfulItems`.

### 4.2 Batch Blind Critic (`BatchToeicPipelineService.evaluateBatchBlindCritic`)
- **Strict Blindness Invariant:**
  - Options are stripped of `isCorrect` flags.
  - Explanations are completely omitted.
  - Correct Option Key is completely hidden.
  - Critic receives ONLY: `blueprintId`, `prompt`, unlabeled options (A, B, C, D), and an abstract pedagogical objective.
- **Evaluation Dimensions:** Critic must independently return `solvedKey`, `singleDefensibleKey` (boolean), `naturalnessScore` (1.0–5.0), `grammarCorrectness` (boolean), `distractorQuality`, and `rejectionReasons`.
- **Deterministic Post-Hoc Comparison:** Post-call code deterministically verifies:
  1. `evaluation.solvedKey === item.expectedKey` (Answer-key agreement).
  2. `evaluation.singleDefensibleKey === true` (No dual defensible keys).
  3. `evaluation.naturalnessScore >= 4.0` (Natural corporate ETS register).
  4. `evaluation.grammarCorrectness === true` and `evaluation.curriculumAlignment === true`.

### 4.3 Deterministic Pipeline Caching (`DeterministicPipelineCache`)
- Computes SHA-256 hashes of blueprint specifications and content payloads.
- Reuses Stages 1–4 and Stages 6–10/12 results when input hashes match.
- Changes in verb, prompt, or option text immediately invalidate cache entries.
- All entries are tagged with `CACHE_VERSION = "v1.0-deterministic"`.

---

## 5. Offline Test Battery & Verification Results

All tests were executed offline with zero Gemini API calls:

```
+----+-----------------------------------------+-----------+-----------+-----------------------------+
| ID | Test Suite / Target                     | Tests Run | Exit Code | Invariants Verified         |
+----+-----------------------------------------+-----------+-----------+-----------------------------+
| T1 | tsc --noEmit --skipLibCheck             | 1 check   | Code 0    | Strict TypeScript typing    |
| T2 | phase3-4c-batch-pipeline.test.ts        | 11 passed | Code 0    | Batch QA, blind critic, fail|
| T3 | phase3-4c-spending-controller.test.ts   | 8 passed  | Code 0    | Hard budget cap enforced    |
| T4 | phase3-4c-canonical-pipeline.test.ts    | 6 passed  | Code 0    | 15-stage pipeline & critic  |
| T5 | phase3-4c-e2e-pipeline.test.ts          | 7 passed  | Code 0    | Deterministic E2E flow      |
| T6 | phase3-4c-gemini-client.test.ts         | 5 passed  | Code 0    | Fail-closed & key redaction |
| T7 | phase3-4c-data-integrity.test.ts (Live) | 5 passed  | Code 0    | 43 items, 12 approved latest|
+----+-----------------------------------------+-----------+-----------+-----------------------------+
|    | TOTAL TESTS PASSED                      | 43 / 43   | Code 0    | **100% Pass Rate**          |
+----+-----------------------------------------+-----------+-----------+-----------------------------+
```

### Specific Test Coverage in `phase3-4c-batch-pipeline.test.ts`:
1. `should successfully parse and validate a complete batch response` (PASSED)
2. `should handle partial batch failure by preserving valid items and isolating failures` (PASSED)
3. `should fail gracefully when batch response JSON is truncated` (PASSED)
4. `should fail gracefully when batch response contains invalid JSON syntax` (PASSED)
5. `should construct blind critic prompt without revealing correct answer keys or explanations` (PASSED)
6. `should reject candidate when critic independently solves a different key` (PASSED)
7. `should reject candidate when critic flags multiple defensible keys` (PASSED)
8. `should reject candidate when naturalness score is below 4.0` (PASSED)
9. `should prevent duplicate entries by computing identical content hashes for identical items` (PASSED)
10. `should cache deterministic results and invalidate cleanly when blueprint or content changes` (PASSED)
11. `should strictly enforce gemini-3-flash-preview model pinning without silent fallback` (PASSED)

---

## 6. Staging Database Census & Verification

The staging database identity and census were verified against Neon:
- **Host:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432`
- **Database:** `grammarpath-staging`
- **Isolation Status:** 100% isolated staging branch.

```
+----------------------------------------------------------------------------------------------------+
| STAGING DATABASE INVENTORY RECONCILIATION                                                          |
+---------------------------------------+---------------------+---------------------+----------------+
| Metric / Table                        | Pre-Pilot Baseline  | Current Staging     | Reconciliation |
+---------------------------------------+---------------------+---------------------+----------------+
| Total Question Bank Items             | 41 items            | **43 items**        | **+2 items**   |
| Approved Items (isLatestApproved=true)| 12 items            | **12 items**        | **0 (Invariant)**|
| Validated Items (pending human review)| 20 items            | **22 items**        | **+2 items**   |
| Archived Items                        | 5 items             | 5 items             | 0 (Invariant)  |
| Withdrawn Items                       | 4 items             | 4 items             | 0 (Invariant)  |
| Unit 3 Items in Question Bank         | 0 items             | **2 items**         | **+2 items**   |
| Units 1-25 Items                      | 40 items            | **42 items**        | **+2 items**   |
| Out-of-Range Unit 40 Items            | 1 item              | 1 item              | 0 (Invariant)  |
| Practice Sessions (Telemetry)         | 10 sessions         | 10 sessions         | 0 (Invariant)  |
| Practice Items (Telemetry)            | 15 items            | 15 items            | 0 (Invariant)  |
| Historical Question Attempt Items     | 5 attempts          | 5 attempts          | 0 (Invariant)  |
| Exercise Attempts (Telemetry)         | 7 attempts          | 7 attempts          | 0 (Invariant)  |
| Question Attempts (Telemetry)         | 3 attempts          | 3 attempts          | 0 (Invariant)  |
+---------------------------------------+---------------------+---------------------+----------------+
```

### Invariants Maintained:
- **Zero Auto-Approval:** Both existing Unit 3 candidates (`f691db84` and `c4fecf7a`) have `isLatestApproved = false` and `reviewStatus = "validated"`.
- **Zero Practice Leakage:** Querying `unitNumber = 3 AND reviewStatus = 'approved' AND isLatestApproved = true` returns **0 items**.
- **Historical Data Safety:** 100% of telemetry records remain untouched.
- **Canonical Repo Protection:** `grammarpath-data` on `main` is completely untouched.

---

## 7. Free Tier Quota Protocol & Exact Resume Plan

### Authoritative Upstream Quota State:
- Metric: `generativelanguage.googleapis.com/generate_content_free_tier_requests`
- Quota: 20 requests per day per project per model (`gemini-3-flash`)
- Daily Quota Exhausted At: ~04:29 ICT (Nov 15, 2026)
- Upstream Retry Delay: `37815s`
- **Quota Reset Cooldown Expiration:** **Approximately 15:00 ICT / 08:00 UTC (Nov 15, 2026)** (~10 hours remaining).

### Execution Plan for Resume Milestone (Phase 3.4C.4B.4.3.4):
The dedicated batch runner [`run-unit3-batch-execution.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-unit3-batch-execution.ts) is already implemented and verified in dry-run mode. Once the cooldown window elapses:

1. **Step 1 (Preflight Check):**
   Run without exploratory probes to confirm database identity and candidates `f691db84` and `c4fecf7a`.
2. **Step 2 (Reuse U03-P01):**
   Inject the recovered `U03-P01` Stage 5 output into the pipeline (0 API calls).
3. **Step 3 (Batch 1 Generation):**
   Generate `U03-P04`, `U03-P05`, `U03-P06` via `generateBatchQuestions` (**1 API call**).
4. **Step 4 (Batch 2 Generation):**
   Generate `U03-P07`, `U03-P08` via `generateBatchQuestions` (**1 API call**).
5. **Step 5 (Batch Blind Critic):**
   Evaluate all 6 items (`U03-P01`, `U03-P04`, `U03-P05`, `U03-P06`, `U03-P07`, `U03-P08`) via `evaluateBatchBlindCritic` (**1 API call**).
6. **Step 6 (Diversity & Staging Commit):**
   Run contextual diversity checks ($D_{\text{ctx}} \ge 0.50$) and persist all passing items atomically as `reviewStatus = "validated"`, `isLatestApproved = false`.
   Target database state: **49 total items** (41 baseline + 8 validated Unit 3 items).

---

## 8. Section 9 Stop Condition Sign-Off

In strict observance of Section 9 invariants:
- **Execution Status:** **STRICTLY STOPPED.**
- **Candidate Items Approved or Published:** **0**
- **Billing Activated:** **NO (Zero Google Cloud charges incurred, $0.00 invoiced)**
- **Unit 4 or Later Operations:** **NONE**
- **Canonical Curriculum Repo:** `grammarpath-data` on `main` is completely untouched.

*Awaiting quota reset window (~15:00 ICT) and explicit user authorization before resuming live generation.*

