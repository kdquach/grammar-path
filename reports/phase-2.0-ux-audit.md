# Phase 2.0 — Learning Experience & UX Audit

**Audit Date:** 2026-11-12  
**Scope:** End-to-end learner flows across Catalog (`/`) -> Theory & Examples (`/units/:n`) -> Exercises -> Mistake Review (`/mistakes`) -> Progress Dashboard (`/progress`) -> Smart Quiz & TOEIC Practice Modals -> TOEIC Roadmap (`/roadmap`).

---

## 1. Learner Journey Walkthrough Findings

### UX-1 — Mistake Review Retry UI Cannot Render Multi-Blank, Multi-Part, Option, or Visual-Context Questions
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - [`MistakeReviewPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L303-L366) hardcodes a single `<input type="text" />` (`retryAnswers[item.questionId]`) for every mistake item regardless of `questionType`, `options`, `blanks`, `parts`, or visual context.
  - Because `GET /api/v1/progress/mistakes` ([`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L334-L367)) omits `options`, `blanks`, `parts`, `contextClue`, and `visualContextDescription`, learners cannot see multiple-choice options, blank structure, sub-part prompts, or visual scenes when retrying mistakes (impacting `209` multi-blank, `31` multi-part, `277` option, and `175` visual-context questions).
  - Additionally, resolving a mistake (`handleRetrySubmit`, lines `149-151`) updates local `resolvedIds` without triggering a refresh of [`AdaptiveReviewPanel`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L445) rendered on the same page.
- **Reproduction Steps:**
  1. Submit a wrong answer to an option question (e.g., `24.1-q1`) or multi-blank question (`1.1-q5`).
  2. Navigate to `/mistakes`. Observe a bare single text box with no options, no blank hints, and stale error counts in the panel below even after resolving the item.
- **Recommended Remediation:** Reuse [`QuestionCard`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L59-L277) (or its polymorphic renderers) inside `MistakeReviewPage` powered by enriched `GET /progress/mistakes` payloads, and refresh `AdaptiveReviewPanel` via a `refreshKey` prop whenever a mistake is resolved.
- **Dependencies & Risks:** Depends on `API-3` (`GET /progress/mistakes` payload enrichment).

