# Phase 2.0 — API Contract, Auth & Reliability Audit

**Audit Date:** 2026-11-12  
**Scope:** Every endpoint registered under [`/api/v1`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/index.ts#L1-L26), Zod validation, authentication/authorization guards, rate limiting, error handling, and response contracts vs docs (`docs/phase-5-api-specification.md`, `docs/phase-7-auth-progress-api.md`, `docs/phase-9-adaptive-ai-specification.md`).

---

## 1. Endpoint Inventory & Auth Matrix

| Method & Path | Auth Guard | Rate Limit | Input Validation | Spec Alignment / Issues |
|---|---|---|---|---|
| `GET /health` | Public | None | None | [`health.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/health.controller.ts#L5-L25) — OK |
| `GET /book` | Public | None | None | [`book.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/book.controller.ts#L6-L52) — OK |
| `GET /units` | Public | None | `getUnitsQuerySchema` | [`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts#L8-L27) — Missing `status` filter |
| `GET /units/:unitNumber` | Public | None | `unitNumberParamSchema` | [`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts#L149-L217) — OK |
| `GET /units/:unitNumber/theory` | Public | None | `unitNumberParamSchema` | [`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts#L219-L290) — OK |
| `GET /theory/sections/:sectionId` | Public | None | `sectionIdParamSchema` | [`theory.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/theory.controller.ts#L15-L105) — OK |
| `GET /units/:unitNumber/exercises` | Public | None | `unitNumberParamSchema`, `includeAnswers` | **API-1 (`Critical`)**: Public `?includeAnswers=true` spoiler leak |
| `GET /exercises/:exerciseId` | Public | None | `exerciseIdParamSchema`, `includeAnswers` | **API-1 (`Critical`)**: Public `?includeAnswers=true` spoiler leak |
| `GET /exercises/:exerciseId/solutions` | Public | None | `exerciseIdParamSchema` | **API-1 (`Critical`)**: Unauthenticated full answer-key dump |
| `POST /exercises/:exerciseId/check` | `optionalAuth` | None | `checkExerciseBodySchema` | **API-5 (`Medium`)**: Unit auto-complete overrides manual demotion |
| `GET /questions/:questionId` | Public | None | `questionIdParamSchema`, `includeAnswers` | **API-1 (`Critical`)**: Public `?includeAnswers=true` spoiler leak |
| `GET /questions/:questionId/solution` | Public | None | `questionIdParamSchema` | **API-1 (`Critical`)**: Unauthenticated solution dump |
| `POST /questions/:questionId/check` | `optionalAuth` | None | `checkQuestionBodySchema` | [`questions.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts#L171-L292) — OK |
| `POST /auth/register` | Public | `authRateLimiter` | `registerBodySchema` | [`auth.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/auth.controller.ts#L27-L70) — OK |
| `POST /auth/login` | Public | `authRateLimiter` | `loginBodySchema` | [`auth.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/auth.controller.ts#L72-L112) — OK |
| `GET /auth/me` | `requireAuth` | None | Bearer JWT | [`auth.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/auth.controller.ts#L114-L142) — OK |
| `GET /progress/overview` | `requireAuth` | None | None | [`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L31-L183) — 13 parallel queries |
| `GET /progress/mistakes` | `requireAuth` | None | None | **API-3 (`High`)**: Omits `options`, `blanks`, `parts`, visual context |
| `GET /progress/units/:unitNumber` | `requireAuth` | None | `unitNumberParamSchema` | [`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L238-L324) — OK |
| `PUT /progress/units/:unitNumber` | `requireAuth` | None | `updateProgressBodySchema` | **API-5 (`Medium`)**: Response omits `attempts`; wiped on client |
| `POST /theory/explain-theory` | `requireAuth` | `aiRateLimiter` | `explainTheorySchema` | **API-7 (`Medium`)**: Accepts arbitrary `sourceContent` from client |
| `GET /adaptive/analytics` | `requireAuth` | None | None | **DATA-3 (`Medium`)**: Unbounded full-history fetch |
| `GET /adaptive/recommendations` | `requireAuth` | None | None | **DATA-3 (`Medium`)**: Unbounded full-history fetch |
| `POST /adaptive/toeic-practice` | `requireAuth` | `aiRateLimiter` | `toeicPracticeSchema` | **API-4 (`High`)**: Fallback `"A"` bias + count cap + no grading/persistence |
| `POST /adaptive/quiz/generate` | `requireAuth` | `aiRateLimiter` | `generateQuizSchema` | **API-2 (`Critical`)**: Leaks `correctAnswer`, truncates blanks/parts, targets resolved items |

---

## 2. Detailed API Findings

### API-1 — Public Answer-Key Scraping & Anti-Spoiler Bypass
- **Severity:** `Critical`
- **Status:** `Broken`
- **Evidence:**
  - [`exercises.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/exercises.routes.ts#L11-L13) and [`questions.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/questions.routes.ts#L11-L13) leave `GET /exercises/:exerciseId/solutions`, `GET /questions/:questionId/solution`, and `?includeAnswers=true` ([`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L10-L18)) completely unauthenticated.
  - Anyone can iterate `1..145` or `1.1..145.4` anonymously to extract all 4,414 canonical answer keys and Vietnamese explanations.
- **Reproduction Steps:**
  1. `curl -s http://localhost:3001/api/v1/units/1/exercises?includeAnswers=true` without an `Authorization` header.
  2. Observe `correctAnswerText` and `acceptedAnswers` returned in HTTP `200`.
- **Recommended Remediation:** Remove or auth-protect `?includeAnswers=true` (for curriculum browsing, the frontend always passes `false` at [`ExerciseViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/ExerciseViewer.tsx#L90)), and enforce `requireAuth` (or guest session gating + rate limiting) on `/solutions` and `/solution`.
- **Dependencies & Risks:** [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts#L70-L88) explicitly tests `?includeAnswers=true` without auth and must be updated alongside policy change.

### API-2 — `POST /api/v1/adaptive/quiz/generate` Corrupts Complex Answers, Leaks Solutions, and Ignores Resolution State
- **Severity:** `Critical`
- **Status:** `Broken`
- **Evidence:**
  - [`formatAdaptiveQuestion`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L693-L714) omits `parts`, `acceptedAnswers`, `correctAnswerArray`, `hasVisualContext`, and `visualContextDescription`, and computes:
    `correctAnswer: q.correctAnswerText || (q.blanks?.[0]?.correctAnswerText ?? "")` (lines `708-709`).
  - In staging PostgreSQL, **`202`** interactive questions have `blanks > 1` or `parts > 0`, and **`55`** questions have `correctAnswerType = 'array'` (`correctAnswerText = null`). All 202 questions lose all answers beyond blank #1 and drop all `acceptedAnswers` alternatives!
  - [`adaptive.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L641-L666) queries `questionAttemptItem.findMany({ where: { userId, isCorrect: false } })` rather than filtering to questions whose **latest** attempt is `false`.
- **Reproduction Steps:**
  1. Miss a multi-blank question (e.g., `1.1-q5`), then answer it correctly via `POST /api/v1/questions/1.1-q5/check`.
  2. Call `POST /api/v1/adaptive/quiz/generate`. Notice `1.1-q5` is still prioritized as an active mistake, and `correctAnswer` contains only `blank[0]`.
- **Recommended Remediation:** Reuse `DISTINCT ON (question_id)` latest-state logic from `getMistakes`, return full non-spoiler question shape (`options`, `blanks` without answers, `parts` without answers, visual context), strip `correctAnswer` from quiz generation, and grade via `POST /api/v1/questions/:questionId/check` or a dedicated `POST /api/v1/adaptive/quiz/check` endpoint using `evaluateQuestion`.
- **Dependencies & Risks:** Coordinated frontend update needed in [`AdaptiveQuizModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L98-L453) and contract updates in [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts) / [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts).

### API-3 — `GET /api/v1/progress/mistakes` Payload Missing Interactive Question Structure
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - [`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L334-L367) returns only flat fields (`questionId`, `questionContent`, `questionType`, `exerciseId`, `exerciseNumber`, `unitNumber`, `unitTitle`, `lastStudentAnswer`, `lastAttemptedAt`).
  - It omits `options`, `blanks` (count/indices), `parts`, `contextClue`, `hasVisualContext`, and `visualContextDescription`.
- **Reproduction Steps:** Miss an option, multi-blank, multi-part, or visual-context question, then load `GET /api/v1/progress/mistakes` or `/mistakes` page. None of the structural renderers can run.
- **Recommended Remediation:** Enrich `getMistakes` (by fetching matching question IDs via Prisma and formatting with `formatQuestion(q, false)` plus `lastStudentAnswer` and `lastAttemptedAt`) so [`MistakeReviewPage`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L303-L367) can mount the exact same polymorphic renderers as `QuestionCard`.
- **Dependencies & Risks:** Preserves existing top-level fields (`MistakeItem`) as a backward-compatible superset.

### API-4 — `POST /api/v1/adaptive/toeic-practice` Fallback Defects & Count Truncation
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - [`toeicPracticeSchema`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L542-L550) accepts `count` `1..20`, yet [`generateDynamicFallbackToeicQuestions`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L538-L795) only populates `5` items for `easy`/`hard` and `6` for `medium`. Asking for `count=10` without Gemini silently returns `5` or `6`.
  - Curated question banks exist solely for Units `1..4`. All fallback items across `easy`/`medium`/`hard` (16/16 questions, lines `565-781`) have **`correctAnswer: "A"`** (`100%` answer-key bias) and reuse generic passive/inversion/subjunctive templates unrelated to the unit's actual grammar (e.g., Unit 121 Prepositions gets `"recommend that ... take"`).
  - Returns `correctAnswer` in the payload with no server-side grading or persistence.
- **Reproduction Steps:**
  1. Without `GEMINI_API_KEY`, call `POST /api/v1/adaptive/toeic-practice` with `{ "unitNumber": 25, "count": 10, "difficulty": "medium" }`.
  2. Receive only `6` items, all with `correctAnswer === "A"` and generic template prompts.
- **Recommended Remediation:** Shuffle options when constructing fallback items (eliminating `"A"` bias), cycle/expand unit-aware or textbook-example-derived templates when `count > 6`, surface generation `source: "ai" | "curated" | "fallback"` in response metadata, and support server-side answer checking & attempt storage.
- **Dependencies & Risks:** [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) expects deterministic `toeic-practice` payloads when `GEMINI_API_KEY` is absent; response additions should be additive.

### API-5 — Progress State Conflict Between Manual Update and Automatic Completion
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L405-L423) computes `allExercisesPassed` across **all historical attempts** (`userAttempts.some((ua) => ua.scorePercentage >= 80)`). If a user previously achieved `>= 80%` on all exercises and manually sets the unit back to `"in_progress"` via `PUT /progress/units/:unitNumber`, submitting any single exercise (even with `0%`) immediately promotes the unit back to `"completed"`.
  - Conversely, [`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L226-L232) returns `{ unitNumber, title, status, completedAt, lastAccessedAt }` without `attempts`, and [`UnitPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitPage.tsx#L112-L113) calls `setUnitProgress(updated)`, wiping `unitProgress.attempts` in client memory!
- **Reproduction Steps:**
  1. Complete all exercises in a unit with `>=80%`, then click `Mark as In Progress` in [`UnitPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitPage.tsx#L213-L228).
  2. Observe exercise score badges (`✓ 100%`) immediately vanish from `ExerciseViewer` until page reload.
  3. Re-submit one exercise with `0%` -> unit snaps back to `completed`.
- **Recommended Remediation:** Merge `updated` fields into `unitProgress` (preserving `attempts`) on the client (and/or return `attempts` from `PUT /progress/units/:unitNumber`), and evaluate unit auto-completion against the **latest attempt per exercise** rather than any historical attempt.
- **Dependencies & Risks:** Clarifies semantics for re-practicing completed units.

### API-6 — `GET /api/v1/units` Lacks Server-Side Progress Status Filter
- **Severity:** `Medium`
- **Status:** `Missing`
- **Evidence:** [`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts#L8-L15) accepts `page`, `limit`, `search`, `fromUnit`, `toUnit`, forcing [`CatalogPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/CatalogPage.tsx#L65-L67) to request `limit=145` and paginate in-memory whenever a status filter is selected.
- **Recommended Remediation:** Add optional authenticated `status` filtering on `GET /api/v1/units` (using `optionalAuth`) so server-side pagination works cleanly.
- **Dependencies & Risks:** Backward compatible when `status` is omitted.

### API-7 — `POST /api/v1/theory/explain-theory` Trusts Client-Supplied Textbook Text
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:** [`ai.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L7-L28) accepts `sectionId`, `heading`, and `sourceContent` directly from `req.body` (up to `12,000` chars) without checking DB `theory_sections` or caching results. Any authenticated user can submit arbitrary text inside `sourceContent` as a generic Gemini prompt proxy.
- **Recommended Remediation:** Look up `heading` and `sourceContent` by `sectionId` from `prisma.theorySection` server-side (retaining backward-compatible optional fields if needed for tests) and cache repeated `(sectionId, normalizedUserQuestion)` explanations.
- **Dependencies & Risks:** [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts) tests validation of `explainTheorySchema`; lookup fallback should not break schema tests.

### API-8 — Global Error Handling & Zod Envelope Consistency
- **Severity:** `Low`
- **Status:** `Implemented`
- **Evidence:** [`error-handler.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/error-handler.ts) catches `ZodError`, `AppError`, and malformed JSON (`SyntaxError`), emitting `{ success: false, error: { code, message, details? } }` cleanly without leaking stack traces in production.
- **Recommended Remediation:** Keep intact; ensure future routes pass all errors via `next(error)`.

