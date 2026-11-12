# GrammarPath Phase 2.2.1 — Browser Smoke Test & Release Gate Report

**Date:** 2026-11-12  
**Workspace:** `grammarpath-app` (`frontend` + `backend`)  
**Database Target:** Isolated Neon staging PostgreSQL (`grammarpath-staging` on `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432`)  
**Browser Engine:** Google Chrome `157.0.8103.50` driven by Playwright (`@playwright/test` `1.65.0`, installed as frontend `devDependency` only)  
**Viewports Tested:** Desktop `1280×800`, Mobile `375×812`  
**Phase 2.2.1 Release Gate Verdict:** **PASS WITH CONDITIONS**

---

## 1. Executive Summary & Gate Outcome

Real browser end-to-end verification in **Google Chrome `157.0.8103.50`** against the isolated **Neon `grammarpath-staging`** database executed and passed all **7 scenarios (A–G)** on the final clean run (`task-2914`, exit code `0`):
- **0 console errors**
- **0 uncaught page errors**
- **0 failed network requests**
- **0 unexpected HTTP `>= 400` responses** (with intentional `422 INSUFFICIENT_CONTENT` verified cleanly in Scenario F)
- **0 pre-submission JSON spoiler leaks** across all inspected `/api/v1/*` GET/generation payloads
- **0 horizontal layout overflows** across all 8 Desktop (`1280×800`) and Mobile (`375×812`) page/tab checks (`overflowPx = 0`)
- **0 leftover test rows** in `grammarpath-staging` after automated cascade cleanup (`users: 0`, canonical content unchanged at `145` units / `4,414` questions)

### Defect Discovered & Fixed During Verification

