# GrammarPath — Phase 3.4B Stage 2: Milestone 1 Report
## Schema, Migration & Legacy Ingestion

**Auditor/Engineer:** Senior Software Architect, Database Lead, QA Engineer  
**Date:** November 14, 2026  
**Status:** COMPLETE & VERIFIED (EXIT GATE PASSED)  
**Safety Scope:** Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech / grammarpath-staging`), Canonical Curriculum (`grammarpath-data` Clean)  

---

## 1. Executive Summary & Exit Gate Status

Milestone 1 (M1) has completed successfully with all exit gate criteria satisfied:
1. **Schema & Migration:** Additive, fully reversible migration `20261114000000_phase_3_4b_toeic_question_bank` deployed to Neon staging.
2. **Pre-Migration Safety Recovery Point:** Complete snapshot captured at `backend/recovery/staging-recovery-1794590404198.json`.
3. **Legacy Ingestion:** Exactly **30 curated questions** from `CURATED_TOEIC_UNIT_QUESTIONS` ingested idempotently into `toeic_question_bank_items` with 120 child options.
4. **Lifecycle Invariant:** 100% of legacy questions were ingested with `reviewStatus = "validated"` and `isLatestApproved = false`. **Zero unapproved items can reach learners.**
5. **Historical Data Protection:** All existing learner records (3 users, 2 exercise attempts, 2 attempt items) remain 100% intact and unaltered.
6. **Tests Passed:** Dedicated test suite `tests/phase3-4b-m1.test.ts` passed (5/5 tests, exit code 0). Offline migration check `verify-migrations.ts` passed (exit code 0).

**Exit Gate Verdict: PASS — Milestone 2 is safe to begin.**

---

## 2. Database & Schema Objects Changed

### 2.1 New Database Enums
- `toeic_part_enum`: `PART_1`, `PART_2`, `PART_3`, `PART_4`, `PART_5`, `PART_6`, `PART_7`
- `toeic_question_format_enum`: `PART5_INCOMPLETE_SENTENCE`, `PART6_TEXT_COMPLETION`, `PART7_READING_SINGLE`, `PART7_READING_DOUBLE`, `PART7_READING_TRIPLE`
- `toeic_item_source_enum`: `curated_expert`, `ai_generated`, `corpus_derived`, `legacy_seed`
- `toeic_review_status_enum`: `draft`, `validated`, `approved`, `rejected`, `archived`, `withdrawn`
- `toeic_primary_skill_enum`: `direct_grammar`, `word_form_morphology`, `vocabulary_collocation`, `reading_comprehension`, `listening_comprehension`
- `toeic_generation_job_status_enum`: `pending`, `in_progress`, `completed`, `failed`, `paused`

### 2.2 New Database Tables
1. **`toeic_question_generation_runs`:** Tracks batch generation runs, prompt templates, model versions, token usage, latency, and success rates.
2. **`toeic_question_bank_items`:** The authoritative repository of TOEIC questions, supporting immutable versioning (`root_question_id` + `version`), quality scores, review workflow, and concept linkages.
3. **`toeic_question_options`:** Individual answer choices (A, B, C, D) with `is_correct` boolean and pedagogical distractor rationales.
4. **`toeic_generation_jobs`:** Persistent offline queue for background question generation with exponential backoff and checkpointing.

### 2.3 Modified Database Tables
- **`toeic_practice_items`:** Added column `question_bank_item_id UUID` with foreign key `ON DELETE RESTRICT`.
- **`question_attempt_items`:** Made `question_id` optional; added `question_bank_item_id UUID` with foreign key `ON DELETE RESTRICT` and index `(user_id, question_bank_item_id)`.

---

## 3. Pre-Migration Recovery & Rollback Status

1. **Recovery Point:**
   - File: `backend/recovery/staging-recovery-1794590404198.json`
   - Verified table counts prior to migration:
     - `user`: 3
     - `exerciseAttempt`: 2
     - `questionAttemptItem`: 2
     - `grammarConcept`: 161
     - `unitToeicMetadata`: 145
2. **Reversible Migration:**
   - Forward migration: `backend/prisma/migrations/20261114000000_phase_3_4b_toeic_question_bank/migration.sql`
   - Rollback script: `backend/prisma/migrations/20261114000000_phase_3_4b_toeic_question_bank/down.sql`

---

## 4. Legacy Question Ingestion & Data Reconciliation

The idempotent importer `backend/scripts/import-legacy-toeic.ts` was executed against Neon staging:

| Metric | Planned Target | Actual Value | Finding Classification |
|---|---|---|---|
| Ingested Items Count | 30 | **30** | `[VERIFIED FACT]` |
| Status of Ingested Items | `validated` | **100% `validated` (30/30)** | `[VERIFIED FACT]` |
| `isLatestApproved` Flag | `false` | **100% `false` (30/30)** | `[VERIFIED FACT]` |
| Total Child Options | 120 | **120 (4 per item)** | `[VERIFIED FACT]` |
| Unambiguous Single Correct Key | 30/30 | **30/30 (100%)** | `[VERIFIED FACT]` |
| Concept Mapping Integrity | Units 1–4 mapped to `unit.001`–`unit.004` | **100% mapped (30/30)** | `[VERIFIED FACT]` |
| Duplicate Ingestion Test (Idempotency) | 0 new rows on re-run | **0 inserted, 30 skipped** | `[VERIFIED FACT]` |
| Historical Learner Records Mutated | 0 | **0** | `[VERIFIED FACT]` |

---

## 5. Test Results & Command Exit Codes

```bash
# 1. Staging Isolation Guard Check
node scripts/run-with-staging-env.mjs --check-only
# Exit Code: 0 (Target: ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging)

# 2. Migration Deployment
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/prisma migrate deploy
# Exit Code: 0 (All 7 migrations applied)

# 3. Offline Migration Verification
npm run test:migrations
# Exit Code: 0 (18 enums, 46 tables, 59 FKs, 22 CHECK constraints, 93 indexes)

# 4. Backend TypeScript Check
npm run typecheck
# Exit Code: 0 (Clean build)

# 5. Milestone 1 Automated Tests
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4b-m1.test.ts
# Exit Code: 0 (5/5 tests passed in 3.48s)
```

---

## 6. Known Risks & Readiness for Milestone 2

- **Known Risk:** Currently, 0 questions in `toeic_question_bank_items` are approved (`isLatestApproved = true`). Practice sessions will continue to use the legacy dynamic fallback builder until M2 introduces the administrative editorial review workflow and allows the project owner to approve the 30 legacy items.
- **Readiness:** M1 has established the database foundation with zero regressions or drift. **Milestone 2 (Question Bank Services, Quality Engine & Editorial Review Workflow) is ready to begin.**

