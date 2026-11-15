# GrammarPath — Phase 3.4C.1: Implementation Report
## Evidence Integrity & Foundational Mastery Hardening

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.1 Scope Lock  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Status:** IMPLEMENTED & VERIFIED PASS  

---

## 1. Executive Summary & Authorization Context

Phase 3.4C.1 establishes rigorous psychometric evidence integrity for the GrammarPath mastery engine. In accordance with the Phase 3.4C Stage 1.1 Architecture Decision Reconciliation, this milestone enforces strict evidence eligibility gates for TOEIC question bank items, implements true concept evidence isolation, codifies parent module concept aggregation, locks Foundational Competence ($\theta$) as an independent dimension (explicitly rejecting composite scalar scoring), and successfully executes the audited withdrawal of defective staging item `7d24582b-ca20-4c7a-a828-530f4852e80a`.

### Non-Negotiable Safety Safeguards Enforced:
1. **Staging Isolation:** All operations were executed strictly against Neon staging guarded by `backend/scripts/run-with-staging-env.mjs`. Production was never contacted.
2. **Canonical Curriculum Immutability:** Canonical data in `grammarpath-data` remains 100% clean on `main` (zero unstaged/staged changes).
3. **Attempt Immutability:** No existing learner attempts in `QuestionAttemptItem` were deleted, rewritten, or truncated.
4. **Scope Lock:** Neither composite scalar scores nor uncalibrated Transfer Quotient formulas were introduced. Transfer remains an explicit `insufficient_data` state.

---

## 2. P0: Strict TOEIC Evidence Eligibility Invariant

### 2.1 The Invariant Specification
Under Phase 3.4C.1, TOEIC items contribute evidence to concept mastery, accuracy, retention, and spaced review scheduling **only** if they satisfy the complete eligibility tuple:
- `reviewStatus === "approved"`
- `isLatestApproved === true`
- `primarySkill in ["direct_grammar", "word_form_morphology"]`
- `conceptMappingConfidence >= 0.85`
- `attemptStatus !== "unanswered"` and `isCorrect !== null`

Draft, validated (pending approval), rejected, withdrawn, superseded, or archived question versions are **strictly excluded** from live mastery calculation.

