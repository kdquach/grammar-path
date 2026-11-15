# GrammarPath — Learning MVP Readiness Audit Report

> **Audit Date:** 2026-11-16  
> **Audited Baseline:** Commit `708ab15` on `main`  
> **Database Scope:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
> **Executive Verdict:** **READY TO STUDY**

---

## 1. Executive Summary

This audit evaluates whether GrammarPath at baseline commit `708ab15` is fully functional and ready for the project owner to immediately begin studying English.

All six core learning flows were rigorously inspected and verified across both automated unit/integration suites and an end-to-end programmatic audit against the staging database:
1. **Open a unit and read theory:** Fully operational with rich Murphy grammar explanations, Vietnamese bilingual translations, and rule keys.
2. **Open original textbook exercise:** Fully operational with matching, fill-in-the-blank, and multi-question exercises.
3. **Anti-spoiler protection:** 100% enforced. Unsubmitted questions leak zero answer keys or explanations. Anti-spoiler bypass query parameters (`?includeAnswers=true`) return `403 SPOILER_FORBIDDEN`. Unattempted solution access returns `403 SOLUTION_LOCKED`.
4. **Server-side grading engine:** Fully operational and stateless. Evaluates exact matches, contraction variants (e.g. `He's` vs `He is`), multi-blank arrays, and multi-part questions. Correctly handles incorrect and unanswered submissions without crash.
5. **Review correct answers and explanations:** Rich Vietnamese explanations and rule citations are delivered for incorrect answers and post-attempt solution unlocks.
6. **Progress persistence & reload:** Learning progress, exercise attempts, question attempts, and mistake review persist reliably to PostgreSQL and reload seamlessly across sessions.

**Zero blockers** were identified for the core study workflow. The application is ready for immediate learning.

---

## 2. Six Essential Learning Flows Verification Matrix

