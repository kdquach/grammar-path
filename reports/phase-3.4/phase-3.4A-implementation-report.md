# GrammarPath Phase 3.4A — Implementation Report
## Security Hardening, Server-Authoritative Review Grading & Transactional Integrity

**Date:** 2026-11-13  
**Target Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Phase Status:** IMPLEMENTATION COMPLETE & VERIFIED  
**Phase Scope:** Phase 3.4A (Defect F-01 & F-03 Resolution, IDOR Defense, Atomic Transactions, Idempotency)

---

## 1. Executive Summary

Phase 3.4A resolves critical security, grading integrity, and transactional vulnerabilities identified during the comprehensive Phase 3.4 audit. Specifically, it eliminates **Defect F-01** (client-authoritative review grading), mitigates **Defect F-03** (unprotected learning endpoints vulnerable to abuse/DoS), enforces strict **IDOR protection** across user schedules, guarantees **ACID transaction safety** during spaced repetition completions, and preserves complete backward compatibility with existing learning mastery semantics.

All work was completed strictly within `grammarpath-app` against the Neon staging database (`grammarpath-staging`). Canonical curriculum assets (`grammarpath-data`, 145 units) and production environments remained completely untouched.

---

## 2. Architecture & Trust Boundary Redesign

### 2.1 The Previous Vulnerability (Defect F-01)
Previously, the review completion endpoint (`POST /api/v1/reviews/:conceptId/complete`) accepted an untrusted client payload containing:
```json
{
  "correctCount": 5,
  "totalCount": 5,
  "unansweredCount": 0,
  "accuracy": 100,
  "scheduleId": "..."
}
```
A malicious learner or script could bypass actual learning by submitting forged `correctCount` or `accuracy: 100`, resulting in unearned mastery score spikes, artificial stability expansion (2x multiplier), and corrupt spaced repetition intervals.

### 2.2 Server-Authoritative Trust Boundary (Phase 3.4A)
The contract and grading pipeline have been redesigned such that the client is treated as an **untrusted input collector**. 

```
┌─────────────────────────────────┐
│     Learner Browser / UI        │
│  (ReviewCenterPage / Drill)     │
└──────────────┬──────────────────┘
               │ Submits ONLY raw answers:
               │ { answers: { [questionId]: "student answer" }, scheduleId, submissionId }
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│  POST /api/v1/reviews/:conceptId/complete                              │
│                                                                        │
│  1. Rate Limiting: submissionRateLimiter (60 req/min per user)         │
│  2. Schema Validation: completeReviewBodySchema (Zod)                  │
│  3. Existence & Ownership Checks:                                      │
│     - Verify concept exists (404 Not Found)                           │
│     - Verify schedule belongs to authenticated user (403 Forbidden)    │
│  4. Question Integrity Check:                                          │
│     - Verify question IDs belong to concept exercises (400 Bad Request)│
│  5. Server Grader (grader.ts / evaluateQuestion):                      │
│     - Normalize text, evaluate exact & accepted alternatives           │
│  6. Atomic Database Transaction (prisma.$transaction):                 │
│     - Bulk insert QuestionAttemptItem (attemptSource: single_check)    │
│     - Update ConceptReviewSchedule (stability, interval, repetitions)  │
│     - Trigger calculateConceptMastery (unified Bayesian/EWMA engine)   │
│     - Synchronize DailyLearningPlanItem (spaced_review type)           │
│  7. Return Sanitized Feedback:                                         │
│     - Server-evaluated accuracy, status, per-question explanations     │
└────────────────────────────────────────────────────────────────────────┘
```

The server completely discards client-supplied `correctCount`, `accuracy`, `isCorrect`, or `attemptStatus`. The server fetches the canonical question data, applies `evaluateQuestion` from `backend/src/utils/grader.ts`, grades each question, records individual attempt telemetry, and atomically commits the spaced repetition schedule and mastery score.

---

## 3. Implementation Details by Task

### Task A: Server-Authoritative Review Grader (`review.service.ts` & `review.controller.ts`)

1. **Payload Schema Update:**
   - In `backend/src/controllers/review.controller.ts`, updated `completeReviewBodySchema`:
     ```typescript
     export const completeReviewBodySchema = z.object({
       scheduleId: z.string().uuid("scheduleId must be a valid UUID").optional(),
       submissionId: z.string().min(1).max(128).optional(),
       answers: z.record(z.string()).default({}),
     }).passthrough();
     ```
   - Using `.passthrough()` ensures backward compatibility while the controller strips any unauthorized fields before passing to the service.

