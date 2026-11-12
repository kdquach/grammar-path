# Phase 2.1 Report — Workstream D: Exercise Rendering, Word Bank Insertion & Scoping Integrity

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** `ExerciseViewer.tsx`, `QuestionCard.tsx`, `QuestionVisualContext.tsx`, & Question Renderers  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 identified six structural UI/state bugs in the exercise player:
1. **Lost Per-Question Visual Context:** `OptionQuestionRenderer`, `FillBlankQuestionRenderer`, `MultiPartQuestionRenderer`, and Worked Example cards ignored `question.hasVisualContext` and `question.visualContextDescription`.
2. **Missing Exercise `contextNotes`:** `ExerciseViewer.tsx` only displayed `visualContextDescription` and dropped `exercise.contextNotes` completely.
3. **Unwired Word Bank Click-to-Insert:** Clicking a `WordBankBar` chip toggled strike-through and clipboard copy, but never inserted into active text/blank/part inputs (`onSelectWord` wasn't passed in `ExerciseViewer`).
4. **Shared Score/Restored Flag Across Exercise Tabs:** Switching tabs (e.g., Exercise `1.2` -> `1.3`) leaked Exercise `1.2`'s `Exercise Evaluation Summary` banner onto `1.3` and lost `1.2`'s score when returning.
5. **Global Unscoped Submission Payload:** `checkExerciseAnswers` sent all `answers` in state across all exercises in the unit, allowing stale or empty inputs to fail/pollute grading.
6. **Double-Submit Race & Empty-Submit Acceptance:** Rapid clicks fired duplicate `POST /check` requests creating duplicate DB rows; clicking Check with empty inputs still hit the backend.

---

## 2. Root Cause Analysis

- Visual context rendering existed solely inside `SentenceQuestionRenderer.tsx` instead of a shared component across all renderers.
- `ExerciseViewer.tsx` stored `exerciseScore` and `isRestoredAttempt` as scalar booleans/objects rather than keyed by `exercise.exerciseId`.
- `answers` state was passed directly to `api.checkExerciseAnswers(activeExercise.exerciseId, answers)` instead of building a filtered `scopedAnswers` map strictly matching `activeExercise.questions`.
- Neither renderers nor `QuestionCard` tracked field focus (`onFocusField`) for programmatic insertion.

---

## 3. Files Modified / Added

- `frontend/src/components/exercises/QuestionVisualContext.tsx` (new shared component)
- `frontend/src/components/exercises/renderers/OptionQuestionRenderer.tsx`
- `frontend/src/components/exercises/renderers/FillBlankQuestionRenderer.tsx`
- `frontend/src/components/exercises/renderers/MultiPartQuestionRenderer.tsx`
- `frontend/src/components/exercises/renderers/SentenceQuestionRenderer.tsx`
- `frontend/src/components/exercises/QuestionCard.tsx`
- `frontend/src/components/exercises/ExerciseViewer.tsx`
- `backend/src/controllers/exercises.controller.ts` (server-side foreign key & empty payload validation)
- `backend/src/controllers/questions.controller.ts` (server-side empty answer validation + deduplication)
- `backend/src/utils/idempotency.ts`
- `backend/tests/phase2-1-remediation.api.test.ts`
- `frontend/tests/exercise-renderer.test.tsx`

---

## 4. Implementation Details

- Created `QuestionVisualContext.tsx` (`data-testid="question-visual-context"`) rendering whenever `hasVisualContext && description?.trim()`. Integrated into `OptionQuestionRenderer`, `FillBlankQuestionRenderer` (single & multi-blank), `MultiPartQuestionRenderer`, `SentenceQuestionRenderer`, and `QuestionCard` Worked Examples.
- Added distinct rendering for `activeExercise.visualContextDescription` (`data-testid="exercise-visual-context"`) and `activeExercise.contextNotes` (`data-testid="exercise-context-notes"`) in `ExerciseViewer.tsx`.
- Added `onFocusField` callbacks across text/blank/part renderers -> `QuestionCard` -> `ExerciseViewer.focusedTargetRef`. Wired `WordBankBar.onSelectWord` (`handleSelectWordFromBank`) to insert the clicked word into the focused blank/part/sentence field or automatically target the next empty interactive text field without wiping typed multi-word phrases.
- Replaced scalar score/restored state with per-exercise maps (`exerciseScoresById` and `restoredByExerciseId`), isolating score banners per exercise tab and clearing only the active exercise on `Reset Exercise`.
- Built `scopedAnswers` restricted to `activeExercise.questions` (excluding empty inputs) in `handleCheckEntireExercise`, paired with backend scope validation rejecting foreign `questionId`/`partId` keys (`400 VALIDATION_ERROR`).
- Added synchronous `checkingQuestionIdsRef` and `isCheckingExerciseRef` double-submit locks in `ExerciseViewer.tsx`, plus exported `isEmptyAnswerValue` blocking empty single-question and exercise submissions client- and server-side.

---

## 5. Observed Verification Results

- **Backend Adversarial Suite (`tests/phase2-1-remediation.api.test.ts` — Scenarios 4 & 9 passed):**
  - Scenario 4: Rejected empty single-question (`""`), empty array (`["  ", ""]`), empty exercise (`{}`), and foreign-question exercise submissions (`{ "1.2-q1": "am" }` submitted to `exercises/1.1/check`) with `400 VALIDATION_ERROR`.
  - Scenario 9: Concurrent duplicate `POST /exercises/1.1/check` submissions with shared `submissionId` produced identical response payloads and created exactly `1` `ExerciseAttempt` row in staging PostgreSQL.
- **Frontend Tests (`tests/exercise-renderer.test.tsx` — `17/17` passed):**
  - Verified `QuestionVisualContext` renders across Option, FillBlank, MultiPart, Sentence, and Worked Example.
  - Verified `exercise-visual-context` and `exercise-context-notes` render independently.
  - Verified `WordBankBar` click inserts into focused question #2 blank input (`thirsty`) while leaving unfocused question #1 untouched.
  - Verified tab switching between `1.2` and `1.3` keeps `1.2`'s `50%` score summary strictly scoped to `1.2` without leaking onto `1.3`.
  - Verified rapid double-clicking `Check Entire Exercise` fires only `1` `api.checkExerciseAnswers` call.

---

## 6. Remaining Limitations & Regression Risks

- **Multi-word editing with Word Bank:** If a learner focuses a partially typed sentence that is not a bank word, `mergeWord` appends cleanly with space separation; clicking to *replace* inside a multi-word answer vs single-blank relies on whether the current string equals an existing Word Bank chip.
- **Non-image visual aids:** `QuestionVisualContext` renders canonical `visualContextDescription` text faithfully because the canonical dataset stores text descriptions rather than image URLs.

