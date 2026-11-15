# GrammarPath Phase 3.1 — Attempt Status & Telemetry Audit Report
**Unanswered Blank Semantics, Backfill Audit, and Accuracy Integrity**

- **Date:** 2026-11-13
- **Author:** Senior Database Architect & Backend Lead
- **Environment:** Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)

---

## 1. Problem Statement & Historical Flaw

In Phases 1 and 2, when learners submitted an exercise with unanswered or skipped blanks, the backend recorded these items as:
```json
{
  "studentAnswer": "",
  "isCorrect": false
}
```
This historical implementation caused several critical data defects:
1. **False Error Amplification:** Skipped questions were logged as learner mistakes, flooding the Mistake Review page with blank submissions.
2. **Deflated Accuracy:** Learners testing single answers while skipping others saw their accuracy plummet to near 0%.
3. **Loss of Pedagogical Intent:** The system could not distinguish between a student who did not know an answer vs a student who deliberately skipped it.
4. **Zero-Article Ambiguity:** In English grammar, zero-article (e.g. Unit 73.1-q7: `["", "the"]`) uses an empty string as a valid, intentional answer, which conflicted with empty-string meaning "unanswered".

---

## 2. Schema Hardening & Database Constraints

### 2.1 Enum and Column Definitions

In Prisma schema [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma):
```prisma
enum AttemptStatus {
  correct
  incorrect
  unanswered
}

enum AttemptSource {
  single_check
  exercise_submission
  adaptive_quiz
  mistake_retry
  toeic_practice
  legacy_unknown
}

model QuestionAttemptItem {
  id              String        @id @default(uuid())
  attemptId       String        @map("attempt_id")
  questionId      String        @map("question_id")
  studentAnswer   String?       @map("student_answer")
  isCorrect       Boolean?      @map("is_correct")
  attemptStatus   AttemptStatus @default(unanswered) @map("attempt_status")
  attemptSource   AttemptSource @default(legacy_unknown) @map("attempt_source")
  evaluatorNote   String?       @map("evaluator_note")
  createdAt       DateTime      @default(now()) @map("created_at")
  // ...
}
```

### 2.2 Database CHECK Constraint

In migration `20261113120000_phase_3_1_data_foundation`:
```sql
ALTER TABLE "question_attempt_items"
  ADD CONSTRAINT "chk_qai_attempt_status_consistency"
  CHECK (
    (attempt_status = 'unanswered' AND is_correct IS NULL AND student_answer IS NULL)
    OR
    (attempt_status IN ('correct', 'incorrect') AND is_correct IS NOT NULL AND student_answer IS NOT NULL)
  );
```
This guarantees at the database engine level that no code path can ever create an `unanswered` row with non-null correctness, nor an evaluated answer with null correctness or missing student answer.

---

## 3. Historical Data Backfill Audit

Prior to applying the constraint, all pre-existing rows in `question_attempt_items` were safely classified and backfilled via deterministic SQL:

```sql
-- 1. Correct attempts
UPDATE "question_attempt_items"
SET "attempt_status" = 'correct'
WHERE "is_correct" = true;

-- 2. Skipped blanks (empty answer and marked incorrect)
UPDATE "question_attempt_items"
SET "attempt_status" = 'unanswered',
    "is_correct" = NULL,
    "student_answer" = NULL
WHERE "is_correct" = false
  AND ("student_answer" IS NULL OR "student_answer" = '');

-- 3. Genuine incorrect attempts (non-empty student answer)
UPDATE "question_attempt_items"
SET "attempt_status" = 'incorrect'
WHERE "is_correct" = false
  AND "student_answer" IS NOT NULL
  AND "student_answer" <> '';
```

**Backfill Verification:**
- Constraint check violation count: `0`
- Zero data loss: all legitimate student mistakes were preserved with `attemptStatus = 'incorrect'`.
- All blank placeholder attempts had their correctness converted to `NULL` to avoid corrupting analytics.

---

## 4. Analytics Audit & Calculation Isolation

A shared telemetry utility was created at [attempt-telemetry.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/attempt-telemetry.ts):

```typescript
export function computeNullableAccuracy(correct: number, incorrect: number): number | null {
  const evaluated = correct + incorrect;
  if (evaluated === 0) return null;
  return Math.round((correct / evaluated) * 1000) / 10;
}

export function computeNullableAverageScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}
```

### 4.1 Endpoint Behavior Audit

| Endpoint | File | Handling of `unanswered` | Zero-Answered Output |
|---|---|---|---|
| `POST /exercises/:id/check` | [exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts) | Unanswered blanks recorded with `isCorrect: null, studentAnswer: null` | Returns `answeredCount` & `unansweredCount` |
| `GET /progress` | [progress.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts) | Excluded via `attemptStatus: { not: "unanswered" }` | `accuracyPercentage: null`, `averageScore: null` |
| `GET /mistakes` | [mistakes.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mistakes.service.ts) | Filtered via `attempt_status <> 'unanswered' AND is_correct IS NOT NULL` | Unanswered blanks do not appear in mistake reviews |
| `GET /adaptive/recommendations` | [adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts) | Only evaluated attempts considered in weakness scoring | Weakness calculated strictly on answered errors |
| `GET /dashboard/summary` | [dashboard.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/dashboard.service.ts) | Separated into `totalUnansweredSkipped`, isolated from accuracy | `accuracyPercentage: null` (`"—"` in UI) |

---

## 5. UI Verification: Nullable Accuracy vs 0%

In frontend components ([ProgressDashboardPage.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ProgressDashboardPage.tsx), [DashboardPage.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/DashboardPage.tsx), [ToeicRoadmapPage.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ToeicRoadmapPage.tsx)):
- **Empty state:** Displays `"—"` with tooltip `"No evaluated answers yet"`.
- **Never 0%:** 0% is strictly reserved for a learner who attempted questions and answered 0 of them correctly.
- **Skipped question display:** Rendered with distinct badge `(X answered, Y skipped)` in exercise history cards.

