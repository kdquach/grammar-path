# Phase 2.1 Test & Verification Report

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Environment:** Isolated Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`) + Offline Unit/Vitest Suites  
**Overall Verdict:** PASS (`167/167` Automated Checks Passing, Zero Leaked Test Data)

---

## 1. Execution Summary Matrix

| Suite / Command | Scope | Result | Duration / Notes |
| --- | --- | --- | --- |
| `backend`: `npm run test:unit` | Security, hygiene, staging guard, Phase 2.1 unit helpers | **44/44 PASSED** (`4/4` files) | 1.89s |
| `backend`: `npm run test:api:staging` | Live Staging Neon + Express integration + 10 adversarial scenarios | **63/63 PASSED** (`7/7` files) | 93.31s |
| `backend`: `npm run build` | TypeScript compilation (`tsc`) | **PASSED** (`exit 0`) | Zero compile errors |
| `backend`: `npm run test:migrations` | Offline SQL schema checksum/DDL check | **PASSED** (`exit 0`) | 5 enums, 29 tables, 31 FKs, 21 CHECKs, 48 indexes |
| `backend`: `npm run prisma:status:staging` | Live staging migration state | **UP TO DATE** | 3 migrations applied |
| `frontend`: `npm run typecheck` | TypeScript check (`tsc --noEmit`) | **PASSED** (`exit 0`) | Zero type errors across `src/` and `tests/` |
| `frontend`: `npm test` | Vitest + React Testing Library components/pages | **60/60 PASSED** (`9/9` files) | 3.04s |
| `frontend`: `npm run build` | Production bundle (`tsc -b && vite build`) | **PASSED** (`exit 0`) | 1611 modules transformed in 1.48s |

---

## 2. Backend Offline Unit Test Breakdown (`44/44` Passed)

- `tests/phase1-7-staging-guard.test.ts`: **6/6 passed**
- `tests/phase1-6-hygiene.test.ts`: **8/8 passed**
- `tests/phase1-security-hardening.test.ts`: **22/22 passed**
- `tests/phase2-1-unit.test.ts` (new in Phase 2.1): **8/8 passed**
  - `isEmptyStudentAnswer` handling strings, arrays, records, null/undefined.
  - `evaluateQuestion` multi-blank ordered evaluation and case/punctuation normalization.
  - `assertNoSpoilerQueryParams` rejecting `?includeAnswers=true`, `?revealAnswers=1`, allowing non-spoiler params.
  - Non-spoiler formatters stripping `answerKey` / `acceptedAnswers` / `correctAnswerText` on reads.
  - `runDeduplicatedSubmission` collapsing concurrent duplicate calls while permitting sequential retries after error.
  - `rebalanceBatchOptionDistribution` producing uniform `{ A: 5, B: 5, C: 5, D: 5 }` on 20 items.
  - Dynamic TOEIC synthesis normalizing `{blank}` and `...` without literal marker leakage.
  - `422 INSUFFICIENT_CONTENT` thrown when source questions are empty.

---

## 3. Backend Staging API Integration Breakdown (`63/63` Passed)

- `tests/curriculum.api.test.ts`: **9/9 passed**
- `tests/exercises.api.test.ts`: **8/8 passed** (updated Tests #2, #3, #4, #6, #7 for Phase 2.1 anti-spoiler gates)
- `tests/grading.api.test.ts`: **11/11 passed**
- `tests/auth-and-progress.api.test.ts`: **7/7 passed**
- `tests/adaptive.api.test.ts`: **7/7 passed** (bounded fail-closed AI timeout `5000ms`; handles live Gemini 503 vs 200 cleanly)
- `tests/adaptive-toeic.api.test.ts`: **11/11 passed** (TOEIC persistence, anti-spoiler check, Unit 98 `count=20` DB A/B/C/D balance assertion, cascade delete cleanup)
- `tests/phase2-1-remediation.api.test.ts` (new in Phase 2.1): **10/10 passed** — covering all 10 required adversarial scenarios:
  1. Anti-spoiler read enforcement (`403 SPOILER_FORBIDDEN`), auth & attempt locks on solutions (`401` / `403 SOLUTION_LOCKED`), and non-spoiler partial exercise submission.
  2. Cross-user adaptive session authorization isolation (`403 FORBIDDEN` when User B submits User A's session), plus server-side adaptive quiz grading & DB persistence.
  3. Canonical latest-attempt mistake resolution (wrong -> `/progress/mistakes` contains rich `86.4-q9` payload -> retry right -> excluded from `/progress/mistakes` & next Adaptive Quiz while raw `QuestionAttemptItem` count = `2`).
  4. Rejecting empty single-question (`""`), empty array (`["  ", ""]`), empty exercise (`{}`), and foreign-question submissions (`400 VALIDATION_ERROR`).
  5. Multi-blank (`["No-one", "anyone"]`), option-key, and multi-select unordered arrays (`["A", "C"]` / `["C", "A"]`) graded accurately across Exercise, Question, Mistake, and Adaptive endpoints.
  6. Per-exercise `1.1` vs `1.2` scoping: submitting valid `1.1` does not touch `1.2` or allow foreign keys (`1.2-q1` inside `1.1/check` -> `400`).
  7. Latest-attempt unit completion on Unit 23 (`23.1` 100% -> `23.1` 0% -> `23.2` 100% stays `in_progress`; `23.1` retry 100% promotes to `completed`; all `4` attempts preserved).
  8. Manual status toggle on Unit 1 preserves attempts & overview metrics (`0` wiped rows).
  9. Concurrent duplicate check requests with identical `submissionId` collapse to `1` persisted `ExerciseAttempt` row and `1` persisted `QuestionAttemptItem` row.
  10. Unit 98 `POST /adaptive/toeic-practice` (`count=20`) returns `20` unbiased, unit-grounded items without pre-submission spoilers and grades accurately on `/toeic-practice/check`.

---

## 4. Frontend Automated Test Breakdown (`60/60` Passed)

- `tests/catalog-and-theory.test.tsx`: **5/5 passed**
- `tests/exercise-renderer.test.tsx`: **17/17 passed** (includes visual context across all renderers + worked examples, distinct `contextNotes`, `WordBankBar` click-to-insert into focused blank, per-exercise score isolation across tab switching, empty submit prevention, guest/attempt solution locks, double-submit lock)
- `tests/adaptive-and-ai.test.tsx`: **4/4 passed**
- `tests/adaptive-toeic.test.tsx`: **2/2 passed** (non-ETS disclaimer, `5/10/20` count selector, server check grading, double-click lock, `fill_blank` Adaptive Quiz flow)
- `tests/auth-and-progress.test.tsx`: **6/6 passed** (includes multi-blank + Word Bank mistake retry, analytics refresh, `UnitPage` status toggle attempt preservation)
- `tests/toeic-roadmap.test.tsx`: **4/4 passed**
- `tests/phase1-runtime-reliability.test.tsx`: **8/8 passed**
- `tests/formatted-theory.test.tsx`: **8/8 passed**
- `tests/phase1-6-api-url.test.ts`: **6/6 passed**

---

## 5. Multi-Unit Live TOEIC Sampling Check & Staging Database Audit

- **Live Multi-Unit Sampling Check** (`units [1, 5, 42, 70, 98, 121, 145]`, `count=20`, offline Gemini):
  - All 7 units returned `actualCount: 20` with clean `_______` blanks and balanced answer distribution `{ A: 5, B: 5, C: 5, D: 5 }`.
- **Post-Test Staging DB Audit (`grammarpath-staging`):**
  - Canonical dataset counts unchanged: `units: 145`, `exercises: 549`, `questions: 4414`, `theorySections: 542`, `textbookExamples: 639`, `answerKeys: 4414`, `explanations: 4414`.
  - Ephemeral user/session cleanup verified (`0` leaked rows): `users: 0`, `learningProgress: 0`, `exerciseAttempts: 0`, `questionAttemptItems: 0`, `adaptiveQuizSessions: 0`, `toeicPracticeSessions: 0`, `toeicPracticeItems: 0`.
  - `grammarpath-data` canonical dataset files remain untouched.

