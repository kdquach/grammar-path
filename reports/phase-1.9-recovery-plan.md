# GrammarPath — Phase 1.9 Staging Backup, Recovery Plan & Readiness Gate

> **Date:** 2026-11-12  
> **Phase:** 1.9 — Controlled Dataset Import & API Re-Verification (Steps 2 & 3)  
> **Target Environment:** Neon Staging (`summer-resonance-11737918` / `br-blue-meadow-a1uyxgfp` / `grammarpath-staging`)  
> **Readiness Gate Verdict:** **PASS (`8/8` Gates Green — Authorized to Proceed with Staging-Only Import)**

---

## 1. Staging Branch & Database Identity (Re-Verified Pre-Import)

Live read-only verification against `.env.staging` (`2026-11-12 06:03:37 UTC`):
- **Neon Project ID:** `summer-resonance-11737918`
- **Neon Branch ID:** `br-blue-meadow-a1uyxgfp`
- **Neon Timeline ID:** `690b13b13a363aeeb3612b98e983d86f`
- **Neon Tenant ID:** `082a637a7d63100a47ca6cd3eb6f97dd`
- **Neon Compute Host (redacted):** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432`
- **Database Name / Role:** `grammarpath-staging` (`neondb_owner`, `public` schema, read-write `transaction_read_only = off`)
- **PostgreSQL Version:** `PostgreSQL 18.6 (ac70818)`
- **Pre-Import WAL Marker:** LSN `0/2246068` at `2026-11-12 06:03:37.16866+00` (`wal_level = replica`)
- **Pre-Import Database State:** `27` public tables (`26` application tables + `_prisma_migrations`):
  - `_prisma_migrations`: **`2`** rows (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`)
  - All `26` application tables (all `22` canonical tables + `users`, `learning_progress`, `exercise_attempts`, `question_attempt_items`): **`0` rows** (confirmed via `SELECT COUNT(*)` per table)
