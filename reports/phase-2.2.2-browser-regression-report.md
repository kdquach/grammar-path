# GrammarPath — Phase 2.2.2 Browser Regression Report

> **Date:** 2026-11-12  
> **Browser:** Google Chrome `157.0.8103.50` via Playwright (`1.65.0` devDependency)  
> **Target:** Isolated ephemeral Express + Vite server against `grammarpath-staging` (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging`)  
> **Outcome:** **PASS** (`0` console errors, `0` page errors, `0` failed requests, `0` HTTP `>=400` errors, `0` pre-submit/unanswered spoiler leaks)

---

## 1. Regression Scenario & Steps Executed

Executed automated real-browser regression against Unit 1 `Exercise 1.3` (`10` total items: `2` worked examples + `8` interactive questions `1.3-q3`..`1.3-q10`):

1. **Authenticated Setup:** Registered transient test account (`p222_smoke_*@example.com`), verified authenticated sidebar hydration, and navigated to `/units/1` -> `Exercises Overview` -> `Exercise 1.3`.
2. **Pre-Submit Anti-Spoiler Check:** Confirmed `0` occurrences of `Expected Answer:`, `Incorrect`, or `Unanswered` in DOM and `0` forbidden spoiler keys in pre-submission API payloads (`GET /api/v1/units/1`, `GET /api/v1/progress/unit/1`, etc.).
3. **Mixed Partial Submission Inputs:**
   - `1.3-q3`: Entered correct canonical answer `"I'm not listening"`.
   - `1.3-q4`: Entered incorrect answer `"wrong answer here"`.
   - `1.3-q5`: Entered whitespace-only `"   "`.
   - `1.3-q6`..`1.3-q10`: Left completely blank (`5` untouched questions).
4. **Submit Exercise:** Clicked `Check Entire Exercise` and waited for `Exercise Evaluation Summary` (`1 of 8 questions correct`) and `networkidle`.
5. **Post-Submit Tri-State Inspection:**
   - Verified `data-feedback-status` counts: `correct = 1`, `incorrect = 1`, `unanswered = 6`, `revealed = 0`.
   - Verified visible badge text counts: `"Correct!" = 1`, `"Incorrect" = 1`, `"Unanswered" = 6`.
   - Verified `Expected Answer:` and `Giải thích ngữ pháp (Vietnamese Explanation)` appeared only on the `2` attempted cards (`1.3-q3`, `1.3-q4`) and `0` times inside any `[data-feedback-status="unanswered"]` card.
   - Verified `Show Solution` remained locked (`title="Sign in and check your answer once to unlock solution"`) on all `6` unanswered cards (`1.3-q5`..`1.3-q10`).
6. **Reload & State Restoration Inspection:**
   - Executed `page.reload({ waitUntil: "networkidle" })`, returned to `Exercise 1.3`, waited for `"Đã khôi phục từ lần làm trước"`.
   - Verified restored input values: `1.3-q3` = `"I'm not listening"`, `1.3-q4` = `"wrong answer here"`, `1.3-q5` (whitespace-only) = `""`, `1.3-q6` = `""`.
   - Verified restored feedback states: `correct = 1`, `incorrect = 1`, `unanswered = 6`, `0` `"Incorrect"` labels on skipped items, `0` pre-revealed answers/explanations on skipped items, `2` unlocked `Show Solution` buttons (`1.3-q3`, `1.3-q4`), and `6` locked `Show Solution` buttons (`1.3-q5`..`1.3-q10`).
7. **Database Cleanup:** Deleted only the transient `p222_smoke_*` test user via Prisma cascade cleanup.

---

## 2. Observed Metrics & Visual Verification

| Check | Post-Submit | Post-Reload | Expected |
|---|---|---|---|
| Score Summary Banner | `1 of 8 questions correct` | Restored attempt banner visible | Match |
| `[data-feedback-status="correct"]` | `1` (`Correct!`) | `1` (`Correct!`) | `1` |
| `[data-feedback-status="incorrect"]` | `1` (`Incorrect`) | `1` (`Incorrect`) | `1` |
| `[data-feedback-status="unanswered"]` | `6` (`Unanswered`) | `6` (`Unanswered`) | `6` |
| `Expected Answer:` occurrences | `2` (attempted only) | `0` (locked behind `Show Solution`) | No skipped leaks |
| Vietnamese explanation occurrences | `2` (attempted only) | `0` (locked behind `Show Solution`) | No skipped leaks |
| Locked `Show Solution` buttons | `6` | `6` | `6` |
| Unlocked `Show Solution` buttons | `2` | `2` | `2` |
| Console / Page / HTTP >=400 / Spoiler errors | `0` | `0` | `0` |

Visual screenshot inspection also confirmed clean alignment and removal of an empty horizontal divider line under restored single-row `Correct!` / `Incorrect` headers in [QuestionFeedbackPanel.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx).

Captured verification screenshots (stored in session scratch folder):
- `p222-correct-and-incorrect.png` — Post-submit `Correct!` (`1.3-q3`) with explanation and unlocked `Show Solution`.
- `p222-incorrect-and-unanswered.png` — Post-submit `Incorrect` (`1.3-q4`) above neutral `Unanswered` (`1.3-q5` whitespace-only) and blank `1.3-q6` with locked `Show Solution`.
- `p222-reload-restored.png` & `p222-reload-restored-unanswered.png` — Post-reload restored `1.3-q3` (`Correct!`), `1.3-q4` (`Incorrect`), `1.3-q5` (`Unanswered`), and `1.3-q6` (blank + locked).

---

## 3. Staging Database Integrity Post-Cleanup

Verified immediately after test teardown:
- **Canonical content:** `1` book, `145` units, `542` theory sections, `639` textbook examples, `549` exercises, `4,414` questions, `4,414` answer keys, `4,414` explanations (unchanged).
- **Runtime user/session tables:** `0` users, `0` learning progress rows, `0` exercise attempts, `0` question attempt items, `0` adaptive quiz sessions, `0` TOEIC practice sessions, `0` TOEIC practice items.

