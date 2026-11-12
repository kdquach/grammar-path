# Phase 2.0 — Architecture Audit (`grammarpath-app` & `grammarpath-data`)

**Audit Date:** 2026-11-12  
**Scope:** End-to-end repository structure, frontend routing, backend layering, authentication/authorization, rate limiting, Prisma schema synchronization, and dual-repo deployment boundaries.  
**Audit Method:** Static code inspection across `grammarpath-app` and `grammarpath-data`, combined with offline typechecks/unit tests and read-only verification against `grammarpath-staging` (PostgreSQL 18.6).

---

## 1. System Topology Summary

GrammarPath spans two repositories sharing one canonical PostgreSQL database (`grammarpath` / `grammarpath-staging`):

| Layer | Repository / Location | Technology | Verified Role |
|---|---|---|---|
| Data Pipeline & Importer | `grammarpath-data` (`scripts/`, `prisma/schema.prisma`, `data/`) | Python, TypeScript/Prisma | Extracts canonical 145 units (4,414 questions) and imports them into PostgreSQL (`22` core curriculum tables). |
| Backend API | `grammarpath-app/backend` ([`app.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L1-L60)) | Node.js, Express, TypeScript, Prisma 6.19.3, Zod, JWT, Gemini SDK | Serves REST API under `/api/v1` across 26 tables and 5 enums. |
| Frontend SPA | `grammarpath-app/frontend` ([`App.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/App.tsx#L1-L33)) | React 19, TypeScript, Vite, Tailwind CSS, React Router | Renders 5 main routes (`/` catalog, `/roadmap`, `/units/:unitNumber`, `/progress`, `/mistakes`) inside [`AppLayout`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/layout/AppLayout.tsx#L14-L186). |

### Verified Baseline Checks (2026-11-12, Read-Only)
- **Backend Typecheck:** `npm run typecheck` — **PASS** (`0` errors).
- **Backend Offline Unit Tests:** `npm run test:unit` — **PASS** (`3/3` files, `36/36` tests).
- **Frontend Typecheck & Tests:** `npm run typecheck` (**PASS**), `npm test` — **PASS** (`9/9` files, `56/56` tests).
- **Staging DB Baseline:** 145 units, 549 exercises, 4,414 questions, 542 theory sections, 639 textbook examples, 4,414 answer keys, 4,414 explanations, `0` failed validations, `0` unresolved items, `0` users.

---

## 2. Architectural Findings

### ARCH-1 — Two-Repository Prisma Schema Split (22 vs 26 Models)
- **Severity:** `High`
- **Status:** `Partial`
- **Evidence:**
  - `grammarpath-data` defines only 22 curriculum tables + 4 enums in [data schema](file:///Users/kd.quach03/Documents/grammarpath-data/prisma/schema.prisma#L1-L435) and omits `LearningStatus`, `User`, `LearningProgress`, `ExerciseAttempt`, and `QuestionAttemptItem`.
  - `grammarpath-app` defines all 26 tables + 5 enums in [app schema](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L447-L516), adding [`20261106000000_add_user_progress_tables`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations).
  - Canonical import inside `grammarpath-data` uses its own schema without awareness of user attempt tables.
- **Reproduction Steps:**
  1. Compare [`grammarpath-data/prisma/schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-data/prisma/schema.prisma#L45-L60) with [`grammarpath-app/backend/prisma/schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L45-L60).
  2. Notice `LearningStatus` (`learning_status_enum`) and user progress models exist only in `grammarpath-app`.
- **Recommended Remediation:** Establish `grammarpath-app/backend/prisma/` as the single DDL/migration owner, and ensure `grammarpath-data` never runs `prisma db push` or destructive resets against shared databases (already guarded by Phase 1.7 staging checks, should remain codified in CI/runbooks).
- **Dependencies & Risks:** High risk of unintended column/table drops if any Prisma schema push were ever executed from `grammarpath-data`.

### ARCH-2 — Missing Service / Repository Layer Across 9 of 10 Controllers
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - Only TOEIC question generation uses a dedicated service ([`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L800-L941)).
  - Core business logic, aggregation, grading, and persistence transactions live directly inside Express controllers: [`adaptive.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L54-L830) (830 lines), [`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L43-L469), [`progress.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L31-L375), [`questions.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts#L26-L292), [`units.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/units.controller.ts#L37-L290), [`auth.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/auth.controller.ts#L27-L142), [`ai.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L102-L181), [`theory.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/theory.controller.ts#L15-L105), and [`book.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/book.controller.ts#L6-L52).
- **Reproduction Steps:** Inspect directory structure of `backend/src/services/` — only `toeic-generator.service.ts` exists.
- **Recommended Remediation:** Extract domain services incrementally (`grading.service.ts`, `adaptive.service.ts`, `progress.service.ts`) so business rules can be unit-tested independently of HTTP request/response mocking and reused between regular exercises, Mistake Review, and Adaptive Quiz.
- **Dependencies & Risks:** Tight coupling between HTTP handlers and Prisma complicates unit testing and leads to duplicated mistake/formatting queries (`getMistakes` vs `generateAdaptiveQuizHandler`).

### ARCH-3 — Unauthenticated Answer & Solution Endpoints (Anti-Spoiler Architecture Gap)
- **Severity:** `Critical`
- **Status:** `Broken`
- **Evidence:**
  - [`exercises.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/exercises.routes.ts#L11-L13) and [`questions.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/questions.routes.ts#L11-L13) expose `/exercises/:exerciseId/solutions`, `/questions/:questionId/solution`, and `?includeAnswers=true` with zero authentication middleware and zero prior-attempt check.
  - [`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L10-L18) and [`formatters.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/formatters.ts#L54-L61) return full canonical answer keys (`correctAnswerText`, `acceptedAnswers`, blank/part solutions) to any anonymous caller passing `?includeAnswers=true`.
- **Reproduction Steps:**
  1. Send unauthenticated `GET /api/v1/exercises/1.1/solutions` or `GET /api/v1/exercises/1.1?includeAnswers=true`.
  2. Observe HTTP `200` returning all canonical answers and Vietnamese explanations without authentication or submission.
- **Recommended Remediation:** Decide and enforce an explicit product policy: (a) gate solution reveal and `?includeAnswers=true` behind `requireAuth` (or remove `?includeAnswers=true` from public curriculum endpoints) plus optional rate limiting/attempt tracking, and (b) update [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts#L70-L88) to reflect the enforced policy rather than asserting unauthenticated answer scraping.
- **Dependencies & Risks:** Changing `?includeAnswers=true` or `/solution(s)` auth requires updating existing Phase 5/6 contract tests and ensuring guest mode UX explicitly documents whether "Show Solution" is permitted for guests.

### ARCH-4 — Client-Side Grading & Missing Server Persistence in Adaptive Quiz and TOEIC Practice
- **Severity:** `High`
- **Status:** `Broken`
- **Evidence:**
  - `POST /api/v1/adaptive/quiz/generate` embeds `correctAnswer` directly in the API response ([`adaptive.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L708-L709)) and [`AdaptiveQuizModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L103-L133) grades purely in-browser via string stripping without calling `POST /api/v1/questions/:questionId/check` or recording a `QuestionAttemptItem`.
  - `POST /api/v1/adaptive/toeic-practice` returns `correctAnswer` for every generated question ([`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L574-L920)) and [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L105-L115) checks answers in local React state with zero DB persistence.
- **Reproduction Steps:**
  1. Complete a 5-question Smart Quiz in [`AdaptiveQuizModal`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx#L109-L133).
  2. Inspect network tab: zero calls to `/questions/:id/check` or any quiz-submit endpoint; `/mistakes` and `/progress` remain unchanged.
- **Recommended Remediation:** Strip `correctAnswer` from quiz-generation responses and evaluate quiz answers server-side via `evaluateQuestion()` (persisting `QuestionAttemptItem` and optionally `AdaptiveQuizSession` / `ToeicAttempt` tables).
- **Dependencies & Risks:** Server-side grading requires new or reused grading endpoints and database migrations if standalone TOEIC/Adaptive quiz sessions should appear in dashboard history.

### ARCH-5 — AI Provider Fallback Policy Inconsistency & Dead Code
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`ai.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L127-L148) fails closed with `503 AI_PROVIDER_UNAVAILABLE` whenever Gemini is unavailable, leaving [`generateFallbackExplanation`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts#L42-L97) unreachable in live runtime (though tested as a standalone helper in [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts#L137-L149)).
  - Meanwhile [`TheoryViewer.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/theory/TheoryViewer.tsx#L278-L288) still maintains UI branching for `aiSource === "fallback"` ("Tóm tắt ngoại tuyến").
  - Conversely, [`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L811-L819) silently returns HTTP `200` with template questions whenever `GEMINI_API_KEY` is missing or errors occur ([lines 923-940](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L923-L940)).
- **Recommended Remediation:** Unify and document the AI degradation contract across both AI features; surface an explicit `source` / `isFallback` flag on TOEIC practice responses so learners know when they are seeing offline fallback items vs AI-generated items, and remove or intentionally wire `generateFallbackExplanation`.
- **Dependencies & Risks:** Silent fallback in TOEIC masks Gemini outages/quota exhaustion while serving repetitive templates.

### ARCH-6 — Process-Local Rate Limiting (`MemoryStore`) & Auth Transport Hardening
- **Severity:** `Medium`
- **Status:** `Implemented` (documented single-instance constraint)
- **Evidence:**
  - [`app.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L12-L44) correctly configures bounded `trust proxy`, `helmet()`, strict `cors` allowlist, and bounded JSON/URL-encoded body parsers.
  - [`rate-limit.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts#L21-L91) explicitly documents that `MemoryStore` is process-local and will not share counters across horizontal workers or serverless invocations.
  - [`client.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/api/client.ts#L30-L50) stores JWT in `localStorage` (`grammarpath_token`) and handles `401 UNAUTHORIZED` globally via `authEvents`.
- **Recommended Remediation:** Adopt a shared Redis/Upstash store before deploying multiple backend replicas/serverless workers, and validate whether XSS-hardened HttpOnly cookies are desired post-MVP.
- **Dependencies & Risks:** Multi-instance deployment with `MemoryStore` allows `N * limit` AI/auth requests across `N` workers.

### ARCH-7 — Frontend State Coupling & Navigation Flow
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`App.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/App.tsx#L17-L26) defines 5 routes (`/`, `/roadmap`, `/units/:unitNumber`, `/progress`, `/mistakes`) and redirects unknown routes (`*`) silently to `/`.
  - Authenticated pages (`/progress`, `/mistakes`) render full-page guest banners instead of route guards, which is friendly for discovery, but deep links to specific exercises (`/units/:unitNumber?exercise=1.2` or `?tab=exercises`) are unsupported ([`UnitPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/UnitPage.tsx#L41) defaults `activeTab` to `"theory"`).
- **Recommended Remediation:** Support URL search params (`?tab=exercises&exercise=1.2`) so Mistake Review and Adaptive Recommendations can link directly to the relevant exercise/section.
- **Dependencies & Risks:** Low risk; improves deep-linking from dashboard and mistake cards.

