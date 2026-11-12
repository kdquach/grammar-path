# Phase 2.1 Report — Workstream A: Anti-Spoiler & Solution Gating

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** Backend Read/Solution Routes & Frontend Exercise Solution Disclosure  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 identified P0 security/pedagogical integrity defects where canonical answer keys and explanations were exposed prior to user effort:
1. Unauthenticated or pre-submission spoiler bypass via query parameters (e.g., `?includeAnswers=true`, `?includeSolutions=true`) on exercise and question read endpoints.
2. Public, unauthenticated access to `/api/v1/questions/:questionId/solution` and `/api/v1/exercises/:exerciseId/solutions` with no attempt-state verification.
3. Unanswered items inside partial `/exercises/:exerciseId/check` submissions leaking `correctAnswers`, `expectedAnswers`, and `explanation` for skipped questions.
4. Frontend `ExerciseViewer` requesting `/units/:unitNumber/exercises?includeAnswers=true` and allowing guests/unattempted learners to reveal full solutions prematurely.

---

## 2. Root Cause Analysis

- `exercises.controller.ts` and `questions.controller.ts` previously honored `?includeAnswers=true` on GET handlers and mapped `formatExercise(..., true)` / `formatQuestionDetail(..., true)`.
- `exercises.routes.ts` and `questions.routes.ts` exposed `/solutions` and `/solution` routes without `requireAuth` or checking prior `ExerciseAttempt` / `QuestionAttemptItem` records.
- `exercises.controller.ts` (`checkExerciseAnswers`) evaluated omitted questions via `evaluateQuestion(q, undefined)` and returned non-empty `correctAnswers`, `expectedAnswers`, and `explanation` alongside empty `studentAnswer`.
- `frontend/src/api/client.ts` defaulted `getUnitExercises(unitNumber, includeAnswers = false)` and `ExerciseViewer.tsx` exposed reveal buttons unconditionally.

---

## 3. Files Modified

- `backend/src/controllers/exercises.controller.ts`
- `backend/src/controllers/questions.controller.ts`
- `backend/src/routes/exercises.routes.ts`
- `backend/src/routes/questions.routes.ts`
- `backend/tests/exercises.api.test.ts`
- `backend/tests/phase2-1-remediation.api.test.ts`
- `backend/tests/phase2-1-unit.test.ts`
- `frontend/src/api/client.ts`
- `frontend/src/components/exercises/ExerciseViewer.tsx`
- `frontend/src/components/exercises/QuestionCard.tsx`
- `frontend/tests/exercise-renderer.test.tsx`

---

## 4. Implementation Details

### Backend Enforcement
- Added [`assertNoSpoilerQueryParams`](../backend/src/controllers/exercises.controller.ts#L23-L44) rejecting `?includeAnswers`, `?includeSolutions`, `?showAnswers`, `?revealAnswers`, and `?withAnswers` with `403 SPOILER_FORBIDDEN` across:
  - `GET /api/v1/units/:unitNumber/exercises`
  - `GET /api/v1/exercises/:exerciseId`
  - `GET /api/v1/questions/:questionId`
- Always formats read payloads with `includeAnswers = false` (`formatExercise(..., false)` and `formatQuestionDetail(..., false)`).
- Added `requireAuth` middleware to `GET /api/v1/questions/:questionId/solution` and `GET /api/v1/exercises/:exerciseId/solutions`.
- Added attempt-state gates:
  - `getExerciseSolutions` checks for at least one `ExerciseAttempt` row for `(userId, exercise.id)`, throwing `403 SOLUTION_LOCKED` if none exists.
  - `getQuestionSolution` exempts worked examples (`question.isExample === true`) after auth, and requires at least one non-empty `QuestionAttemptItem` (`!isEmptyStudentAnswer(item.studentAnswer)`) for interactive questions, throwing `403 SOLUTION_LOCKED` otherwise.
- Updated `checkExerciseAnswers` so unanswered questions (`!hasAttempted`) return `{ isCorrect: false, studentAnswer: null, correctAnswers: [], expectedAnswers: [], explanation: null, ruleReference: null }` with zero answer disclosure, and rejected completely empty submissions (`attemptedCount === 0`) with `400 VALIDATION_ERROR`.

### Frontend Enforcement
- Removed `includeAnswers` query forwarding from `api.getUnitExercises(unitNumber)` in `frontend/src/api/client.ts`.
- Updated `ExerciseViewer.tsx` and `QuestionCard.tsx` so:
  - Unauthenticated users see lock indicators on solution controls and are prompted to sign in via `onOpenAuthModal` rather than firing forbidden API calls.
  - Authenticated users must check a question or submit/restore an exercise attempt before `Show Solution` / `Reveal All Solutions` unlocks interactive items.
  - Empty submissions are blocked client-side before hitting `/check`.

---

## 5. Observed Verification Results

- **Backend Offline Unit Tests (`tests/phase2-1-unit.test.ts`):** Verified `assertNoSpoilerQueryParams` throws `403 SPOILER_FORBIDDEN` on `?includeAnswers=true` and `?revealAnswers=1` (`8/8` tests in file passed; `44/44` total backend unit tests passed).
- **Backend Staging Integration (`tests/exercises.api.test.ts` — `8/8` passed):**
  - Test #2: `?includeAnswers=true` returns `403 SPOILER_FORBIDDEN` and read responses omit `answerKey` / `acceptedAnswers`.
  - Test #3 & #4: Exercise and detail endpoints omit answers and block query-string spoilers.
  - Test #6: `GET /api/v1/questions/:id/solution` returns `401` unauthenticated, `403 SOLUTION_LOCKED` without prior attempt, and `200` after checking.
  - Test #7: `GET /api/v1/exercises/1.1/solutions` returns `401` unauthenticated, `403 SOLUTION_LOCKED` before submission, and `200` with all 8 ordered solutions after submitting `POST /exercises/1.1/check`.
- **Adversarial Verification (`tests/phase2-1-remediation.api.test.ts` — `10/10` passed):**
  - Scenario 1: Confirmed read endpoints contain zero answer keys/explanations and reject spoiler flags (`403`), solutions require auth (`401`) and prior attempt (`403`), and partial `1.1/check` returns empty `correctAnswers` / `expectedAnswers` / `null` explanation for skipped questions.
- **Frontend Tests (`tests/exercise-renderer.test.tsx` — `17/17` passed):** Verified empty-check prevention, guest/unattempted solution blocking, and unlocked post-attempt solution retrieval.

---

## 6. Remaining Limitations & Regression Risks

- **Rate-limiting/brute-force scope:** Existing Express rate limiting mitigates automated solution-probing via dummy submissions; there is no separate per-question cooldown on answer checking.
- **Worked example policy:** `getQuestionSolution` still requires authentication (`requireAuth`) before fetching worked example explanations, though `exampleAnswer` itself remains part of worked example demonstration cards (`question.isExample === true`).
- **Regression risk:** Any future public endpoint returning Prisma `Question` relations via custom formatters must keep `includeAnswers = false` as default to avoid accidental re-exposure.