2. **Database Question Fetching & ID Validation:**
   - The service extracts the keys from `payload.answers`.
   - If question IDs are provided, it queries the database:
     ```typescript
     const questions = await prisma.question.findMany({
       where: {
         id: { in: questionIds },
         exercise: { conceptId },
       },
       include: { answerKey: true, acceptedAnswers: true },
     });
     ```
   - If any submitted question ID does not exist in the database or does not belong to the target concept's exercises, the service immediately throws `AppError.badRequest("One or more submitted question IDs are invalid or do not belong to this concept")`.

3. **Evaluation using `evaluateQuestion`:**
   - For each valid question, the student's answer is evaluated using `evaluateQuestion(question, studentAnswer)`.
   - Empty answers (`isEmptyStudentAnswer`) are evaluated as incorrect (`attemptStatus: "unanswered"` or `"incorrect"`).
   - Expected answers and AI explanations from `answerKey` and `explanation` models are returned in the response payload for educational feedback.

4. **IDOR & Schedule Ownership Defense:**
   - If `scheduleId` is provided, the service queries `prisma.conceptReviewSchedule.findUnique({ where: { id: scheduleId } })`.
   - If `schedule.userId !== userId`, the service immediately aborts with `AppError.forbidden("Access denied: You do not own this review schedule")`.

---

### Task B: Rate Limiting Architecture (`rate-limit.ts` & `env.ts`)

To protect learning endpoints against brute-force attacks and abuse (Defect F-03), two tiered rate limiters were introduced:

1. **Configuration:**
   - `RATE_LIMIT_SUBMISSION_MAX`: 60 requests/minute per authenticated user (or IP for anonymous users).
   - `RATE_LIMIT_GENERAL_MAX`: 500 requests per 15 minutes per IP.

2. **Middleware Implementation (`backend/src/middleware/rate-limit.ts`):**
   - `generalApiRateLimiter`: Attached to `/api/v1` in `backend/src/app.ts`. Standard burst protection for all endpoints.
   - `submissionRateLimiter`: Enforces a 60 req/min quota on high-computation / database-write endpoints.
   - Custom `keyGenerator`: Uses `req.user?.id || req.ip` to ensure authenticated users are isolated and cannot be starved by unauthenticated IP pool collisions.
   - Structured JSON response on HTTP 429:
     ```json
     {
       "success": false,
       "error": {
         "code": "RATE_LIMIT_EXCEEDED",
         "message": "Too many submissions. Please wait a minute before submitting again."
       }
     }
     ```

3. **Protected Routes:**
   - `POST /api/v1/reviews/:conceptId/complete` (`review.routes.ts`)
   - `POST /api/v1/exercises/:exerciseId/check` (`exercises.routes.ts`)
   - `POST /api/v1/questions/:questionId/check` (`questions.routes.ts`)
   - `POST /api/v1/assessment/:assessmentId/submit` (`onboarding.routes.ts`)
   - `POST /api/v1/adaptive/toeic-practice/check` (`adaptive.routes.ts`)
   - `POST /api/v1/adaptive/quiz/check` (`adaptive.routes.ts`)

---

### Task C: Transactional Safety & Deduplication (`review.service.ts`)

Spaced repetition reviews must maintain strict data consistency across 4 separate database entities:
1. `QuestionAttemptItem` records (audit log of student answers).
2. `ConceptReviewSchedule` (FSRS/SuperMemo-inspired spaced repetition intervals).
3. `UserConceptMastery` (Bayesian probability and retention decay).
4. `DailyLearningPlanItem` (daily goal tracking and completion status).

1. **ACID Transaction Boundary:**
   All mutations are wrapped inside `prisma.$transaction(async (tx) => { ... })`:
   - If any step throws an error (e.g. unique constraint violation or calculation error), the entire batch rolls back completely.
   - Attempt records are created with `attemptSource: "single_check"`.
   - Schedule update:
     - On success (`isSuccess` = accuracy >= 70%): `stabilityDays = currentStability * 2.0`, `intervalDays = Math.ceil(stabilityDays)`, `reviewState = "learning"`, `dueAt = now + intervalDays`.
     - On reinforcement needed: `stabilityDays = Math.max(0.5, currentStability * 0.6)`, `intervalDays = 1`, `reviewState = "learning"`, `dueAt = now + 1 day`.
   - Mastery engine synchronization: Calls `calculateConceptMastery(userId, conceptId, tx)` inside the transaction boundary.
   - Daily plan item sync: If the user has an active daily learning plan for today containing a `spaced_review` item targeting `conceptId`, its status is updated to `completed`.

2. **Concurrent Request Deduplication (Idempotency):**
   - Learners double-clicking submit or experiencing network latency can trigger multiple submissions simultaneously.
   - A concurrent submission deduplicator was implemented: `runDeduplicatedSubmission(dedupeKey, fn)`.
   - Uses a sliding window promise cache based on `userId + conceptId + submissionId`.
   - Concurrent incoming requests await the active promise rather than triggering redundant database writes, eliminating race conditions.

