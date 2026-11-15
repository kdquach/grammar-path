# GrammarPath — Phase 3.4B Stage 2: Milestone 2 Report
## Question Bank Services, Quality Engine & Editorial Review Workflow

**Auditor/Engineer:** Senior Software Architect, QA Lead, Backend Security Engineer  
**Date:** November 14, 2026  
**Status:** COMPLETE & VERIFIED (EXIT GATE PASSED)  
**Safety Scope:** Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech / grammarpath-staging`), Canonical Curriculum (`grammarpath-data` Clean)  

---

## 1. Executive Summary & Exit Gate Status

Milestone 2 (M2) has successfully delivered the complete Question Bank Service, Quality Engine, and Administrative Editorial Review Workflow:
1. **Automated Quality Engine:** Implemented comprehensive multi-stage screening (`toeic-quality-engine.service.ts`) enforcing format, single-key integrity, distractor deduplication, business register, curriculum mapping, and prompt similarity checks.
2. **Supplementary Dual-Pass Evaluation:** Implemented 4-factor scoring rubric (Linguistic Accuracy 3.0, Business Realism 2.5, Distractor Validity 2.5, Pedagogical Explanation 2.0). Threshold $\ge 8.50$ qualifies items for `validated` status, but **never automatically publishes**.
3. **Mandatory Human Editorial Sign-off:** Administrative workflow implemented with role/email checks (`requireAdmin`). Only authorized administrators can approve questions.
4. **Lifecycle State Machine:** Enforced atomic approval transitions (`isLatestApproved = true`, automatic archiving of older versions), explicit rejection with required audit notes, and emergency withdrawal (`withdrawn`).
5. **Session Admission Invariant:** Verified that `getApprovedQuestionsForPractice` physically excludes draft, validated, rejected, archived, or withdrawn questions. Only active approved questions can be queried.
6. **Tests Passed:** Dedicated test suite `tests/phase3-4b-m2.test.ts` passed (11/11 tests, exit code 0).

**Exit Gate Verdict: PASS — Milestone 3 is safe to begin.**

---

## 2. Components Implemented

### 2.1 Services & Business Logic
1. **[`toeic-quality-engine.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-quality-engine.service.ts):**
   - Structural validation (single blank `_______`, 8–45 words, 4 options).
   - Answer key validation (exactly 1 correct key; flags zero keys `BLK_WRONG_KEY` or multiple keys `BLK_AMBIGUITY`).
   - Distractor deduplication and validation (`BLK_DISTRACTOR`).
   - Vietnamese pedagogical explanation depth check (`BLK_EXPLANATION`).
   - Business register keyword check.
   - Exact content hash match (`BLK_DUPLICATE`) and Levenshtein similarity check ($> 0.85$ prompt similarity).
2. **[`toeic-question-bank.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-question-bank.service.ts):**
   - `getReviewQueue`: Filtered review queue by status, unit, difficulty.
   - `approveQuestion`: Promotes `validated` item to `approved` and `isLatestApproved = true`, archiving previous versions of the same root question.
   - `rejectQuestion`: Rejects defective items with mandatory audit notes.
   - `emergencyWithdrawQuestion`: Immediately quarantines items (`withdrawn`) with mandatory reason codes.
   - `createNewVersion`: Non-destructive versioning ($N+1$) initialized in `draft`/`validated`.
   - `getApprovedQuestionsForPractice`: Strictly filters `reviewStatus = 'approved' AND isLatestApproved = true`.

### 2.2 Security & Admin API
1. **[`backend/src/middleware/admin.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/admin.ts):**
   - Checks authentication and validates user email against `ADMIN_EMAILS` or `x-admin-key` header.
   - Returns 403 `FORBIDDEN` to standard learners attempting to access administrative endpoints.
2. **[`backend/src/controllers/admin-toeic.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/admin-toeic.controller.ts) & [`backend/src/routes/admin-toeic.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/admin-toeic.routes.ts):**
   - `GET /api/v1/admin/toeic/queue`
   - `GET /api/v1/admin/toeic/items/:id`
   - `POST /api/v1/admin/toeic/items/:id/approve`
   - `POST /api/v1/admin/toeic/items/:id/reject`
   - `POST /api/v1/admin/toeic/items/:id/withdraw`
   - `POST /api/v1/admin/toeic/items/:id/version`
   - `POST /api/v1/admin/toeic/validate`

---

## 3. Test Execution Summary

```bash
# Backend TypeScript Typecheck
npm run typecheck
# Exit Code: 0

# Milestone 2 Automated Test Suite
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4b-m2.test.ts
# Exit Code: 0 (11 passed in 10.71s)
```

### Detailed Test Assertions:
- Quality Gate: High-quality Part 5 question passed with score $\ge 8.50$.
- Format Defect: Missing blank and multiple blanks flagged with `BLK_FORMAT`.
- Key Defect: Zero keys and ambiguous multiple keys flagged with `BLK_WRONG_KEY` and `BLK_AMBIGUITY`.
- Distractor Defect: Duplicate option texts flagged with `BLK_DISTRACTOR`.
- Authorization: 401 on unauthenticated, 403 on standard learner, 200 on authorized admin.
- State Machine: Approved Version 1 $\rightarrow$ created Version 2 $\rightarrow$ approved Version 2 atomically archived Version 1.
- Emergency Protocol: Question withdrawn with reason code, instantly deactivated.
- Invariant Gate: `getApprovedQuestionsForPractice` completely excluded non-approved and non-latest items.

---

## 4. Next Milestone Readiness

- **Current Status:** All quality engine rules and administrative lifecycle endpoints are verified and active on staging.
- **Safety Sign-off:** No learner-facing practice API can query unapproved questions.
- **Milestone 3 (Offline Generation & Learner Integration) is cleared to proceed.**

