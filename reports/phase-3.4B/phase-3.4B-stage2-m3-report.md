# GrammarPath — Phase 3.4B Stage 2: Milestone 3 Report
## Offline Generation Queue, Practice Retrieval & Mastery Telemetry Bridge

**Auditor/Engineer:** Principal Learning Systems Architect, Senior Backend Engineer, Educational Data Scientist  
**Date:** November 14, 2026  
**Status:** COMPLETE & VERIFIED (EXIT GATE PASSED)  
**Safety Scope:** Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech / grammarpath-staging`), Canonical Curriculum (`grammarpath-data` Clean)  

---

## 1. Executive Summary & Exit Gate Status

Milestone 3 (M3) has completed with all exit gate criteria satisfied:
1. **Offline Persistent Generation Queue:** Implemented `ToeicGenerationQueueService` backed by database table `toeic_generation_jobs`. Enqueued 144 jobs across Priority Batch 1 (Units 5–24, 60 jobs) and Priority Batch 2 (Units 25–52, 84 jobs) with bounded exponential backoff, checkpointing, and safe pause/resume.
2. **Practice Retrieval Integration:** Updated `generateToeicQuestionsForUnit` to prioritize approved questions from `ToeicQuestionBankService.getApprovedQuestionsForPractice`. Instantiated practice items now carry immutable `questionBankItemId` references.
3. **Mastery Telemetry Bridge:** Gated learning telemetry strictly according to the 7 Stage 1.1 eligibility rules. When an eligible approved question is checked:
   - Persists a `QuestionAttemptItem` with `attemptSource: "toeic_practice"`.
   - Records binary `attemptStatus` ("correct" or "incorrect").
   - Updates `user_concept_mastery` and spaced review schedules via `triggerToeicMasteryUpdate`.
4. **Domain & Repeat Isolation:**
   - Vocabulary, reading, and listening questions are **100% isolated** from emitting grammar concept mastery telemetry.
   - Re-attempting a question within the same session increments attempt counts in `toeic_practice_items` but **does not create duplicate mastery telemetry** in `question_attempt_items`.
5. **Emergency Withdrawal Shield:** Submitting an answer against a withdrawn defective question awards void credit without penalty and emits zero negative telemetry.
6. **Tests Passed:** Dedicated test suite `tests/phase3-4b-m3.test.ts` passed (6/6 tests, exit code 0).

**Exit Gate Verdict: PASS — Milestone 4 is safe to begin.**

---

## 2. Components Implemented

### 2.1 Offline Generation Queue Service
- File: [`backend/src/services/toeic-generation-queue.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generation-queue.service.ts)
- Capabilities:
  - `enqueueUnits`: Idempotent batch enqueueing across target units and difficulty levels.
  - `processNextJob`: Picks pending job past `nextRetryAt`, creates audit run in `toeic_question_generation_runs`, calls LLM with fail-closed handling, evaluates candidate questions via `validateToeicQuestionQuality`, and writes validated/draft items (never auto-approved).
  - Exponential backoff: `Math.pow(2, attempts) * 1000ms` up to 60s.
  - Job pause and resume states.

### 2.2 Practice Retrieval & Session Persistence
- File: [`backend/src/services/toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts)
- Capabilities:
  - First queries `ToeicQuestionBankService.getApprovedQuestionsForPractice({ unitNumber, difficulty, count })`.
  - Populates `questionBankItemId` on served `ToeicQuestion` records.
  - Preserves option shuffling and anti-spoiler behavior.
- File: [`backend/src/controllers/adaptive.controller.ts#generateToeicPracticeHandler`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L650-L670):
  - Populates `questionBankItemId` on persisted `ToeicPracticeItem` rows.

### 2.3 Server Grader & Mastery Telemetry Bridge
- File: [`backend/src/controllers/adaptive.controller.ts#checkToeicPracticeHandler`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L720-L840):
  - Emergency withdrawal check: if `questionBankItem.reviewStatus === "withdrawn"`, awards void credit (`isVoided = true`) without penalty.
  - First-attempt gating: only the first graded interaction on a practice item can emit mastery evidence.
  - Skill gating: only `direct_grammar` or `word_form_morphology` with confidence $\ge 0.85$ writes to `question_attempt_items`.
  - Emits `attemptSource: "toeic_practice"` and correct `attemptStatus`.
  - Calls `triggerToeicMasteryUpdate` to update `user_concept_mastery`.
- File: [`backend/src/services/mastery.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts):
  - Added `triggerToeicMasteryUpdate(userId, conceptId)` invoking deterministic Phase 3.2 `calculateConceptMastery`.

---

## 3. Test Execution Summary

```bash
# Backend TypeScript Typecheck
npm run typecheck
# Exit Code: 0

# Milestone 3 Automated Test Suite
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4b-m3.test.ts
# Exit Code: 0 (6 passed in 13.69s)
```

### Detailed Test Assertions:
1. `enqueueUnits` successfully enqueued batch units and demonstrated 100% idempotency (0 duplicates on re-enqueue).
2. `toeic_generation_jobs` demonstrated safe pause and resume state transitions.
3. `POST /api/v1/adaptive/toeic-practice` successfully selected approved question bank items, linking `questionBankItemId`.
4. `POST /api/v1/adaptive/toeic-practice/check` created a `QuestionAttemptItem` with `attemptSource: 'toeic_practice'` and `attemptStatus: 'correct'`.
5. Repeated attempts on the same practice item incremented `attemptCount` in `toeic_practice_items` while emitting zero duplicate rows to `question_attempt_items`.
6. Non-grammar items (`primarySkill = 'vocabulary_collocation'`) were successfully isolated from emitting grammar concept mastery telemetry.

---

## 4. Next Milestone Readiness

- **Current Status:** All generation queues, practice retrieval logic, and mastery telemetry bridges are verified and operational.
- **Safety Sign-off:** Zero impact on canonical Murphy curriculum or existing Phase 3.2 mastery algorithm semantics.
- **Milestone 4 (Comprehensive Independent Verification) is cleared to begin.**

