# GrammarPath Phase 3.1 — Comprehensive Test Report
**Unit, Staging API Integration, Frontend Vitest, and Browser E2E Verification**

- **Date:** 2026-11-13
- **Author:** QA Lead & Test Automation Engineer
- **Environment:** Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)

---

## 1. Test Execution Summary

All test suites across backend, frontend, staging database, and real browser end-to-end passed with zero failures, zero regressions, and zero console/runtime errors.

| Test Tier | Scope | Total Tests | Passed | Failed | Status |
|---|---|---:|---:|---:|:---:|
| Backend Unit Tests | Pure business logic, security guards, telemetry math | 54 | 54 | 0 | **PASS** |
| Backend Staging API Tests | Full HTTP API against live Neon staging database | 70 | 70 | 0 | **PASS** |
| Frontend Vitest Tests | Component rendering, user flows, route navigation | 69 | 69 | 0 | **PASS** |
| Playwright Browser E2E | Chrome headless full user journey across 4 pages | 8 steps | 8 steps | 0 | **PASS** |
| Frontend Build & Types | `tsc -b && vite build` | Clean | Clean | 0 | **PASS** |
| Backend Build & Types | `tsc` | Clean | Clean | 0 | **PASS** |
| **Total Automated Tests** | **All Verification Layers** | **193+** | **193+** | **0** | **100% PASS** |

---

## 2. Backend Unit Tests (54/54 Passed)

Command: `cd backend && npm run test:unit`

```
Test Files  6 passed (6)
Tests       54 passed (54)
Duration    1.48s
```

### Test Suite Breakdown:
1. [phase3-1-unit.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase3-1-unit.test.ts) (6 tests):
   - `deriveAttemptStatus`: returns `unanswered` for empty string or null answer.
   - `deriveAttemptStatus`: returns `correct` or `incorrect` for evaluated answers.
   - `computeNullableAccuracy`: returns `null` when 0 evaluated (never `0%`).
   - `computeNullableAccuracy`: computes exact rounded percentage when answers exist.
   - `computeNullableAverageScore`: returns `null` for empty list, rounded average otherwise.
   - `isEvaluatedAttemptItem`: properly preserves zero-article intentional empty answers.
2. [phase1-security-hardening.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase1-security-hardening.test.ts) (13 tests):
   - Anti-spoiler answer masking, token validation, rate limiters, session ownership.
3. [phase1-6-hygiene.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase1-6-hygiene.test.ts) (9 tests):
   - Input sanitization, password strength validation (min 8 chars), error envelope formatting.
4. [phase1-7-staging-guard.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase1-7-staging-guard.test.ts) (8 tests):
   - Staging environment isolation guard, blocked prod host detection, placeholder detection.
5. [phase2-1-unit.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase2-1-unit.test.ts) (9 tests):
   - Server-side grading, multi-blank normalization, rule lookup caching.
6. [phase2-2-unit.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/unit/phase2-2-unit.test.ts) (9 tests):
   - Partial exercise grading, solution unlock policies, answer verification flags.

---

## 3. Backend Staging API Integration Tests (70/70 Passed)

Command: `cd backend && node scripts/run-with-staging-env.mjs -- npm run test:api:staging -- --testTimeout=60000`

```
Test Files  9 passed (9)
Tests       70 passed (70)
Duration    ~38s (over Neon WAN)
```

### Test Suite Breakdown:
1. [phase3-1-staging.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/phase3-1-staging.api.test.ts) (4 tests):
   - `POST /exercises/:id/check`: Partial submit records `attemptStatus: 'unanswered'`, `isCorrect: null`, `studentAnswer: null` for blank inputs and excludes them from error count.
   - `GET /dashboard/summary`: Excludes `unanswered` blanks from accuracy; returns `accuracyPercentage: null` when user has only skipped blanks.
   - `POST /questions/:id/check`: Records `attemptSource: 'single_check'` and `'mistake_retry'`; resolves mistakes in `mistakes_service`.
   - `GET /curriculum/roadmap`: Returns 5 stages, 16 modules, 145 unit metadata rows with normalized `toeicParts` matching `/^Part \d$/`.
2. [curriculum.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/curriculum.api.test.ts) (8 tests):
   - Unit catalog browsing, Unit 1–145 detail pagination, theory sections with mapped concepts.
3. [exercises.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/exercises.api.test.ts) (10 tests):
   - Full exercise retrieval, multi-blank structure, worked example filtering.
4. [grading.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/grading.api.test.ts) (9 tests):
   - Strict server-side grading, anti-spoiler protection, partial exercise persistence.
5. [auth-and-progress.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/auth-and-progress.api.test.ts) (11 tests):
   - Registration, JWT auth, progress tracking, unit completion status toggles.
6. [adaptive.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/adaptive.api.test.ts) (7 tests):
   - Adaptive quiz session generation, dynamic question selection, weakness analysis.
7. [adaptive-toeic.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/adaptive-toeic.api.test.ts) (5 tests):
   - TOEIC Part 5 question generation, difficulty levels (easy, medium, hard), answer evaluation.
8. [phase2-1-remediation.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/phase2-1-remediation.api.test.ts) (8 tests):
   - Solution gate verification, mistake review queue, rule reference linking.
9. [phase2-2-qa.api.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/api/phase2-2-qa.api.test.ts) (8 tests):
   - End-to-end regression validation, anti-tampering guards, concurrent session isolation.

---

