# GrammarPath — Production Migration Deployment Runbook (`20261113000000_add_practice_sessions`)

> **Date:** 2026-11-12  
> **Migration Folder:** `backend/prisma/migrations/20261113000000_add_practice_sessions/migration.sql`  
> **File SHA-256:** `976b5ee311bf8c64b1cc971d737dbe2628def72ccc697181e78cb1407b2c64a7`  
> **Nature of Change:** Purely additive DDL (creates `3` new tables, `4` non-unique B-tree indexes, `3` `ON DELETE CASCADE` foreign keys; `0` `DROP`, `ALTER`, or DML rewrite statements).

---

## 1. Expected Schema Changes

Applying [migration.sql](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations/20261113000000_add_practice_sessions/migration.sql) creates:

1. **Tables (`3`):**
   - `adaptive_quiz_sessions` (`id` PK UUID, `user_id` UUID, `difficulty`, `question_ids` JSONB, `target_units` JSONB, `created_at` TIMESTAMPTZ(6))
   - `toeic_practice_sessions` (`id` PK UUID, `user_id` UUID, `unit_number` INT, `difficulty`, `source`, `requested_count`, `actual_count`, `created_at` TIMESTAMPTZ(6))
   - `toeic_practice_items` (`id` PK UUID, `session_id` UUID, `item_order` INT, `source`, `prompt`, `options` JSONB, `correct_answer` VARCHAR(10), `explanation`, `rule_reference`, `student_answer`, `is_correct`, `attempt_count`, `answered_at`)
2. **Indexes (`4`):**
   - `adaptive_quiz_sessions_user_id_created_at_idx`
   - `toeic_practice_sessions_user_id_created_at_idx`
   - `toeic_practice_sessions_user_id_unit_number_idx`
   - `toeic_practice_items_session_id_item_order_idx`
3. **Foreign Keys (`3`, all `ON DELETE CASCADE ON UPDATE CASCADE`):**
   - `adaptive_quiz_sessions_user_id_fkey` -> `users(id)`
   - `toeic_practice_sessions_user_id_fkey` -> `users(id)`
   - `toeic_practice_items_session_id_fkey` -> `toeic_practice_sessions(id)`

No existing canonical or user-progress tables (`books`, `units`, `questions`, `users`, `learning_progress`, `exercise_attempts`, `question_attempt_items`) are locked for rewrite or altered structurally other than standard lightweight FK registration on `users`.

---

## 2. Preconditions

Before running any production command:
1. Build & CI checks pass on the target release commit (`cd backend && npm run typecheck && npm run build && npm run test:migrations && npm run test:unit`).
2. Confirm `schema.prisma` reads `DATABASE_URL`: set `DATABASE_URL` in your migration shell to the **direct (non-pooled)** PostgreSQL endpoint for production (`-pooler` endpoints are unsuitable for Prisma advisory migration locks).
3. **Forbidden Commands:** NEVER run `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, or run migrations from `grammarpath-data`.

---

## 3. Production Database Identity Verification

Verify target identity in `psql` or Neon SQL Editor before taking snapshots or migrating (redacted URL, never paste credentials in logs):

```sql
SELECT
  current_database() AS database_name,
  current_user       AS db_user,
  inet_server_addr() AS server_addr,
  version()          AS pg_version;

SELECT
  migration_name,
  checksum,
  finished_at,
  rolled_back_at,
  applied_steps_count
