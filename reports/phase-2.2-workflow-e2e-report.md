# GrammarPath Phase 2.2 — Audit A: Complete Learning Workflow E2E Report

**Date:** 2026-11-12  
**Target Environment:** Isolated Neon staging database `grammarpath-staging` (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432`) + Express API (`backend/`) + React/Vite SPA (`frontend/`)  
**Execution Method:** Live Supertest HTTP integration against Neon staging DB (`npm run test:api:staging` + dedicated 10-flow E2E verification script) combined with Vitest + React Testing Library + JSDOM component integration tests (`npm test`). *(Note: Neither `playwright`, `chromium`, nor `google-chrome` is installed on the host, so live visual browser click-through remains unexecuted; UI workflows were exercised at component/DOM integration level and backed by live API/DB verification.)*

---

## 1. End-to-End Workflow Matrix (Flows 1–10)

| # | Workflow | Frontend Verification (RTL + JSDOM) | Backend & Staging DB Verification (Supertest + Prisma) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Guest browses curriculum & opens exercise** | [`catalog-and-theory.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/catalog-and-theory.test.tsx), [`exercise-renderer.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/exercise-renderer.test.tsx), keyboard-accessible unit cards in [`CatalogPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/CatalogPage.tsx#L420-L433) | Guest `GET /api/v1/units`, `/units/:n`, `/units/:n/theory`, `/units/:n/exercises`, `/exercises/:id` return 200 without spoiler fields (`audit_a_d_e.ts`, [`curriculum.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/curriculum.api.test.ts)) | **PASS** (API + Component) |
| **2** | **Authenticated user starts & submits exercise** | [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx) + [`exercise-renderer.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/exercise-renderer.test.tsx) | `POST /api/v1/auth/register` -> `POST /api/v1/exercises/1.1/check` (also tested parallel dedupe with identical `submissionId` returning identical `attemptId` and creating 1 `ExerciseAttempt`) | **PASS** (API + Component) |
| **3** | **Partial exercise submission** | Partial state handling in [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx) & [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx) | Submitted 1 wrong answer on `1.1` (`1.1-q2`) leaving siblings (`1.1-q3`+) unattempted: `totalQuestions` matches interactive count, `unitProgressStatus: "in_progress"`, unattempted items return `studentAnswer: null`, `expectedAnswers: []`, `explanation: null` | **PASS** (API + Component) |
| **4** | **Solution gating (per-question & exercise)** | [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L102-L160) (`QuestionSolution` ordered hydration) | Guest solution endpoints return `401`. Auth without attempt returns `403 SOLUTION_LOCKED`. After partial attempt on `1.1-q2`: `GET /questions/1.1-q2/solution` unlocks `200`, while unattempted sibling `GET /questions/1.1-q3/solution` stays `403 SOLUTION_LOCKED`; `GET /exercises/1.1/solutions` unlocks `200` | **PASS** (API + Component) |
| **5** | **Reload & progress restoration** | [`auth-and-progress.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/auth-and-progress.test.tsx) (`ProgressDashboardPage`, auth state) | `GET /api/v1/progress/units/1` restores `status: "in_progress"`, `attempts[0].items` (`1.1-q2` has `studentAnswer: "definitely wrong phrase"`, `isCorrect: false`; `1.1-q3` has `studentAnswer: null`) | **PASS** (API + Component) |
| **6** | **Adaptive Quiz end-to-end** | [`AdaptiveQuizModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx), [`adaptive-toeic.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/adaptive-toeic.test.tsx) | `POST /api/v1/adaptive/quiz/generate` targets unresolved mistake (`1.1-q2`), omits all spoiler keys, persists `AdaptiveQuizSession`. `POST /adaptive/quiz/check` grades server-side & enforces `403` cross-user ownership | **PASS** (API + Component) |
| **7** | **Mistake review & resolution** | [`MistakeReviewPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L552-L642) (ordered chips + retry UX) | `GET /api/v1/progress/mistakes` contains `1.1-q2` (not unattempted `1.1-q3`). Resolving via `/adaptive/quiz/check` (or `/questions/:id/check`) clears `/progress/mistakes` to `[]` while preserving `question_attempt_items` count = `2` (1 wrong + 1 right) | **PASS** (API + Component) |
| **8** | **TOEIC Part 5 practice flow** | [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L408-L436) + [`phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx) (2-blank split fill verified) | `POST /api/v1/adaptive/toeic-practice` (`count=5, 10, 20`) returns spoiler-free items & `sessionId`. `/toeic-practice/check` enforces cross-user `403` and idempotent `attemptCount === 1` on parallel duplicate `submissionId` | **PASS** (API + Component) |
| **9** | **Unit status transitions** | [`UnitPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitPage.tsx) status toggle controls | `PUT /api/v1/progress/units/1` (`completed` -> `in_progress`) updates `LearningProgress` cleanly while preserving `attempts.length === 1` | **PASS** (API + Component) |
| **10** | **Cross-page consistency** | [`CatalogPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/CatalogPage.tsx), [`ProgressDashboardPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ProgressDashboardPage.tsx), [`ToeicRoadmapPage`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/toeic-roadmap.test.tsx) | `GET /api/v1/progress/overview`, `/api/v1/adaptive/analytics`, and `/api/v1/adaptive/recommendations` reflect identical `totalAttempts: 1`, mistake counts, and zero spoiler keys | **PASS** (API + Component) |

---

## 2. Negative & Edge-Case Workflow Checks Executed

- **Foreign Question Injection Rejected:** `POST /api/v1/exercises/1.1/check` with `{ answers: { "2.1-q2": "works" } }` returned `400` (`audit_a_d_e.ts`, line 167–171).
- **Double-Submission / Parallel Race Idempotency:**
  - `POST /api/v1/exercises/1.1/check` fired concurrently in `Promise.all` with matching `submissionId` returned `200` on both calls with the same `attemptId` (`audit_a_d_e.ts`, lines 326–339).
  - `POST /api/v1/adaptive/toeic-practice/check` fired concurrently with matching `submissionId` left DB `ToeicPracticeItem.attemptCount === 1` (`audit_a_d_e.ts`, lines 275–289).
- **Empty Answer Guard:** Tested in `grading.api.test.ts` and `phase2-1-remediation.api.test.ts` (`400 EMPTY_ANSWER` for single-blank empty submissions while preserving explicit empty-string `""` alternatives inside multi-blank arrays like `73.1-q7`).

---

## 3. Environment Note & Honest Boundary

- All backend HTTP workflow steps and DB persistence invariants were executed directly against live Neon staging PostgreSQL (`grammarpath-staging`) after the final Phase 2.2 edits, with zero mock DBs on the API layer.
- Frontend tests ran under Vitest + JSDOM + React Testing Library (`64/64` tests passing across `10` test files) with mocked `api/client` modules. End-to-end interactive clicking inside a real Chromium/WebKit browser engine was not performed because Chromium/Playwright binaries are not installed in this environment.