| Flow | Frontend Component | Backend API / Service | DB Tables | Test Evidence | Status | Blocker |
|---|---|---|---|---|---|---|
| **1. Read Unit Theory** | [`UnitDetailPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitDetailPage.tsx), [`FormattedTheory.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/FormattedTheory.tsx) | `GET /api/v1/units/:id`<br>[`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts) | `units`, `theory_sections`, `theory_examples`, `theory_rules` | Vitest: 8 theory tests passed.<br>E2E: Unit 1 loaded with 5 sections (1A–1E), examples, and bilingual text. | **PASS** | None |
| **2. Open Textbook Exercise** | [`ExerciseDetailPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ExerciseDetailPage.tsx), [`ExerciseRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/ExerciseRenderer.tsx) | `GET /api/v1/units/:id/exercises`<br>`GET /api/v1/exercises/:id`<br>[`exercises.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/exercises.service.ts) | `exercises`, `questions`, `word_bank_items` | Vitest: 17 renderer tests passed.<br>E2E: Unit 1 returned 4 exercises (1.1–1.4); Exercise 1.1 returned 8 questions and word bank chips. | **PASS** | None |
| **3. Anti-Spoiler Guard** | [`ExerciseRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/ExerciseRenderer.tsx) (client state isolation) | Anti-Spoiler Sanitizer in [`exercises.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/exercises.service.ts), `exercises.controller.ts` | `exercises`, `questions`, `exercise_attempts` | Vitest: `exercises.api.test.ts` (tests 2, 3, 6, 7).<br>E2E: Verified zero answers in payload; `?includeAnswers=true` -> `403 SPOILER_FORBIDDEN`; unattempted solution -> `403 SOLUTION_LOCKED`. | **PASS** | None |
| **4. Server-Side Grading Engine** | [`ExerciseDetailPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ExerciseDetailPage.tsx), `api.post('/exercises/:id/check')` | `POST /api/v1/questions/:id/check`<br>`POST /api/v1/exercises/:id/check`<br>[`grading.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/grading.service.ts) | `questions`, `exercises` (stateless queries) | Vitest: `grading.api.test.ts` (11 tests passed).<br>E2E: Exact match, contractions (`I am`/`I'm`), multi-blank arrays, multi-part, and unanswered items graded correctly. | **PASS** | None |
| **5. Review Answers & Explanations** | Feedback cards, [`ResultSummaryCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/ResultSummaryCard.tsx), solution reveal | `POST /check` feedback + `GET /api/v1/questions/:id/solution`<br>[`questions.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts) | `questions`, `theory_rules`, `exercise_attempts` | Vitest: `grading.api.test.ts` (test 5), `exercises.api.test.ts` (tests 6–7).<br>E2E: Verified Vietnamese feedback on wrong answers; solutions unlocked after attempt with Murphy rule references. | **PASS** | None |
| **6. Progress Persistence & Reload** | [`AuthContext.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/context/AuthContext.tsx), [`DashboardPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/DashboardPage.tsx), [`MistakeReviewPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx) | `POST /api/v1/auth/*`<br>`GET/PUT /api/v1/progress/*`<br>[`progress.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/progress.service.ts) | `users`, `exercise_attempts`, `question_attempt_items`, `user_learning_progress`, `user_concept_mastery` | Vitest: `auth-and-progress.api.test.ts` (7 tests passed).<br>E2E: User attempts persisted, unit progress updated, mistakes logged, re-retrieved across sessions. | **PASS** | None |

---

## 3. Representative Case Test Evidence

### A. Single-Answer Exercise (1.1-q1)
- **Input:** `"She's taking a picture"` (or accepted variation `"She is taking a picture"`)
- **Submission:** `POST /api/v1/questions/1.1-q1/check` -> `{ answer: "She's taking a picture" }`
- **Result:** `isCorrect: true`, `expectedAnswers: ["She's taking a picture", "She is taking a picture"]`
- **Exit Code:** 0

### B. Contractions & Accepted Variants (1.1-q2)
- **Input:** `"He's tying his shoelace"`
- **Variant tested:** `"He is tying his shoelace"`
- **Submission:** `POST /api/v1/questions/1.1-q2/check` -> `{ answer: "He is tying his shoelace" }`
- **Result:** `isCorrect: true` (normalized contraction matching verified)

### C. Fill-in-the-Blank Multi-Blank Exercise (1.2-q1)
- **Sentence:** `"Please be quiet. I _____ (work)."`
- **Input Array:** `["am working"]` / `["'m working"]`
- **Multi-Blank Array:** Tested `POST /api/v1/questions/1.2-q1/check` with `answer: ["am working"]`
- **Result:** `isCorrect: true`

### D. Multi-Question Exercise Submission (1.1 check)
- **Submission:** `POST /api/v1/exercises/1.1/check` with partial dictionary of question answers.
- **Handling:**
  - Evaluates all non-example questions.
  - Worked examples are excluded from scoring denominator.
  - Unanswered items are flagged `isCorrect: false` without leaking answers before user attempts them.
- **Result:** Score correctly calculated (e.g. 80%), persisted to `exercise_attempts`.

### E. Anti-Spoiler Bypass & Solution Lockdown
- **Bypass Probe 1:** `GET /api/v1/units/1/exercises?includeAnswers=true` -> Status `403 SPOILER_FORBIDDEN`.
- **Bypass Probe 2:** `GET /api/v1/questions/1.1-q2/solution` without logged attempt -> Status `403 SOLUTION_LOCKED`.
- **Post-attempt Solution Retrieval:** After authenticated attempt, `GET /api/v1/questions/1.1-q2/solution` returns Status `200` with official Murphy solution and grammar explanation.

### F. Progress Persistence & Reload Simulation
- A session was registered, answers were submitted, and progress verified.
- Subsequent calls to `GET /api/v1/progress/overview` and `GET /api/v1/progress/mistakes` accurately returned the persisted attempts, score averages, and mistake queue.
- Temporary test accounts were cleaned up safely, leaving the staging database in a clean, invariant state.

---

## 4. Test Suite Execution Logs & Invariance Verification

### Frontend Suite
- **Command:** `cd frontend && npm test -- --run`
- **Exit Code:** `0`
- **Results:** 13 test files passed, 79/79 unit/integration tests passed.
  - `exercise-renderer.test.tsx`: 17 passed
  - `formatted-theory.test.tsx`: 8 passed
  - `auth-and-progress.test.tsx`: 6 passed
  - `phase2-2-ux.test.tsx`: 5 passed
  - `catalog-and-theory.test.tsx`: 5 passed
  - `toeic-roadmap.test.tsx`: 4 passed
  - `phase3-1-dashboard.test.tsx`: 4 passed
  - `phase3-2-mastery.test.tsx`: 5 passed
  - `phase3-3-experience.test.tsx`: 5 passed
  - `adaptive-toeic.test.tsx`: 2 passed
  - `adaptive-and-ai.test.tsx`: 4 passed
  - `phase1-runtime-reliability.test.tsx`: 8 passed
  - `phase1-6-api-url.test.ts`: 6 passed

### Backend Core Suites
- **Grading Engine:** `npm test tests/grading.api.test.ts` -> 11/11 tests passed (Exit Code `0`).
- **Exercise & Anti-Spoiler:** `npm test tests/exercises.api.test.ts` -> 8/8 tests passed (Exit Code `0`).
- **Auth & Persistence:** `npm test tests/auth-and-progress.api.test.ts` -> 7/7 tests passed (Exit Code `0`).

### Database Census Invariance Verification
Before and after the readiness audit, the Neon staging database was verified:
```json
{
  "exerciseAttempts": 2,
  "questionAttempts": 5,
  "practiceSessions": 10,
  "practiceItems": 15,
  "bankTotal": 53,
  "bankApproved": 12,
  "bankValidated": 32
}
```
All counts remained strictly invariant. Zero data was overwritten or corrupted.

---

## 5. Prioritized List of Blockers

**No blockers.**
There are zero technical or functional defects blocking study of English Murphy grammar units and textbook exercises.

---

## 6. How to Start Studying Immediately

To start studying right now:

### Step 1: Start the Backend Service
In a terminal window:
```bash
cd /Users/kd.quach03/Documents/grammarpath-app/backend
npm run dev
```
*(Server listens on `http://localhost:4000`)*

### Step 2: Start the Frontend Application
In a second terminal window:
```bash
cd /Users/kd.quach03/Documents/grammarpath-app/frontend
npm run dev
```
*(Vite dev server starts on `http://localhost:5173`)*

### Step 3: Open the First Lesson
Open your web browser and navigate directly to:
- **Unit 1 Theory & Overview:** [http://localhost:5173/units/1](http://localhost:5173/units/1)
- **Unit 1 Exercises:** [http://localhost:5173/units/1/exercises/1.1](http://localhost:5173/units/1/exercises/1.1)
- **Full Unit Catalog:** [http://localhost:5173/units](http://localhost:5173/units)

### Recommended Study Workflow:
1. Open [http://localhost:5173/units/1](http://localhost:5173/units/1).
2. Read sections **1A through 1E** (Present continuous: forms, spelling rules, time phrases).
3. Click **"Bắt đầu bài tập 1.1"** (Exercise 1.1).
4. Complete the 8 questions using the interactive input controls.
5. Click **"Nộp bài"** (Submit) to receive instant server-side grading, review mistakes, and see detailed explanations.

