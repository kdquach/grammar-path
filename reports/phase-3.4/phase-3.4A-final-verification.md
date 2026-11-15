# GrammarPath Phase 3.4A — Final Independent Verification Report
## Independent Audit: Security Hardening, Server-Authoritative Grading, and Transactional Integrity

**Date:** 2026-11-13  
**Auditor:** Senior Independent QA Engineer, Security Auditor & Database Integrity Specialist  
**Verification Scope:** Phase 3.4A Implementation across `grammarpath-app` & `grammarpath-staging`  
**Final Verdict:** **VERIFIED PASS**

---

## 1. Executive Summary & Verification Scorecard

An exhaustive, non-destructive audit and independent verification of Phase 3.4A has been completed against the live Neon PostgreSQL staging database (`grammarpath-staging`). 

All source code, routes, controllers, services, database models, transaction scopes, and security layers were traced and verified. All 8 mandated test suites were executed sequentially from fresh shell processes; every suite completed with exit code 0 and 0 failures. All temporary staging test records were cleanly pruned, leaving 0 orphaned rows and zero database drift.

### Verification Scorecard

| Verification Area | Requirement / Gate | Result | Evidence / Details |
| :--- | :--- | :--- | :--- |
| **Grading Integrity** | Eliminate client-side grading (Defect F-01) | **PASS** | Server evaluates raw answers via `evaluateQuestion`; client counts stripped. |
| **Route Protection** | Tiered rate limiting (Defect F-03) | **PASS** | 60 req/min for submissions; 500 req/15min for general API. |
| **IDOR Defense** | Cross-user review schedule isolation | **PASS** | User B blocked from User A schedule with HTTP 403 `FORBIDDEN`. |
| **Input Validation** | Fabricated / foreign question ID rejection | **PASS** | Mismatched questions rejected with HTTP 400 `VALIDATION_ERROR`. |
| **Transactional Safety** | ACID transaction across 4 entities | **PASS** | `prisma.$transaction` wraps attempts, schedule, mastery, and plan items. |
| **Idempotency** | Concurrent submission deduplication | **PASS** | `runDeduplicatedSubmission` prevents duplicate state progression. |
| **Database Migrations** | Zero new migrations / zero schema drift | **PASS** | `prisma migrate status` reports schema up-to-date with 6 existing migrations. |
| **Data Cleanliness** | Temporary test user cleanup & zero orphans | **PASS** | 0 test users remaining, 0 orphaned attempts, 0 orphaned schedules. |
| **Curriculum Invariance** | `grammarpath-data` strictly untouched | **PASS** | Working tree clean on branch `main` (145 units intact). |
| **OVERALL VERDICT** | — | **VERIFIED PASS** | **100% PASS across all verification gates** |

---

## 2. Complete Source Implementation Trace

The review submission flow was traced end-to-end through the stack:

```
[Browser / UI] ReviewCenterPage.tsx (L66-84)
       │
       ▼
[API Client] client.ts (L583-596)
       │
       ▼
[Route Guard] review.routes.ts (L14-19) [requireAuth + submissionRateLimiter]
       │
       ▼
[Controller] review.controller.ts (L15-26, L56-75) [completeReviewBodySchema + strips client counts]
       │
       ▼
[Service] review.service.ts (L179-274) [Concept check, IDOR check, question existence validation]
       │
       ▼
[Server Grader] grader.ts (L235-613) [evaluateQuestion: options, multi-blank, parts, accepted variations]
       │
       ▼
[Deduplication] idempotency.ts (L24-49) [runDeduplicatedSubmission by user:concept:submissionId]
       │
       ▼
[ACID Transaction] review.service.ts (L319-474) [prisma.$transaction]
       ├── QuestionAttemptItem bulk persistence (L321-334)
       ├── ConceptReviewSchedule upsert (L343-358 / L406-428)
       ├── calculateConceptMastery recalculation (L431, mastery.service.ts)
       └── DailyLearningPlanItem completion sync (L434-446)
```

### Exact File Paths & Code Line Verification

