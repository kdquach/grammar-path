# Phase 2.0 — Prioritized Remediation & Product Roadmap

**Audit Date:** 2026-11-12  
**Planning Horizon:** Phase 2.1 (Critical Security, Integrity & Grading Repair) -> Phase 2.2 (Learning Experience & Data Fidelity) -> Phase 2.3 (AI/TOEIC Quality, Scale & Persistence) -> Phase 2.4 (CI/E2E & Polish).

---

## Priority Overview

| Phase | Priority | Focus | Findings Addressed | Target Outcome |
|---|---|---|---|---|
| **Phase 2.1** | `P0` (Blocker) | Anti-spoiler auth, Adaptive Quiz & Mistake Review structural repair | `ARCH-3`, `ARCH-4`, `API-1`, `API-2`, `API-3`, `DATA-2`, `UX-1`, `UX-2`, `TEST-3` | Zero unauthenticated answer-key scraping; Adaptive Quiz & Mistake Review support all 4,414 question shapes with server-side grading & persistence. |
| **Phase 2.2** | `P1` (High) | Curriculum rendering fidelity & Exercise/Progress state repair | `DATA-1`, `DATA-4`, `DATA-5`, `API-5`, `UX-3`, `UX-4`, `UX-5` | All 175 visual-context questions, 20 `contextNotes` exercises, 403 `answerKeys.notes`, and 172 word-bank exercises work seamlessly; unit progress/tab states stop clobbering user data. |
| **Phase 2.3** | `P1/P2` (High/Med) | TOEIC generator quality, AI tutor grounding, DB scaling & service extraction | `API-4`, `API-6`, `API-7`, `ARCH-2`, `ARCH-5`, `DATA-3`, `UX-6` | Unbiased, count-accurate, unit-relevant TOEIC drills (with persistence); DB-indexed analytics; grounded & cached AI tutor. |
| **Phase 2.4** | `P2/P3` (Med/Low) | Automated CI DB + E2E tests, UI i18n consistency, theory formatter audit | `TEST-1`, `TEST-2`, `UX-7`, `ARCH-6`, `ARCH-7` | Automated PR gates (Postgres + Playwright), deep-linking (`?tab=exercises`), clean single-language/bilingual UX conventions. |

---

## Detailed Phased Execution Plan

