# GrammarPath — Phase 1.9 API Integration Re-Verification Report

> **Date:** 2026-11-12  
> **Phase:** 1.9 — Controlled Dataset Import & API Re-Verification (Step 7: API Integration Re-Verification)  
> **Target Staging Database:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (Neon Project `summer-resonance-11737918`, Branch `br-blue-meadow-a1uyxgfp`, PostgreSQL `18.6`)  
> **Execution Summary:** **`52 Passed / 0 Failed / 0 Skipped` across all `6` suites (`59.05s`, Exit Code `0`)**  
> **Re-Verification Verdict:** **`PASS`** *(Unblocked from Phase 1.8's `17/52` baseline; all `35` previously failing seeded-data tests now pass with `0` code changes or weakened assertions)*

---

## 1. Pre-Execution Isolation & Guard Verification (`PASS`)

- **Guard check:** `npm run staging:check` in `grammarpath-app/backend` -> [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs) confirmed `[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` (`exit 0`).
- **Execution command:** `npm run test:api:staging -- --reporter=verbose --reporter=json` (`tests/setup.ts` + `run-with-staging-env.mjs` stripped all fallback `.env` paths).
- **Test scope integrity:** Zero tests skipped, zero test assertions modified or relaxed compared to Phase 1.8.

---

## 2. Per-Suite Result Breakdown & Phase 1.8 Comparison (`6` Suites / `52` Tests)

| Suite File | Tests | Phase 1.8 (Empty DB) | Phase 1.9 (Seeded DB) | Duration | Key Capabilities Verified Against Live Staging |
|---|---:|---:|---:|---:|---|
| [`curriculum.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/curriculum.api.test.ts) | `9` | `2 passed / 7 failed` | **`9 passed / 0 failed`** | `2,746 ms` | `/health` (`totalUnits=145`), `/book` (`145` units, `549` exercises, `4,414` questions, `542` theory sections, `639` examples), `/units` pagination/search/range, `/units/1` harmonized pages (`[13, 14, 347]`), `/units/1/theory` (`14` Vietnamese examples), `/theory/sections/1B` & case-insensitive `1b`, `400`/`404` guards. |
| [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts) | `8` | `1 passed / 7 failed` | **`8 passed / 0 failed`** | `4,324 ms` | `/units/1/exercises` (`1.1..1.4`), Anti-Spoiler default omission vs `?includeAnswers=true`, `/exercises/1.4` ordered `5`-item word bank, `/questions/1.1-q1`, `/questions/1.1-q1/solution` (AnswerKey + Vietnamese explanation + `1B`), `/exercises/1.1/solutions`, `404` handling. |
| [`grading.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/grading.api.test.ts) | `11` | `2 passed / 9 failed` | **`11 passed / 0 failed`** | `15,169 ms` | Exact string, accepted variant & curly-apostrophe normalization, multi-blank (`1.2-q1`), multi-part (`4.1-q9`, `10.1-q1`, `13.3-q10`), Option-B worked-example exclusion (`1.1/check`), auxiliary-blank option grading (`70.1-q2a/b`, `46.1-q1`, `50.1-q2`), combined multi-blank (`32.1-q7`, `98.2-q10`), split-slash (`86.4-q9`), multi-select (`17.2-q3`, `24.1-q3`), statelessness & `400`/`404` guards. |
| [`auth-and-progress.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/auth-and-progress.api.test.ts) | `7` | `3 passed / 4 failed` | **`7 passed / 0 failed`** | `4,447 ms` | `/auth/register` (`409` duplicate, `400` short pwd), `/auth/login`, `/auth/me`, authenticated `/exercises/1.1/check` persistence (`ExerciseAttempt`, `QuestionAttemptItem`, `LearningProgress`), `PUT /progress/units/1` completed, `/progress/overview` (`1/145`), `/progress/mistakes` capture & resolution + `afterAll` cleanup & `145/549/4414` assertions. |
| [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts) | `7` | `5 passed / 2 failed` | **`7 passed / 0 failed`** | `8,952 ms` | Auth guards (`401`), fresh analytics/starter recommendation (`Unit 1`), live Gemini `POST /api/v1/theory/explain-theory` (`200 OK`, `source = "ai"`, `6,037 ms`), `400` validation, `70C` fallback helper, mistake tracking & rule-level (`weakRules`) remediation recommendations. |
| [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) | `10` | `4 passed / 6 failed` | **`10 passed / 0 failed`** | `20,280 ms` | Register, `401`/`400` guards, live Gemini TOEIC Part 5 generation (`POST /api/v1/adaptive/toeic-practice` with `count=5`, `count=3`, `difficulty='easy'` & `'hard'`), diagnostic & error-driven `POST /api/v1/adaptive/quiz/generate` (custom `difficulty='hard'`). |
| **Total (`6` Suites)** | **`52`** | **`17 passed / 35 failed`** | **`52 passed / 0 failed`** | **`59.05 s`** | **`100%` pass rate against imported `grammarpath-staging`** |

---

## 3. Post-Test Staging Database Verification (`PASS`)

Immediately after `vitest run` completed (`exit 0`), direct read-only SQL checks against `grammarpath-staging` verified clean isolation and zero leftover mutations:

- **Test User / Attempt Cleanup (`PASS`):**
  - `users`: **`0`**
  - `learning_progress`: **`0`**
  - `exercise_attempts`: **`0`**
  - `question_attempt_items`: **`0`**
- **Canonical Dataset Integrity (`PASS`):**
  - All `22` canonical tables match exact baseline counts (`books=1`, `units=145`, `unit_source_pages=454`, `theory_sections=542`, `theory_section_source_pages=542`, `textbook_examples=639`, `textbook_example_source_pages=639`, `exercises=549`, `exercise_word_bank_items=1,117`, `questions=4,414`, `question_source_pages=5,007`, `question_options=697`, `question_blanks=2,619`, `blank_accepted_answers=4,467`, `question_parts=75`, `part_accepted_answers=123`, `accepted_answers=8,425`, `answer_keys=4,414`, `answer_key_source_pages=4414`, `explanations=4,414`, `unit_validation=145`, `unresolved_items=0`).
  - Unit `110` `"110A"` explanations verified intact (`17`).
- **Prisma Migration History (`PASS`):**
  - `_prisma_migrations` unchanged (`2` applied rows: `20261105000000_init_schema`, `20261106000000_add_user_progress_tables`; both `rolled_back_at = null`).

