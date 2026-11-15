# GrammarPath — Phase 3.4C.1: Test & Verification Report
## Comprehensive Evidence Integrity & Regression Test Suite

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.1 Scope Lock  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Overall Verdict:** VERIFIED PASS  

---

## 1. Executive Summary & Verification Protocol

Milestone 3.4C.1 subjected all evidence gating rules, concept isolation logic, parent module aggregation routines, and the staging withdrawal state to rigorous automated testing. 

All verification was conducted using the **Staging Isolation Guard** (`backend/scripts/run-with-staging-env.mjs`), strictly against Neon staging. Zero mock bypasses were utilized for database integration tests; all tests interacted directly with the live staging PostgreSQL engine via Prisma Client.

### Verification Summary:
- **Phase 3.4C.1 Dedicated Suite:** 14/14 tests PASSED (0 failures).
- **Consolidated Regression Suite:** 7 test files, 64/64 tests PASSED (0 failures).
- **Supplemental Regression Suites (Phase 3.2 & 3.3):** 2 test files, 21/21 tests PASSED (0 failures).
- **TypeScript Static Verification (`tsc --noEmit`):** Exit code 0 (0 errors).
- **Overall Exit Code:** `0`.

---

## 2. Reproduction Command Matrix

All tests can be independently reproduced by executing the following terminal commands from the backend repository root (`/Users/kd.quach03/Documents/grammarpath-app/backend`):

### 2.1 Dedicated Phase 3.4C.1 Suite
```bash
node scripts/run-with-staging-env.mjs -- npm test tests/phase3-4c1-mastery-hardening.test.ts
```
- **Exit Code:** `0`
- **Result:** `1 passed (1 file), 14 passed (14 tests), duration: 12.86s`

### 2.2 Consolidated Regression Suite
```bash
node scripts/run-with-staging-env.mjs -- npm test \
  tests/phase3-4c1-mastery-hardening.test.ts \
  tests/phase3-4b1-mastery-aggregation.test.ts \
  tests/phase3-4b-m1.test.ts \
  tests/phase3-4b-m2.test.ts \
  tests/phase3-4b-m3.test.ts \
  tests/phase3-4a-unit.test.ts \
  tests/phase3-4a1-attempt-source.unit.test.ts
```
- **Exit Code:** `0`
- **Result:** `7 passed (7 files), 64 passed (64 tests), duration: 36.97s`

### 2.3 Supplemental Regression Suite (Phase 3.2 & Phase 3.3)
```bash
node scripts/run-with-staging-env.mjs -- npm test \
  tests/phase3-2-unit.test.ts \
  tests/phase3-3-unit.test.ts
```
- **Exit Code:** `0`
- **Result:** `2 passed (2 files), 21 passed (21 tests), duration: 0.35s`

### 2.4 TypeScript Compilation Check
```bash
npx tsc --noEmit
```
- **Exit Code:** `0`
- **Result:** Clean compilation, 0 errors.

---

## 3. Detailed Audit of Phase 3.4C.1 Test Suite

