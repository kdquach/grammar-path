# GrammarPath — Phase 1.8 API Integration Test Execution Report

> **Date:** 2026-11-12  
> **Phase:** 1.8 — Live Migration & API Integration Verification  
> **Target Database:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (`PostgreSQL 18.6`, migrated with `0` seeded canonical rows)  
> **Execution Summary:** **17 Passed / 35 Failed / 0 Skipped (`52` Total, Duration `15.71s`, Exit Code `1`)**  
> **Classification:** **`BLOCKED` by missing canonical dataset prerequisite (`0` seeded rows per Phase 1.8 Section 11)** — `0` application code or migration defects observed.

---

## 1. Pre-Execution Isolation & Safety Verification (`PASS`)

- **Isolation guard:** Executed strictly via `npm run test:api:staging` -> [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs), which confirmed `target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` before launching Vitest.
- **No `.env` fallback:** Both `run-with-staging-env.mjs` and [`tests/setup.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/setup.ts) neutralized fallback paths to workspace `.env`.
- **Write isolation & cleanup design:** Only [`auth-and-progress.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/auth-and-progress.api.test.ts), [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts), and [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) write rows, each creating a single timestamped `@grammarpath.local` user and deleting strictly `{ where: { id: testUserId } }` in `afterAll`.

---

## 2. Per-Suite Test Results (`6` Suites / `52` Tests, `15.71s`)

| Suite File | Total | Passed | Failed | Skipped | Duration | Suite Notes |
|---|---|---|---|---|---|---|
| [`adaptive.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive.api.test.ts) | `7` | `5` | `2` | `0` | `6,864 ms` | Live Auth (`0`, `4`), Zod `400` (`3`), helper (`3b`), & live Gemini AI (`2`, `5,441 ms`) **PASSED**; `1` & `6` failed due to `0` Units/Questions |
| [`adaptive-toeic.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/adaptive-toeic.api.test.ts) | `10` | `4` | `6` | `0` | `1,521 ms` | Register (`1`), Auth guards (`2`, `6`), & Zod `400` (`3`) **PASSED**; `4`, `5`, `5b`, `7`, `8`, `9` failed due to `0` Units/Questions |
| [`auth-and-progress.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/auth-and-progress.api.test.ts) | `7` | `3` | `4` | `0` | `1,923 ms` | `register` (`1`), `login` (`2`), `me` (`3`) **PASSED** on live PostgreSQL; `4..7` & `afterAll:41` (`unitsCount === 145`) failed due to `0` Units/Exercises |
| [`grading.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/grading.api.test.ts) | `11` | `2` | `9` | `0` | `1,645 ms` | Stateless DB preservation (`7`) & `404`/`400` error handling (`8`) **PASSED**; `1..6, 9..11` failed `404` due to `0` seeded questions |
| [`curriculum.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/curriculum.api.test.ts) | `9` | `2` | `7` | `0` | `1,196 ms` | Validation `400` (`6`) & unknown route `404` (`9`) **PASSED**; `1..5, 7, 8` failed (`0` Units / `0` Books / `0` Sections) |
| [`exercises.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/exercises.api.test.ts) | `8` | `1` | `7` | `0` | `814 ms` | `404` error handling (`8`) **PASSED**; `1..7` failed `404` due to `0` seeded Unit 1 exercises |
| **Total (`6` Files)** | **`52`** | **`17`** | **`35`** | **`0`** | **`15.71 s`** | **`100%` of failures caused by empty canonical tables (`0` rows)** |

---

## 3. Root-Cause Breakdown of All `35` Failures & `afterAll` Assertion

Every single failure traces strictly to the intentional absence of canonical content in `grammarpath-staging` (`books = 0`, `units = 0`, `theory_sections = 0`, `exercises = 0`, `questions = 0`), **not** an application bug or environment misconfiguration:

| Failure Mode | Count | Affected Tests & Representative Stack Traces | Environment vs App Classification |
|---|---|---|---|
| HTTP `404` instead of `200` on missing seeded curriculum/exercise/question IDs | `29` | `exercises.api.test.ts` `1..7`; `grading.api.test.ts` `1..6, 9..11`; `curriculum.api.test.ts` `2, 5, 7, 8`; `auth-and-progress.api.test.ts` `4, 5`; `adaptive.api.test.ts` `6`; `adaptive-toeic.api.test.ts` `4, 5, 5b, 8` (`AssertionError: expected 404 to be 200`, e.g., [`grading.api.test.ts:17`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/grading.api.test.ts#L17)) | **Expected Missing Test Fixture (Seed Prerequisite)** — DB tables exist and return structured `404 NOT_FOUND` cleanly |
| Empty array (`length: 0`) where seeded Units/recommendations were expected | `5` | `curriculum.api.test.ts:47` (`expected [] to have a length of 20`), `curriculum.api.test.ts:74` (`expected 0 >= 1`), `adaptive.api.test.ts:90` (`recommendations.length: expected 0 > 0`), `adaptive-toeic.api.test.ts:175` (`targetUnits.length: expected 0 > 0`), `auth-and-progress.api.test.ts:278` (`mistakes.length: expected 0 >= 1`) | **Expected Missing Test Fixture (Seed Prerequisite)** |
| `0` vs expected seeded unit/completed counts (`totalUnits === 145` / `completedCount === 1`) | `2` (+ `1` `afterAll` hook) | `curriculum.api.test.ts:19` (`totalUnits: expected +0 to be 145`), `auth-and-progress.api.test.ts:249` (`completedCount: expected +0 to be 1`), plus [`auth-and-progress.api.test.ts:41`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/auth-and-progress.api.test.ts#L41) `afterAll` (`expect(unitsCount).toBe(145)`) | **Expected Missing Test Fixture (Seed Prerequisite)** |
| Undefined first element access after empty `quiz/generate` (`targetUnits = []`) | `1` (within the `35`) | `adaptive-toeic.api.test.ts:251` (`TypeError: Cannot read properties of undefined (reading 'difficulty')` because `quizRes.body.data.questions` is `[]` on empty `units`) | **Expected Missing Test Fixture (Seed Prerequisite)** |

*(Note on rate limits & AI during the run: `adaptive.api.test.ts` Test `2` exercised live Gemini `POST /api/v1/theory/explain-theory` using the staging key in `backend/.env.staging` and passed with `200` in `5.44s`, while `auth` rate limits stayed within `8/15` hits.)*

---

## 4. Post-Test Database Cleanup & Integrity Verification (`PASS`)

Immediately after `vitest run` terminated, live SQL `SELECT COUNT(*)` checks across **every table in `public`** confirmed:

- `users`: **`0`** (`100%` of `@grammarpath.local` test users deleted by `afterAll` hooks — including in `auth-and-progress.api.test.ts` where `prisma.user.delete` executed on lines `18–20` before line `41`'s `unitsCount === 145` assertion threw).
- `learning_progress`: **`0`**
- `exercise_attempts`: **`0`**
- `question_attempt_items`: **`0`**
- All `22` canonical tables: **`0`** (`0` unexpected rows created)
- `_prisma_migrations`: **`2`** rows intact (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`), `rolled_back_at = null`.

---

## 5. Offline Suite Confirmation (`PASS`)

Post-test offline verification (`grammarpath-app/backend`) confirmed all `3` hermetic unit suites pass (`36/36` tests: `22` security hardening + `8` pre-deployment hygiene + `6` staging guard).

