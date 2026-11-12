# GrammarPath — Phase 1.9 Importer Audit Report

> **Date:** 2026-11-12  
> **Phase:** 1.9 — Controlled Dataset Import & API Re-Verification (Step 1: Preflight & Importer Audit)  
> **Target Script Audited:** [`scripts/import/import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts) & [`npm run import:staging`](file:///Users/kd.quach03/Documents/grammarpath-data/package.json#L16)  
> **Audit Result:** **PASS (After Pre-Import Safeguard Hardening — Pre-Audit Critical Cascade Hazard Resolved Fail-Closed)**

---

## 1. Exact `npm run import:staging` Execution Chain

Inspected [`grammarpath-data/package.json`](file:///Users/kd.quach03/Documents/grammarpath-data/package.json#L16):
```text
npm run import:staging
  └─> node scripts/import/run-with-staging-env.mjs -- ./node_modules/.bin/tsx scripts/import/import-to-db.ts
```

1. [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/run-with-staging-env.mjs):
   - Reads strictly `grammarpath-data/.env.staging` (rejects `.env`, `.env.local`, `.env.prod*`, `.example`).
   - Requires `STAGING_ISOLATED_CONFIRMED="true"`, non-placeholder URLs, and `sslmode=require` on `*.neon.tech`.
   - Strips inherited `DATABASE_URL`, `DIRECT_URL`, and `POOLED_DATABASE_URL`, injects only `.env.staging` values into `childEnv`, and spawns `./node_modules/.bin/tsx scripts/import/import-to-db.ts` (`shell: false`).
   - Note: `import-to-db.ts` does NOT import `dotenv/config`, so `@prisma/client` uses exclusively `childEnv.DATABASE_URL` (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`).
   - Notice: `npm run import:staging` invokes `import-to-db.ts` **without `--resume`**, meaning every existing unit encountered in DB triggers the unit-replacement path unless protected.

---

## 2. Import Execution Flow

1. **CLI Parsing (`parseCliArgs`):** Parses `--dry-run`, `--resume`, `--force`, `--units=...` (hardened in Phase 1.9 to reject invalid tokens and out-of-range units outside `1..145`), and `--report=...`.
2. **Tier 1 Preflight (`validateCanonicalInventory`):** Scans `data/units/`:
   - Applies strict regex `^unit-(?:00[1-9]|0[1-9][0-9]|1[0-3][0-9]|14[0-5])\.json$`.
   - Explicitly excludes `unit-template.json`.
   - Rejects any rogue/out-of-range `.json` file (`unit-146.json`, etc.).
   - Parses JSON and verifies `payload.unit_number === expectedUnitNum`, zero duplicates, and full `1..145` contiguity (`145` files exact).