### Phase 2.1 — Security, Anti-Spoiler & Core Practice Integrity (P0 — Mandatory Before Public Release)
1. **Enforce Anti-Spoiler Access Control (`API-1` / `ARCH-3`):**
   - Remove public `?includeAnswers=true` from [`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L10-L18) & [`questions.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts#L33), and protect `/exercises/:exerciseId/solutions` and `/questions/:questionId/solution` with `requireAuth` (plus clear guest UX prompt) or verified session/attempt gating.
2. **Repair Smart Adaptive Quiz End-to-End (`API-2` / `DATA-2` / `UX-2` / `ARCH-4`):**
   - Filter active mistakes in `generateAdaptiveQuizHandler` using `DISTINCT ON (question_id)` latest attempt (`isCorrect = false`) so resolved questions are not re-served forever.
   - Return full structural non-spoiler question shape (`options`, `blanks`, `parts`, `visualContextDescription`, `contextClue`) via `formatQuestion(q, false)` — remove `correctAnswer` from quiz generation output.
   - Replace client-side `normalize()` grading in `AdaptiveQuizModal.tsx` with `QuestionCard`-compatible polymorphic inputs submitting to `POST /api/v1/questions/:questionId/check` (or a batch quiz submission endpoint) so `evaluateQuestion()` grades all `202` multi-blank/multi-part questions and persists `QuestionAttemptItem` records.
   - Refresh `ProgressDashboardPage` / `AdaptiveReviewPanel` stats on modal close.
3. **Repair Mistake Review Multi-Shape Retry (`API-3` / `UX-1`):**
   - Enrich `GET /api/v1/progress/mistakes` to include `options`, `blanks` (non-answer shape), `parts` (non-answer shape), `contextClue`, `hasVisualContext`, and `visualContextDescription`.
   - Upgrade `MistakeReviewPage.tsx` from a single text box to polymorphic inputs matching `QuestionCard`, and trigger `AdaptiveReviewPanel` refresh upon resolving a mistake.
4. **Update Regression & Integration Tests (`TEST-3`):**
   - Align `exercises.api.test.ts` and `adaptive-toeic.api.test.ts` to enforce anti-spoiler rules and test multi-blank/multi-part quiz items + mistake resolution.

**Acceptance Gate:** Unauthenticated requests cannot fetch answers/solutions; missing and retrying any multi-blank (`209`), multi-part (`31`), option (`277`), or visual (`175`) question works and resolves cleanly across Exercises, `/mistakes`, and Smart Quiz.

---

### Phase 2.2 — Curriculum Fidelity, Exercise State & Progress Integrity (P1)
1. **Render 100% of Visual Context & `contextNotes` (`DATA-1` / `UX-3`):**
   - Move `hasVisualContext && visualContextDescription` rendering into `QuestionCard.tsx` (covering `100/175` omitted blanks/options/parts questions and worked examples).
   - Render `activeExercise.contextNotes` (`20` exercises) separately from `visualContextDescription` in `ExerciseViewer.tsx`.
2. **Fix `ExerciseViewer` Tab Isolation & Word Bank Insertion (`UX-4` / `UX-5`):**
   - Scope `checkExerciseAnswers` submissions to `activeExercise.questions` only; store `exerciseScore` per `exerciseId` instead of wiping on tab switch.
   - Wire `onSelectWord` on `<WordBankBar>` in `ExerciseViewer.tsx` to fill the currently focused blank/sentence input.
3. **Fix Unit Progress Toggle & Auto-Completion Semantics (`API-5` / `UX-5`):**
   - Preserve `attempts` when updating unit status in `UnitPage.tsx` (`setUnitProgress(prev => ...)` / return attempts from `PUT /progress/units/:unitNumber`).
   - Compute `allExercisesPassed` using each exercise's **latest** attempt (or respect explicit manual status override timestamp) so manual `Mark as In Progress` is not silently reverted on the next submission.
4. **Surface `answerKeys.notes` & Unify Input Mode Hints (`DATA-4` / `DATA-5`):**
   - Include `answerKey.notes` in `evaluateQuestion` / check responses and emit explicit `inputMode` hints from `formatQuestion` so client renderers and server grading never diverge.

**Acceptance Gate:** Every visual-context exercise/question and `contextNotes` renders accurately; switching tabs or toggling unit completion never drops scores/attempts.

---

### Phase 2.3 — AI Tutor, TOEIC Generator Quality & Backend Scaling (P1/P2)
1. **Fix TOEIC Practice Generator Quality, Bias & Persistence (`API-4` / `UX-6`):**
   - Eliminate hardcoded `correctAnswer: "A"` bias by randomizing option placement in fallback mode, guarantee exact requested `count` (`1..20`), add `source: "ai" | "curated" | "fallback"` metadata + explicit UI notice on fallback, and add server-side TOEIC check/persistence (`toeic_attempts` table or session store) so Roadmap/TOEIC drills feed learner history.
2. **Harden & Cache AI Theory Tutor (`API-7` / `ARCH-5`):**
   - Look up `sectionId` content from PostgreSQL `theory_sections` server-side instead of trusting arbitrary `sourceContent` payloads, add response caching for `(sectionId, normalizedUserQuestion)`, and remove/align dead `generateFallbackExplanation` UI states.
3. **Optimize Adaptive & Progress Queries + Extract Service Layer (`DATA-3` / `ARCH-2` / `API-6`):**
   - Add composite index `(user_id, question_id, created_at DESC)` via forward Prisma migration.
   - Replace full-history NodeJS loops in `adaptive.controller.ts` with SQL aggregates; add optional `status` filter to `GET /api/v1/units` so `CatalogPage` stops fetching `limit=145` client-side.
   - Extract `grading.service.ts`, `adaptive.service.ts`, and `progress.service.ts`.

---

### Phase 2.4 — Automated Verification, Deep-Linking & Polish (P2/P3)
1. **CI Pipeline & Automated Unit/E2E Gates (`TEST-1` / `TEST-2`):**
   - Run all unit suites (including `phase1-7-staging-guard.test.ts` plus new unit tests for `grader.ts`, `formatters.ts`, and `toeic-generator.service.ts`) in GitHub Actions.
   - Add a CI PostgreSQL 18 job running Prisma migrations + test fixture seed + 52+ API integration tests + Playwright E2E smoke tests.
2. **Navigation, i18n & Theory Formatter Polish (`UX-7` / `ARCH-6` / `ARCH-7`):**
   - Support `?tab=exercises&exercise=...` deep-links in `UnitPage.tsx`.
   - Standardize EN/VI copy across pages, audit `FormattedTheoryContent.tsx` regexes across all 542 sections, and plan shared Redis rate-limit store prior to multi-instance scaling.