### 2.2 Implementation in `mastery.service.ts`
In [`backend/src/services/mastery.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts), the evidence eligibility gate was hardened in both the bank item census and the attempt query criteria:

#### A. Eligible Bank Item Count ([`mastery.service.ts#L190-L200`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts#L190-L200)):
```typescript
const eligibleBankItemCount = await db.toeicQuestionBankItem.count({
  where: {
    conceptId,
    primarySkill: { in: ["direct_grammar", "word_form_morphology"] },
    conceptMappingConfidence: { gte: 0.85 },
    reviewStatus: "approved",
    isLatestApproved: true,
  },
});
```

#### B. Attempt Query Filter ([`mastery.service.ts#L231-L266`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts#L231-L266)):
```typescript
const attemptCriteria: Prisma.QuestionAttemptItemWhereInput[] = [];
if (mappedQuestionIds.length > 0) {
  attemptCriteria.push({ questionId: { in: mappedQuestionIds } });
}
if (eligibleBankItemCount > 0) {
  attemptCriteria.push({
    attemptSource: "toeic_practice",
    questionBankItem: {
      conceptId,
      primarySkill: { in: ["direct_grammar", "word_form_morphology"] },
      conceptMappingConfidence: { gte: 0.85 },
      reviewStatus: "approved",
      isLatestApproved: true,
    },
  });
}

const attempts = await db.questionAttemptItem.findMany({
  where: {
    userId,
    attemptStatus: { not: "unanswered" },
    isCorrect: { not: null },
    OR: attemptCriteria.length > 0 ? attemptCriteria : undefined,
  },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    questionId: true,
    questionBankItemId: true,
    isCorrect: true,
    attemptStatus: true,
    attemptSource: true,
    createdAt: true,
  },
});
```

### 2.3 Verification Against Regression
If a question is withdrawn or superseded by a newer approved version:
- The old version has `isLatestApproved = false` (and `reviewStatus = "withdrawn"` or `"archived"`).
- Queries evaluating live mastery dynamically evaluate against `questionBankItem.isLatestApproved = true`, so attempts on the obsolete or withdrawn version instantly cease contributing evidence to current mastery scores.
- Historical attempts remain 100% intact in the database for auditing and research purposes.

---

## 3. Concept Evidence Isolation

### 3.1 Elimination of Broad Unit-Level Fallback
Prior to Phase 3.4C.1, if a concept had fewer than 5 distinct questions linked via `Explanation.theorySectionId`, the query executed an unconstrained fallback:
```typescript
// REMOVED LEGACY FLAW:
if (questionIdsSet.size < 5 && associatedUnitIds.size > 0) {
  const fallbackQuestions = await db.question.findMany({
    where: { exercise: { unitId: { in: Array.from(associatedUnitIds) } } },
    select: { id: true },
  });
  fallbackQuestions.forEach(q => questionIdsSet.add(q.id));
}
```
**The Flaw:** English Grammar in Use units contain multiple exercises testing distinct micro-rules (e.g., Unit 4 has stative verbs vs dynamic verbs). Sweeping all unit questions into every concept linked to any section of that unit caused severe cross-concept evidence contamination.

**The Resolution:** The unit-wide fallback was **completely deleted**. Questions are linked to concepts strictly through:
1. Textbook items: Direct `Question -> Explanation -> TheorySection -> ConceptTheoryLink` paths.
2. TOEIC items: Approved `ToeicQuestionBankItem -> conceptId` mappings with $\ge 0.85$ confidence.

### 3.2 Handling Sparse Concepts
If an atomic concept has fewer than 3 distinct questions attempted by a learner, it remains in `masteryStatus = "insufficient_data"`. It does not borrow, sweep in, or infer evidence from adjacent units or unlinked exercises.

---

## 4. Parent Module Concept Aggregation

### 4.1 Curriculum Concept Hierarchy
GrammarPath models 161 `GrammarConcept` entities:
- **145 Unit Concepts (`unit.001` – `unit.145`):** Each corresponds to a canonical textbook unit and directly links to 14–37 textbook questions.
- **16 Parent Module Concepts (`module.1.1` – `module.5.3`):** High-level syllabus groupings (e.g., `module.2.1: Present and Past`, covering Units 1–4). These concepts have no direct textbook explanations (`theoryLinks = 0`).

### 4.2 Aggregation Formula
Instead of querying questions directly for parent concepts (which yielded 0 records or would have required dangerous recursive joins), `mastery.service.ts` now aggregates child unit masteries directly ([`mastery.service.ts#L68-L140`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts#L68-L140)):

$$\text{moduleScore} = \frac{\sum_{c \in \text{ActiveChildren}} (\text{masteryScore}_c \times \text{distinctQuestionCount}_c)}{\sum_{c \in \text{ActiveChildren}} \text{distinctQuestionCount}_c}$$

$$\text{totalDistinct} = \sum_{c \in \text{Children}} \text{distinctQuestionCount}_c, \quad \text{totalEvidence} = \sum_{c \in \text{Children}} \text{evidenceCount}_c$$

$$\text{avgRetention} = \frac{1}{|\text{Children}|} \sum_{c \in \text{Children}} \text{retentionScore}_c$$

### 4.3 Aggregation Status Gates
- If $\text{totalDistinct} = 0$: `masteryStatus = "not_started"`, `masteryScore = null`.
- If $\text{totalDistinct} < 3$: `masteryStatus = "insufficient_data"`.
- If $\text{totalDistinct} \ge 3$: Status follows standard thresholds (`developing` < 70, `practicing` < 85, `proficient` $\ge$ 85 with $N < 5$, `mastered` $\ge$ 85 with $N \ge 5$ and $\text{retention} \ge 0.6$).

This preserves psychometric accuracy and guarantees zero double-counting.

---

## 5. Measurement Dimensions: Foundational Competence vs Transfer

### 5.1 Rejection of Composite Scalar Scoring
The product owner rejected fixed 60/40 or adaptive 40/60 composite weights. Combining Foundational Competence ($\theta$) and Transfer Quotient ($\tau$) into a single scalar number obscures whether learner difficulty arises from core grammatical misunderstanding or context-switch fatigue under TOEIC workplace distractors.

### 5.2 Foundational Competence ($\theta$) Model
The foundational competence model implemented in Phase 3.2 remains the sole driver of the core mastery score:
- **Exponential Repeat Discounting:**
  $$d(k) = \max(0.10, 0.50^k)$$
  Where $k$ is the attempt sequence number for a specific question. Repeated attempts cannot artificially inflate `distinctQuestionCount` or skew the score.
- **Same-Day Cramming Factor:** Multiple attempts within 24 hours receive a 0.50 discount factor.
- **Forgetting Curve Recency Decay:**
  $$R(t) = \exp(-0.02 \times \Delta t_{\text{days}})$$
  Triggers `needs_review` state when estimated retention drops below 0.60.
- **Spaced Review Interval Scheduling:** Half-life stability $S$ updates adaptively based on response correctness.

### 5.3 Transfer Dimension ($\tau$) Status
Until Phase 3.4C.2 and 3.4C.3 establish psychometrically calibrated item response theory parameters and adequate approved item coverage, the Transfer dimension exposes an explicit `insufficient_data` state with rationale:
```json
{
  "transferDimension": {
    "status": "insufficient_data",
    "score": null,
    "reason": "transfer_quotient_uncalibrated",
    "requiredConditions": [
      "minimum_3_approved_toeic_items_per_concept",
      "calibrated_item_difficulty_parameters",
      "non_zero_learner_cross_context_attempts"
    ]
  }
}
```

---

## 6. Audited Withdrawal Execution: Staging Item `7d24582b`

### 6.1 Defect Audit
- **Target Item ID:** `7d24582b-ca20-4c7a-a828-530f4852e80a`
- **Root Question ID:** `3d71c0d1-6a2d-498a-b6f2-c5abad85657e`
- **Carrier Prompt:** *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."*
- **Defect:** Correct key was Option B: *"am trying"* (`isCorrect: true`). Subject is 3rd-person singular *"he"*; *"he am trying"* is grammatically defective.

### 6.2 Precondition Verification
Prior to withdrawal execution, the following invariants were verified via [`backend/scripts/execute-phase3-4c1-withdrawal.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c1-withdrawal.mjs):
1. Item exists, version = 2, currently `reviewStatus = "approved"`, `isLatestApproved = true`.
2. Target defect verified: Option B is indeed `"am trying"` and marked `isCorrect: true`.
3. Learner attempts on this item in `question_attempt_items` = **0**.
4. Total learner attempts on all TOEIC question bank items = **0**.

### 6.3 Withdrawal Mutation & Audit Trail
The withdrawal was executed atomically:
```typescript
await prisma.toeicQuestionBankItem.update({
  where: { id: "7d24582b-ca20-4c7a-a828-530f4852e80a" },
  data: {
    reviewStatus: "withdrawn",
    isLatestApproved: false,
    withdrawnReason: "Withdrawn in Phase 3.4C.1 audit: ungrammatical answer key (Option B 'am trying' with 3rd-person subject 'he'). Originally approved by f52ff8f5-00f8-4ff2-9dde-5339114f62ba at 2026-11-13T17:34:56.098Z.",
    updatedAt: new Date(),
  },
});
```
- Historical reviewer (`f52ff8f5...`), review timestamp, and review notes were completely preserved.
- Active approved TOEIC bank items remaining: exactly **2** (`7d9abd94-df89-4762-8a86-a3217f0217b0` and `45e751fd-4915-4bac-a386-c7bae5295911`).

---

## 7. Historical Attempt Preservation

A core architectural invariant of Phase 3.4C.1 is that learner attempt history is strictly immutable.
- `QuestionAttemptItem` records are **append-only**.
- No attempts were deleted or altered during the withdrawal or during test execution.
- Vitest suites use transactional rollbacks or explicit user-scoped cleanup (`userId = testUserId`), guaranteeing zero mutation of baseline staging learner records.
- Staging baseline users (`audit-db-...`, `perf-audit-...`, `phase32-e2e-...`) and their historical attempts on question `0c657406-9046-4704-8609-55a9ed670fd5` remain completely intact.

---

## 8. Implementation File Manifest

| File Path | Nature of Change | Purpose / Invariant Enforced |
|---|---|---|
| [`backend/src/services/mastery.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts) | Modified | Enforced strict TOEIC eligibility (`approved` + `isLatestApproved`), removed broad unit fallback, implemented module aggregation. |
| [`backend/scripts/execute-phase3-4c1-withdrawal.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c1-withdrawal.mjs) | Created | Deterministic migration script executing audited withdrawal of item `7d24582b` on Neon staging. |
| [`backend/tests/phase3-4c1-mastery-hardening.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4c1-mastery-hardening.test.ts) | Created | 14 comprehensive unit & integration tests validating all Phase 3.4C.1 invariants. |
| [`backend/tests/phase3-4b-m3.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4b-m3.test.ts) | Modified (L161) | Hardened test assertion to dynamically bind to whichever approved bank item is drawn by practice session. |

---

## 9. Conclusion & Verdict

Phase 3.4C.1 successfully resolves all evidence integrity issues without introducing premature composite formulas. All automated test suites and regression tests pass with exit code 0.

**Implementation Verdict: VERIFIED PASS**