3. **Tier 2 Preflight (`scripts/validate_data.py --all --strict-rule-prefix`):** Hardened in Phase 1.9 to pass `--strict-rule-prefix`. Validates all 146 JSON files (`unit-001..145` + `unit-template.json`) against [`schemas/unit.schema.json`](file:///Users/kd.quach03/Documents/grammarpath-data/schemas/unit.schema.json), answer consistency, non-empty strings, consecutive 1-based blanks, OCR review tags, source page bounds `[1, 399]`, strict unit-prefix alignment (`110A`, etc.), and intra-unit `rule_reference` resolution before opening any database connection.
4. **Metadata Load:** Reads [`data/index.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/index.json) `book_metadata` and `units[]`.
5. **Book Catalog Upsert (`prisma.book.upsert`):** Upserts singleton row on unique `(title, edition)` (`"English Grammar in Use"`, `"4th Edition"`). Preserves `books.id` UUID.
6. **Per-Unit Loop (`1..145`):**
   - Computes SHA-256 of raw JSON bytes (`computeFileSha256`).
   - **Triple-Key Resume Guard (when `--resume && !--force`):** Skips unit if `units.source_file_sha256 === fileSha256`, `mapping_version === "1.0.0"`, and `unit_validation.status === "completed"`.
   - **Unit Transaction (`executeWithRetry` wrapping `prisma.$transaction`, `timeout: 180000ms`, `maxWait: 30000ms`):**
     1. Checks `existingUnit` on `(bookId, unitNumber)`.
     2. **Learner Attempt Cascade Safety Guard (`assertNoDependentLearnerAttempts` — added pre-import in Phase 1.9):** If `existingUnit` exists, checks `exercise_attempts` and `question_attempt_items` for rows referencing `unitId` exercises/questions and fails closed (`[SAFETY ABORT]`, `nonRetryable = true`) before any delete runs.
     3. **20-Step Reverse-Dependency Child Delete Sequence:** Deletes leaf-to-parent child rows scoped to `unitId`.
     4. **Unit Upsert (`tx.unit.upsert`):** Updates `units` row in place (`units.id` UUID preserved!).
     5. **Forward Insert Order:** `unit_source_pages` -> `theory_sections` + `theory_section_source_pages` -> `textbook_examples` + `textbook_example_source_pages` -> `exercises` + `exercise_word_bank_items` -> `questions` (`question_source_pages`, `question_options` via `parseQuestionOptions`, `question_blanks` + `blank_accepted_answers`, `question_parts` + `part_accepted_answers`, `accepted_answers`, `answer_keys` + `answer_key_source_pages`, `explanations`) -> `unit_validation` -> `unresolved_items`.

---

## 3. Tables Written, Updated, and Deleted/Replaced

| Operation | Tables Affected | Notes |
|---|---|---|
| **Upserted (UUID preserved)** | `books`, `units` | `books` updated on `(title, edition)`; `units` updated on `(book_id, unit_number)` so `learning_progress.unit_id` FKs never break or cascade. |
| **Written / Replaced per Unit (20 child tables)** | `blank_accepted_answers`, `part_accepted_answers`, `question_blanks`, `question_parts`, `question_options`, `question_source_pages`, `accepted_answers`, `answer_key_source_pages`, `answer_keys`, `explanations`, `questions`, `exercise_word_bank_items`, `exercises`, `textbook_example_source_pages`, `textbook_examples`, `theory_section_source_pages`, `theory_sections`, `unit_source_pages`, `unit_validation`, `unresolved_items` | Deleted in reverse dependency order and recreated with new child UUIDs when an existing unit is re-imported without skipping. |
| **Read-Only Guarded (never written/deleted)** | `exercise_attempts`, `question_attempt_items` | Inspected via SQL inside `tx` (`assertNoDependentLearnerAttempts`) prior to any child delete; non-zero counts abort the transaction before any delete occurs. |
| **Untouched** | `users`, `learning_progress`, `_prisma_migrations` | Zero writes, zero deletions, zero schema mutations. |

---

## 4. Transaction Behavior, Cascade Risks & Data-Loss Safeguards

### Transaction & Retry Behavior
- **Per-Unit Atomicity:** Each unit runs in one PostgreSQL interactive transaction (`180s` timeout, `30s` maxWait). Any DB error or invariant failure inside Unit `N` rolls back Unit `N` cleanly (`0` half-written unit state).
- **Bounded Retries (`executeWithRetry`):** Retries up to 3 times (`1s, 3s, 5s`) strictly on transient connectivity/timeout errors (`P1001, P1002, P1008, P1017, P2024, P2028`, socket timeouts). Non-transient errors (`P2xxx` constraint errors, `[SAFETY ABORT]`, missing answer key/explanation) fail immediately without retry.
- **Run-Level Boundary:** `book.upsert` and each unit transaction commit sequentially (`145` transactions rather than 1 monolithic transaction due to WAN round-trip latency). If Unit `k` aborts fatally mid-run, Units `1..k-1` remain committed and Units `k..145` are absent until resumed with `--resume`.

### Pre-Hardening Critical Finding vs Resolved Safeguard (Audit Question #11)
- **Pre-Hardening Audit Finding (`CRITICAL — UNSAFE WITHOUT GUARD ON POPULATED DBs`):**  
  In [`20261106000000_add_user_progress_tables/migration.sql`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations/20261106000000_add_user_progress_tables/migration.sql#L78-L96):
  - `learning_progress.unit_id -> units.id` (`ON DELETE CASCADE`): safe across re-imports because `units` is upserted (`units.id` never deleted).
  - **`exercise_attempts.exercise_id -> exercises.id` (`ON DELETE CASCADE`)** and **`question_attempt_items.question_id -> questions.id` (`ON DELETE CASCADE`)**: [`grammarpath-data/prisma/schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-data/prisma/schema.prisma#L3) excludes user tables (`// Future progress tables removed`), and previously `import-to-db.ts` lines 568–590 executed `tx.question.deleteMany` and `tx.exercise.deleteMany` without checking learner attempts. On any populated database holding `exercise_attempts` or `question_attempt_items`, running `npm run import:staging`, `import:db`, `--force`, or re-importing a modified unit JSON would **silently cascade-delete user exercise attempts and mistake history**.
- **Required Safeguards Implemented Before Step 3 Readiness Gate:**
  1. **Added `assertNoDependentLearnerAttempts(tx, unitId, unitNum)` inside [`import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts#L163-L209):** Runs inside `tx` right before the 20-step delete sequence whenever `existingUnit` exists; checks `to_regclass('public.exercise_attempts')` and `to_regclass('public.question_attempt_items')` and aborts fail-closed (`nonRetryable = true`) if any learner attempt references that unit's exercises or questions.
  2. **Added `--strict-rule-prefix` to Tier 2 Preflight ([`import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts#L298)):** Ensures Unit 110 style `section_id`/`rule_reference` mismatches always fail before DB connection.
  3. **Live-Mode Parity Assertions ([`import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts#L611-L613,L920-L958)):** Added explicit fail-fast checks in live mode for missing `indexUnit`, invalid `correct_answer` string mapping, missing `AnswerKey`, and missing `Explanation` inside `tx`.
  4. **CLI `--units` Bounds Guard ([`import-to-db.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts#L121-L152)):** Rejects invalid/out-of-range units outside `1..145` and empty target sets.
  5. **Automated Preflight Unit Verification ([`run-preflight-tests.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/run-preflight-tests.ts#L690-L768)):** Added Stage 5 (`IMP-T1..IMP-T5`) proving all guards behave deterministically (`PASS`).

---

## 5. Required 14-Item Audit Matrix

| # | Audit Question | Status | Evidence & Finding |
|---:|---|---|---|
| 1 | Does importing an existing Unit delete and recreate its child records? | **PASS (Verified Behavior)** | Yes when not skipped by `--resume`: lines `568–590` (post-edit lines `638–660`) delete 20 child tables scoped to `unitId` inside `tx` and reinsert fresh child rows, while `units` is upserted (`unit.id` preserved). Skipped cleanly with `--resume` when hash/version/status match. |
| 2 | Can a failed import leave partial data? | **PASS (Bounded & Recoverable)** | Single-unit failures roll back atomically via PostgreSQL `$transaction`. Multi-unit runs commit per unit (`145` sequential transactions); a mid-run fatal error leaves earlier units intact and is safely resumable via `--resume`. |
| 3 | Are writes wrapped in transactions? | **PASS** | All per-unit deletes and writes execute inside `prisma.$transaction(..., { timeout: 180000, maxWait: 30000 })` wrapped by `executeWithRetry`. Singleton `book.upsert` is outside the unit loop and idempotent. |
| 4 | Does the importer preserve stable source IDs? | **PASS** | All canonical string identifiers (`unitNumber`, `sectionId`, `exampleId`, `exerciseId`, `questionId`, `partId`, `itemId`) and `displayOrder` / `blankIndex` are preserved verbatim. Note: child surrogate UUIDs (`id`) regenerate upon child deletion/recreation. |
| 5 | Can repeated imports create duplicates? | **PASS** | No: `books` and `units` upsert on unique composite keys; child records are deleted per `unitId` before re-insert; PostgreSQL unique indexes (`questions.question_id`, `exercises(unit_id, exercise_id)`, `theory_sections(unit_id, section_id)`, etc.) enforce engine-level uniqueness. |
| 6 | Are answer keys and explanations linked to the correct questions? | **PASS** | `akMap` and `expMap` index by `q.question_id` within each unit and link via `questionId: createdQuestion.id`. Live mode now asserts both exist inside `tx` (`4,414 === 4,414 === 4,414` confirmed in preflight dry-run). |
| 7 | Are multi-blank accepted answers preserved? | **PASS** | `q.blanks` creates ordered `QuestionBlank` rows (`blankIndex = b.blank_index ?? bIdx + 1`) and `BlankAcceptedAnswer` rows via `createMany` (`2,619` blanks, `4,467` blank accepted answers, plus `75` parts / `123` part accepted answers and `8,425` top-level accepted answers). |
| 8 | Are positional fallback options handled correctly? | **PASS** | [`option-parser.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/option-parser.ts) strips sequential prefixes only when `n >= 2` and all options match 1 of 8 prefix families; otherwise preserves verbatim text and assigns `'a'..'z'` (`n <= 26`). Verified by `OPT-T1..OPT-T13` (`187` prefixed, `510` fallback). |
| 9 | Are Word Bank records preserved? | **PASS** | `ex.word_bank` inserts ordered `ExerciseWordBankItem` rows (`displayOrder = wIdx + 1`), preserving all `1,117` items across `172` exercises. |
| 10 | Are source page relationships preserved? | **PASS** | Preserved across all 5 source page tables (`unit_source_pages` via [`source-page-harmonizer.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/source-page-harmonizer.ts): `454`; `theory_section_source_pages`: `542`; `textbook_example_source_pages`: `639`; `question_source_pages`: `5,007`; `answer_key_source_pages`: `4,414`). |
| 11 | Can an import accidentally delete user progress or exercise attempts? | **PASS (After Safeguard Fix)** | **Pre-fix:** `learning_progress` was safe (`units` upserted), **but** re-importing an existing unit would cascade-delete `exercise_attempts` and `question_attempt_items` (`ON DELETE CASCADE`). **Post-fix:** `assertNoDependentLearnerAttempts` checks both tables inside `tx` and aborts fail-closed (`[SAFETY ABORT]`) if any dependent attempt rows exist (`IMP-T2..IMP-T5` verified). Staging currently holds `0` attempt rows. |
| 12 | Does the importer distinguish a missing Unit from an intentionally empty Unit? | **PASS** | `validateCanonicalInventory` rejects any missing unit file `001..145` before DB connection. An empty-array unit (if schema-valid) still creates a `units` row (`0` child exercises), whereas a missing unit fails Tier 1 preflight (`missingUnits`). `--units` out-of-range filters now fail instead of exiting `0` silently. |
| 13 | Does the importer accidentally include `unit-template.json`? | **PASS** | `KNOWN_EXCLUDED_FILES = new Set(['unit-template.json'])` in [`inventory-validator.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/inventory-validator.ts#L16-L31) explicitly excludes `unit-template.json` (`INV-T6` verified). |
| 14 | Does the importer enforce canonical Unit range 1–145? | **PASS** | Enforced by regex `^unit-(?:00[1-9]|0[1-9][0-9]|1[0-3][0-9]|14[0-5])\.json$`, filename-vs-payload check, contiguity check `1..145`, and hardened `--units` CLI validation (`IMP-T1` verified). |

