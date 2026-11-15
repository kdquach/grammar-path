# GrammarPath — Phase 3.0 Workstream A: Existing System Audit

> **Phase:** 3.0 — Design & Audit Only (Zero source/schema/data modifications)  
> **Date:** 2026-11-13  
> **Scope:** Canonical Dataset (`grammarpath-data`), PostgreSQL/Prisma Schema & Migrations, Backend Services/Controllers, Frontend UI/UX, and Phase 2.2.2 Baseline Carryovers.

---

## Executive Summary

GrammarPath already has a strong transactional foundation across textbook browsing, polymorphic grading, anti-spoiler enforcement, and persisted exercise/TOEIC/mistake flows (Phase 2.2.2 verified 48/48 backend unit tests, 66/66 staging API tests, 65/65 frontend tests, and 3/3 applied migrations with zero staging schema drift).

However, inspecting the actual codebases reveals **seven structural limitations** that prevent Phase 2 telemetry from supporting accurate mastery estimation, explainable recommendations, personalized practice, or comprehensive TOEIC grammar training without targeted Phase 3 remediation:

1. **Unanswered-as-Incorrect Analytics Bug (Critical):** Partial exercise submissions persist omitted questions into `question_attempt_items` with `studentAnswer = null` and `isCorrect = false` ([exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L439-L451)). While [mistakes.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mistakes.service.ts#L50-L53) excludes null answers, both [progress.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L74-L87) and [adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L66-L193) aggregate `QuestionAttemptItem` **without excluding null answers**, artificially inflating error counts and deflating accuracy.
2. **Completion Conflated with Mastery:** `LearningProgress.status = "completed"` can be toggled manually via `PUT /progress/units/:unitNumber` or auto-set once when exercises cross `>= 80%`, and never reverts on subsequent failures ([exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L484-L515)).
3. **Attempt Source & Context Blindness:** `QuestionAttemptItem` cannot distinguish whether an answer came from an initial unit exercise check, a Mistake Review retry, or an Adaptive Quiz submission because all single-item routes write `attemptId = null` without a source discriminator.
4. **Disconnected Practice Modes:** `ToeicPracticeSession` / `ToeicPracticeItem` (added in migration 3) are ignored by all progress, adaptive analytics, and mistake endpoints; `AdaptiveQuizSession` stores `questionIds` and `targetUnits` as opaque JSON blobs without item child rows or completion status; and `AdaptiveQuizModal` ignores user-selected target units.
5. **Missing Concept Taxonomy in Backend/DB:** Although **4,414 / 4,414 (100%)** canonical explanations reference a valid `TheorySection.sectionId` in the same unit, `Explanation.ruleReference` is an un-joined `VarChar(20)` string, 30 intro/comparison `TheorySection`s have zero question links, and all 145-unit TOEIC stage/module/priority mappings live exclusively in frontend-hardcoded [toeicRoadmap.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/data/toeicRoadmap.ts).
6. **TOEIC Content Diversity & AI Validation Gaps:** Curated TOEIC questions cover only Units 1–4 ([toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts)); Units 5–145 rely on unverified Gemini JSON outputs or textbook sentence cloze-to-MCQ transformations; and `generateFallbackExplanation` in [ai.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L42-L145) is dead code while live AI failures throw `503`.
7. **Full-History In-Memory Scans & UI Duplication:** Analytics and mistake services scan full per-user `QuestionAttemptItem` histories on every request, no charting dependency exists, practice modes are trapped inside modals, and `MistakeReviewPage` duplicates `AdaptiveReviewPanel` from `ProgressDashboardPage`.

---

## A1. Canonical Dataset & Prisma / PostgreSQL Audit

### A1.1 Canonical JSON Baseline (`grammarpath-data`)

Direct inspection of `/Users/kd.quach03/Documents/grammarpath-data/data/units/unit-[0-9][0-9][0-9].json` (145 canonical files; excluding `unit-template.json`) and [unit.schema.json](file:///Users/kd.quach03/Documents/grammarpath-data/schemas/unit.schema.json) confirms:

| Entity | Verified Count | Structural Notes |
|---|---:|---|
| Units | 145 | `unit_number` 1..145 (`unit-001.json`..`unit-145.json`) |
| Theory sections | 542 | `section_id` is **globally unique** across all 542 rows (0 duplicates) |
| Theory illustrative examples | 639 | Bilingual English + `translation_vi` |
| Exercises | 549 | 172 contain Word Bank items (1,117 total word bank items) |
| Questions (total) | 4,414 | 3,753 interactive (`is_example: false`), 661 worked examples (`is_example: true`) |
| Answer keys & Explanations | 4,414 / 4,414 | 100% `verified`; **4,414 / 4,414** carry non-null `rule_reference` matching same-unit `section_id` |
| Multi-blank / Multi-part / Visual | 209 / 31 / 175 | Requires structured `blanks[]` / `parts[]` / `options[]` rendering and grading |

Question type distribution in canonical JSON:
- `fill_blank`: 2,974 (2,546 interactive)
- `transformation`: 771 (640 interactive)
- `sentence_correction`: 285 (235 interactive)
- `multiple_choice`: 239 (210 interactive)
- `other`: 64 (51 interactive)
- `word_formation`: 43 (39 interactive)
- `matching`: 38 (32 interactive)

Only **512 / 542** theory sections are referenced by `explanation.rule_reference`; **30 theory sections** (predominantly introductory comparison sections such as `1A`, `5A`, `6A`, `15B`) have zero direct question links.

### A1.2 Prisma Schema & Migrations (`grammarpath-app`)

Inspecting [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma) and the three migrations (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`, `20261113000000_add_practice_sessions`) confirms **29 tables, 5 enums, 31 foreign keys, 21 CHECK constraints, and 48 indexes** (note: line 2 comment in `schema.prisma` inaccurately still says `"22 Tables"`).

#### Table Reuse & Gap Matrix

| Existing Table / Model | Current Role | Phase 3 Reusability | Missing Fields / Constraints / Issues |
|---|---|---|---|
| `Unit`, `TheorySection`, `Exercise`, `Question`, `QuestionOption`, `QuestionBlank`, `QuestionPart`, `AcceptedAnswer`, `AnswerKey` | Canonical textbook catalog & grading | **Reuse as immutable textbook core** (`ContentOrigin` enum already exists) | Keep canonical tables strictly isolated from AI-generated practice items to preserve baseline counts (`4,414` questions). |
| `Explanation` | Stores `aiExplanation`, `ruleReference` (`VarChar(20)`) | **Reuse + extend** | `ruleReference` is a loose string, not an FK to `TheorySection`. Forces repeated secondary lookups by `sectionId` string. |
| `User` | Auth identity (`email`, `passwordHash`, `displayName`) | **Reuse directly** | No explicit `toeicGoalBand` or learner preference fields persisted server-side (currently stored in frontend `localStorage`). |
| `LearningProgress` | Per-`(userId, unitId)` status (`not_started` / `in_progress` / `completed`) | **Reuse strictly for curriculum completion** | Cannot represent mastery, confidence, retention, or regression; allows manual user overrides (`PUT /progress/units/:unitNumber`). |
| `ExerciseAttempt` | Per-exercise submission header (`scorePercentage`, `correctCount`, `totalQuestions`) | **Reuse for textbook exercises** | `totalQuestions` includes all interactive items even on partial submits (`scorePercentage` reflects percentage of whole exercise, not answered-only accuracy). |
| `QuestionAttemptItem` | Item-level attempt log (`attemptId?`, `userId`, `questionId`, `studentAnswer`, `isCorrect`, `createdAt`) | **Reuse + extend** | (1) Skipped partial answers written as `studentAnswer: JsonNull, isCorrect: false`; (2) Missing `attemptStatus` (`correct`/`incorrect`/`unanswered`); (3) Missing `attemptSource` & session FK (`adaptiveSessionId` / `practiceSessionId`); (4) Missing `responseTimeMs`. |
| `AdaptiveQuizSession` | Persists generated adaptive quiz (`targetDifficulty`, `targetUnits` JSON, `questionIds` JSON) | **Reuse or consolidate** | No child item rows, no `status` (`active`/`completed`), no `completedAt`, no `scorePercentage`. |
| `ToeicPracticeSession` & `ToeicPracticeItem` | Persists generated TOEIC sets & per-item checks (`ruleReference`, `studentAnswer`, `isCorrect`, `attemptCount`) | **Reuse + extend** | No session `mode` (`unit_drill`/`mixed`/`timed`/`weak_topics`/`part6_grammar`), no `timeLimitSeconds` / `elapsedSeconds` / `completedAt`, no `conceptId`, overwrites `studentAnswer` in place on retry, and **disconnected from all progress/mastery analytics**. |

### A1.3 Schema Configuration Note
- [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L9-L12) specifies `url = env("DATABASE_URL")` without `directUrl`, whereas [backend/.env.example](file:///Users/kd.quach03/Documents/grammarpath-app/backend/.env.example#L3-L5) documents `DIRECT_URL` and `POOLED_DATABASE_URL`. Any Phase 3 migration on Neon pooled URLs requires either adding `directUrl` or overriding `DATABASE_URL` during `prisma migrate deploy` (already flagged in [phase-2.2.2-production-preflight.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-2.2.2-production-preflight.md#L74-L76)).

---

## A2. Backend Architecture & Logic Audit

### A2.1 Route & Middleware Inventory

Mounted under `/api/v1` ([app.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L45-L46), [routes/index.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/index.ts)):
- **Auth** ([auth.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/auth.routes.ts)): `POST /auth/register`, `POST /auth/login` (`authRateLimiter`), `GET /auth/me` (`requireAuth`).
- **Curriculum** ([units.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/units.routes.ts), [theory.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/theory.routes.ts)): `GET /units`, `/units/:unitNumber`, `/units/:unitNumber/theory`, `/units/:unitNumber/exercises`, `/theory/sections/:sectionId`, plus `GET /book/info` ([book.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/book.controller.ts)).
- **Exercises & Questions** ([exercises.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/exercises.routes.ts), [questions.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/questions.routes.ts)): `POST /exercises/:exerciseId/check` (`optionalAuth`), `GET /exercises/:exerciseId/solutions` (`requireAuth`), `POST /questions/:questionId/check` (`optionalAuth`), `GET /questions/:questionId/solution` (`requireAuth`).
- **Progress & Adaptive** ([progress.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/progress.routes.ts), [adaptive.routes.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/adaptive.routes.ts)): `/progress/overview`, `/progress/mistakes`, `/progress/units/:unitNumber`, `/adaptive/analytics`, `/adaptive/recommendations`, `/adaptive/toeic-practice`, `/adaptive/toeic-practice/check`, `/adaptive/quiz/generate`, `/adaptive/quiz/check`.
- **AI Theory** (`POST /theory/explain-theory`, `requireAuth` + `aiRateLimiter`).

### A2.2 Reusable Services vs Duplicated / Flawed Logic

| Area | Reusable Strengths | Duplication & Architectural Defects |
|---|---|---|
| **Grading & Anti-Spoiler** | [grader.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts) (`evaluateQuestion`, `isEmptyStudentAnswer`) accurately grades options, multi-blank, multi-part, and transformations. `assertNoSpoilerQueryParams` ([exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L23-L44)) and `SOLUTION_LOCKED` attempt gates ([questions.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts#L136-L157)) are solid. | Null-answer handling diverges: `checkQuestionAnswer` rejects empty input with `400`, whereas `checkExerciseAnswers` inserts `studentAnswer: JsonNull, isCorrect: false` for skipped questions ([exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L439-L451)). |
| **Mistake Extraction** | [mistakes.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mistakes.service.ts#L50-L79) (`getLatestUnresolvedMistakes`) properly uses SQL `DISTINCT ON (qai.question_id)` ordered by `created_at DESC, id DESC` and excludes `student_answer IS NULL`. | Does not inspect `ToeicPracticeItem` or future generated practice errors; no concept aggregation; runs raw SQL across all attempts on every call. |
| **Progress & Adaptive Analytics** | Clean Zod validation and idempotency wrapper ([idempotency.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/idempotency.ts)). | **Severe duplication & bug:** [progress.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L74-L87), `getAdaptiveAnalytics` ([adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L66-L193)), and `getAdaptiveRecommendations` ([adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L320-L402)) all run separate full-table `questionAttemptItem.findMany` scans **without filtering `studentAnswer != null`**, misreporting accuracy and error counts whenever a user submits partial exercises. |
| **TOEIC Generator & AI** | [gemini.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/lib/gemini.ts) handles API-key header isolation, 15s timeouts, model fallback chain, and 60s circuit breaker cleanly. | [toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts) (1,556 lines) only has curated TOEIC items for **Units 1–4**; Units 5–145 rely on unverified Gemini JSON (only checks string presence + 4 options + A–D key—no rule alignment, distractor plausibility, or single-correct-answer validation) or deterministic cloze conversion (`buildUnitGroundedDynamicQuestions`, full 5-item coverage on 145/145 units, dropping to 142/145 at 10 items and 127/145 at 20). [ai.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L42-L145) leaves `generateFallbackExplanation` unreachable. |
| **Rate Limiting & Idempotency** | Keyed safely via IPv4/IPv6-normalized `req.ip` and `user:${id}`. | [rate-limit.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts) uses in-process `MemoryStore` and `idempotency.ts` uses an in-memory `Map` (2.5s TTL)—insufficient for multi-instance deployment. |

---

## A3. Frontend Architecture & UX Audit

### A3.1 Current Navigation & Routes ([App.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/App.tsx), [Sidebar.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/layout/Sidebar.tsx))

- **4 top-level routes** + 1 detail route:
  - `/` (`CatalogPage` — Textbook Unit Grid)
  - `/roadmap` (`ToeicRoadmapPage` — 5-Stage TOEIC Roadmap)
  - `/progress` (`ProgressDashboardPage` — Progress & Adaptive Review)
  - `/mistakes` (`MistakeReviewPage` — Mistake Review + embedded `AdaptiveReviewPanel`)
  - `/units/:unitNumber` (`UnitPage` — Theory + Exercises + RuleReferenceModal + TOEIC Modal)
- **No dedicated routes** for Personalized Practice (`/practice`) or TOEIC Grammar Training (`/toeic`). Both `AdaptiveQuizModal` and `ToeicPracticeModal` are transient modals.

### A3.2 Reusable Components vs UX Gaps

- **Reusable strengths:** `QuestionCard` (polymorphic support for `OptionQuestionRenderer`, `MultiPartQuestionRenderer`, `FillBlankQuestionRenderer`, `SentenceQuestionRenderer`), `QuestionFeedbackPanel` (handles `correct`, `incorrect`, `unanswered`, `revealed`), `RuleReferenceModal`, `TheoryViewer`, `ExerciseViewer`, `AuthModal`, `AppLayout`, `Sidebar`.
- **UX Inconsistencies & Gaps:**
  1. **Domain Data Trapped in Frontend:** [toeicRoadmap.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/data/toeicRoadmap.ts) embeds all 145 units across 5 stages, 16 modules, `priority` (`core`: 73, `recommended`: 55, `advanced`: 17), `toeicTag`, and `toeicParts` (even containing inconsistent labels: `"Listening Part 2"` x1, `"Reading Part 5"` x1 alongside `"Part 1"`..`"Part 7"`). The backend has zero access to this taxonomy.
  2. **Duplicated Analytics Panel:** [MistakeReviewPage.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx) embeds `<AdaptiveReviewPanel />` underneath the mistake list, duplicating the exact same weak-unit/recommendation view shown on `ProgressDashboardPage`.
  3. **Broken Modal Wiring:** [AdaptiveQuizModal.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx) accepts `targetUnitNumbers` / weak unit selections but calls `api.generateAdaptiveQuiz(5, selectedDifficulty)` without passing `targetUnits` cleanly in every path, and offers no session resumption if closed mid-quiz.
  4. **Missing Visualizations & Charting Stack:** [frontend/package.json](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/package.json) includes React 18, React Router 6, Lucide icons, and TailwindCSS 3.4 — **no charting library** is installed. `ProgressDashboardPage` shows only static KPI counters, plain progress bars, and recent attempt rows.
  5. **Mixed Language Surface:** Textbook headings/buttons are mostly English while TOEIC Roadmap, AI tutor, and adaptive recommendation strings are Vietnamese (some backend controller messages are English while `adaptive.controller.ts` recommendations and `toeic-generator.service.ts` explanations are Vietnamese).

---

## A4. Summary of Existing Limitations Against Phase 3 Objectives

| Phase 3 Requirement | Current System Status | Concrete Blocker / Gap |
|---|---|---|
| Accurate concept-level analytics | **Blocked** | Null-answer partial submissions pollute `question_attempt_items` analytics; `ToeicPracticeItem` ignored; no `GrammarConcept` table or `Explanation -> TheorySection` FK. |
| Distinguish completion vs mastery vs retention | **Not Supported** | `LearningProgress.status` is binary/sticky completion + manual override; no distinct-item weighting, decay/retention, confidence thresholds, or historical snapshots. |
| Explainable recommendations | **Minimal / Fragile** | Rule-based text strings in `adaptive.controller.ts` only inspect `QuestionAttemptItem` error counts (including unanswered rows) without evidence confidence, expected outcome, or due review state. |
| Reliable personalized practice | **Partial** | `AdaptiveQuizModal` only pulls existing textbook questions without generating targeted variants, concept balance, or tracking session completion cleanly. |
| Diverse TOEIC grammar training | **Partial** | Only Part 5-style single-unit 5-item drills exist; curated content exists for Units 1–4 only; no timed mode, mixed Part 5 mode, weak-topic drill, Part 6 grammar passage mode, or TOEIC pace/category analytics. |

### Phase 2.2.2 Production Carryovers (Audit Note)
Per [phase-2.2.2-final-report.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-2.2.2-final-report.md) and [phase-2.2.2-production-preflight.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-2.2.2-production-preflight.md), staging is clean (`3/3` migrations, `145` units, `4,414` questions), while **production** deployment still carries pending operational prerequisites: applying `20261113000000_add_practice_sessions`, verifying Unit 110 canonical DB parity in production, configuring `TRUST_PROXY` / `CORS_ORIGIN` / `JWT_SECRET`, and confirming single-instance vs Redis rate-limiter topology.

