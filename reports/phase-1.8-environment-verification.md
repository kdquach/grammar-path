# GrammarPath — Phase 1.8 Staging Environment Verification Report

> **Date:** 2026-11-12  
> **Phase:** 1.8 — Live Migration & API Integration Verification  
> **Scope:** Staging configuration guard verification, endpoint parity across both repositories, Neon project/database identity check (read-only), and production-isolation audit.

---

## 1. Staging Configuration & Isolation Preflight (`PASS`)

### 1.1 Fail-Closed Staging Guards
Both repositories passed `npm run staging:check` cleanly without reading `.env` or printing credentials:

- **Backend (`grammarpath-app/backend`):**
  `[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` (`exit 0`)
- **Data Pipeline (`grammarpath-data`):**
  `[Data Staging Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` (`exit 0`)

### 1.2 Sanitized Endpoint Parity & Env Loading Audit
Redacted URL metadata extracted from both `.env.staging` files confirmed exact parity:

| Setting / Coordinate | `grammarpath-app/backend/.env.staging` | `grammarpath-data/.env.staging` | Match |
|---|---|---|---|
| `STAGING_ISOLATED_CONFIRMED` | `"true"` | `"true"` | **YES** |
| `DATABASE_URL` host / port / db | `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | **YES** (`hash 1a1d653217f7`) |
| `DIRECT_URL` host / port / db | `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | **YES** (`hash 1a1d653217f7`) |
| `POOLED_DATABASE_URL` host / port / db | `ep-small-dream-a1lqsn1r-pooler.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | `ep-small-dream-a1lqsn1r-pooler.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` | **YES** (`hash 530c43807482`) |
| TLS / Channel Binding | `sslmode=require`, `channel_binding=require` | `sslmode=require`, `channel_binding=require` | **YES** |
| Runtime Flags (`backend` only) | `NODE_ENV="test"`, `PORT=4100`, `GEMINI_API_KEY` set (`redacted`) | — | N/A |

- **No silent `.env` fallback verified:**
  - [`backend/scripts/run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs) and [`grammarpath-data/scripts/import/run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/run-with-staging-env.mjs) strip inherited sensitive env vars and inject explicit `.env.staging` keys (`DATABASE_URL`, `DIRECT_URL`, `POOLED_DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`) into child processes before `prisma`, `tsx`, or `vitest` start.
  - Prisma CLI still logs `Environment variables loaded from .env`, but because `dotenv` runs non-overriding (`override: false`) and the wrapper already populates `DATABASE_URL`, `DIRECT_URL`, `POOLED_DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, and `GEMINI_API_KEY`, Prisma connected strictly to `"grammarpath-staging" at "ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech"` on every command.
  - [`tests/setup.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/setup.ts) blocks bare `vitest run` fallback by pinning unreachable `127.0.0.1:1` when `DATABASE_URL` is absent.
  - [`backend/.env`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/.env) and [`grammarpath-data/.env`](file:///Users/kd.quach03/Documents/grammarpath-data/.env) were never opened, printed, or altered.

---

## 2. Live PostgreSQL Connection & Neon Project Identity Verification (`PASS`)

Read-only SQL queries executed against `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` before any DDL confirmed:

| Inspection Field | Observed Live Result | Expected / Required | Status |
|---|---|---|---|
| `current_database()` | `grammarpath-staging` | `grammarpath-staging` | **PASS** |
| `current_user` | `neondb_owner` | Valid staging role | **PASS** |
| `version()` | `PostgreSQL 18.6 (ac70818) on aarch64-unknown-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit` | PostgreSQL 18 | **PASS** |
| `server_version` | `18.6 (ac70818)` | `18.6` | **PASS** |
| `current_schema()` | `public` | `public` | **PASS** |
| `transaction_read_only` | `off` | `off` (writable) | **PASS** |
| Pre-migration `public` base tables | `0` (`[]`) | `0` empty staging DB | **PASS** |

### Neon Project Identity Evidence (`pg_settings`)
No `neonctl` CLI, local Neon credentials (`~/.config/neonctl`, `~/.neon`), or `NEON_API_KEY` env vars exist on the host, and production `.env` was never inspected to compare project IDs. Instead, project isolation was established programmatically via PostgreSQL `pg_settings` combined with the repository owner's verified Neon Console parameters:

- `neon.project_id`: `summer-resonance-11737918`
- `neon.branch_id`: `br-blue-meadow-a1uyxgfp`
- `neon.compute_id`: `compute-dawn-cloud-a1381kh9`
- `neon.compute_mode`: `primary`
- `neon.console_url`: `http://neon-control-plane-api.neon-control-plane.svc.cluster.local:9096/compute/api/v2/endpoints/ep-small-dream-a1lqsn1r/dbs_and_roles`
- `neon.pageserver_connstring`: `host=pageserver-23.ap-southeast-1.aws.neon.tech port=6400`
- Pre-migration table inventory in `public`: **`0` tables**, proving the target was a clean empty database rather than the populated `26`-table production instance.