- **Cross-Repo Target Parity:** [`backend/.env.staging`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/.env.staging) and [`grammarpath-data/.env.staging`](file:///Users/kd.quach03/Documents/grammarpath-data/.env.staging) resolve to the **exact same** `DATABASE_URL` and `DIRECT_URL` (SHA-256 prefix `ebe8948a56f4`, host `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`, `sslmode=require`).

---

## 2. Neon Restore-Point & Branching Capability Assessment

- **Local Tooling Check (`neonctl`, `neon`, `pg_dump`, MCP plugins):**
  - `neonctl` / `neon` CLI: Not installed; `~/.config/neonctl`, `~/.neon`, and `NEON_*` env vars are absent; no Neon plugin/MCP account is connected.
  - `pg_dump` / `pg_restore` / `psql`: Not installed on host.
  - Therefore, a manual Neon Console branch or named restore point cannot be created programmatically from this terminal without Neon Control Plane credentials.
- **Database Engine & Empty-State Recoverability Assessment (`PASS`):**
  1. **Zero Data At Risk Pre-Import:** `grammarpath-staging` currently holds **`0` canonical rows and `0` user/progress/attempt rows** across all 26 application tables. Recreating or restoring an empty schema loses zero data.
  2. **Deterministic Schema Reconstruction:** The entire 26-table DDL (5 enums, 26 tables, 28 FKs, 21 `CHECK` constraints, 44 indexes) is versioned in [`grammarpath-app/backend/prisma/migrations/`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations). Running `npm run prisma:migrate:staging` on a clean `br-blue-meadow-a1uyxgfp` staging branch deterministically reproduces the exact pre-import state in ~1 second.
  3. **Neon Built-In History / Branching:** `pg_settings` confirms `wal_level = replica` and Neon WAL proposer/timeline `690b13b13a363aeeb3612b98e983d86f`. Should recovery ever be required after import, the project owner can use Neon Console's Branch Restore / Instant Branching on **`summer-resonance-11737918` / `br-blue-meadow-a1uyxgfp`** using pre-import marker **`2026-11-12 06:03:37 UTC` (`LSN 0/2246068`)**, OR drop/recreate **only** the isolated staging branch upon explicit user approval.
  4. **In-Flight Transaction Protection:** Every unit import executes inside an ACID PostgreSQL transaction (`180s` timeout) and rolls back cleanly on unit failure without half-written unit state.
  5. **Pre-Import State Snapshot Captured:** Local read-only baseline evidence (identity, WAL LSN, timestamp, `_prisma_migrations` checksums, and 26 zero row counts) was saved prior to Step 4.
- **No Destructive Branch Actions Taken:** Zero Neon branches created, modified, reset, or dropped. Production branches/databases remain 100% untouched.

---

## 3. Production Protection Guarantee

1. [`grammarpath-data/scripts/import/run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/run-with-staging-env.mjs) refuses `.env`, `.env.local`, `.env.prod*`, and `.example` files, strips inherited `DATABASE_URL`/`DIRECT_URL`/`POOLED_DATABASE_URL`, requires `STAGING_ISOLATED_CONFIRMED="true"`, and injects only `grammarpath-data/.env.staging`.
2. [`import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts) never imports `dotenv/config`, so it cannot silently load `grammarpath-data/.env`.
3. Every command in Phase 1.9 runs via `npm run ...:staging` (`staging:check`, `prisma:status:staging`, `import:staging`, `verify:staging`, `test:api:staging`), verified to target `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`.

---

## 4. Step 3 — Import Readiness Gate

| Check | Result | Evidence |
|---|---|---|
| **Staging isolation** | **PASS** | `npm run staging:check` passes in both repos; both `.env.staging` files match byte-for-byte (`ebe8948a56f4`) targeting `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`; live `pg_settings` confirms `summer-resonance-11737918` / `br-blue-meadow-a1uyxgfp`; production `.env` untouched. |
| **Migration state** | **PASS** | `npm run prisma:status:staging` reports `Database schema is up to date!` in both repos (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`; `26/26` tables empty). |
| **Importer safety** | **PASS** | Step 1 audit completed ([`phase-1.9-importer-audit.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-1.9-importer-audit.md)); critical `ON DELETE CASCADE` attempt-loss risk resolved via fail-closed `assertNoDependentLearnerAttempts` guard inside `tx`; `IMP-T1..IMP-T5` passed. |
| **Transaction safety** | **PASS** | Per-unit interactive `$transaction` (`180s` timeout / `30s` maxWait) + bounded retries on transient errors only; fail-closed live assertions on `indexUnit`, `AnswerKey`, `Explanation`, and `[SAFETY ABORT]` rollback strategy documented. |
| **Canonical validation** | **PASS** | `npm run test:preflight` (Stages 1–5 + 145-unit metric reconciliation), `npm run test:migration-sql`, `.venv/bin/python scripts/validate_data.py --all --strict-rule-prefix` (`146 passed, 0 failed`), and `npm run import:dry-run` all passed `100%`. |
| **Unit range** | **PASS** | `data/units` contains exactly `145` canonical units (`001..145`) + explicitly excluded `unit-template.json` (`validateCanonicalInventory` regex + payload + contiguity verified). |
| **Unit 110 integrity** | **PASS** | [`unit-110.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-110.json) `theory[].section_id = ["110A","110B","110C","110D"]` (`445560da7115562e8bc617bb867e83669c0ea3fcdad2811c638d8e1a73e8c123`); Unit 100 (`["100A","100B","100C"]`, `ed90d2b1...`) unaffected; `4,414/4,414` rule refs resolve locally. |
| **Recovery plan** | **PASS** | Neon project/branch/timeline/WAL marker recorded (`LSN 0/2246068`); pre-import state verified as `0` user/canonical rows (`100%` reconstructible from committed Prisma migrations + Neon Console restore window); no branch recreation executed. |

**Gate Outcome:** All **8/8** readiness checks are **`PASS`**. Authorized to proceed to Step 4 (`npm run import:staging`).

