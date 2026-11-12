# GrammarPath — Phase 1.8 Final Verification Report

> **Date:** 2026-11-12  
> **Phase:** 1.8 — Live Migration & API Integration Verification  
> **Final Verdict:** **`BLOCKED`** *(Live migration & schema parity: `PASS`; Full 52-test API integration suite & post-import verification: `BLOCKED` by missing canonical dataset seed prerequisite prohibited in Phase 1.8)*

---

## A. Environment

- **Staging Host:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` (`-pooler` endpoint `ep-small-dream-a1lqsn1r-pooler.ap-southeast-1.aws.neon.tech`, AWS `ap-southeast-1`, credentials redacted).
- **Database Name / Role:** `grammarpath-staging` (`current_user = neondb_owner`, `current_schema = public`, `transaction_read_only = off`).
- **PostgreSQL Version:** `PostgreSQL 18.6 (ac70818) on aarch64-unknown-linux-gnu, 64-bit`.
- **Project Isolation Verification Result (`PASS`):**
  - `npm run staging:check` succeeded in both `grammarpath-app/backend` and `grammarpath-data`, and redacted URL hashes confirmed identical host/port/database/SSL coordinates (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`, `sslmode=require`, `channel_binding=require`).
  - Live `pg_settings` established Neon project identity `neon.project_id = summer-resonance-11737918`, `neon.branch_id = br-blue-meadow-a1uyxgfp`, `neon.compute_id = compute-dawn-cloud-a1381kh9`, and `neon.console_url` endpoint `ep-small-dream-a1lqsn1r`, matching the owner's staging project specification.
  - Pre-migration `information_schema.tables` confirmed **`0` existing public tables**, verifying an empty isolated staging instance cleanly separated from populated production.
