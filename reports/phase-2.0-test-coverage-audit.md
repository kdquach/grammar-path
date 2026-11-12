# Phase 2.0 — Test Coverage & CI Verification Audit

**Audit Date:** 2026-11-12  
**Execution Baseline (Verified 2026-11-12):**
- Backend unit suite (`npm run test:unit`): **36/36 PASS** (`3` files)
- Frontend component/unit suite (`npm test`): **56/56 PASS** (`9` files)
- Backend API integration suite (`tests/*.api.test.ts`, verified in Phase 1.9 against `grammarpath-staging`): **52/52 PASS** (`6` files)

---

## 1. Suite-by-Suite Inventory

### Backend (`grammarpath-app/backend/tests/`)
| File | Mode | Tests | What Is Covered | Critical Blind Spots |
|---|---|---|---|---|
| [`phase1-security-hardening.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase1-security-hardening.test.ts) | Unit (Offline) | 22 | JWT startup fail-fast, auth routes, CORS allowlist, body limit, error handler sanitization | Does not test `authRateLimiter` or `aiRateLimiter` trigger thresholds directly |
| [`phase1-6-hygiene.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase1-6-hygiene.test.ts) | Unit (Offline) | 8 | `TRUST_PROXY` parsing (`false`, `1..10`, rejects `true`/invalid), IP extraction, `ai.controller` fail-closed `503` | — |
| [`phase1-7-staging-guard.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase1-7-staging-guard.test.ts) | Unit (Offline) | 6 | `assertSafeDatabaseUrl`, `.env.staging` isolation, migration preflight guard | **Not executed in GitHub Actions CI** ([`ci.yml`](file:///Users/kd.quach03/Documents/grammarpath-app/.github/workflows/ci.yml#L57)) |
| [`curriculum.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/curriculum.api.test.ts) | API (Staging DB) | 9 | `/health`, `/book`, `/units`, `/units/:n`, `/units/:n/theory`, `/theory/sections/:id` | Does not verify `contextNotes` or all 145 units |
| [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts) | API (Staging DB) | 8 | Exercises list, `?includeAnswers=true`, `/solutions`, `/questions/:id`, `/solution` | Explicitly validates unauthenticated `?includeAnswers=true` & `/solutions` (contradicts anti-spoiler security goal) |
| [`grading.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/grading.api.test.ts) | API (Staging DB) | 11 | Single/exercise checks across selected sample questions (`1.1`, `1.2`, `32.1`, `86.4`, `98.2`, `110`) | No dedicated unit suite exercising `grader.ts` edge cases offline (`parseCompoundOptionKeys`, `array` answer types, etc.) |
| [`auth-and-progress.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/auth-and-progress.api.test.ts) | API (Staging DB) | 7 | Register, Login, `/auth/me`, attempt saving, `/progress/overview`, `/mistakes`, manual status | Does not test `>=80%` auto-complete overriding manual `in_progress`, nor rate limits |
| [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts) | API (Staging DB) | 7 | AI Zod validation, `generateFallbackExplanation` helper, `/adaptive/analytics`, `/adaptive/recommendations` | Tests dead-code `generateFallbackExplanation` instead of live `/theory/explain-theory` handler (`503`/Gemini mock) |
| [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) | API (Staging DB) | 10 | `/adaptive/toeic-practice` & `/adaptive/quiz/generate` shape, auth, difficulty tiers | Does NOT test multi-blank/multi-part quiz questions (`202` broken questions), `"A"` answer-key bias, or `count > 6` fallback truncation |

### Frontend (`grammarpath-app/frontend/src/tests/`)
- `9` Vitest + Testing Library files (`56` tests) using **mocked `api` modules**:
  - Covers `toeicRoadmap` uniqueness, `apiUrl` normalization, `QuestionCard` / `ExerciseViewer` basics, `FormattedTheoryContent`, `CatalogPage` / `TheoryViewer`, `AuthContext` / `ProgressDashboard` / `MistakeReview`, `AdaptiveReviewPanel`, `ToeicPracticeModal`, `AdaptiveQuizModal`, and runtime `401` toast/error handling.

---

## 2. Detailed Testing & CI Findings

### TEST-1 — GitHub Actions CI Skips Integration Tests, `phase1-7` Guard Tests & Isolated Core Module Unit Tests
- **Severity:** `High`
- **Status:** `Partial`
- **Evidence:**
  - [`ci.yml`](file:///Users/kd.quach03/Documents/grammarpath-app/.github/workflows/ci.yml#L56-L57) only runs `npx vitest run tests/phase1-security-hardening.test.ts tests/phase1-6-hygiene.test.ts`.
  - It omits `phase1-7-staging-guard.test.ts` and has no PostgreSQL service container (`services: postgres:18`) to execute the 52 API integration tests automatically on PRs/pushes.
  - Zero unit tests exist specifically for [`grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts), [`formatters.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/formatters.ts), [`jwt.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/jwt.ts), or [`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts) offline.
- **Recommended Remediation:** Add `phase1-7-staging-guard.test.ts` and new offline unit tests (`grader.unit.test.ts`, `toeic-generator.unit.test.ts`, `formatters.unit.test.ts`) to `npm run test:unit`, and add a CI PostgreSQL service job running migrations + deterministic seed subset + API integration tests.
- **Dependencies & Risks:** Requires lightweight canonical fixture seed for CI Postgres (avoiding full 4,414-question import overhead per PR if desired, or importing a fast fixture).

### TEST-2 — Zero End-to-End Browser Tests (Playwright / Cypress) & Mock-Only Frontend Coverage
- **Severity:** `Medium`
- **Status:** `Missing`
- **Evidence:**
  - Frontend tests (`56/56`) mock `api` responses entirely, so contract mismatches between backend responses and UI components went undetected — including:
    1. `UnitPage` wiping `attempts` on `updateUnitProgress` (`API-5` / `UX-5`),
    2. `MistakeReviewPage` single-input vs multi-blank/option questions (`UX-1`),
    3. `OptionQuestionRenderer`/`FillBlankQuestionRenderer` ignoring `visualContextDescription` (`DATA-1` / `UX-3`),
    4. `AdaptiveQuizModal` truncating multi-blank questions (`DATA-2` / `UX-2`),
    5. `ExerciseViewer` losing `exerciseScore` banner across tab switches (`UX-4`).
- **Recommended Remediation:** Add Playwright smoke E2E tests covering login, Unit study + multi-blank/visual exercise submission + status toggle, Mistake Review retry of option/multi-blank questions, and Adaptive Quiz completion against a real running backend + DB.
- **Dependencies & Risks:** Depends on CI Postgres setup (`TEST-1`).

### TEST-3 — False-Confidence Assertions in Existing API Tests (`exercises` & `adaptive-toeic`)
- **Severity:** `Medium`
- **Status:** `Partial`
- **Evidence:**
  - [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts#L70-L88) asserts unauthenticated `?includeAnswers=true` and `/solutions` return full answers, codifying an anti-spoiler security flaw (`API-1`).
  - [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) checks `correctAnswer` exists on `/adaptive/quiz/generate` (codifying client-side leak `API-2`) and only tests `count: 5` on `toeic-practice` without testing `count: 10` or answer distribution (`API-4`).
- **Recommended Remediation:** Update integration assertions in lockstep with Phase 2.1 security/functional fixes and add regression tests for resolved-mistake exclusion, multi-blank adaptive quiz items, and TOEIC option distribution/count compliance.
- **Dependencies & Risks:** Must be coordinated with Phase 2.1 API contract changes.

