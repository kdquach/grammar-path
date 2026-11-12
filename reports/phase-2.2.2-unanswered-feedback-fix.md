# GrammarPath — Phase 2.2.2 Skipped-Question Feedback Fix Report

> **Date:** 2026-11-12  
> **Phase:** 2.2.2 — Final UX Polish & Production Deployment Preflight  
> **Scope:** Distinguish `correct`, `incorrect`, and `unanswered` feedback states on skipped questions immediately after `Check Entire Exercise` and after page reload, without changing server scoring semantics or leaking answers.

---

## 1. Root Cause Analysis

Prior to Phase 2.2.2, submitting a partially answered exercise via `POST /api/v1/exercises/:id/check` returned an evaluation entry for every question containing `{ isCorrect: false, studentAnswer: null, correctAnswers: [], expectedAnswers: [], explanation: null, ruleReference: null }`. Because the frontend feedback model only carried a binary `isCorrect: boolean` (plus `isRevealedSolution?: boolean`), [`QuestionFeedbackPanel`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx) rendered the red `Incorrect` status banner for unattempted/skipped questions both immediately after submission and after reload restoration in [`ExerciseViewer`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx).

In addition, restoring explicit `status: "unanswered"` objects into `ExerciseViewer`'s `results` map introduced a subtle UX/security edge case if [`isQuestionSolutionUnlocked`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L342-L375) only checked `Boolean(results[questionId])`, which could have rendered the `Show Solution` button as unlocked on skipped cards.

---

## 2. Summary of Changes

### 2.1 Backend Grading & Check Response
- **[`EvaluatedQuestionResult`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts)** in [grader.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts):
  - Added optional `status?: "correct" | "incorrect" | "unanswered"`.
  - Updated [`evaluateQuestion`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts) to emit `status: isCorrect ? "correct" : "incorrect"` for all evaluated cases (`option`, `fill_blank`, `multi_part`, `sentence`).
- **[`checkExerciseAnswers`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts)** in [exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts):
  - When `!hasAttempted`, returns `status: "unanswered"` alongside existing `{ isCorrect: false, studentAnswer: null, correctAnswers: [], expectedAnswers: [], explanation: null, ruleReference: null }`.
  - Existing server scoring (`correctCount`, `scorePercentage`, `totalQuestions`), DB persistence (`ExerciseAttempt`, `QuestionAttemptItem`), and unattempted item omission from `/progress/mistakes` remain unchanged.

### 2.2 Frontend Tri-State Feedback & Solution Lock Handling
- **[`QuestionCheckResult`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/types/api.types.ts#L245)** in [api.types.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/types/api.types.ts): added `status?: "correct" | "incorrect" | "unanswered"`.
- **[`QuestionFeedbackPanel`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx)** & [`isEmptyAnswerValue`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx):
  - Added neutral slate feedback card (`data-feedback-status="unanswered"`) displaying **`Unanswered`** and `"No answer was submitted for this question."` with `MinusCircle` when `status === "unanswered"`.
  - Guarantees skipped cards never render `"Incorrect"`, `Expected Answer`, `Also accepted`, `Cambridge Answer Key`, `Giải thích ngữ pháp`, or `Rule` badges.
  - Added `hasBodyContent` guard so restored `Correct!` / `Incorrect` headers without body details omit the unused bottom divider border cleanly.
- **[`QuestionCard`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx)**:
  - Computes `resolvedStatus` honoring explicit `result.status` first, with safe fallback for `studentAnswer: null` or empty `studentAnswer`, and explicitly strips `expectedAnswers`, `correctAnswers`, `explanation`, and `ruleReference` when `resolvedStatus === "unanswered"`.
- **[`ExerciseViewer`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx)**:
  - Re-exports `isEmptyAnswerValue` cleanly without circular dependencies.
  - [`handleRestorePreviousAnswers`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L148-L193) restores attempted rows as `"correct"` / `"incorrect"` and null-studentAnswer rows as `"unanswered"` while keeping skipped inputs blank.
  - Updated [`isQuestionSolutionUnlocked`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx) and `isExerciseSolutionsUnlocked` so `status === "unanswered"` or empty `studentAnswer` keeps `Show Solution` locked (`403 SOLUTION_LOCKED` on server remains aligned with locked UI state).

---

## 3. Regression Tests Added & Verified

### Frontend ([phase2-2-ux.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx))
Verified inside a mixed multi-renderer exercise (`option`, `sentence`, single `fill_blank`, `multi_blank`, `multi_part`):
1. **Correct answer:** Renders `Correct!`, expected answer, explanation, and unlocked solution indicator.
2. **Incorrect answer:** Renders `Incorrect`, expected answer, and explanation.
3. **Empty answer:** Renders neutral `Unanswered` callout without `"Incorrect"` or answer/explanation spoilers.
4. **Whitespace-only answer (`"   "`):** Filtered out before `POST /check` submission -> renders `Unanswered` with zero spoilers.
5. **Partially completed multi-blank question (`["first", ""]`):** Treated as attempted (`!isEmptyAnswerValue`) -> sent to server and graded as `Incorrect`.
6. **Unanswered multi-part question:** All parts blank -> omitted / `studentAnswer: null` -> renders `Unanswered` with zero spoilers.
7. **Reload after partial submission:** Remounting `ExerciseViewer` with persisted past attempt restores `"Đã khôi phục từ lần làm trước"`, attempted inputs + `Correct!`/`Incorrect` status, `"Unanswered"` cards with blank inputs, locked `Show Solution` on skipped questions, and zero answer leaks.

### Backend ([phase2-2-qa.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-2-qa.api.test.ts))
- Added live staging API integration test covering `POST /api/v1/exercises/1.3/check` (`correct`, `incorrect`, whitespace-only `"   "` -> `status: "unanswered"`, omitted -> `status: "unanswered"`) and multi-part whitespace-only input `{ partId: "   " }` -> `status: "unanswered"`, `expectedAnswers: []`, `explanation: null`.

### Verification Results
- Frontend `npm run typecheck`: **PASS**
- Frontend `npm test`: **PASS (`10/10` test files, `65/65` tests)**
- Frontend `npm run build`: **PASS (`1,611` modules built cleanly)**
- Backend `npm run test:unit`: **PASS (`5/5` test files, `48/48` tests)**
- Backend `npm run test:api:staging`: **PASS (`8/8` test files, `66/66` tests against `grammarpath-staging`)**

