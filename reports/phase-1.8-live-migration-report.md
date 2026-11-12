# GrammarPath — Phase 1.8 Live Migration Execution Report

> **Date:** 2026-11-12  
> **Phase:** 1.8 — Live Migration & API Integration Verification  
> **Target:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (`neon.project_id = summer-resonance-11737918`)  
> **Migration Outcome:** **PASS** (`2/2` authoritative backend migrations applied via `prisma migrate deploy` and idempotency verified)

---

## 1. Repository Ownership & Pre-Migration Review (`PASS`)

### 1.1 Migration Chain Reconciliation Between Repositories
| Repository | Migrations Present | Schema Scope | Role / Authority |
|---|---|---|---|
| `grammarpath-app/backend` | `2` migrations (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`) | Full application schema: `26` tables, `5` enums, `28` FKs, `21` custom `CHECK` constraints, `44` non-PK indexes | **Authoritative application migration owner** |
| `grammarpath-data` | `1` baseline migration (`20261105000000_init_schema`) | Canonical content subset: `22` tables, `4` enums, `21` FKs, `21` `CHECK` constraints, `37` indexes | **Canonical dataset pipeline only** (must never run independent schema migrations against app DBs) |

- **Baseline congruence verified:** `20261105000000_init_schema/migration.sql` and `migration_lock.toml` are byte-for-byte identical in both repositories (SHA-256 `83d240dcac514168b953a26d2d7fed6aa800e4f6eab662b9fb0172c36bb3eae0`).

### 1.2 Pre-Execution Safety & Checksum Audit
Before executing any DDL:
1. Pre-migration `npm run prisma:status:staging` in `grammarpath-app/backend` reported `2 migrations found in prisma/migrations`, both pending (`20261105000000_init_schema`, `20261106000000_add_user_progress_tables`).
2. `shasum -a 256` recorded exact migration SQL hashes:
   - `20261105000000_init_schema/migration.sql`: `83d240dcac514168b953a26d2d7fed6aa800e4f6eab662b9fb0172c36bb3eae0`
   - `20261106000000_add_user_progress_tables/migration.sql`: `659e086db5fc1fad6ee07d9e52a69d6c8324b7f3652c0e38bac7344acebc7e41`
3. Keyword scan (`DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, `INSERT`) confirmed **0 destructive statements** and **0 DML rewrites** (only `ON DELETE CASCADE` / `ON DELETE RESTRICT` / `ON UPDATE CASCADE` foreign-key clauses matched).

---

## 2. Live Staging Migration Execution (`PASS`)

Executed command (only `grammarpath-app/backend` authoritative chain; no `migrate dev`, `migrate reset`, or `db push`):

```bash
cd /Users/kd.quach03/Documents/grammarpath-app/backend
npm run prisma:migrate:staging
```

Observed output:
```text
[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "grammarpath-staging", schema "public" at "ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech"

2 migrations found in prisma/migrations

Applying migration `20261105000000_init_schema`
Applying migration `20261106000000_add_user_progress_tables`

All migrations have been successfully applied.
```

---

## 3. Post-Migration `_prisma_migrations` & Idempotency Verification (`PASS`)

### 3.1 Live `_prisma_migrations` Table State
| `migration_name` | Recorded `checksum` (SHA-256) | Matches Local SQL? | `finished_at` (UTC) | `rolled_back_at` | `applied_steps_count` | `logs` |
|---|---|---|---|---|---|---|
| `20261105000000_init_schema` | `83d240dcac514168b953a26d2d7fed6aa800e4f6eab662b9fb0172c36bb3eae0` | **YES** | `2026-11-12 05:42:48.050953+00` | `null` | `1` | `null` |
| `20261106000000_add_user_progress_tables` | `659e086db5fc1fad6ee07d9e52a69d6c8324b7f3652c0e38bac7344acebc7e41` | **YES** | `2026-11-12 05:42:48.314669+00` | `null` | `1` | `null` |

### 3.2 Status & Idempotency Re-Checks
1. `grammarpath-app/backend` `npm run prisma:status:staging` -> `2 migrations found in prisma/migrations` -> `Database schema is up to date!`
2. `grammarpath-app/backend` repeat `npm run prisma:migrate:staging` -> `No pending migrations to apply.` (`exit 0`, clean no-op).
3. `grammarpath-data` `npm run prisma:status:staging` -> `1 migration found in prisma/migrations` -> `Database schema is up to date!` (confirming `20261105000000_init_schema` baseline history matches seamlessly without needing `grammarpath-data` to apply migrations).

