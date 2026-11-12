# GrammarPath Phase 2.2 — Audit E: Database Persistence, Integrity & History Report

**Date:** 2026-11-12  
**Target Database:** `grammarpath-staging` (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432`)  
**Schema Baseline:** [`backend/prisma/schema.prisma`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma) — `3` applied migrations, `0` pending migrations (`prisma migrate status` verified), `29` tables / `5` enums / `31` FKs / `21` CHECK constraints / `48` indexes verified offline by [`verify-migrations.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/verify-migrations.ts).

---

## 1. Runtime Persistence & Domain Integrity Verification

All persistence checks below were verified live against PostgreSQL (`grammarpath-staging`) during `audit_a_d_e.ts` and `npm run test:api:staging`:

1. **`learning_progress` State Transitions:**
   - Partial/full exercise submission auto-creates/updates `learning_progress` (`in_progress` / `completed`).
   - Explicit `PUT /api/v1/progress/units/1` transitions (`completed` -> `in_progress`) preserve existing `ExerciseAttempt` and `QuestionAttemptItem` rows cleanly without data loss.
2. **`exercise_attempts` & Partial Submissions:**
   - Partial submission creates `ExerciseAttempt` recording `totalQuestions` across the exercise's interactive items and persists `QuestionAttemptItem` rows for attempted questions; unattempted sibling questions stay `null` in attempt retrieval (`GET /progress/units/1`) and remain excluded from unresolved mistakes.
3. **Non-Destructive `question_attempt_items` History & Latest-Attempt Mistakes:**
   - Retrying and resolving an incorrect item (`1.1-q2`) via `POST /api/v1/adaptive/quiz/check` appends a new `QuestionAttemptItem` (`isCorrect: true`) rather than deleting/mutating the historical wrong row (`isCorrect: false`).
   - Direct Prisma count confirmed `question_attempt_items` count for `(userAId, 1.1-q2)` equaled **`2`**, while `GET /api/v1/progress/mistakes` updated immediately to **`[]`**.
4. **`adaptive_quiz_sessions` & `toeic_practice_sessions` / `toeic_practice_items`:**
   - Generation persists session metadata (`targetUnits`, `questionIds` for Adaptive Quiz; `requestedCount`, `actualCount`, ordered `ToeicPracticeItem` rows for TOEIC Practice) so subsequent `/check` requests grade strictly against server-stored state without re-trusting client payloads.
   - Ownership checks return `403` when another authenticated user tries to submit against a foreign session ID.
5. **Parallel Submission Idempotency (`submissionId` Deduplication):**
   - Concurrent `POST /api/v1/exercises/1.1/check` calls with identical `submissionId` returned identical `attemptId` and persisted a single `ExerciseAttempt`.
   - Concurrent `POST /api/v1/adaptive/toeic-practice/check` calls with identical `submissionId` left `ToeicPracticeItem.attemptCount === 1`.
6. **Cascade Cleanup & Zero Orphan Verification:**
   - All ephemeral test users created by Supertest suites and `audit_a_d_e.ts` delete cleanly via `prisma.user.delete` / `deleteMany` cascade without constraint errors or orphaned child rows.

---

## 2. Final Post-Audit Staging Database Snapshot

Verified directly against `grammarpath-staging` after all test suites and `audit_a_d_e.ts` finished:

| Table Group / Model | Table Name | Observed Count | Expected Baseline |
| :--- | :--- | ---: | :---: |
| Canonical Book | `books` | **1** | 1 |
| Canonical Units | `units` | **145** | 145 |
| Canonical Theory Sections | `theory_sections` | **542** | 542 |
| Canonical Textbook Examples | `textbook_examples` | **639** | 639 |
| Canonical Exercises | `exercises` | **549** | 549 |
| Canonical Questions | `questions` | **4,414** | 4,414 |
| Canonical Answer Keys | `answer_keys` | **4,414** | 4,414 |
| Canonical Explanations | `explanations` | **4,414** | 4,414 |
| Test Users | `users` | **0** | 0 |
| Learning Progress | `learning_progress` | **0** | 0 |
| Exercise Attempts | `exercise_attempts` | **0** | 0 |
| Question Attempt Items | `question_attempt_items` | **0** | 0 |
| Adaptive Quiz Sessions | `adaptive_quiz_sessions` | **0** | 0 |
| TOEIC Practice Sessions | `toeic_practice_sessions` | **0** | 0 |
| TOEIC Practice Items | `toeic_practice_items` | **0** | 0 |

### Repository Integrity Check (`grammarpath-data`)
- `git -C /Users/kd.quach03/Documents/grammarpath-data diff --stat data/` returned empty output — canonical unit JSON files and `data/index.json` were untouched throughout Phase 2.2.

