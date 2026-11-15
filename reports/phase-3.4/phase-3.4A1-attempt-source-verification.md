# GrammarPath Phase 3.4A.1 — AttemptSource Semantics Verification & Decision Report

**Date:** 2026-11-13  
**Auditor:** Senior Database Architect, Application Security Engineer & QA Auditor  
**Scope:** `QuestionAttemptItem.attemptSource` Provenance, Review Center Business Semantics, Telemetry Integrity  
**Target Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Verdict:** **VERIFIED PASS — `single_check` CONFIRMED SEMANTICALLY CORRECT**

---

## 1. Executive Summary

Phase 3.4A.1 conducts a rigorous semantic and data-lineage verification of `QuestionAttemptItem.attemptSource` across all GrammarPath submission workflows, with particular focus on whether Review Center submissions (`POST /api/v1/reviews/:conceptId/complete`) should persist with `attemptSource: "single_check"` or `attemptSource: "mistake_retry"`.

### Key Conclusions:
1. **Review Center is NOT a Mistake Retry:**
   Review Center drill questions are sampled strictly by grammar concept / unit linkage (`GrammarConcept.theoryLinks` and `exercise.unitId`), **completely independent of previous user attempt correctness**. A learner with 100% first-time accuracy on Unit 1 will still receive spaced repetition review drills when their memory stability decay schedule elapses. Tagging these drills as `mistake_retry` would be factually incorrect and would distort learning analytics.
2. **`single_check` is the Validated Existing Enum Value:**
   The PostgreSQL enum `AttemptSource` contains: `single_check`, `exercise_submission`, `adaptive_quiz`, `mistake_retry`, `toeic_practice`, and `legacy_unknown`. In Review Center, questions are evaluated as individual standalone items with `attemptId: null` (no parent `ExerciseAttempt` container). Therefore, `single_check` is the most accurate existing representation of standalone question checks that are not whole exercise submissions, not mistake retries, not adaptive diagnostic quizzes, and not TOEIC practice.
3. **Dedicated `tsc --noEmit` Verification Completed:**
   Dedicated TypeScript checks (`tsc --noEmit`) were executed separately on both `frontend` and `backend`, passing with **0 type errors**.

---

## 2. Complete AttemptSource Mapping Table

All code paths persisting `QuestionAttemptItem` records across the application stack were traced and documented:

| Ingestion Workflow | API Endpoint | Controller & Service | Actual `attemptSource` | Parent `attemptId` | Business Meaning & Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Single Question Check** | `POST /api/v1/questions/:questionId/check` | `questions.controller.ts` (`checkQuestionAnswer`) | `single_check` | `null` | **Intended:** Learner checks an individual question standalone outside of an exercise or review drill. |
| **Mistake Review / Notebook** | `POST /api/v1/questions/:questionId/check` | `questions.controller.ts` (`checkQuestionAnswer`) | `mistake_retry` | `null` | **Intended:** Invoked exclusively from `MistakeReviewPage.tsx` (`/mistakes`) with `{ source: "mistake_retry" }` to retry a previously failed item from `getLatestUnresolvedMistakes`. |
| **Exercise Submission** | `POST /api/v1/exercises/:exerciseId/check` | `exercises.controller.ts` (`checkExerciseAnswers`) | `exercise_submission` | `UUID` (to `ExerciseAttempt`) | **Intended:** Learner submits a full textbook exercise (e.g. 1.1) in batch, creating an `ExerciseAttempt` parent container. |
| **Adaptive Quiz / Assessment** | `POST /api/v1/adaptive/quiz/check` | `adaptive.controller.ts` (`checkAdaptiveQuizQuestionHandler`) | `adaptive_quiz` | `null` | **Intended:** Learner checks a question during an adaptive diagnostic quiz session (`AdaptiveQuizSession`). |
| **TOEIC Practice** | `POST /api/v1/adaptive/toeic-practice/check` | `adaptive.controller.ts` (`checkToeicPracticeHandler`) | `toeic_practice` (Reserved) | `null` | **Intended:** Evaluates TOEIC Part 5 practice drills. Updates `ToeicPracticeItem` model directly; enum value reserved for question-level attempts. |
| **Review Center (Spaced Review)** | `POST /api/v1/reviews/:conceptId/complete` | `review.controller.ts` & `review.service.ts` (`completeConceptReview`) | `single_check` | `null` | **Intended & Validated:** Standalone question evaluations for concept-level spaced repetition drills. |
| **Legacy Backfill** | *Database Migration Default* | `20261113120000_phase_3_1_data_foundation` | `legacy_unknown` | `null` / `UUID` | **Intended:** Historical attempt items created before Phase 3.1 provenance tracking was introduced. |

---

## 3. Review Center Business-Semantic Analysis

