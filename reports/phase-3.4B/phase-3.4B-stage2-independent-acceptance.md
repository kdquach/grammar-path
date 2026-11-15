# GrammarPath — Phase 3.4B Stage 2: Final Independent Acceptance Audit Report

**Role:** Senior Independent QA Auditor, Principal Security Auditor, Database Auditor, Educational Data Scientist  
**Date:** November 14, 2026  
**Final Audit Verdict:** **VERIFIED PASS WITH CONDITIONS**  
**Audit Target:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Canonical Repository:** `grammarpath-data` (`origin/main` 100% Clean & Untouched)  

---

## 1. Executive Summary

This independent acceptance audit evaluated the Phase 3.4B Stage 2 implementation claims against reproducible evidence on Neon PostgreSQL staging and application source code.

The previous implementation report claimed "100% VERIFIED PASS". This audit independently verified the codebase, PostgreSQL database catalog, API boundaries, security controls, and regression test suites.

### Summary Assessment
- **Architecture & Security:** Exceptional implementation. Zero Auto-Approval invariant, server-authoritative anti-spoiler answer secrecy, RBAC admin authorization, and IDOR protection are verified in code and integration tests.
- **Database Catalog & Schema:** Applied migration `20261114000000_phase_3_4b_toeic_question_bank` is verified on staging. 4 new tables, 6 new PostgreSQL enums, composite unique constraints, and foreign keys match the design.
- **Legacy Ingestion:** All 30 curated questions across Units 1–4 are present in staging with 120 options, exactly one correct key per question, matching text/keys/explanations, and deterministic SHA-256 fingerprints.
- **Historical Data Safety:** All 3 pre-existing staging users and 2 textbook exercise attempts are completely unaltered. Canonical curriculum repository `grammarpath-data` is 100% clean and untouched.
- **Condition 1 (Unverified Claim):** The offline generation queue has 144 jobs enqueued (status `pending`), but **0 jobs have been executed against live LLMs** on staging (`toeic_question_generation_runs` count is 0). Live queue worker execution against external LLMs remains **UNVERIFIED**.
- **Condition 2 (Mastery Algorithm Query Scope):** While telemetry persistence creates `QuestionAttemptItem` with `attemptSource: "toeic_practice"` upon answer check, the Phase 3.2 mastery algorithm query in `calculateConceptMastery` (`mastery.service.ts:137-143`) was strictly preserved and queries only `questionId: { in: mappedQuestionIds }`. Because TOEIC attempts have `questionId: null` and `questionBankItemId` populated, they do not yet contribute to `distinctQuestionCount` or `evidenceCount` within `user_concept_mastery`.
- **Condition 3 (Rollback Script Constraint):** `down.sql:6` attempts `ALTER COLUMN "question_id" SET NOT NULL`. If any TOEIC practice attempts exist with `question_id = NULL`, executing `down.sql` without pre-cleaning those rows would fail.

---

## 2. Staging Safety & Isolation Audit

Before conducting any database inspection, the connection parameters were audited:

```bash
cd backend && npm run staging:check
```
- **Exit Code:** 0
- **Output:**
  ```text
  [Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging
  ```
- **Verification:** All queries ran against Neon staging host `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech`. Production database was never contacted or modified.

---

## 3. Section-by-Section Verification Audit

### 3.1 Migration & Database Catalog Audit (Section 2)
- **Prisma Migration Status Command:**
  ```bash
  npm run prisma:status:staging
  ```
  - **Exit Code:** 0
  - **Output:** `7 migrations found in prisma/migrations. Database schema is up to date!`
- **Catalog Inspection Query:**
  - Database schema: `public`
  - Total application tables: 46 (plus 1 `_prisma_migrations` table = 47)
  - Total PostgreSQL enums: 18 (including all 6 new Phase 3.4B enums)
  - Foreign keys: 59
  - Application CHECK constraints: 22