The test file [`backend/tests/phase3-4c1-mastery-hardening.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4c1-mastery-hardening.test.ts) evaluates 14 distinct psychometric and architectural invariants:

### Group 1: TOEIC Editorial Lifecycle Status Gating

| Test ID | Test Name | Key Assertions | Result |
|---|---|---|---|
| **Test 1** | Approved latest TOEIC item contributes evidence to concept mastery | Creates approved, `isLatestApproved = true`, confidence 0.95 item and evaluates attempt. Asserts `evidenceCount == 1`, `distinctQuestionCount == 1`, `correctCount == 1`, `masteryStatus == "insufficient_data"` ($N < 3$). | **PASS** |
| **Test 2** | Draft TOEIC item does NOT contribute evidence | Creates `reviewStatus = "draft"` item and creates learner attempt. Asserts `evidenceCount` remains 1 (draft ignored). | **PASS** |
| **Test 3** | Validated (unapproved) item does NOT contribute evidence | Creates `reviewStatus = "validated"`, `isLatestApproved = false` candidate item and learner attempt. Asserts `evidenceCount` remains 1. | **PASS** |
| **Test 4** | Rejected item does NOT contribute evidence | Creates `reviewStatus = "rejected"` item and learner attempt. Asserts `evidenceCount` remains 1. | **PASS** |
| **Test 5** | Withdrawn item does NOT contribute evidence | Creates `reviewStatus = "withdrawn"`, `isLatestApproved = false` item and learner attempt. Asserts `evidenceCount` remains 1. | **PASS** |
| **Test 6** | Superseded / Archived version does NOT contribute to current live mastery | Creates root question with Version 1 (`reviewStatus = "archived"`, `isLatestApproved = false`). Learner attempts V1. Live mastery calculation excludes V1; asserts `evidenceCount` remains 1. | **PASS** |
| **Test 7** | Historical attempts remain 100% intact and unmutated in `QuestionAttemptItem` | Asserts that all 6 historical learner attempts created across Tests 1–6 persist in the database without any record deletion or data loss. | **PASS** |

### Group 2: Evidence Filters & Isolation

| Test ID | Test Name | Key Assertions | Result |
|---|---|---|---|
| **Test 8** | Excludes unanswered attempts (`attemptStatus = "unanswered"` or `isCorrect = null`) | Creates approved item and inserts attempt with `attemptStatus = "unanswered"` and `isCorrect = null` (with `studentAnswer: Prisma.DbNull`). Asserts `evidenceCount` remains 1; unattempted skips do not skew denominator. | **PASS** |
| **Test 9** | Excludes low-confidence mappings ($< 0.85$) from concept mastery | Creates approved item with `conceptMappingConfidence = 0.70`. Evaluates attempt. Asserts `evidenceCount` remains 1; sub-threshold items excluded. | **PASS** |
| **Test 10** | Repeated attempts discount exponentially and do NOT inflate `distinctQuestionCount` | Appends 2 repeated correct attempts on Test 1's approved bank item. Asserts `distinctQuestionCount == 1`, `repeatedAttemptCount == 2`, `evidenceCount == 3`, `masteryStatus == "insufficient_data"`. | **PASS** |

### Group 3: Concept Evidence Isolation & Modules

| Test ID | Test Name | Key Assertions | Result |
|---|---|---|---|
| **Test 11** | Concept without direct questions does not sweep in broad unit questions | Evaluates `module.3.1` (Modals, Units 26–37) for user with no attempts on those units. Asserts `masteryStatus == "not_started"`, `distinctQuestionCount == 0`, `evidenceCount == 0`, `masteryScore == null`. Validates complete removal of unit fallback. | **PASS** |
| **Test 12** | Parent module aggregates child unit masteries without double-counting | Evaluates `module.2.1` (Present & Past, Units 1–4). Child Unit 1 has 1 distinct question with 3 attempts. Asserts `distinctQuestionCount == 1`, `evidenceCount == 3`, `masteryStatus == "insufficient_data"`. Zero double-counting. | **PASS** |

### Group 4: Staging Invariants & Historical Audit

| Test ID | Test Name | Key Assertions | Result |
|---|---|---|---|
| **Test 13** | Verifies flawed staging item `7d24582b` is withdrawn and inactive | Queries staging database for `7d24582b-ca20-4c7a-a828-530f4852e80a`. Asserts `reviewStatus == "withdrawn"`, `isLatestApproved == false`, and `withdrawnReason` contains `"Phase 3.4C.1 audit"`. | **PASS** |
| **Test 14** | Verifies historical textbook attempts and canonical staging users remain completely unaltered | Queries `QuestionAttemptItem` where `questionId IS NOT NULL`. Asserts count == 2 (both on `0c657406-9046-4704-8609-55a9ed670fd5`). Asserts canonical users (`audit-db-...`, `perf-audit-...`, `phase32-e2e-...`) are 100% intact. | **PASS** |

---

## 4. Full Regression Suite Results Matrix

| Test File | Milestone Covered | Tests Passed | Duration | Exit Code | Status |
|---|---|:---:|:---:|:---:|:---:|
| `tests/phase3-4c1-mastery-hardening.test.ts` | Phase 3.4C.1 Hardening | 14 / 14 | 12.55s | 0 | **PASS** |
| `tests/phase3-4b1-mastery-aggregation.test.ts` | Phase 3.4B.1 Aggregation | 9 / 9 | 18.25s | 0 | **PASS** |
| `tests/phase3-4b-m1.test.ts` | Phase 3.4B M1 Schema/Legacy | 5 / 5 | 1.17s | 0 | **PASS** |
| `tests/phase3-4b-m2.test.ts` | Phase 3.4B M2 Quality Engine | 11 / 11 | 4.14s | 0 | **PASS** |
| `tests/phase3-4b-m3.test.ts` | Phase 3.4B M3 Practice Session | 6 / 6 | 0.89s | 0 | **PASS** |
| `tests/phase3-4a-unit.test.ts` | Phase 3.4A Security & Grading | 12 / 12 | 0.01s | 0 | **PASS** |
| `tests/phase3-4a1-attempt-source.unit.test.ts` | Phase 3.4A.1 AttemptSource | 7 / 7 | 0.01s | 0 | **PASS** |
| `tests/phase3-2-unit.test.ts` | Phase 3.2 Spaced Repetition | 12 / 12 | 0.01s | 0 | **PASS** |
| `tests/phase3-3-unit.test.ts` | Phase 3.3 Study Plans | 9 / 9 | 0.01s | 0 | **PASS** |
| **TOTAL** | **Milestones 3.2 – 3.4C.1** | **85 / 85** | **~37.3s** | **0** | **100% PASS** |

---

## 5. Staging Environment & Database Guarding

Every test invocation was prefixed with `backend/scripts/run-with-staging-env.mjs`. The isolation guard inspects `.env.staging` and validates the connection hostname:
- **Expected Hostname:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech`
- **Expected Database:** `grammarpath-staging`
- **Guard Enforcement:** If `DATABASE_URL` references `localhost`, `production`, or any unauthorized target, the runner terminates immediately with exit code 1.
- **Log Verification:** Every test execution produced the verified log header:
  ```text
  [Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging
  ```

---

## 6. Verification Verdict

All tests executed with 100% pass rates, zero flaky retries, zero mock compromises, and zero errors.

**Test & Verification Verdict: VERIFIED PASS**

