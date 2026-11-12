# GrammarPath — Phase 1.9 Import Idempotency Verification Report

> **Date:** 2026-11-12  
> **Phase:** 1.9 — Controlled Dataset Import & API Re-Verification (Step 6: Import Idempotency Test)  
> **Target Staging Database:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (Neon Project `summer-resonance-11737918`, Branch `br-blue-meadow-a1uyxgfp`, PostgreSQL `18.6`)  
> **Idempotency Verdict:** **`PASS` (Zero duplicate rows, exact `0` count delta across all `26` application tables + `_prisma_migrations`, preserved `books.id` & `units.id` UUIDs, verified Unit `85` transient-rollback recovery, and `0 imported / 145 skipped` `--resume` Triple-Key skip verified)**

---

## 1. Test Runs Executed

1. **Before-Run-2 Snapshot (`2026-11-12 06:35:34 UTC`, WAL LSN `0/37076C8`):**
   - Executed `npm run staging:check` + read-only count & UUID capture across all `26` application tables and `_prisma_migrations`.
   - Captured Run 1 metadata (`importRunId = d6acb3b7-fed8-4787-a3e5-b6bb7c1fcda5`, `books.id = f9e518ef-fdd9-4b3d-809d-3cc6cd1aabb9`, Unit `1` `id = 5e335ec4-36b2-490a-9560-7d64495f60d4`, Unit `110` `id = e84985bd-d741-4941-bb97-c4b8a19038fa`, Unit `145` `id = 28db1a62-eb2c-4fd6-838c-07cb08e11e76`).
2. **Run 2 — Full Re-Import Without `--resume` (`npm run import:staging`):**
   - Run ID: `f8cbf07d-32bb-4005-a648-7e9e61076bba` (`Resume Guard: DISABLED`)
   - Exercises the full unit-replacement cycle on an already populated staging database: `assertNoDependentLearnerAttempts(tx)` -> 20-step child `deleteMany` scoped per `unitId` -> `tx.unit.upsert` -> complete child re-insert -> `unit_validation` for all `145` units.
   - Output: **`IMPORT COMPLETE: 145 imported, 0 skipped.`** (`exit 0`).
   - **Live Resilience Observation (Unit `85`):** During Unit `85` attempt 1, Neon closed the connection transiently (`Server has closed the connection.` at `tx.explanation.create`). The interactive transaction rolled back attempt 1 cleanly, [`executeWithRetry`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/import-to-db.ts) waited `1000ms`, retried Unit `85`, and committed `[UNIT 85] Imported successfully.` on attempt 2 (`3` exercises, `37` questions, `unit_validation.status = 'completed'`, zero duplicates/orphans).
3. **Post-Run-2 Count, UUID & Integrity Check (`2026-11-12 07:15:01 UTC`, WAL LSN `0/4F3C000`):**
   - Verified `0` deltas across all `27` queried tables (`22` canonical + `4` user + `_prisma_migrations`).
   - Verified `145/145` `units` updated cleanly to `import_run_id = f8cbf07d-32bb-4005-a648-7e9e61076bba` while retaining identical `books.id` and `units.id` UUIDs.
4. **Run 3 — Triple-Key Resume Guard Verification (`npm run import:staging -- --resume`):**
   - Run ID: `e6bd6626-1b02-4486-a2a4-e0d308ac78fd` (`Resume Guard: ACTIVE`)
   - Output: **`IMPORT COMPLETE: 0 imported, 145 skipped.`** (`exit 0`) — every unit matched `(sourceFileSha256, mappingVersion = 1.0.0, validation.status = completed)` and executed zero writes.