- **Production Never Accessed:** Confirmed. [`backend/.env`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/.env) and [`grammarpath-data/.env`](file:///Users/kd.quach03/Documents/grammarpath-data/.env) were never read, printed, or modified; [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs) and [`tests/setup.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/setup.ts) prevented silent `.env` fallback on every Prisma and Vitest execution.

---

## B. Migration

- **Authoritative Repository:** `grammarpath-app/backend` owns the complete `2`-migration chain (`26` tables); `grammarpath-data` maintains only the canonical `22`-table baseline (`20261105000000_init_schema`, SHA-256 identical) and did not execute DDL migrations.
- **Migration Files Applied (Staging Only via `npm run prisma:migrate:staging` -> `prisma migrate deploy`):**
  1. `20261105000000_init_schema` — SHA-256 `83d240dcac514168b953a26d2d7fed6aa800e4f6eab662b9fb0172c36bb3eae0` (`applied_steps_count = 1`, `logs = null`)
  2. `20261106000000_add_user_progress_tables` — SHA-256 `659e086db5fc1fad6ee07d9e52a69d6c8324b7f3652c0e38bac7344acebc7e41` (`applied_steps_count = 1`, `logs = null`)
- **Migration Status:** Both `grammarpath-app/backend` and `grammarpath-data` report `Database schema is up to date!`; re-running `npm run prisma:migrate:staging` confirmed idempotency (`No pending migrations to apply.`).
- **Schema Verification (`PASS`):** Programmatic inspection of live PostgreSQL `18.6` against committed SQL confirmed **`26/26` tables**, **`5/5` enums**, **`180/180` columns** (`0` type mismatches, `0` nullability mismatches), **`26/26` primary keys**, **`28/28` foreign keys** (`27 CASCADE`, `1 RESTRICT`), **`21/21` custom SQL `CHECK` constraints**, **`44/44` non-PK indexes** (`30` unique + `14` query optimization indexes; `70` total with PKs), and **`0` seeded rows**.
- **Drift / Errors:** **`0` schema drift and `0` migration errors**.

---

## C. API Tests

- **52-Test Result Breakdown (`npm run test:api:staging`, Duration `15.71s`, `exit 1`):**
  - `adaptive.api.test.ts`: **`5 passed / 2 failed / 0 skipped`** (`7` total — auth, validation, and live Gemini `POST /api/v1/theory/explain-theory` passed; `1` and `6` failed without seeded Unit 1/Questions)
  - `adaptive-toeic.api.test.ts`: **`4 passed / 6 failed / 0 skipped`** (`10` total — register, auth guards, and `400` validation passed; `4, 5, 5b, 7, 8, 9` failed without seeded Units)
  - `auth-and-progress.api.test.ts`: **`3 passed / 4 failed / 0 skipped`** (`7` total — `register`, `login`, `me` passed; `4..7` failed without seeded `1.1` / Unit 1, and `afterAll:41` failed asserting `unitsCount === 145` after user cleanup)
  - `grading.api.test.ts`: **`2 passed / 9 failed / 0 skipped`** (`11` total — statelessness `7` & error handling `8` passed; `1..6, 9..11` returned `404` on empty `questions`)
  - `curriculum.api.test.ts`: **`2 passed / 7 failed / 0 skipped`** (`9` total — `400` validation `6` & `404` unknown route `9` passed; `1..5, 7, 8` failed on `0` Books/Units/Sections)
  - `exercises.api.test.ts`: **`1 passed / 7 failed / 0 skipped`** (`8` total — `404` handler `8` passed; `1..7` failed `404` on empty `exercises`)
  - **Combined Total:** **`17 passed / 35 failed / 0 skipped` (`52` tests)**.
- **Root Causes:** All `35` test failures (and the read-only `npm run verify:staging` failure `Count mismatch on table books: expected 1, got 0`) stemmed from one single test-prerequisite condition: **canonical textbook data (`145` Units / `4,414` Questions) is unseeded (`0` rows)** because Phase 1.8 Sections 2 & 11 explicitly excluded canonical dataset import. Zero backend logic or migration defects were detected.
- **Cleanup Verification (`PASS`):** Post-run live database query confirmed **`0` rows across all `26` application tables** (`users = 0`, `learning_progress = 0`, `exercise_attempts = 0`, `question_attempt_items = 0`) and intact `_prisma_migrations` (`2` rows).

---

## D. Data Integrity

- **Canonical Dataset Validation (`PASS`):** Post-verification checks in `grammarpath-data` passed offline:
  - `npm run test:preflight`: **PASS** (`145` Units, `549` Exercises, `4,414` Questions, `542` theory sections, `639` theory illustrative examples, `4,414` Answer Keys, `4,414` Explanations; `4,414/4,414` rule references resolved).
  - `.venv/bin/python scripts/validate_data.py --all --strict-rule-prefix`: **`146 passed, 0 failed`**.
  - `grammarpath-app/backend` `npm run typecheck && npm run build && npm run test:migrations && npm run test:unit`: **PASS** (`36/36` unit tests).
  - `grammarpath-data` `npm run verify:staging` (verified read-only `verify-import.ts` prior to run): exited `1` on `books: 0 !== 1`, confirming zero canonical rows reside in `grammarpath-staging`.
- **Unit 110 Integrity (`PASS`):** [`data/units/unit-110.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-110.json) `theory[0].section_id` remains `"110A"` (`['110A', '110B', '110C', '110D']`) with unchanged SHA-256 `445560da7115562e8bc617bb867e83669c0ea3fcdad2811c638d8e1a73e8c123` (and `unit-100.json` unchanged at `ed90d2b1c36d73449699a804e5c3d47328574f1a1a12aa2b9368ff8b76414d61`).
- **No Canonical Data Imported or Modified:** Confirmed (`0` rows across all `22` canonical tables in `grammarpath-staging`; zero canonical JSON edits).

---

## E. Safety

- **Production database writes:** `0`
- **Production migrations:** `0`
- **Dataset imports:** `0`
- **Unit 110 SQL reconciliation operations:** `0`
- **Canonical JSON modifications during this phase:** `0`

---

## F. Final Verdict

**`BLOCKED`**

- **Why `BLOCKED` (and not `PASS` or `FAIL`):**
  1. All staging environment isolation, PostgreSQL `18.6` live migrations (`2/2`), schema parity (`26/26` tables, `5/5` enums, `28/28` FKs, `21/21` `CHECK` constraints, `44/44` non-PK indexes), test-user cleanup (`0` leftover rows), and canonical data integrity checks **PASSED** with zero defects found.
  2. However, full execution of the `52` API integration tests and `verify:staging` **cannot pass until canonical dataset seeding (`145` Units / `4,414` Questions) is performed**, which was explicitly out of scope (`Section 11`) in Phase 1.8. Under Section 12.F rules (`BLOCKED` — safety, migration, or test prerequisites failed), full API verification remains blocked on the staging dataset-import phase.
- **Recommended Next Step (When Authorized):** Proceed to a dedicated staging dataset import phase (`npm run import:staging && npm run verify:staging` in `grammarpath-data`), followed by re-running `npm run test:api:staging` (`52/52` expected to pass) and testing Unit 110 SQL reconciliation in staging before any production action.

---

### Deliverables Created Under [`grammarpath-app/reports/`](file:///Users/kd.quach03/Documents/grammarpath-app/reports)
1. [`phase-1.8-environment-verification.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.8-environment-verification.md)
2. [`phase-1.8-live-migration-report.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.8-live-migration-report.md)
3. [`phase-1.8-database-schema-verification.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.8-database-schema-verification.md)
4. [`phase-1.8-api-integration-test-report.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.8-api-integration-test-report.md)
5. [`phase-1.8-final-report.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.8-final-report.md)

