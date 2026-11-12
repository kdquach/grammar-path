# Phase 2.1 Report — Workstream F: Progress Consistency & Attempt History Integrity

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** Unit Completion Logic, Status Transitions, Overview Metrics, & `UnitPage` State Preservation  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 discovered two semantic/data-integrity defects in unit progress tracking:
1. **Stale Max-Score Completion Inflation:** A learner who passed all exercises once (`100%`), then retried an exercise and scored `0%`, remained auto-evaluated as having passed every exercise (`MAX(scorePercentage) >= 80`) instead of reflecting their *latest* exercise performance.
2. **UI State Wipe on Manual Status Toggle:** Clicking `Mark as Completed` or `Mark as In Progress` on `UnitPage.tsx` replaced `unitProgress` with `PUT /api/v1/progress/units/:unitNumber`'s response, which omitted `attempts` — causing Exercise tab score badges (`✓ 75%`) and `Tiến trình đã lưu` restore banners to vanish until page reload.

---

## 2. Root Cause Analysis

- `exercises.controller.ts` aggregated `ExerciseAttempt` scores by computing the maximum historical score per `exerciseId` instead of taking the most recent (`submittedAt DESC, id DESC`) score per exercise.
- `progress.controller.ts` (`updateUnitProgress`) returned only `{ unitNumber, title, status, completedAt, lastAccessedAt }` without loading existing `attempts`.
- `UnitPage.tsx` (`handleToggleUnitStatus`) directly executed `setUnitProgress(updated)`, discarding `prev.attempts`.

---

## 3. Files Modified

- `backend/src/controllers/exercises.controller.ts` (`checkExerciseAnswers` latest-attempt completion logic & manual-completed preservation)
- `backend/src/controllers/progress.controller.ts` (`updateUnitProgress` returns `attempts` alongside status)
- `backend/src/controllers/questions.controller.ts` (preserves manual/existing `completed` unit status when checking individual questions)
- `frontend/src/pages/UnitPage.tsx` (defensive `attempts` preservation in `handleToggleUnitStatus`)
- `backend/tests/phase2-1-remediation.api.test.ts` (Scenarios 7 & 8)
- `frontend/tests/auth-and-progress.test.tsx` (Test #6)

---

## 4. Implementation Details

- **Latest-Attempt Completion Derivation (`exercises.controller.ts`):**
  - Queries `ExerciseAttempt` for all exercises in `unitId` ordered by `[{ submittedAt: "desc" }, { id: "desc" }]`.
  - Records only the *first* (latest) score per `exerciseId` in `latestScoreByExercise`.
  - Marks unit `completed` automatically iff `unitExercises.every((ue) => (latestScoreByExercise.get(ue.id) ?? -1) >= 80)`.
  - Preserves legitimate explicit `completed` status (`currentProgress?.status === "completed"`) when individual questions or single retries are checked later, while allowing explicit `PUT /progress/units/:unitNumber` to toggle `completed` <-> `in_progress` at will.
  - Never deletes historical `ExerciseAttempt` or `QuestionAttemptItem` rows (`0` destructive mutations).
- **Rich Progress Payload on Manual Toggle (`progress.controller.ts` + `UnitPage.tsx`):**
  - `updateUnitProgress` queries `ExerciseAttempt` history (including `items`) and returns full `attempts` array alongside `status`.
  - `UnitPage.tsx` merges `updated.attempts` with defensive fallback to `prev?.attempts ?? []`.

---

## 5. Observed Verification Results

- **Backend Adversarial Suite (`tests/phase2-1-remediation.api.test.ts`):**
  - **Scenario 7 (Latest-Attempt Completion vs Stale Max):** Passing `23.1` (`100%`), failing a `23.1` retry (`0%`), then passing `23.2` (`100%`) left latest attempts at `[0%, 100%]` — Unit 23 remained `in_progress` instead of falsely promoting to `completed`; retrying `23.1` with `100%` then cleanly promoted Unit 23 to `completed`, while preserving all `4` historical `ExerciseAttempt` rows in PostgreSQL.
  - **Scenario 8 (Manual Status Toggle Non-Destructiveness):** Toggling Unit 1 between `completed` and `in_progress` via `PUT /progress/units/1` returned `attempts` inline and left `GET /progress/units/1` + `GET /progress/overview` attempt totals completely intact (`0` deleted attempts/items).
- **Frontend (`tests/auth-and-progress.test.tsx` Test #6):**
  - Verified toggling `Mark as Completed` on Unit 23 (`75%` prior attempt on `23.1`) updates status badge to `Completed` and preserves `✓ 75%` badge when switching to the Exercises tab.

---

## 6. Remaining Limitations & Regression Risks

- **Manual `completed` sticky semantics:** Once a unit's `learning_progress.status` is `'completed'` (either earned earlier or toggled manually), retrying a single exercise at `< 80%` does not silently demote `completed` back to `in_progress`; only `PUT /progress/units/:unitNumber` explicitly demotes it, which avoids frustrating accidental progress loss on optional practice retries.
- **Standalone question checks vs ExerciseAttempt:** Checking an individual question (`POST /questions/:id/check`) creates `QuestionAttemptItem` (without fabricating a partial `ExerciseAttempt`), so unit completion auto-promotion still derives strictly from full exercise submissions (`ExerciseAttempt`).