- **New Tables Verified in PostgreSQL Catalog:**
  1. `toeic_question_generation_runs` (Base table, verified)
  2. `toeic_question_bank_items` (Base table, verified)
  3. `toeic_question_options` (Base table, verified)
  4. `toeic_generation_jobs` (Base table, verified)
- **New PostgreSQL Enums Verified:**
  1. `toeic_part_enum` (`PART_5`, `PART_6`, `PART_7`)
  2. `toeic_question_format_enum` (`PART5_INCOMPLETE_SENTENCE`, `PART6_TEXT_COMPLETION`, `PART7_SINGLE_PASSAGE`, `PART7_DOUBLE_PASSAGE`)
  3. `toeic_item_source_enum` (`legacy_seed`, `ai_generated`, `manual_author`, `curated_external`)
  4. `toeic_review_status_enum` (`draft`, `validated`, `approved`, `rejected`, `archived`, `withdrawn`)
  5. `toeic_primary_skill_enum` (`direct_grammar`, `word_form_morphology`, `vocabulary_collocation`, `reading_comprehension`, `listening_comprehension`)
  6. `toeic_generation_job_status_enum` (`pending`, `in_progress`, `completed`, `failed`, `paused`)
- **Foreign Keys Verified:**
  - `question_attempt_items.question_bank_item_id -> toeic_question_bank_items.id` (`ON DELETE RESTRICT`)
  - `toeic_practice_items.question_bank_item_id -> toeic_question_bank_items.id` (`ON DELETE RESTRICT`)
  - `toeic_question_options.question_bank_item_id -> toeic_question_bank_items.id` (`ON DELETE CASCADE`)
  - `toeic_question_bank_items.concept_id -> grammar_concepts.id` (`ON DELETE SET NULL`)
  - `toeic_question_bank_items.generation_run_id -> toeic_question_generation_runs.id` (`ON DELETE SET NULL`)
  - `toeic_generation_jobs.run_id -> toeic_question_generation_runs.id` (`ON DELETE SET NULL`)
- **Composite Unique Constraints Verified:**
  - `toeic_question_bank_items_root_question_id_version_key` on `(root_question_id, version)`
  - `toeic_question_bank_items_content_hash_key` on `(content_hash)`
  - `toeic_question_options_question_bank_item_id_option_key_key` on `(question_bank_item_id, option_key)`
- **Offline Migration Verifier:**
  ```bash
  npm run test:migrations
  ```
  - **Exit Code:** 0
  - **Result:** `[PASS] Backend migration SQL verified offline: 18 enums, 46 tables, 59 FKs, 22 CHECK constraints, 93 indexes.`

---

