# Phase 2.1 Report — Workstream B: Adaptive Quiz Re-architecture

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** `POST /api/v1/adaptive/quiz/generate`, `POST /api/v1/adaptive/quiz/check`, & AdaptiveQuizModal  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 uncovered three major flaws in the Adaptive Quiz subsystem:
1. **Spoiler Leakage & Client-Side Grading:** `/api/v1/adaptive/quiz/generate` returned `correctAnswer` and `explanation` inline, and `AdaptiveQuizModal.tsx` evaluated answers with client-side `normalize()` string comparison without calling any grading API.
2. **Ephemeral Non-Persisted Attempts:** Answers submitted in Adaptive Quiz never created `QuestionAttemptItem` rows or updated dashboard analytics/mistakes, and quiz sessions existed only as transient IDs.
3. **Question-Type Flattening:** Multi-blank, option-based, multi-part, and Word Bank questions lost their structured `options`, `blanks`, `parts`, `visualContext`, and `wordBankItems` in the adaptive quiz payload.

---

## 2. Root Cause Analysis

- `backend/src/controllers/adaptive.controller.ts` queried unresolved mistakes with raw SQL lacking structural joins and stripped `blanks`/`parts`/`wordBankItems` while embedding `correctAnswerText` and `explanation`.
- No server-side grading endpoint (`/adaptive/quiz/check`) or `adaptive_quiz_sessions` persistence table existed in Prisma.
- `AdaptiveQuizModal.tsx` rendered a simplified MC-or-text input instead of reusing GrammarPath's canonical polymorphic renderers and server grading.

---

## 3. Files Modified / Added

- `backend/prisma/schema.prisma` (`AdaptiveQuizSession` model)
- `backend/prisma/migrations/20261113000000_add_practice_sessions/migration.sql`
- `backend/src/services/mistakes.service.ts` (shared latest-unresolved mistake service)
- `backend/src/controllers/adaptive.controller.ts` (`generateAdaptiveQuizHandler`, `checkAdaptiveQuizHandler`)
- `backend/src/routes/adaptive.routes.ts` (`POST /adaptive/quiz/check`)
- `backend/src/utils/idempotency.ts` (`runDeduplicatedSubmission`, `stableSerialize`)
- `frontend/src/types/api.types.ts`
- `frontend/src/api/client.ts` (`checkAdaptiveQuizAnswer`)
- `frontend/src/components/adaptive/AdaptiveQuizModal.tsx`
- `frontend/src/components/adaptive/AdaptiveReviewPanel.tsx`
- `frontend/src/pages/ProgressDashboardPage.tsx`
- `backend/tests/adaptive-toeic.api.test.ts`
- `backend/tests/phase2-1-remediation.api.test.ts`
- `frontend/tests/adaptive-toeic.test.tsx`

---

## 4. Implementation Details

### Persistence & Anti-Spoiler Contract
- Added `adaptive_quiz_sessions` (`AdaptiveQuizSession`) storing `(id, userId, difficulty, questionIds, targetUnits, createdAt)` with cascade delete on `User`.
- `POST /api/v1/adaptive/quiz/generate`:
  - Sources unresolved mistakes strictly via `getLatestUnresolvedMistakes(userId, targetUnitNumbers)` (only questions whose *latest* `QuestionAttemptItem` has `isCorrect = false`).
  - Preserves complete structural question fields (`options`, `blanks`, `parts`, `wordBankItems`, `hasVisualContext`, `visualContextDescription`, `contextClue`, `instruction`) via `formatQuestion(q, false)`.
  - Strips `correctAnswer`, `correctAnswerText`, `acceptedAnswers`, and `explanation`.
  - Persists session row and returns `sessionId: "quiz_<uuid>"`.

### Server-Side Canonical Grading & Ownership Verification
- Added `POST /api/v1/adaptive/quiz/check` (`requireAuth`):
  - Validates `sessionId`, checks ownership (`session.userId === userId` -> else `403 FORBIDDEN`), and verifies `questionId` belongs to the session's `questionIds` list.
  - Rejects empty inputs with `400 VALIDATION_ERROR`.
  - Evaluates via canonical `evaluateQuestion(question, rawAnswer)` supporting strings, multi-blank arrays, multi-select option arrays, and multi-part maps.
  - Deduplicates concurrent/double-submit requests via `runDeduplicatedSubmission`.
  - Persists `QuestionAttemptItem` (`attemptId: null`), updating unresolved mistakes and adaptive analytics without deleting history.

### Frontend Polymorphic Rendering & Live Dashboard Refresh
- Updated `AdaptiveQuizModal.tsx` to delegate rendering to `OptionQuestionRenderer`, `MultiPartQuestionRenderer`, `FillBlankQuestionRenderer`, `SentenceQuestionRenderer`, and `WordBankBar` (with click-to-insert into focused fields).
- Removed all `correctAnswer`, `explanation`, and `normalize()` logic from `AdaptiveQuizModal.tsx`.
- Added synchronous `inFlightIndicesRef` lock blocking double clicks and wired `onProgressUpdated` -> `ProgressDashboardPage` / `AdaptiveReviewPanel` `refreshKey` increments so analytics & mistake counts refresh immediately after grading.

---

## 5. Observed Verification Results

- **Backend Staging Integration (`tests/adaptive-toeic.api.test.ts` — `11/11` passed):**
  - Confirmed `POST /api/v1/adaptive/quiz/generate` omits `correctAnswer`/`explanation`/`acceptedAnswers` and includes structural `options`/`blanks`/`parts`/`wordBankItems`.
  - Verified `POST /api/v1/adaptive/quiz/check` rejects empty answers (`400`) and evaluates valid submissions canonically (`200`).
- **Adversarial Verification (`tests/phase2-1-remediation.api.test.ts` — Scenarios 2, 3, 4, 9 passed):**
  - Scenario 2: User A wrong answer populates Adaptive Quiz without spoilers -> submitting User B's session triggers `403 FORBIDDEN` -> User A passes via `/adaptive/quiz/check` -> verified `QuestionAttemptItem` created in DB and mistake cleared from `/progress/mistakes`.
  - Scenario 3: Verified resolved mistakes (`isCorrect: true` on latest item) do not reappear in subsequent `/adaptive/quiz/generate` sessions.
  - Scenario 9: Concurrent/duplicate `/adaptive/quiz/check` calls with identical `submissionId` deduplicated to a single persisted row.
- **Frontend (`tests/adaptive-toeic.test.tsx` — `2/2` passed; dashboard & modal):**
  - Verified option selection, rapid double-click lock (only 1 `checkAdaptiveQuizAnswer` API call fired), `fill_blank` input progression, server explanation/rule badge rendering, and quiz completion screen.

---

## 6. Remaining Limitations & Regression Risks

- **Cross-instance deduplication:** `runDeduplicatedSubmission` uses in-process memory (sufficient for single-node/staging; a Redis store is recommended if horizontally scaled across multiple stateless containers).
- **Session expiration:** `adaptive_quiz_sessions` rows persist until user deletion (or future TTL cleanup job) — no automatic TTL pruning was added in Phase 2.1.
- **Standalone attempts:** `AdaptiveQuizModal` checks create `QuestionAttemptItem` rows with `attemptId: null`, which update question accuracy/analytics/mistakes cleanly, while exercise-level `ExerciseAttempt` averages intentionally remain tied to full exercise submissions.

