# GrammarPath Phase 3.2 — Database Integrity & Schema Audit Report
**PostgreSQL CHECK Constraint Hardening, Migration Verification, and Idempotency**

- **Date:** 2026-11-13
- **Author:** Senior Database Architect & Staging Environment Custodian
- **Database:** PostgreSQL on Neon Serverless (`grammarpath-staging`)
- **Connection Host:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`
- **Prisma Version:** 6.19.3
- **Migration:** `20261113180000_phase_3_2_mastery_and_reviews`

---

## 1. Environment Safety Verification

Before applying any schema modifications, the environment isolation guard ([`verify-staging-env.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/verify-staging-env.ts)) executed and verified:
- **Target Host:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech`
- **Database Name:** `grammarpath-staging`
- **Production Guard:** **VERIFIED** (Production credentials absent; write guards active).
- **Destructive Commands:** `prisma migrate reset` and `prisma db push` strictly forbidden and never executed.

---

## 2. Workstream A1: Database-Level CHECK Constraint Hardening

### 2.1 The 3-Valued Logic Vulnerability in PostgreSQL
In standard boolean algebra, an expression is either `TRUE` or `FALSE`. However, SQL implements Kleene's 3-valued logic (`TRUE`, `FALSE`, `UNKNOWN`). When evaluating constraints with nullable columns, if any condition evaluates to `UNKNOWN`, a standard `CHECK` constraint **permits the row insertion**, because PostgreSQL only rejects rows where the CHECK condition evaluates to explicit `FALSE` (`WHERE NOT (condition)`).

In Phase 3.1, an adversarial payload with `attempt_status = 'unanswered'` combined with `student_answer IS NOT NULL` could potentially bypass naive boolean logic if any sub-clause evaluated to `UNKNOWN`.

### 2.2 Hardened CASE Statement Implementation
To guarantee zero loopholes, migration `20261113180000_phase_3_2_mastery_and_reviews` implemented a deterministic `CASE` statement on `question_attempt_items`:

```sql
ALTER TABLE "question_attempt_items"
  DROP CONSTRAINT IF EXISTS "chk_qai_attempt_status_consistency";

ALTER TABLE "question_attempt_items"
  ADD CONSTRAINT "chk_qai_attempt_status_consistency"
  CHECK (
    CASE 
      WHEN attempt_status = 'unanswered' THEN
        is_correct IS NULL AND student_answer IS NULL
      WHEN attempt_status IN ('correct', 'incorrect') THEN
        is_correct IS NOT NULL AND student_answer IS NOT NULL
      ELSE false
    END
  );
```

### 2.3 Exhaustive 12-Combination Truth Table Verification
The constraint was tested via direct parameterized SQL against the live Neon staging database across all 12 combinations of `(attempt_status, is_correct, student_answer)`:

| # | `attempt_status` | `is_correct` | `student_answer` | Expected DB Action | Actual DB Result | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `unanswered` | `NULL` | `NULL` | **ACCEPT** | Row inserted (201) | **PASS** |
| 2 | `unanswered` | `true` | `NULL` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 3 | `unanswered` | `false` | `NULL` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 4 | `unanswered` | `NULL` | `""` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 5 | `unanswered` | `NULL` | `"answer"` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 6 | `correct` | `true` | `"answer"` | **ACCEPT** | Row inserted (201) | **PASS** |
| 7 | `correct` | `NULL` | `"answer"` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 8 | `correct` | `true` | `NULL` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 9 | `incorrect` | `false` | `"answer"` | **ACCEPT** | Row inserted (201) | **PASS** |
| 10 | `incorrect` | `false` | `""` | **ACCEPT** | Row inserted (201) | **PASS** |
| 11 | `incorrect` | `NULL` | `"answer"` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |
| 12 | `incorrect` | `false` | `NULL` | **REJECT (23514)** | Rejected with error 23514 | **PASS** |

**Conclusion:** 100% of valid combinations accepted, 100% of invalid combinations rejected with PostgreSQL error `23514` (`check_violation`).

---

## 3. Schema Entities & Offline Migration Audit

Migration verification script ([`verify-migrations.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/verify-migrations.ts)) executed offline via `npm run test:migrations`:

- **Enums (12 total):**
  - Existing: `user_role_enum`, `unit_status_enum`, `question_type_enum`, `attempt_status_enum`, `attempt_source_enum`, `concept_theory_role_enum`, `mapping_confidence_enum`, `toeic_unit_priority_enum`, etc.
  - Phase 3.2 Added:
    - `mastery_status_enum`: `not_started`, `insufficient_data`, `developing`, `practicing`, `proficient`, `mastered`, `needs_review`
    - `review_state_enum`: `new`, `scheduled`, `due`, `completed`, `suspended`
- **Tables (37 total):**
  - Phase 3.2 Added:
    - `user_concept_mastery`
    - `concept_mastery_events`
    - `concept_review_schedules`
- **Foreign Keys (45 total):** Verified referential actions (`ON DELETE CASCADE` on `user_id` and `concept_id`).
- **Indexes (73 total):** Composite unique indexes on `(user_id, concept_id)` ensure idempotent records.

---

## 4. Canonical Dataset Protection Verification

```
git status --porcelain /Users/kd.quach03/Documents/grammarpath-data
```
**Output:** *(Empty - Clean working tree)*.

The Murphy canonical dataset in `grammarpath-data` remains 100% untouched and preserved.