FROM "_prisma_migrations"
ORDER BY started_at ASC;
```

**Expected pre-migration state:**
- `database_name` equals the **production** database name (must **NOT** be `grammarpath-staging` or `ep-small-dream-a1lqsn1r...`).
- `pg_version` reports PostgreSQL `18.6` (matching verified staging major/minor version).
- `_prisma_migrations` shows exactly `2` prior rows (`20261105000000_init_schema` and `20261106000000_add_user_progress_tables`), both with `finished_at IS NOT NULL` and `rolled_back_at IS NULL`.
- Confirm via CLI (using production direct `DATABASE_URL`):
  ```bash
  npx prisma migrate status
  ```
  Output must report `20261113000000_add_practice_sessions` as the **only** pending migration (`Database schema is not yet up to date`, `1` migration not yet applied). Stop immediately if any migration is marked failed or modified.

---

## 4. Backup & Recovery Strategy

Because Neon supports copy-on-write branching and Point-In-Time Recovery (PITR):
1. Create a named Neon pre-migration snapshot branch (e.g., `pre-mig-20261113-practice-sessions`) on the **production** Neon project targeting the exact current timestamp before applying DDL.
2. Record existing production row counts prior to migration:
   ```sql
   SELECT
     (SELECT COUNT(*) FROM books)                 AS books,
     (SELECT COUNT(*) FROM units)                 AS units,
     (SELECT COUNT(*) FROM questions)             AS questions,
     (SELECT COUNT(*) FROM users)                 AS users,
     (SELECT COUNT(*) FROM exercise_attempts)     AS attempts,
     (SELECT COUNT(*) FROM question_attempt_items) AS attempt_items;
   ```

---

## 5. Exact Migration Command

Execute from `grammarpath-app/backend` with `DATABASE_URL` exported in the operator shell pointing strictly to the **direct non-pooled** production database:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

Expected output from `npx prisma migrate deploy`:
- `Applying migration 20261113000000_add_practice_sessions`
- `All migrations have been successfully applied.`
Expected output from `npx prisma migrate status`:
- `3 migrations found in prisma/migrations`
- `Database schema is up to date!`

---

## 6. Post-Migration Verification SQL & Runtime Checks

Run immediately after `prisma migrate deploy`:

```sql
-- 1. Verify _prisma_migrations entry succeeded with zero failures
SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20261113000000_add_practice_sessions';

-- 2. Verify all 3 tables exist in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'adaptive_quiz_sessions',
    'toeic_practice_sessions',
    'toeic_practice_items'
  )
ORDER BY table_name;

-- 3. Verify all 4 new indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'adaptive_quiz_sessions_user_id_created_at_idx',
    'toeic_practice_sessions_user_id_created_at_idx',
    'toeic_practice_sessions_user_id_unit_number_idx',
    'toeic_practice_items_session_id_item_order_idx'
  )
ORDER BY indexname;

-- 4. Verify all 3 foreign key constraints exist
SELECT conname AS constraint_name, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'f'
  AND conname IN (
    'adaptive_quiz_sessions_user_id_fkey',
    'toeic_practice_sessions_user_id_fkey',
    'toeic_practice_items_session_id_fkey'
  )
ORDER BY conname;
```

Then confirm existing row counts match the pre-migration snapshot (`books`, `units`, `questions`, `users`, `exercise_attempts`, `question_attempt_items`), and verify API health after deployment:
```bash
curl -fsS https://<production-api-host>/api/v1/health
# Expect HTTP 200: {"success":true,"data":{"status":"ok","database":"connected","totalUnits":145}}
```

---

## 7. Rollback Limitations & Application Compatibility

- **Prisma Rollback Limitation:** Prisma Migrate does **not** auto-generate down-migrations. Once user traffic writes rows to `adaptive_quiz_sessions`, `toeic_practice_sessions`, or `toeic_practice_items`, dropping these tables (`DROP TABLE ...`) is **irreversible data loss** for those session records.
- **Preferred Recovery Path:**
  - If an emergency code rollback is required *after* schema deployment, **roll back the application code only** while leaving the additive tables intact (`users` and core progress tables are untouched, and prior application releases ignore the 3 new tables without errors).
  - Only restore from the pre-migration Neon snapshot/branch (`pre-mig-20261113-practice-sessions`) if full database restoration is mandated; note that PITR/branch restoration discards all writes occurring between migration and restore time.
- **Deployment Sequencing & Compatibility Requirement:**
  - **Migrate database FIRST**, then roll out the new backend (`dist/src/server.js` compiled with regenerated Prisma Client) and frontend (`frontend/dist`) artifacts. Deploying the new backend before applying `20261113000000_add_practice_sessions` will cause Adaptive Quiz and TOEIC Practice endpoints to fail with PostgreSQL relation-not-found errors.