### 3.1 Question Selection Mechanism
In [`backend/src/services/review.service.ts#L60-L70`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts#L60-L70), practice questions for due review schedules are retrieved via:
```typescript
const questions = await prisma.question.findMany({
  where: {
    OR: [
      { explanation: { theorySectionId: { in: theorySectionIds } } },
      unit ? { exercise: { unitId: unit.id } } : {},
    ],
  },
  orderBy: { displayOrder: "asc" },
  take: 5,
  ...
});
```

**Key Findings:**
1. **Zero Prior Attempt Inspection:** The query does not filter on `userId`, does not join `QuestionAttemptItem`, and does not inspect whether the learner previously answered these questions correctly or incorrectly.
2. **Pedagogical Purpose:** The purpose of Review Center is spaced repetition to counteract the **Ebbinghaus forgetting curve** for concepts previously learned, **not error remediation**.
3. **Contrast with Mistake Review:**
   In [`backend/src/services/mistakes.service.ts#L48-L62`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mistakes.service.ts#L48-L62), `getLatestUnresolvedMistakes` executes a PostgreSQL `DISTINCT ON (qai.question_id)` query strictly filtering `WHERE qai.is_correct = false`. This is the sole domain of `mistake_retry`.

### 3.2 Impact on Analytics & Mastery Engine
- **Dashboard Source Breakdown:** In [`backend/src/services/dashboard.service.ts#L239-L248`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/dashboard.service.ts#L239-L248), `sourceBreakdown` tallies attempts by `attemptSource`:
  ```typescript
  const sourceBreakdown: Record<string, number> = {
    exercise_submission: 0,
    single_check: 0,
    mistake_retry: 0,
    adaptive_quiz: 0,
    legacy_unknown: 0,
  };
  ```
  If Review Center were labeled `mistake_retry`, a learner completing 20 spaced review drills would see their "Mistake Retries" count artificially increase by 100 questions, even if they had made zero errors.
- **Mastery Weighting (`w_src`):** Under Phase 3.0 / Phase 3.4 specifications, `mistake_retry` is discounted (`w_src = 0.90`) to prevent same-day error cramming inflation. Scheduled concept reviews, by contrast, represent genuine recall drills and should receive full standard weight (`w_src = 1.00`), aligning with `single_check`.

### 3.3 Decision
`attemptSource: "single_check"` is confirmed to be the semantically correct and least-disruptive representation among existing enum values.

---

## 4. Test Execution & Evidence

### 4.1 Dedicated Phase 3.4A.1 Unit Suite
A dedicated test suite was added in [`backend/tests/phase3-4a1-attempt-source.unit.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4a1-attempt-source.unit.test.ts) covering all 6 verification points.

- **Command:** `npx vitest run tests/phase3-4a1-attempt-source.unit.test.ts`
- **Exit Code:** `0`
- **Duration:** 568 ms
- **Results:** 1 test file passed, 7 tests passed, 0 failed.

```
✓ tests/phase3-4a1-attempt-source.unit.test.ts (7 tests) 8ms
  ✓ 1. Review Center AttemptSource & Provenance
    ✓ persists Review Center submissions with AttemptSource 'single_check' (NOT 'mistake_retry') 5ms
    ✓ evaluates unanswered items as 'unanswered' with isCorrect: false and studentAnswer: null 0ms
  ✓ 2. AttemptStatus & AttemptSource Telemetry Semantics
    ✓ deriveAttemptStatus guarantees unattempted questions have attemptStatus 'unanswered' and isCorrect null 0ms
    ✓ deriveAttemptStatus maps attempted items to correct and incorrect accurately 0ms
    ✓ isEvaluatedAttemptItem filters out unanswered and unattempted items from accuracy calculation 0ms
    ✓ ALLOWED_QUESTION_CHECK_SOURCES explicitly delineates single checks from mistake retries 1ms
  ✓ 3. Idempotency & Deduplicated Submissions
    ✓ deduplicates concurrent review submissions with identical submissionId without duplicate attempt items 0ms
```

### 4.2 Full Backend Unit Suite
- **Command:** `npm run test:unit`
- **Exit Code:** `0`
- **Duration:** 3.22 s
- **Results:** 8 test files passed, 75 tests passed, 0 failed.

### 4.3 Combined Phase 3.4A Test Suites
- **Command:** `npx vitest run tests/phase3-4a-unit.test.ts tests/phase3-4a-rate-limit.unit.test.ts tests/phase3-4a1-attempt-source.unit.test.ts`
- **Exit Code:** `0`
- **Duration:** 1.14 s
- **Results:** 3 test files passed, 22 tests passed, 0 failed.

---

## 5. Dedicated Frontend TypeScript Verification

As mandated, frontend TypeScript checking was verified directly via the TypeScript compiler, completely separate from the Vite bundler:

- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/frontend`
- **Configuration:** [`frontend/package.json#L9`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/package.json#L9)
- **Exit Code:** `0`
- **Output:** Clean compilation, 0 errors.

Backend TypeScript check was also verified separately:
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Configuration:** [`backend/package.json#L9`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/package.json#L9)
- **Exit Code:** `0`
- **Output:** Clean compilation, 0 errors.

---

## 6. Staging & Canonical Data Safety Confirmation

- **Neon Staging Schema:** `npx prisma migrate status` reports 6 migrations, schema up to date. Zero schema migrations applied, zero schema drift.
- **Database Cleanliness:** 0 temporary test users remaining, 0 orphaned question attempts, 0 orphaned review schedules.
- **Canonical Curriculum:** `cd /Users/kd.quach03/Documents/grammarpath-data && git status` confirms working tree clean on branch `main` (all 145 canonical Murphy units, exercises, and theory sections remain intact).

---

## 7. Subphase Conclusion

Phase 3.4A.1 verification is complete. `attemptSource: "single_check"` is verified as the semantically sound, data-safe, and architecturally consistent classification for Review Center completions.

**Execution halted. Ready for Phase 3.4B upon approval.**