### 3.2 Legacy Import Integrity Audit (Section 3)
An automated read-only comparison script was executed against the staging database to verify the 30 legacy curated questions against the canonical source definition in `CURATED_TOEIC_UNIT_QUESTIONS` ([`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L430-L580)):

- **Item Count:** Exactly 30 items in `toeic_question_bank_items` with `source = 'legacy_seed'` and `version = 1`.
- **Option Count:** Exactly 120 options in `toeic_question_options` (4 options per item).
- **Answer Keys:** Exactly 1 correct option per question across all 30 items.
- **Text & Explanation Fidelity:**
  - Prompts: 30/30 identical string match.
  - Option texts: 120/120 identical string match.
  - Correct keys: 30/30 identical match (A, B, C, or D).
  - Explanations: 30/30 identical string match.
- **Fingerprint Matching:** 30/30 items match the SHA-256 hash computed via `computeToeicItemContentHash(prompt, options)`.
- **Review Status:** Ingested with `reviewStatus = "validated"` and `isLatestApproved = false` (Zero Auto-Approval Invariant upheld).
- **Import Idempotency:** Verified via `contentHash` unique constraint and script skip logic.

---

### 3.3 Editorial Lifecycle & Security Audit (Section 4)
- **Lifecycle State Machine:**
  - File: [`backend/src/services/toeic-question-bank.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-question-bank.service.ts#L140-L375)
  - States: `draft` $\rightarrow$ `validated` $\rightarrow$ `approved` $\rightarrow$ `archived` / `rejected` / `withdrawn`.
  - `approveQuestion` (lines 140–189): Requires single correct option; archives previously approved versions of the same root question; sets `reviewStatus = "approved"`, `isLatestApproved = true`, `reviewedBy`, and `reviewedAt`.
  - `rejectQuestion` (lines 194–234): Blocks rejection of already approved questions (must use withdrawal or versioning); records rejection reason and reviewer ID.
  - `emergencyWithdrawQuestion` (lines 239–270): Immediately sets `reviewStatus = "withdrawn"`, `isLatestApproved = false`, and records `withdrawnReason`.
  - `createNewVersion` (lines 275–375): Increments version number ($N+1$); starts with `isLatestApproved = false` and `reviewStatus = "draft"` or `"validated"` depending on quality gate score; preserves rootQuestionId.
- **Admin Authorization (RBAC):**
  - File: [`backend/src/middleware/admin.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/admin.ts#L6-L35)
  - `requireAdmin` checks `req.user.email` against `ADMIN_EMAILS` or verifies `x-admin-key`.
  - Rejection code: `403 FORBIDDEN` with explicit error message for non-admin learners.
  - Routes: All endpoints under `/api/v1/admin/toeic/*` enforce `requireAuth` and `requireAdmin` ([`admin-toeic.routes.ts:16-18`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/admin-toeic.routes.ts#L16-L18)).
- **Zero Auto-Approval Invariant:**
  - File: [`backend/src/services/toeic-generation-queue.service.ts:273-274`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generation-queue.service.ts#L273-L274)
  - AI-generated candidates are saved with `reviewStatus: isQualified ? "validated" : "draft"` and `isLatestApproved: false`. No code path allows AI to set `reviewStatus = "approved"`.
- **Session Version Immutability:**
  - `toeic_practice_items.question_bank_item_id` references the immutable UUID of the specific version served. Creating a new question version does not alter existing practice items.
- **Emergency Withdrawal Historical Safety:**
  - `emergencyWithdrawQuestion` updates only the `toeic_question_bank_items` row. It does not delete or overwrite historical learner attempts in `question_attempt_items` or `toeic_practice_items`.

---

### 3.4 Generation Queue Audit (Section 5)
A read-only inspection of the staging database `toeic_generation_jobs` table revealed:

- **Actual Queue Status Counts in Staging Database:**
  - `pending`: **144**
  - `in_progress`: **0**
  - `completed`: **0**
  - `failed`: **0**
  - `paused`: **0**
  - **Total Generation Runs (`toeic_question_generation_runs`):** **0**
- **Analysis:**
  - 144 jobs were enqueued across Priority Batch 1 (Units 5–24, 60 jobs) and Priority Batch 2 (Units 25–52, 84 jobs).
  - **Audit Finding:** The background queue worker has not been run against staging to execute these jobs via Gemini LLM. No generation runs exist in `toeic_question_generation_runs`.
  - **Verdict on Queue Execution:** **UNVERIFIED IN STAGING.** While the enqueue logic, schema, and queue service code are verified, live execution against external LLMs has not been executed on staging.
- **Queue Implementation Architecture:**
  - File: [`backend/src/services/toeic-generation-queue.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generation-queue.service.ts)
  - Bounded Retries: `maxAttempts: 5` (line 55).
  - Exponential Backoff: `Math.min(60_000, Math.pow(2, currentAttempt) * 1000)` (line 328).
  - Deduplication: `enqueueUnits` checks if pending/in_progress job exists for `(unitNumber, difficulty)` before creating (lines 38–46).
  - Provider Outage Handling: If Gemini returns empty/error, throws `PROVIDER_UNAVAILABLE`, catches error, increments attempts, and schedules `nextRetryAt` without falling back to lower quality.

---

### 3.5 TOEIC Practice & Anti-Spoiler Audit (Section 6)
- **Practice Retrieval Filter:**
  - File: [`backend/src/services/toeic-question-bank.service.ts:388-399`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-question-bank.service.ts#L388-L399)
  - `getApprovedQuestionsForPractice` queries strictly:
    `where: { unitNumber, difficulty, reviewStatus: "approved", isLatestApproved: true }`
  - Unapproved questions (`draft`, `validated`, `rejected`, `archived`, `withdrawn`) are strictly excluded.
- **Anti-Spoiler Payload Secrecy:**
  - File: [`backend/src/controllers/adaptive.controller.ts:675-695`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L675-L695)
  - Session creation response maps questions to return: `itemId`, `itemOrder`, `source`, `difficulty`, `prompt`, `options`, `ruleReference`.
  - `correctAnswer` and `explanation` are omitted from the learner response.
  - Option items do not expose `isCorrect`.
- **Server-Authoritative Grading:**
  - File: [`backend/src/controllers/adaptive.controller.ts:783-794`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L783-L794)
  - Client-submitted answer is compared against server-side `item.correctAnswer`.
- **IDOR Protection & Input Validation:**
  - File: [`backend/src/controllers/adaptive.controller.ts:713-750`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L713-L750)
  - Rejects invalid answer keys (outside A, B, C, D) with `400 VALIDATION_ERROR`.
  - Blocks cross-learner submission (`session.userId !== userId`) with `403 FORBIDDEN`.

---

### 3.6 Mastery Telemetry Bridge Audit (Section 7)
- **Telemetry Write Path:**
  - File: [`backend/src/controllers/adaptive.controller.ts:796-848`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L796-L848)
  - First-attempt check: `isFirstAttempt = item.attemptCount === 0 || !item.answeredAt;`
  - Skill eligibility: `primarySkill === "direct_grammar" || primarySkill === "word_form_morphology"`
  - Status eligibility: `bankItem.reviewStatus === "approved"`
  - Mapping confidence: `conceptMappingConfidence >= 0.85`
  - Target concept: `bankItem.conceptId`
- **Telemetry Record:**
  - Writes to `question_attempt_items`:
    - `attemptSource = "toeic_practice"`
    - `attemptStatus = isCorrect ? "correct" : "incorrect"`
    - `questionBankItemId = item.questionBankItemId`
    - `questionId = null`
- **Domain Isolation:**
  - Questions with `primarySkill = "vocabulary_collocation"`, reading, or listening bypass telemetry creation. They update `toeic_practice_items` for drill feedback, but write **zero rows** to `question_attempt_items`.
- **Duplicate Prevention:**
  - Submissions are deduplicated via `runDeduplicatedSubmission` using `dedupeKey`.
  - Repeated attempts on the same item increment `toeic_practice_items.attemptCount`, but `if (isFirstAttempt)` prevents creating duplicate `QuestionAttemptItem` records.
- **Audit Finding on Mastery Calculation Denominator (Condition 2):**
  - In [`backend/src/services/mastery.service.ts:137-143`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts#L137-L143):
    ```typescript
    const attempts = await db.questionAttemptItem.findMany({
      where: {
        userId,
        questionId: { in: mappedQuestionIds },
        attemptStatus: { not: "unanswered" },
        isCorrect: { not: null },
      },
      ...
    });
    ```
  - Because `questionId` is `null` on `toeic_practice` attempts, and `mappedQuestionIds` contains only textbook question IDs, `calculateConceptMastery` does not yet count TOEIC attempts in its attempt aggregation query.
  - **Impact:** TOEIC telemetry is captured and stored accurately in `question_attempt_items`, but does not yet influence `user_concept_mastery.masteryScore` or `evidenceCount`. This was done in compliance with the owner rule "Never modify the Phase 3.2 mastery algorithm", but represents an incomplete end-to-end telemetry loop.

---

### 3.7 Regression and Test Evidence (Section 8)

All safe test suites and build commands were independently executed and recorded:

```bash
# 1. Backend Typecheck
cd backend && npm run typecheck
# Exit Code: 0 (tsc --noEmit: 0 errors)

# 2. Offline Migration Verifier
npm run test:migrations
# Exit Code: 0 (18 enums, 46 tables, 59 FKs, 22 CHECK constraints, 93 indexes)

# 3. Backend Unit Suites (Phase 1, 2, 3)
npm run test:unit
# Exit Code: 0 (8 test files passed, 75 tests passed, 0 failed, 0 skipped)

# 4. Phase 3.4A Security & Grading Regression Suites
./node_modules/.bin/vitest run tests/phase3-4a-unit.test.ts tests/phase3-4a-rate-limit.unit.test.ts tests/phase3-4a1-attempt-source.unit.test.ts
# Exit Code: 0 (3 test files passed, 22 tests passed, 0 failed, 0 skipped)

# 5. Phase 3.4B Non-Destructive Staging Suite
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4b-m1.test.ts
# Exit Code: 0 (1 test file passed, 5 tests passed, 0 failed, 0 skipped)

# 6. Frontend Typecheck
cd ../frontend && npm run typecheck
# Exit Code: 0 (tsc --noEmit: 0 errors)

# 7. Frontend Production Bundle Build
npm run build
# Exit Code: 0 (Vite built in 1.58s; dist/index.html 0.55 kB, dist/assets/index-4AOdVyLn.js 562.80 kB)

# 8. Frontend Unit & Experience Test Suites
npm run test
# Exit Code: 0 (13 test files passed, 79 tests passed, 0 failed, 0 skipped)
```

**Total Automated Tests Passed Across All Suites:** **181 tests passed, 0 failed, 0 skipped.**

---

### 3.8 Git & Canonical Data Safety (Section 9)
- **Canonical Repository (`grammarpath-data`):**
  - Branch: `main`
  - Status: Up to date with `origin/main`. Working tree 100% clean. Zero modifications.
- **Application Repository (`grammarpath-app`):**
  - Modified tracked files: 31 files (backend controllers, models, routes, frontend pages, test files).
  - Diffstat: `31 files changed, 2200 insertions(+), 138 deletions(-)`.
  - Zero `.env` files tracked (only `.env.example` and `.env.staging.example` are committed).
  - No secret keys, credentials, or database connection strings committed.
  - Zero commits created during Phase 3.4B (working directory unstaged/uncommitted).

---

## 4. Audit Findings & Conditions

### Finding 1: Live LLM Queue Execution Unverified on Staging
- **Severity:** Medium (Operational / Claim Accuracy)
- **Evidence:** `toeic_generation_jobs` has 144 jobs, all in `status: "pending"`. `toeic_question_generation_runs` has 0 rows.
- **Reproduction Query:**
  ```sql
  SELECT status, count(*) FROM toeic_generation_jobs GROUP BY status;
  -- Result: pending = 144, completed = 0, in_progress = 0
  ```
- **Impact:** While queue enqueueing, data models, schema, and queue service unit tests are verified, the physical execution of jobs via external Gemini API in staging has not occurred.
- **Required Action:** Acknowledge in documentation that live LLM generation queue processing remains unverified until a supervised worker run is performed with a valid LLM API key.

### Finding 2: Mastery Calculation Denominator Does Not Query `questionBankItemId`
- **Severity:** Medium (Learning Analytics Consistency)
- **Evidence:** [`backend/src/services/mastery.service.ts:137-143`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts#L137-L143)
  ```typescript
  const attempts = await db.questionAttemptItem.findMany({
    where: {
      userId,
      questionId: { in: mappedQuestionIds },
      attemptStatus: { not: "unanswered" },
      isCorrect: { not: null },
    },
    ...
  });
  ```
- **Impact:** `QuestionAttemptItem` rows for TOEIC practice are successfully persisted with `attemptSource: "toeic_practice"` and `questionBankItemId`, but `calculateConceptMastery` ignores them because it filters exclusively by `questionId: { in: mappedQuestionIds }`.
- **Required Action:** In Phase 3.4C or post-algorithm-freeze update, amend the `where` clause in `calculateConceptMastery` to:
  ```typescript
  where: {
    userId,
    OR: [
      { questionId: { in: mappedQuestionIds } },
      { questionBankItem: { conceptId } }
    ],
    attemptStatus: { not: "unanswered" },
    isCorrect: { not: null },
  }
  ```

### Finding 3: Rollback DDL `down.sql` Dependency on NULL `question_id`
- **Severity:** Low (Operational Maintenance)
- **Evidence:** [`backend/prisma/migrations/20261114000000_phase_3_4b_toeic_question_bank/down.sql:6`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations/20261114000000_phase_3_4b_toeic_question_bank/down.sql#L6)
  ```sql
  ALTER TABLE "question_attempt_items" ALTER COLUMN "question_id" SET NOT NULL;
  ```
- **Impact:** If `down.sql` is executed against a database containing `question_attempt_items` where `attemptSource = "toeic_practice"` (which have `question_id = NULL`), PostgreSQL will reject the `SET NOT NULL` constraint with a violation error.
- **Required Action:** Document in the migration runbook that before executing `down.sql`, any rows in `question_attempt_items` with `question_id IS NULL` must be deleted or archived.

---

## 5. Separation of Audit Findings

### 1. Verified Implementation
- TOEIC Question Bank schema with 4 tables, 6 PostgreSQL enums, composite unique constraints, and restricted foreign keys.
- Deterministic Quality Engine service with 8 blocking defect rules and 4-factor scoring rubric.
- Editorial lifecycle service with state transitions, immutability, versioning, and emergency withdrawal.
- Admin authorization middleware (`requireAdmin`) protecting `/api/v1/admin/toeic/*`.
- Server-authoritative anti-spoiler practice generator and server grader.
- Telemetry recording with `attemptSource: "toeic_practice"` and domain isolation for non-grammar questions.

### 2. Verified Database State
- Migration `20261114000000_phase_3_4b_toeic_question_bank` applied cleanly on Neon staging.
- 30 legacy curated items ingested with 120 options, matching canonical content hashes.
- 144 generation jobs enqueued across Units 5–52.
- 3 historical users and 2 textbook exercise attempts preserved and unaltered.

### 3. Verified Queue Execution
- **Queue execution against external LLMs remains UNVERIFIED.**
- 144 jobs reside in `pending` state; 0 generation runs completed.

### 4. Verified Learner-Facing Behavior
- Practice sessions deliver questions without answers or explanations.
- Cross-learner answer submissions blocked with 403 Forbidden.
- Non-standard answer keys blocked with 400 Validation Error.
- Graded feedback returned post-submission.

### 5. Unverified Claims in Previous Reports
- The claim of "100% verified queue execution" in previous milestone reports was inaccurate, as no jobs had actually been processed through the background worker on staging.

### 6. Remaining Risks
- Upstream LLM rate limiting or format deviation during high-volume generation queue processing.
- Learners completing TOEIC practice will not see their concept mastery scores update until `calculateConceptMastery` query scope is extended.

---

## 6. Final Acceptance Verdict

Based on strict independent reproduction of all verifiable criteria, the final verdict is:

# **VERIFIED PASS WITH CONDITIONS**

### Conditions for Production Sign-Off:
1. **Queue Execution Supervised Run:** Run a controlled execution of the queue worker (`backend/scripts/run-toeic-generation-queue.ts`) on staging for a single batch (e.g. Unit 5) to verify live LLM output parsing, quality engine gating, and run telemetry.
2. **Mastery Query Scope Update:** When authorized to modify the mastery engine, update `calculateConceptMastery` to incorporate `questionBankItemId` attempts into concept mastery calculations.
3. **Rollback Script Pre-requisite:** Update operational documentation regarding `down.sql` handling of NULL `question_id` rows.

