# Phase 2.0 — Data Access, Schema & Dataset Fidelity Audit

**Audit Date:** 2026-11-12  
**Database Verified (Read-Only):** `grammarpath-staging` (PostgreSQL 18.6, `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech`).  
**Scope:** Canonical dataset completeness vs runtime SQL/Prisma queries, grading edge cases across all 4,414 questions, indexing/performance hotspots, and data-layer integrity.

---

## 1. Live Staging Dataset Quantitative Verification

| Metric | Staging DB Value | Notes / Audit Observation |
|---|---|---|
| Units | **145** | `unit_validation` = `completed` on `145/145`; `unresolved_items` = `0` |
| Theory Sections | **542** | All linked cleanly |
| Textbook Examples | **639** | `0` missing `translation_vi` (`100%` translated) |
| Exercises | **549** | `fill_blank: 361`, `transformation: 113`, `sentence_correction: 29`, `multiple_choice: 25`, `other: 11`, `matching: 6`, `word_formation: 4` |
| Exercises w/ Word Bank | **172** (`1,117` items) | All exposed via `GET /units/:n/exercises` & `GET /exercises/:id` |
| Exercises w/ Visual Context | **29** | All 29 have non-null `visual_context_description` |
| Exercises w/ `context_notes` | **20** | **DATA-1:** Returned by API (`formatters.ts:75`), never rendered in UI |
| Questions (Total / Examples / Interactive) | **4,414** / **661** / **3,753** | `661` worked examples excluded from exercise test grading |
| Questions w/ `options` | **277** | Rendered by `OptionQuestionRenderer` (except split-slash hints) |
| Questions w/ `blanks` (without options) | **2,254** | Includes `209` multi-blank (`> 1` blank) questions |
| Questions w/ `parts` | **31** | Includes `24` with `correctAnswerType = 'array'` (`75` total `question_parts`) |
| Questions w/ plain sentence (`!options && !blanks && !parts`) | **1,882** | Rendered by `SentenceQuestionRenderer` |
| Interactive multi-blank or multi-part (`!isExample`) | **202** | **Broken in Smart Adaptive Quiz & Mistake Review** |
| Questions w/ `correctAnswerType = 'array'` | **55** | All `55` have `blanks` (`24` also have `parts`) and `correctAnswerText = null` |
| Questions w/ Visual Context (`has_visual_context = true`) | **175** | `75` plain sentence, `4` options, `95` blanks-only, `1` parts-only (**100/175 = 57.1% hidden in UI!**) |
| Explanations / Answer Keys | **4,414** / **4,414** | `0` empty `ai_explanation`; `0` unmatched `rule_reference`; **`403`** non-null `answer_keys.notes` |

---

## 2. Detailed Data-Access Findings