5. **Post-Idempotency Concordance Verification (`npm run verify:staging`):**
   - *(Note: An initial verification invocation hit a transient WAN connection close during CHECK 4's 145-unit read loop; immediately re-running the read-only `npm run verify:staging` suite passed `100%` with `exit 0`.)*
   - Final Result: **`ALL POST-IMPORT VERIFICATION CHECKS COMPLETED AND PASSED WITH 100% CONCORDANCE`** (`exit 0`).

---

## 2. Before vs. After Table Record Counts Across All Tables

| Table | Before Run 2 | After Run 2 | Delta | Status |
|---|---:|---:|---:|---|
| `books` | `1` | `1` | **`0`** | **PASS** |
| `units` | `145` | `145` | **`0`** | **PASS** |
| `unit_source_pages` | `454` | `454` | **`0`** | **PASS** |
| `theory_sections` | `542` | `542` | **`0`** | **PASS** |
| `theory_section_source_pages` | `542` | `542` | **`0`** | **PASS** |
| `textbook_examples` | `639` | `639` | **`0`** | **PASS** |
| `textbook_example_source_pages` | `639` | `639` | **`0`** | **PASS** |
| `exercises` | `549` | `549` | **`0`** | **PASS** |
| `exercise_word_bank_items` | `1,117` | `1,117` | **`0`** | **PASS** |
| `questions` | `4,414` | `4,414` | **`0`** | **PASS** |
| `question_source_pages` | `5,007` | `5,007` | **`0`** | **PASS** |
| `question_options` | `697` | `697` | **`0`** | **PASS** |
| `question_blanks` | `2,619` | `2,619` | **`0`** | **PASS** |
| `blank_accepted_answers` | `4,467` | `4,467` | **`0`** | **PASS** |
| `question_parts` | `75` | `75` | **`0`** | **PASS** |
| `part_accepted_answers` | `123` | `123` | **`0`** | **PASS** |
| `accepted_answers` | `8,425` | `8,425` | **`0`** | **PASS** |
| `answer_keys` | `4,414` | `4,414` | **`0`** | **PASS** |
| `answer_key_source_pages` | `4,414` | `4,414` | **`0`** | **PASS** |
| `explanations` | `4,414` | `4,414` | **`0`** | **PASS** |
| `unit_validation` | `145` | `145` | **`0`** | **PASS** |
| `unresolved_items` | `0` | `0` | **`0`** | **PASS** |
| `users` | `0` | `0` | **`0`** | **PASS** |
| `learning_progress` | `0` | `0` | **`0`** | **PASS** |
| `exercise_attempts` | `0` | `0` | **`0`** | **PASS** |
| `question_attempt_items` | `0` | `0` | **`0`** | **PASS** |
| `_prisma_migrations` | `2` | `2` | **`0`** | **PASS** |

---

## 3. Idempotency & Invariant Checklist

| Verification Check | Observed Result | Verdict |
|---|---|---|
| Duplicate `questions.question_id` rows after Run 2 | `0` | **PASS** |
| `books.id` UUID preserved across re-import | `true` (`f9e518ef-fdd9-4b3d-809d-3cc6cd1aabb9`) | **PASS** |
| `units.id` UUIDs preserved (`Unit 1`, `Unit 110`, `Unit 145` sampled; `learning_progress.unit_id` FK stability) | `true` (`5e335ec4...`, `e84985bd...`, `28db1a62...`) | **PASS** |
| Answer Keys (`4,414`) & Explanations (`4,414`) 1:1 linkage intact | `q_no_ak = 0`, `q_no_exp = 0`, `4,414 === 4,414 === 4,414` | **PASS** |
| Unit `110` remains `"110A"` (`110A..110D`, `17` `"110A"` refs, `0` `"100A"` refs) | Confirmed (`u110_110a_count = 17`, `u110_100a_count = 0`) | **PASS** |
| `unit_validation` remains `145` `completed` | `val_completed = 145` | **PASS** |
| Unit `85` rollback-and-retry atomicity after transient connection close | Rolled back attempt 1, succeeded attempt 2 (`3` exercises, `37` questions, `0` duplicates) | **PASS** |
| User progress / attempts preserved (`0` rows lost) | `0 -> 0` across all `4` user tables | **PASS** |
| `npm run verify:staging` post-Run-2 concordance | `exit 0` (`4,414/4,414` entities & all `145` Triple-Key hashes verified) | **PASS** |