1. **Frontend Call Site:**
   - **File:** [`frontend/src/pages/ReviewCenterPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/ReviewCenterPage.tsx#L66-L84)
   - **Verification:** `handleSubmitReview` sends only `{ answers, scheduleId: activeReview.scheduleId }`. It contains no client-side evaluation logic or calculations for `isCorrect`, `correctCount`, or `accuracy`.

2. **Frontend API Client:**
   - **File:** [`frontend/src/api/client.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/api/client.ts#L583-L596)
   - **Verification:** `completeReview(conceptId, { answers, scheduleId, submissionId })` issues a `POST /reviews/:conceptId/complete`.

3. **HTTP Route & Middleware Chain:**
   - **File:** [`backend/src/routes/review.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/review.routes.ts#L14-L19)
   - **Verification:** Route is mounted with `requireAuth`, `submissionRateLimiter`, and `completeReviewHandler`.

4. **Controller Schema Sanitization:**
   - **File:** [`backend/src/controllers/review.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/review.controller.ts#L15-L26) & [`L56-L75`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/review.controller.ts#L56-L75)
   - **Verification:** `completeReviewBodySchema` validates `scheduleId`, `submissionId`, and `answers: z.record(...)`. In lines 66–70, the controller explicitly extracts and forwards *only* `answers`, `scheduleId`, and `submissionId` to `completeConceptReview`. Any client-supplied `correctCount`, `accuracy`, or `isCorrect` fields are stripped.

5. **Service Validation & Authorization Checks:**
   - **File:** [`backend/src/services/review.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts#L184-L274)
   - **Verification:**
     - Concept existence check: Line 193 throws `AppError.notFound` if concept is missing.
     - Cross-User IDOR defense: Lines 206–208 verify `schedule.userId === userId`; throws `AppError.forbidden` (HTTP 403) if mismatched.
     - Schedule concept linkage: Line 209 verifies `schedule.conceptId === conceptId`.
     - Question integrity: Lines 226–273 fetch questions from DB and reject any foreign or fabricated question IDs with `AppError.badRequest` (HTTP 400).

6. **Server Grader Invocation:**
   - **File:** [`backend/src/utils/grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L235-L613)
   - **Verification:** `evaluateQuestion` evaluates each submitted student answer against canonical answer keys, multiple-choice options, multi-blank records, parts, and accepted alternative variations with case/whitespace/punctuation normalization. Empty answers are checked via `isEmptyStudentAnswer` ([`grader.ts#L16-L41`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L16-L41)) and marked `unanswered`.

7. **Attempt Model & Status Semantics:**
   - **File:** [`backend/src/services/review.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts#L320-L334)
   - **Verification:** Creates `QuestionAttemptItem` with `attemptSource: "single_check"` and `attemptStatus: item.status` (`"correct"` | `"incorrect"` | `"unanswered"`), matching Prisma enum constraints in [`backend/prisma/schema.prisma#L588-L589`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L588-L589).

---

## 3. Transaction Safety & Idempotency Analysis

### 3.1 Database Writes Inside `prisma.$transaction`
The transaction boundary ([`backend/src/services/review.service.ts#L319-L474`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts#L319-L474)) encapsulates all state-modifying database operations:
1. `tx.questionAttemptItem.create`: Bulk creation of question attempt records for every question evaluated.
2. `tx.conceptReviewSchedule.upsert`: Updates stability days (2.0x expansion or 0.5x contraction), intervals, review count, consecutive correct count, and next due date.
3. `calculateConceptMastery(userId, conceptId, tx)`: Recalculates concept mastery score, retention score, and mastery status passing the active transaction client `tx` into [`mastery.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts).
4. `tx.dailyLearningPlanItem.updateMany`: Marks today's `spaced_review` plan item as `completed`.

### 3.2 Atomicity and Rollback Behavior
- **Failure Midway:** If any write operation fails (e.g. database network glitch, foreign key violation, or calculation throw inside `calculateConceptMastery`), Prisma aborts the transaction with an immediate `ROLLBACK`.
- **Proof of Verification:** Tested and confirmed in unit test (`tests/phase3-4a-unit.test.ts#L4`): when `calculateConceptMastery` threw an error inside the transaction, zero `QuestionAttemptItem` rows were written and `ConceptReviewSchedule` remained completely unchanged.

### 3.3 Concurrency & Idempotency Guard
- **Mechanism:** Implemented in [`backend/src/utils/idempotency.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/idempotency.ts#L24-L49) via `runDeduplicatedSubmission(dedupeKey, fn)`.
- **Key Generation:** Keyed on `review:${userId}:${conceptId}:sub:${payload.submissionId}` (or stable-serialized answer hash if submissionId is omitted).
- **Double-Click & Concurrent Retry Handling:** If two identical requests arrive simultaneously, the second request awaits the in-flight promise of the first request. Only one transaction is dispatched to the database. Both requests receive identical server-authoritative responses.
- **Failed Request Retry:** If the promise rejects, `inflightAndRecent.delete(dedupeKey)` is called immediately in the `.catch()` block, allowing immediate re-submission without blocking.

---

## 4. Test Execution Evidence & Reproducibility Records

All 8 mandated test suites were executed sequentially on the final codebase against Neon staging.

### 4.1 Phase 3.4A Grader Unit Tests
- **Command:** `npx vitest run tests/phase3-4a-unit.test.ts`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Duration:** 294 ms
- **Summary:** 1 test file passed, 12 tests passed, 0 failed.
- **Coverage:** Server grading, alternative answers, normalization, incorrect answers, client tampering neutralization (`isCorrect: true`, `isCorrect: false`), fabricated question rejection (400), IDOR defense (403), unanswered submissions, idempotency deduplication, and atomic rollback.

### 4.2 Phase 3.4A Rate-Limit Unit Tests
- **Command:** `npx vitest run tests/phase3-4a-rate-limit.unit.test.ts`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Duration:** 822 ms
- **Summary:** 1 test file passed, 3 tests passed, 0 failed.
- **Coverage:** Enforcement of `RATE_LIMIT_SUBMISSION_MAX`, user quota isolation, and HTTP 429 `RATE_LIMIT_EXCEEDED` response structure.

### 4.3 Backend Full Unit Suite
- **Command:** `npm run test:unit`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Duration:** 2.79 s
- **Summary:** 8 test files passed, 75 tests passed, 0 failed.
- **Suites Verified:**
  - `phase1-security-hardening.test.ts` (22 tests)
  - `phase1-6-hygiene.test.ts` (8 tests)
  - `phase1-7-staging-guard.test.ts` (6 tests)
  - `phase2-1-unit.test.ts` (8 tests)
  - `phase2-2-unit.test.ts` (4 tests)
  - `phase3-1-unit.test.ts` (6 tests)
  - `phase3-2-unit.test.ts` (12 tests)
  - `phase3-3-unit.test.ts` (9 tests)

### 4.4 Phase 3.4A Staging API Integration Tests
- **Command:** `node scripts/run-with-staging-env.mjs -- npx vitest run tests/phase3-4a-staging.api.test.ts`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Duration:** 9.84 s
- **Target DB:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`
- **Summary:** 1 test file passed, 8 tests passed, 0 failed.
- **Coverage:** Authentication routes (401), correct answer grading with stability expansion, incorrect answer grading with stability reduction, client tampering neutralization on live DB, cross-user IDOR blocking (403), fabricated question rejection (400), and concurrent submission idempotency.

### 4.5 Frontend Full Test Suite
- **Command:** `npm test`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/frontend`
- **Exit Code:** `0`
- **Duration:** 5.75 s
- **Summary:** 13 test files passed, 79 tests passed, 0 failed.
- **Suites Verified:**
  - `phase3-2-mastery.test.tsx` (5 tests)
  - `phase3-3-experience.test.tsx` (5 tests)
  - `phase3-1-dashboard.test.tsx` (4 tests)
  - `exercise-renderer.test.tsx` (17 tests)
  - `auth-and-progress.test.tsx` (6 tests)
  - `adaptive-toeic.test.tsx` (2 tests)
  - `phase2-2-ux.test.tsx` (5 tests)
  - `phase1-runtime-reliability.test.tsx` (8 tests)
  - `catalog-and-theory.test.tsx` (5 tests)
  - `toeic-roadmap.test.tsx` (4 tests)
  - `adaptive-and-ai.test.tsx` (4 tests)
  - `formatted-theory.test.tsx` (8 tests)
  - `phase1-6-api-url.test.ts` (6 tests)

### 4.6 Backend TypeScript Check & Build
- **Command:** `npx tsc --noEmit && npm run build`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Result:** TypeScript compile passed cleanly with 0 type errors.

### 4.7 Frontend TypeScript Check & Build
- **Command:** `npm run build`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/frontend`
- **Exit Code:** `0`
- **Duration:** 1.80 s
- **Result:** `tsc -b && vite build` completed cleanly; 1,618 modules transformed into `dist/`.

### 4.8 Phase 3.4A Playwright Browser E2E Verification
- **Command:** `node scripts/run-phase3-4a-browser-verification.mjs`
- **Working Directory:** `/Users/kd.quach03/Documents/grammarpath-app/backend`
- **Exit Code:** `0`
- **Duration:** 28.2 s
- **Target Ports:** Backend on `:4100`, Frontend on `:5173`
- **Console / Page Errors:** 0 unhandled errors
- **Journeys Verified:**
  1. *Journey 1:* User registration for User A and User B.
  2. *Journey 2:* Seeded overdue review schedule on staging for User A.
  3. *Journey 3:* Interactive drill modal, filled correct answers, verified server feedback banner ("Hoàn thành xuất sắc!") and 2x stability expansion in database.
  4. *Journey 4:* Injected tampered payload (`isCorrect: true`, `correctCount: 99`); verified server evaluated 0% accuracy and recorded incorrect attempt.
  5. *Journey 5:* User B submitted User A's schedule; verified server rejected with HTTP 403 `FORBIDDEN`.
  6. *Journey 6:* Reloaded Review Center; verified schedule state consistency.
- **Screenshots Generated:**
  - `reports/phase-3.4/artifacts/phase3-4a-01-correct-review.png`
  - `reports/phase-3.4/artifacts/phase3-4a-02-schedule-consistent.png`

---

## 5. Rate Limiting Verification & Topography

### 5.1 Route Protection Matrix

| Route | Method | Attached Middleware | Limit Quota | Window | Identity Key |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/*` | ALL | `generalApiRateLimiter` | 500 req | 15 min | `user:${id}` or `ip:${normalizedIp}` |
| `/api/v1/reviews/:conceptId/complete` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |
| `/api/v1/exercises/:exerciseId/check` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |
| `/api/v1/questions/:questionId/check` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |
| `/api/v1/assessment/:assessmentId/submit` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |
| `/api/v1/adaptive/toeic-practice/check` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |
| `/api/v1/adaptive/quiz/check` | POST | `submissionRateLimiter` | 60 req | 1 min | `user:${id}` (authenticated) |

### 5.2 HTTP 429 Response Behavior
When quota is exceeded, the server responds with HTTP 429 and standard error envelope:
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many submission attempts. Please slow down and wait a moment before trying again."
  }
}
```

### 5.3 Storage Architecture: Process-Local vs Distributed
- **Current Implementation:** Backed by `MemoryStore` via `express-rate-limit` ([`backend/src/middleware/rate-limit.ts#L35`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts#L35)).
- **Explicit Architectural Boundary:** Rate limit counters and deduplication caches are **process-local**. In a single-instance container (the current staging configuration), this operates reliably with zero external latency. However, it is **not distributed**. In a multi-replica clustered production deployment, instances do not share memory counters. A transition to Redis (`rate-limit-redis`) is documented and planned for production infrastructure hardening (Phase 3.4D).

---

## 6. Security Threat Vector Audit

All 8 threat vectors mandated for Phase 3.4A were verified:

```
[Threat 1] Client sends isCorrect: true for wrong answer      --> DEFENDED (Server evaluates 0%, status: incorrect)
[Threat 2] Client sends isCorrect: false for right answer     --> DEFENDED (Server evaluates 100%, status: correct)
[Threat 3] Client tampers with schedule ID                    --> DEFENDED (Validated for existence and concept match)
[Threat 4] User B completes User A's schedule (IDOR)          --> DEFENDED (HTTP 403 FORBIDDEN)
[Threat 5] Client sends false unanswered status               --> DEFENDED (Server evaluates actual answer presence)
[Threat 6] Client sends fabricated/foreign question ID        --> DEFENDED (HTTP 400 VALIDATION_ERROR)
[Threat 7] Client double-submits identical review             --> DEFENDED (Deduplicated; single atomic DB commit)
[Threat 8] Client sends empty/malformed answer string         --> DEFENDED (Safely evaluated as unanswered/incorrect)
```

---

## 7. Data Integrity & Staging Isolation Confirmation

1. **Migration State:**
   - Command: `npx prisma migrate status`
   - Output: `6 migrations found in prisma/migrations. Database schema is up to date!`
   - Result: **Zero migrations applied. Zero schema drift.**
2. **Canonical Curriculum Invariance:**
   - Command: `cd /Users/kd.quach03/Documents/grammarpath-data && git status`
   - Output: `On branch main. nothing to commit, working tree clean.`
   - Result: **All 145 canonical Murphy units, theory sections, exercises, and questions remain 100% untouched.**
3. **Database Records & Orphans:**
   - All 10 temporary test users created during automated test runs were purged along with dependent child records.
   - Raw SQL check (`SELECT count(*) FROM question_attempt_items LEFT JOIN users ... WHERE users.id IS NULL`) confirmed **0 orphaned attempts**.
   - Raw SQL check (`SELECT count(*) FROM concept_review_schedules LEFT JOIN users ... WHERE users.id IS NULL`) confirmed **0 orphaned schedules**.

---

## 8. Roadmap Reconciliation & Dependency Sequence

The previously approved roadmap sequence is confirmed and reconciled:

```
┌────────────────────────────────────────────────────────┐
│  Phase 3.4A: Security, Grading Integrity & Rate Limit   │  ◄── COMPLETED & VERIFIED
│  (Resolves F-01 & F-03)                                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3.4B: Dedicated TOEIC Question Bank & Quality    │  ◄── NEXT IN LINE
│  (Resolves F-02: TOEIC Model, Seed Bank, Distractors)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3.4C: Mastery Engine Refinement & Transfer      │
│  (TOEIC transfer weight, inertia fix, returning review)│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3.4D: UX, Accessibility & Production Hardening  │
│  (WCAG 2.1 AA focus, PgBouncer, Redis distributed store)│
└────────────────────────────────────────────────────────┘
```

### Rationale for Subphase Ordering:
- **Phase 3.4A First (Security):** Immediate resolution of F-01 (client-side grading) and F-03 (abuse) was necessary before adding new features, ensuring all review data persisted to staging is tamper-proof.
- **Phase 3.4B Second (TOEIC Bank):** Subphase 3.4C (mastery transfer learning) requires authentic, validated TOEIC assessment items mapped to grammar concepts. Implementing the `ToeicQuestionBankItem` model and seeding Units 5–52 in 3.4B provides the required data foundation for 3.4C.
- **Phase 3.4D Last (Production Hardening):** Redis stores, PgBouncer configuration, and accessibility cleanup are finalized once core data models and business logic are stable.

---

## 9. Known Limitations & Unresolved Risks

1. **Process-Local Rate Limiting & Deduplication:**
   As documented in Section 5.3, `MemoryStore` is process-local. It is fully operational for the single-instance staging environment, but multi-replica horizontal scaling will require swapping to Redis/Valkey in Phase 3.4D.
2. **Neon PgBouncer Connection Sizing:**
   Under heavy concurrent burst loads, direct pooled connections to Neon serverless PostgreSQL can approach max pool limits. Adding PgBouncer transaction pooling configuration is scheduled for Phase 3.4D.

---

## 10. Verification Sign-Off

Phase 3.4A has satisfied all functional, security, architectural, and quality requirements with zero defects, zero schema migrations, and zero regressions.

**Final Verdict:** **VERIFIED PASS**