---

### Task D: Frontend Integration (`ReviewCenterPage.tsx` & `client.ts`)

1. **API Client (`frontend/src/api/client.ts`):**
   - Updated `completeReview`:
     ```typescript
     completeReview: (conceptId: string, payload: {
       answers: Record<string, string>;
       scheduleId?: string;
       submissionId?: string;
     }) =>
       request<ApiResponse<CompleteReviewResponse>>(`/reviews/${conceptId}/complete`, {
         method: "POST",
         body: JSON.stringify(payload),
       }),
     ```

2. **Review Center Page (`frontend/src/pages/ReviewCenterPage.tsx`):**
   - Removed client-side evaluation logic (`evalAnswers`, `correctCount`, `accuracy`).
   - The UI collects raw answers from `userDrillAnswers` and passes them directly to `api.completeReview(activeModalItem.conceptId, { answers, scheduleId, submissionId })`.
   - Renders server-evaluated feedback returned from backend:
     - Overall status banner ("Hoàn thành xuất sắc!" or "Cần củng cố thêm").
     - Dynamic accuracy percentage badge.
     - Per-question breakdown showing whether each answer was correct, the student's submission, the expected answer, and grammar explanations.

---

## 4. Modified & Created Files Summary

| File Path | Type | Key Responsibility / Changes |
|-----------|------|------------------------------|
| `backend/src/config/env.ts` | Modified | Added `RATE_LIMIT_SUBMISSION_MAX: 60` and `RATE_LIMIT_GENERAL_MAX: 500`. |
| `backend/src/middleware/rate-limit.ts` | Modified | Added `submissionRateLimiter` and `generalApiRateLimiter` with custom user/IP key generator and 429 response structure. |
| `backend/src/app.ts` | Modified | Mounted `generalApiRateLimiter` globally on `/api/v1`. |
| `backend/src/routes/review.routes.ts` | Modified | Mounted `submissionRateLimiter` on `POST /reviews/:conceptId/complete`. |
| `backend/src/routes/exercises.routes.ts` | Modified | Mounted `submissionRateLimiter` on `POST /exercises/:exerciseId/check`. |
| `backend/src/routes/questions.routes.ts` | Modified | Mounted `submissionRateLimiter` on `POST /questions/:questionId/check`. |
| `backend/src/routes/onboarding.routes.ts` | Modified | Mounted `submissionRateLimiter` on `POST /assessment/:assessmentId/submit`. |
| `backend/src/routes/adaptive.routes.ts` | Modified | Mounted `submissionRateLimiter` on `POST /adaptive/toeic-practice/check` and `/adaptive/quiz/check`. |
| `backend/src/controllers/review.controller.ts` | Modified | Redesigned `completeReviewBodySchema` to accept `answers`, `scheduleId`, and `submissionId`. |
| `backend/src/services/review.service.ts` | Modified | Implemented server-authoritative evaluation with `evaluateQuestion`, IDOR schedule check, question existence validation, atomic `prisma.$transaction`, deduplication cache, and feedback return. |
| `frontend/src/types/api.types.ts` | Modified | Added `ReviewQuestionResult` and updated `CompleteReviewResponse`. |
| `frontend/src/api/client.ts` | Modified | Updated `completeReview` signature to send `answers`, `scheduleId`, and `submissionId`. |
| `frontend/src/pages/ReviewCenterPage.tsx` | Modified | Switched to server-authoritative submission and added rich question-by-question feedback modal. |
| `backend/tests/phase3-4a-unit.test.ts` | Created | 12 unit tests verifying server grading, tampering neutralization, IDOR defense, and transactions. |
| `backend/tests/phase3-4a-rate-limit.unit.test.ts` | Created | 3 unit tests verifying submission rate limiter, burst defense, and user quota isolation. |
| `backend/tests/phase3-4a-staging.api.test.ts` | Created | 8 integration tests against Neon staging database verifying live API contracts and data persistence. |
| `backend/scripts/run-phase3-4a-browser-verification.mjs` | Created | Playwright E2E browser verification script covering 6 user journeys. |

---

## 5. Database Schema & Migration Invariants

- **Zero Schema Migrations:** No migration was created or required for Phase 3.4A. The existing Prisma schema (`ConceptReviewSchedule`, `QuestionAttemptItem`, `UserConceptMastery`, `DailyLearningPlanItem`) supported all required fields and relation mappings.
- **Canonical Data Guard:** Canonical Murphy JSON files in `grammarpath-data` were untouched.
- **Staging Isolation:** Staging guard (`run-with-staging-env.mjs`) strictly verified host connection to `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`.