- **`ProgressDashboardPage` Unmounting Active `AdaptiveQuizModal` Mid-Quiz (Scenario E Blocker):**
  - **Root Cause:** In [`ProgressDashboardPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ProgressDashboardPage.tsx#L112), checking Question 1 inside `AdaptiveQuizModal` triggers `onProgressUpdated?.()` -> `handleRefreshDashboard()` -> `setRefreshCounter(c => c + 1)`, which sets `isLoading(true)` while re-fetching `GET /api/v1/progress/overview`. Because `ProgressDashboardPage` returned the full-page loading state whenever `isLoading` was `true` (even when `overview` was already loaded), React unmounted and remounted `<AdaptiveQuizModal>`, destroying active quiz answers/results and generating a brand-new session mid-quiz.
  - **Fix Applied:** Changed the early-return condition to `if (isLoading && !overview)` so background dashboard refreshes keep the mounted dashboard and open `AdaptiveQuizModal` intact.
  - **Post-Fix Regression Verification:** Re-ran full Chrome Scenarios A–G (`task-2914`), plus frontend `npm run typecheck` (`tsc --noEmit`), `npm test` (`10/10` files, `64/64` tests passed), and `npm run build` (`tsc -b && vite build`, 1,611 modules built cleanly).

---

## 2. Test Environment & Isolation Controls

- **Runtime Setup:**
  - Ephemeral Express API bound to `127.0.0.1:<ephemeral>` via [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs) pointing strictly to `.env.staging` (`grammarpath-staging`).
  - Frontend Vite server running at `http://127.0.0.1:4173` with `VITE_API_BASE_URL` pointing to the isolated ephemeral API origin (leaving existing host processes on ports `4000` and `5173` untouched).
- **Dependency Hygiene:**
  - Added `@playwright/test` `^1.65.0` strictly to [`frontend/package.json`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/package.json#L19) `devDependencies`. Zero production dependencies added.
  - Canonical repository `grammarpath-data` was **not modified** and dataset import was **not re-run**.
- **Anti-Spoiler Network Scanner:**
  - Intercepted all `< 300` JSON responses on `/api/v1/*` excluding explicit post-submission/reveal endpoints (`/check`, `/solution`, `/solutions`, `/explain-theory`) and scanned recursively for `correctAnswerText`, `correctAnswerArray`, `acceptedAnswers`, `blankAcceptedAnswers`, `partAcceptedAnswers`, `answerKey`, `correctAnswer`, `correctAnswers`, `expectedAnswers`, and `aiExplanation`.

---

## 3. Scenario Execution Results (A–G)

| Scenario | Workflow Covered | Status | Key Observations & Assertions Verified |
| :--- | :--- | :---: | :--- |
| **A — Guest Browsing** | Home catalog -> Unit 1 Theory -> Exercise 1.1 | **PASS** | Catalog rendered Cambridge *English Grammar in Use* (`145` units, `549` exercises, `4,414` questions). Unit 1 Theory (`Theory & Examples 5`) and Exercise `1.1` loaded under `Chế độ Khách`. Verified `0` `Solution Revealed` / `Expected Answer:` elements before submission and `0` network spoiler keys. |
| **B — Authentication** | Staging account registration -> Sign Out -> Sign In | **PASS** | Registered isolated staging user (`Smoke Learner`), verified sidebar switched from `Sign In / Register` to authenticated profile (`My Progress`, `Review Mistakes`). Signed out cleanly and verified guest state restored with `0` personal nav links (`My Progress`, `Review Mistakes` hidden). Signed back in and verified personal navigation restored. |
| **C — Exercise Workflow** | Unit 1 Exercise 1.3 partial submit -> skipped behavior -> reload restore | **PASS** | Filled `1.3-q3` (first interactive item after 2 worked examples) with a wrong string and left `1.3-q4`..`1.3-q10` blank; clicked `Check Entire Exercise`. Verified `Exercise Evaluation Summary` (`0 of 8 questions correct`), Vietnamese explanation rendered **only** for attempted `1.3-q3` (`1`), while skipped items leaked `0` answers/explanations. Full `page.reload()` restored `Exercise 1.3 ✓ 0%`, banner `Đã khôi phục từ lần làm trước`, and student text `'completely wrong answer'`. *(See minor pre-reload vs post-reload skipped-card visual note in §5.)* |
| **D — Mistake Review** | Mistake listing -> View Solution -> Retry correction -> DB history | **PASS** | Mistake Review listed only attempted mistake `1.3-q3` (skipped siblings absent). Inspected pedagogical solution chip (`'I'm not listening'`), submitted correction, and verified UI displayed `Resolved! Cleared from mistakes list`. DB confirmed **2** `QuestionAttemptItem` rows preserved (`isCorrect: false` + `isCorrect: true`, non-destructive history). |
| **E — Adaptive Quiz** | Progress Dashboard -> Smart Adaptive Quiz -> multi-structure checks -> DB persistence | **PASS** | Opened `Quiz Thông Minh — Luyện Theo Điểm Yếu` (`5` questions). Interacted across multiple structures (`Ex 1.4 (fill_blank)`, `Ex 1.1 (matching)` option buttons, `Ex 2.5 (fill_blank)`, `Ex 2.2 (fill_blank)`, `Ex 1.3 (fill_blank)`), checked all 5 answers with server feedback + explanations without resetting modal state, observed `Hoàn thành bài Quiz Thích Ứng`, and verified `AdaptiveQuizSession` persisted (`1` row in DB). |
| **F — TOEIC Practice** | Unit 1 counts (`5`, `10`, `20`), selection, grading, Unit 92 `422` failure UI | **PASS** | Unit 1 generated `Câu 1 / 5`, `Câu 1 / 10`, and `Câu 1 / 20` cleanly (`KẾT HỢP BIÊN SOẠN + UNIT DB`). Selected Option A, checked answer, and verified server grading + Vietnamese explanation. On sparse Unit 92 at `count=20`, backend returned `422 INSUFFICIENT_CONTENT` and modal cleanly displayed the exact shortfall reason: `Unit 92 ("Relative clauses 1: clauses with who/that/which") only yielded 9 distinct unit-grounded practice items, which is fewer than the requested count (20).` |
| **G — Responsive & A11y** | Keyboard nav, `Escape` dismissal, `1280×800` & `375×812` layout/overflow checks | **PASS** | Desktop keyboard `Enter` on focused `CatalogPage` unit card navigated to `/units/1`. `RuleReferenceModal` (`Rule 1B`), `AdaptiveQuizModal`, `ToeicPracticeModal`, and `AuthModal` all dismissed cleanly via `Escape`. Mobile `375×812` slide-out navigation drawer opened/closed and signed out cleanly. All 8 overflow checks reported `overflowPx = 0`. |

---

## 4. Layout Overflow, Visual & Network Evidence

### Desktop (`1280×800`) & Mobile (`375×812`) Scroll/Overflow Measurements

| Page / View | Viewport (`W×H`) | `innerWidth` | `scrollWidth` | `bodyScrollWidth` | `overflowPx` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Desktop Catalog | `1280×800` | `1280` | `1280` | `1280` | **0** |
| Desktop Unit 1 Theory | `1280×800` | `1280` | `1280` | `1280` | **0** |
| Desktop Progress Dashboard | `1280×800` | `1280` | `1280` | `1280` | **0** |
| Mobile Catalog | `375×812` | `375` | `375` | `375` | **0** |
| Mobile Unit 1 Theory | `375×812` | `375` | `375` | `375` | **0** |
| Mobile Unit 1 Exercises | `375×812` | `375` | `375` | `375` | **0** |
| Mobile Progress Dashboard | `375×812` | `375` | `375` | `375` | **0** |
| Mobile Mistake Review | `375×812` | `375` | `375` | `375` | **0** |

### Visual Screenshots Inspected

Ten screenshots were captured during verification and visually inspected in Chrome `157.0.8103.50` (stored in conversation scratch evidence folder):
- `scenario-a-guest-exercise.png` — Guest Exercise 1.1 card layout with zero pre-submit answers
- `scenario-b-authenticated.png` — Authenticated sidebar & navigation state
- `scenario-c-partial-submit.png` — Exercise 1.3 post-submit evaluation (`1.3-q3` graded `Incorrect` with Rule `1B` + Vietnamese explanation)
- `scenario-c-skipped-card.png` — Exercise 1.3 unattempted `1.3-q4` rendering immediately post-submit (`Incorrect` header with 0 answers/explanations leaked)
- `scenario-c-reload-restored.png` — Exercise 1.3 after full reload (`✓ 0%` pill + `Đã khôi phục từ lần làm trước`)
- `scenario-d-mistake-resolved.png` — Mistake Review `1.3-q3` resolved banner (`0 Unresolved`, answer chip + Vietnamese explanation)
- `scenario-e-adaptive-quiz.png` — Adaptive Quiz `5/5` completion modal state
- `scenario-f-toeic-20.png` — TOEIC Part 5 `20`-question practice view on Unit 1
- `scenario-f-toeic-422.png` — TOEIC `422 INSUFFICIENT_CONTENT` error callout on Unit 92 at `count=20`
- `scenario-g-mobile-catalog.png` & `scenario-g-mobile-exercises.png` — Mobile `375×812` catalog and Unit 1 exercise tabs with zero clipping

### Console, Page & Network Diagnostics (`task-2914`)

- **Console errors:** `0`
- **Page runtime errors:** `0`
- **Failed network requests:** `0`
- **Unexpected HTTP `>= 400` responses:** `0` (Unit 92 `count=20` returned expected `422`)
- **Pre-submission spoiler leaks:** `0`
- **Gemini AI live fallback observation:** During Scenario F (`TOEIC Practice`), upstream Gemini requests encountered `HTTP 429` / `AbortError`, and backend gracefully engaged its deterministic unit-grounded fallback without throwing `5xx` or breaking modal rendering.

---

## 5. Minor Non-Blocking Visual Observation & Remaining Limitations

1. **Pre-Reload vs. Post-Reload Skipped Card Feedback (`Scenario C`):**
   - Immediately after `Check Entire Exercise`, [`exercises.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L388-L401) returns skipped items (`studentAnswer: null`, `expectedAnswers: []`, `explanation: null`) in `res.results`, causing [`QuestionFeedbackPanel.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx#L60-L88) to render a red `✕ Incorrect` header over an empty divider line on skipped cards (`1.3-q4`..`1.3-q10`), whereas full-page reload restoration (`handleRestorePreviousAnswers` skipping `studentAnswer === null`) omits the feedback panel on skipped cards. No spoilers are leaked in either state, though displaying `"Skipped"` or suppressing the empty box pre-reload would polish consistency.
2. **Local Staging Harness vs. Deployed Production Topology:**
   - Verified Vite dev server (`127.0.0.1:4173`) + in-process staging Express API (`127.0.0.1:64570`) against remote Neon `grammarpath-staging`. Production reverse-proxy TLS/CORS/headers, deployed static bundle serving (`dist/`), rate-limit store behavior under `TRUST_PROXY`, and production database migration (`20261113000000_add_practice_sessions`) remain outside local staging smoke scope.
3. **Browser Binary Note:**
   - Used preinstalled macOS Google Chrome `157.0.8103.50` via Playwright `executablePath` rather than downloading Playwright's bundled Chromium binary.
4. **Backend Suite Currency:**
   - No backend files were modified in Phase 2.2.1; backend baseline (`48/48` unit + `65/65` staging API tests) stands from Phase 2.2. Frontend `tsc --noEmit`, Vitest (`64/64`), and `vite build` were freshly re-run and passed after the `ProgressDashboardPage.tsx` fix (`task-2918`).

---

## 6. Database Pre- & Post-Smoke Verification (`grammarpath-staging`)

Cleanup deleted **only** the transient staging test user (`p221_smoke_*`) created during the run via cascade delete, leaving canonical data completely untouched:

| Table | Pre-Smoke Count | Post-Smoke Count | Expected Baseline | Status |
| :--- | :---: | :---: | :---: | :---: |
| `books` | `1` | `1` | `1` | Verified |
| `units` | `145` | `145` | `145` | Verified |
| `theory_sections` | `542` | `542` | `542` | Verified |
| `textbook_examples` | `639` | `639` | `639` | Verified |
| `exercises` | `549` | `549` | `549` | Verified |
| `questions` | `4,414` | `4,414` | `4,414` | Verified |
| `answer_keys` | `4,414` | `4,414` | `4,414` | Verified |
| `explanations` | `4,414` | `4,414` | `4,414` | Verified |
| `users` | `0` | `0` | `0` | Clean |
| `learning_progress` | `0` | `0` | `0` | Clean |
| `exercise_attempts` | `0` | `0` | `0` | Clean |
| `question_attempt_items` | `0` | `0` | `0` | Clean |
| `adaptive_quiz_sessions` | `0` | `0` | `0` | Clean |
| `toeic_practice_sessions` | `0` | `0` | `0` | Clean |
| `toeic_practice_items` | `0` | `0` | `0` | Clean |

---

## 7. Final Release Gate Recommendation

**Verdict: `PASS WITH CONDITIONS`**

- **Browser Verification Gate (Phase 2.2 Condition Resolved):** **PASSED** — all Scenarios A–G, viewport responsiveness (`1280×800` & `375×812`), anti-spoiler enforcement, persistence, mistake history preservation, and DB cleanup verified in live Google Chrome `157.0.8103.50` against Neon `grammarpath-staging`.
- **Conditions Before Production Promotion:**
  1. Verify deployed reverse-proxy configuration (`TRUST_PROXY`, TLS, CORS origin, and production `VITE_API_BASE_URL`) in a deployed staging/pre-prod environment.
  2. Apply pending additive Prisma migration (`20261113000000_add_practice_sessions`) safely to target deployment environment via `prisma migrate deploy` prior to serving traffic.
  3. Optionally polish pre-reload skipped-card empty `Incorrect` banner consistency (`Scenario C`) before general release.

