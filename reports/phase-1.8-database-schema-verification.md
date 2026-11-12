# GrammarPath — Phase 1.8 Live Database Schema Verification Report

> **Date:** 2026-11-12  
> **Phase:** 1.8 — Live Migration & API Integration Verification  
> **Target:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (`PostgreSQL 18.6`)  
> **Schema Audit Outcome:** **PASS** (`0` missing objects, `0` extra objects, `0` column/type/nullability/constraint discrepancies)

---

## 1. Live Schema vs Authoritative DDL Object Counts

Live inspection queried `information_schema.tables`, `information_schema.columns`, `information_schema.table_constraints`, `information_schema.referential_constraints`, `pg_type`/`pg_enum`, `pg_constraint`, and `pg_indexes` on schema `public` (excluding Prisma internal metadata table `_prisma_migrations`), and diffed programmatically against the authoritative committed SQL ([`20261105000000_init_schema`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations/20261105000000_init_schema/migration.sql) + [`20261106000000_add_user_progress_tables`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/migrations/20261106000000_add_user_progress_tables/migration.sql)) and [`schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma).

| Schema Object Category | Expected | Actual (Live) | Discrepancies | Status |
|---|---|---|---|---|
| Application Base Tables | `26` | `26` | `0` | **PASS** |
| Prisma Metadata Table (`_prisma_migrations`) | `1` (`2` rows) | `1` (`2` rows) | `0` | **PASS** |
| PostgreSQL Custom Enums | `5` | `5` | `0` label/order diffs | **PASS** |
| Columns (`180` across `26` tables) | `180` | `180` | `0` missing, `0` extra | **PASS** |
| Column Data Types & Lengths | `180` | `180` | `0` type mismatches | **PASS** |
| Column Nullability (`NOT NULL` vs nullable) | `180` | `180` | `0` nullability mismatches | **PASS** |
| Primary Key Constraints | `26` | `26` | `0` | **PASS** |
| Foreign Key Constraints & Referential Rules | `28` | `28` | `0` (`27` `CASCADE`, `1` `RESTRICT`) | **PASS** |
| Unique Indexes (Non-PK) | `30` | `30` | `0` | **PASS** |
| Non-Unique Optimization Indexes | `14` | `14` | `0` | **PASS** |
| Total Non-PK Indexes (`UNIQUE` + regular) | `44` | `44` | `0` (plus `26` `_pkey` = `70` total) | **PASS** |
| Custom SQL `CHECK` Constraints | `21` | `21` | `0` missing (`chk_*` verified in `pg_constraint`) | **PASS** |
| Seed / Content Rows in Application Tables | `0` (Phase 1.8 rule) | `0` (`0` across all `26` tables) | `0` | **PASS** |

---

## 2. Detailed Verification Highlights (`Verified Live on PostgreSQL 18.6`)

### 2.1 Enum Types & Labels (`5 / 5`)
- `answer_type_enum`: `['string', 'array', 'null']` (maps to Prisma `AnswerType` where `null_value` uses `@map("null")`)
- `content_origin_enum`: `['textbook', 'ai_generated', 'human_authored']`
- `learning_status_enum`: `['not_started', 'in_progress', 'completed']`
- `question_type_enum`: `['fill_blank', 'transformation', 'sentence_correction', 'multiple_choice', 'matching', 'word_formation', 'other']`
- `verification_status_enum`: `['verified', 'inferred', 'needs_review', 'unavailable']`

### 2.2 Tables (`26 / 26`, All `0` Rows)
- **Canonical content (`22` tables):** `books`, `units`, `unit_source_pages`, `theory_sections`, `theory_section_source_pages`, `textbook_examples`, `textbook_example_source_pages`, `exercises`, `exercise_word_bank_items`, `questions`, `question_source_pages`, `question_options`, `question_blanks`, `blank_accepted_answers`, `question_parts`, `part_accepted_answers`, `accepted_answers`, `answer_keys`, `answer_key_source_pages`, `explanations`, `unit_validation`, `unresolved_items`.
- **User & progress (`4` tables):** `users`, `learning_progress`, `exercise_attempts`, `question_attempt_items`.

### 2.3 Foreign Keys (`28 / 28`) & Custom `CHECK` Constraints (`21 / 21`)
- Exact match verified on `27/28` `ON DELETE CASCADE` / `ON UPDATE CASCADE` constraints and `1/28` `ON DELETE RESTRICT` / `ON UPDATE CASCADE` constraint (`units_book_id_fkey`).
- All `21` custom `CHECK` constraints (`chk_question_correct_answer`, `chk_blank_correct_answer`, `chk_part_correct_answer`, `chk_answer_key_answer`, `chk_question_example_answer`, `5` page-range checks `[1, 399]`, `chk_blank_index_positive`, and `10` non-negative `display_order` checks) are active in `pg_constraint`.
- **Operational note:** Because Prisma Schema Language does not natively model PostgreSQL `CHECK` expressions, future schema deployments on staging/production must continue using `prisma migrate deploy` (never `prisma db push` or `prisma migrate dev` against live environments).