### UX-2 — Smart Adaptive Quiz UX Truncates Inputs & Lacks Persistence / Feedback Consistency
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - [`AdaptiveQuizModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L378-L453) only supports either `options` buttons or a single `<input type="text">` (`answers[currentIndex]`), breaking multi-blank (`209`), multi-part (`31`), multi-select, and visual-context (`175`) questions.
  - [`AdaptiveQuizModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L103-L133) grades via naive client-side punctuation stripping (`normalize()`), skipping `acceptedAnswers` alternatives (e.g., `"isn't"` vs `"is not"`) and never persisting attempts to PostgreSQL.
  - Note also [`ProgressDashboardPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ProgressDashboardPage.tsx#L424-L427) does not reload dashboard overview stats when `AdaptiveQuizModal` closes.
- **Reproduction Steps:** Open Smart Quiz from `/progress`, complete 5 questions, close modal -> `Recent Attempts`, `Accuracy`, and `/mistakes` are completely unchanged; alternative valid English contractions are rejected by client `normalize()`.
- **Recommended Remediation:** Render polymorphic question inputs, submit answers to `POST /questions/:id/check` (or batch quiz check) so `evaluateQuestion` runs server-side with full `acceptedAnswers` and attempt persistence, and refresh dashboard/panel metrics on modal close.
- **Dependencies & Risks:** Depends on `API-2` / `DATA-2`.

### UX-3 — Visual Context Descriptions Hidden on 57.1% of Visual Questions & `contextNotes` Dropped Completely
- **Severity:** `High`
- **Status:** `Partial`
- **Evidence:**
  - [`SentenceQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/SentenceQuestionRenderer.tsx#L22-L30) renders `visualContextDescription`, whereas [`OptionQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/OptionQuestionRenderer.tsx#L62-L73), [`FillBlankQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/FillBlankQuestionRenderer.tsx#L30-L95), [`MultiPartQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/MultiPartQuestionRenderer.tsx#L27-L39), and worked examples in [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L115-L174) do not (`100/175` questions missing context).
  - [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L399-L406) renders `visualContextDescription` under heading `"Context Notes"` and ignores `activeExercise.contextNotes` (`20` exercises affected).
- **Recommended Remediation:** Move question-level visual context callout into `QuestionCard` above the polymorphic renderer switch (and inside Worked Examples), and display `activeExercise.contextNotes` cleanly alongside `visualContextDescription` in `ExerciseViewer`.
- **Dependencies & Risks:** Zero API changes needed.

### UX-4 — `ExerciseViewer` Cross-Exercise State Leakage & Tab Reset Quirk
- **Severity:** `Medium`
- **Status:** `Broken`
- **Evidence:**
  - [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L205-L210) submits the entire cross-exercise `answers` state object (`api.checkExerciseAnswers(activeExercise.exerciseId, answers)`) rather than scoping to `activeExercise.questions`.
  - When switching exercise tabs (`lines 330-334`), `setExerciseScore(null)` and `setIsRestoredAttempt(false)` clear the score banner, while `answers` and `results` remain populated across exercises — so switching away from a checked exercise and back loses the score banner yet retains checked per-question feedback cards (and suppresses auto-restore because `hasAnyInput` is true at `lines 153-156`).
- **Reproduction Steps:**
  1. Open a unit with multiple exercises (e.g. Unit 1). Answer & check Exercise 1.1 (score banner displays).
  2. Click Exercise 1.2 tab, then click back to Exercise 1.1. The score banner disappears while individual question answers/feedback remain.
- **Recommended Remediation:** Scope `checkExerciseAnswers` payload strictly to `activeExercise.questions` IDs and track `exerciseScoreByExerciseId` (`Record<string, ScoreSummary>`) so switching between Exercise tabs cleanly preserves per-exercise score summaries and draft answers.
- **Dependencies & Risks:** Low risk; improves multi-exercise reliability in all 145 units.

### UX-5 — Unit Status Toggle Drops Attempt Badges & Word Bank Click-to-Insert Is Unwired
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`UnitPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitPage.tsx#L112-L113) replaces full `unitProgress` (which holds `attempts`) with the `updateUnitProgress` response (`{ unitNumber, title, status, completedAt, lastAccessedAt }`), immediately erasing all exercise attempt badges (`✓ 100%`) and past-attempt restore banners until reload.
  - [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L550-L555) mounts `<WordBankBar>` without passing `onSelectWord` (defined on [`WordBankBar.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/WordBankBar.tsx#L16)), so clicking a word chip only copies to clipboard and toggles strikethrough instead of filling the active input.
- **Recommended Remediation:** Preserve `prev?.attempts ?? []` in `setUnitProgress` inside `UnitPage.tsx` (or call `handleRefreshProgress()`), and wire `onSelectWord` to insert into the last-focused question input in `ExerciseViewer`.
- **Dependencies & Risks:** Low risk; noticeable UX polish for the `172` word-bank exercises.

### UX-6 — TOEIC Practice Fallback Pedagogy, Bias & Progress Disconnect
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L105-L115) checks answers in local state against `"A"`-biased generic fallback questions (`toeic-generator.service.ts:565-781`) for Units 5–145 whenever Gemini is unavailable.
  - Because fallback questions are hardcoded `"A"` and unrelated to the selected unit's grammar, learners clicking `"🎯 Luyện tập thêm dạng đề TOEIC"` from [`ToeicRoadmapPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ToeicRoadmapPage.tsx#L76-L120) or `UnitPage` receive misleading practice if Gemini is not configured.
- **Recommended Remediation:** Display a clear warning banner when `source === "fallback"` (or disable misleading generic items / randomize answer positions), and record TOEIC practice completion metrics if part of the TOEIC Roadmap study loop.
- **Dependencies & Risks:** Depends on `API-4`.

### UX-7 — Inconsistent Bilingual Language (English vs Vietnamese) & `FormattedTheoryContent` Fragility
- **Severity:** `Low`
- **Status:** `Partial`
- **Evidence:**
  - [`CatalogPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/CatalogPage.tsx#L244-L295), [`Sidebar.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/layout/Sidebar.tsx#L264-L372), [`ProgressDashboardPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ProgressDashboardPage.tsx#L139-L169), and [`MistakeReviewPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L191-L200) mix English UI headings/buttons (`"Learning Progress Dashboard"`, `"Review Mistakes"`, `"Show Solution"`) with Vietnamese buttons and labels (`"Lộ trình TOEIC"`, `"⚡ Làm bài Quiz thông minh"`, `"Thu nhỏ"`, `"Chế độ Khách"`).
  - [`FormattedTheoryContent.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/theory/FormattedTheoryContent.tsx#L46-L56) contains Unit-2A-specific regex hacks (`but He drives a bus`, `Drive(s)/[^:]+:`) that could split unexpected strings inconsistently across other units (though the `"Nguyên bản"` Raw button at line `294` provides a safe escape hatch).
- **Recommended Remediation:** Standardize UI chrome copy (or add a clean i18n dictionary / consistent EN-academic + VI-pedagogical convention) and audit `FormattedTheoryContent` block detection against a broader sample of the 542 theory sections.
- **Dependencies & Risks:** Low risk; cosmetic + clarity improvement.