## 4. Frontend Vitest Tests (69/69 Passed)

Command: `cd frontend && npm test`

```
Test Files  11 passed (11)
Tests       69 passed (69)
Duration    3.30s
```

### Test Suite Breakdown:
1. [phase3-1-dashboard.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase3-1-dashboard.test.tsx) (4 tests):
   - Renders Dashboard with distinct Completion, Answered Accuracy, and Activity pillars.
   - Displays `"—"` (never 0%) when answered accuracy is null; isolates skipped questions.
   - Renders 14-day study activity SVG chart and recent activity feed.
   - Explicitly displays Phase 3.2 attribution note for concept mastery (zero fake scores).
2. [toeic-roadmap.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/toeic-roadmap.test.tsx) (4 tests):
   - Roadmap data covers all 145 units with normalized Part 1–7 tags.
   - Part matrix filtering, goal track switching (500, 650, 750+), guest auth modal prompt.
   - Authenticated user progress synchronization and weak unit recommendations.
   - Sidebar navigation integration.
3. [exercise-renderer.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/exercise-renderer.test.tsx) (17 tests):
   - Restores partial attempt states; renders `Unanswered` badge for skipped blanks.
   - Single-question checks, multi-blank fields, option questions, sentence questions.
4. [catalog-and-theory.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/catalog-and-theory.test.tsx) (5 tests):
   - Unit cards, search filter, page pagination, rule modals.
5. [auth-and-progress.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/auth-and-progress.test.tsx) (6 tests):
   - Login, registration, token refresh, progress dashboard metrics.
6. [adaptive-toeic.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/adaptive-toeic.test.tsx) (2 tests):
   - TOEIC modal rendering, difficulty selectors, question review.
7. [adaptive-and-ai.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/adaptive-and-ai.test.tsx) (4 tests):
   - AI Tutor explanation cards, fallback messages on 503, quiz flows.
8. [formatted-theory.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/formatted-theory.test.tsx) (8 tests):
   - Formatted markdown theory, illustrative examples, rule callouts.
9. [phase1-runtime-reliability.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase1-runtime-reliability.test.tsx) (8 tests):
   - Non-blocking error toasts, proxy error resilience, 401 handling.
10. [phase2-2-ux.test.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx) (5 tests):
    - Solution lock gates, persistent evaluation banners, mistake retry inputs.
11. [phase1-6-api-url.test.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase1-6-api-url.test.ts) (6 tests):
    - Base URL normalization, proxy target resolution, double-prefix deduplication.

---

## 5. Playwright Browser E2E Verification (PASS)

Script: `verify-phase3-1-browser.mjs` executed using headless Chromium against the live staging backend on `:4100` and Vite dev on `:5173`.

```json
{
  "status": "PASS",
  "verifiedEmail": "p31-e2e-1794544014336@grammarpath.local",
  "desktopOverflow": false,
  "mobileDashboardOverflow": false,
  "mobileRoadmapOverflow": false,
  "consoleErrorsCount": 0,
  "pageErrorsCount": 0,
  "failed5xxCount": 0
}
```

### Full User Journey Verified in Browser:
1. **Signed-Out Access:** Navigated to `/dashboard`; verified unauthenticated callout and auth prompt.
2. **Account Creation:** Opened `AuthModal`, switched to `Create Account`, registered new test user with 8+ character password, authenticated automatically.
3. **Empty Dashboard Inspection:** Verified `dashboard-accuracy-card` displays `"—"` and `"No evaluated answers yet"` — **never 0%**.
4. **Partial Exercise Submission:** Navigated to Unit 1 -> Exercises Overview -> Exercise 1.3. Answered question 3 correctly (`"I'm not listening"`), answered question 4 incorrectly (`"wrong e2e answer"`), left remaining 6 blanks empty. Clicked "Check Entire Exercise". Verified evaluation banner.
5. **Reload Persistence:** Reloaded page. Re-opened Exercise 1.3. Confirmed exact persistence: 1 Correct, 1 Incorrect, and **6 Unanswered badges**.
6. **Dashboard Telemetry Update:** Navigated to `/dashboard`. Confirmed Answered Accuracy updated to **50.0%** (1/2 evaluated), Skipped count = **6**, and 14-day study activity chart rendered.
7. **Progress Page Audit:** Navigated to `/progress`. Confirmed recent attempt summary displays `(2 answered, 6 skipped)`.
8. **Mistake Review & Remediation:** Navigated to `/mistakes`. Found unresolved mistake 1.3-q4. Retried with correct answer `"She's having"`. Verified `"Resolved! Cleared from mistakes list"`.
9. **Remediated Dashboard Reflection:** Returned to `/dashboard`. Confirmed Answered Accuracy rose to **66.7%** (2/3 evaluated), Unresolved Mistakes = 0, and source pill `"Mistake Retry: 1"` appeared.
10. **TOEIC Drill Integration:** Navigated to `/roadmap`. Clicked `"Part 5"` filter pill. Started TOEIC drill via `"Luyện 5 câu TOEIC Part 5"`. Selected Option A and verified server-side grading feedback. Returned to `/dashboard` and confirmed `"TOEIC Drill"` badge in Recent Activity.
11. **Responsive Viewport Verification:** Evaluated horizontal scrolling across `/dashboard` and `/roadmap` at desktop (1280x800) and mobile (375x812 iPhone viewport) — **0 overflow detected**.
12. **Database Hygiene:** Post-test cleanup removed the test user automatically from staging.