### DATA-1 — `exercise.contextNotes` (20 Exercises) & Question-Level Visual Context (100/175 Questions) Omitted in UI
- **Severity:** `High`
- **Status:** `Partial`
- **Evidence:**
  - In [`formatters.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/formatters.ts#L73-L75), `formatExercise` serializes both `visualContextDescription` and `contextNotes`.
  - [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L399-L406) renders ONLY `activeExercise.hasVisualContext && activeExercise.visualContextDescription` (mis-labeled `"Context Notes"`!) and completely ignores `activeExercise.contextNotes` (dropping **`20/20`** exercises that have `contextNotes`).
  - At the question level, only [`SentenceQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/SentenceQuestionRenderer.tsx#L22-L30) renders `question.hasVisualContext && question.visualContextDescription`. [`OptionQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/OptionQuestionRenderer.tsx#L62-L73), [`FillBlankQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/FillBlankQuestionRenderer.tsx#L30-L95), and [`MultiPartQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/MultiPartQuestionRenderer.tsx#L27-L39) omit it, hiding visual descriptions on **`100 / 175` (57.1%)** visual-context questions (`95` blanks, `4` options, `1` parts). Worked-example cards in [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L143-L164) also omit `visualContextDescription`.
- **Reproduction Steps:** Query any visual-context blank exercise (one of the 95 blanks-only questions with `has_visual_context = true`). Notice the visual scene needed to answer the sentence never appears in the browser.
- **Recommended Remediation:** Render `visualContextDescription` once in [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L143-L233) (including worked examples) rather than duplicating it per renderer, and render `activeExercise.contextNotes` separately from `activeExercise.visualContextDescription` in `ExerciseViewer`.
- **Dependencies & Risks:** Zero backend change required — fields are already in API responses.

### DATA-2 — `formatAdaptiveQuestion` Drops Answers & Structure for 202 Multi-Blank/Multi-Part Questions
- **Severity:** `Critical`
- **Status:** `Broken`
- **Evidence:**
  - [`adaptive.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L651-L654) includes `options` and `blanks` (without `acceptedAnswers`), never includes `parts`, `acceptedAnswers`, or `correctAnswerArray`, and outputs `correctAnswer: q.correctAnswerText || (q.blanks?.[0]?.correctAnswerText ?? "")` (lines `708-709`).
  - Staging DB verifies `55` questions have `correctAnswerType = 'array'` (`correctAnswerText = null`) and `202` interactive questions have `>1` blank or `>=1` part. For all `202`, `formatAdaptiveQuestion` drops blanks `#2..N` and all `parts`, making it impossible for a learner to pass them inside [`AdaptiveQuizModal`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L109-L133).
- **Recommended Remediation:** Align Adaptive Quiz formatting and grading with `formatQuestion(q, false)` + `POST /questions/:id/check` (server-side [`evaluateQuestion`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L196-L562)).
- **Dependencies & Risks:** Shared remediation with `API-2`.

### DATA-3 — Unbounded Full-History Queries & Node.js Aggregation in Adaptive Analytics / Recommendations
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`getAdaptiveAnalytics`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L63-L94) and [`getAdaptiveRecommendations`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L329-L355) call `prisma.questionAttemptItem.findMany({ where: { userId }, include: { question: { explanation, exercise: { unit } } } })` with no pagination or SQL `GROUP BY`.
  - [`getProgressOverview`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L39-L122) issues 13 parallel Prisma queries, including two unbounded `groupBy(["questionId"])` calls (`lines 76-83`) and full `learningProgress.findMany` (`lines 106-121`).
  - [`getMistakes`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L334-L367) executes `DISTINCT ON (qai.question_id) ... ORDER BY qai.question_id, qai.created_at DESC`, while [`schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L513-L515) indexes `(user_id, is_correct)` and `(user_id, question_id)`, NOT `(user_id, question_id, created_at DESC)`.
- **Recommended Remediation:**
  1. Add a composite index `@@index([userId, questionId, createdAt(sort: Desc)])` (and/or SQL aggregation) for `question_attempt_items`.
  2. Replace Node-side full-history scans in `adaptive.controller.ts` with PostgreSQL `COUNT` / `GROUP BY` aggregations.
  3. Add shared `resolveUserMistakeQuestionIds` logic so analytics/quiz/mistakes agree on latest vs historical attempt counts (e.g., deciding whether analytics counts all lifetime errors vs unresolved errors clearly).
- **Dependencies & Risks:** Index additions require a forward Prisma migration following Phase 1 migration-safety discipline.

### DATA-4 — Split-Blank Slash Detection Diverges Between Backend Grader & Frontend Card
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L76-L109) checks `!anyOptionMatchesExpected` using top-level `correctAnswerText` and `acceptedAnswers` before classifying a question as split-blank slash hints.
  - [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L11-L21) checks only `options.length > 1 && blanks.length > 1 && options.every(opt.optionText.includes(" / ") && !opt.optionText.includes("..."))` (since answers are hidden when `includeAnswers = false`).
  - Furthermore, [`grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L498-L506) handles `blanks` before or after `parts` cleanly, **except** if a multi-blank question (`Case 3`) has `options` and `blanks` mismatching `options.length === blanks.length` in [`FillBlankQuestionRenderer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/renderers/FillBlankQuestionRenderer.tsx#L66-L71), where `hasPerBlankSlashHints` silently disables the clickable slash choice buttons.
- **Recommended Remediation:** Pre-compute or return an explicit safe UI rendering hint (e.g. `inputMode: "options" | "split_slash_blanks" | "parts" | "blanks" | "sentence"`) from `formatQuestion`, eliminating heuristic drift between server grading and client UI.
- **Dependencies & Risks:** Low risk; improves determinism across all 4,414 questions.

### DATA-5 — `answerKeys.notes` (403 Questions) Hidden After `Check Answer`
- **Severity:** `Low`
- **Status:** `Partial`
- **Evidence:**
  - Staging DB confirms **`403`** `answer_keys` rows carry non-null pedagogical `notes`.
  - [`QuestionFeedbackPanel.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx#L129-L151) displays `answerKey.notes` when the user clicks `Show Solution`, **but** [`checkQuestionAnswer`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts#L279-L288) and [`evaluateQuestion`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L196-L562) do not fetch or return `answerKey.notes`, so checking an answer never surfaces those 403 textbook notes unless the user also clicks `Show Solution`.
- **Recommended Remediation:** Include `answerKey.notes` (and `sourcePages`) in `evaluateQuestion` / check responses when available.
- **Dependencies & Risks:** Trivial additive field.

### DATA-6 — Canonical Dataset Completeness & Referential Integrity Verified Clean
- **Severity:** `Low`
- **Status:** `Implemented`
- **Evidence:** Live SQL audit of `grammarpath-staging` confirms `145/145` units valid, `0` unresolved items, `0/639` missing Vietnamese translations on examples, `0/4,414` empty `ai_explanation`, and `0/4,414` dangling `rule_reference` codes. Canonical JSON and Neon staging import are production-grade.

