# GrammarPath — Phase 3.4C.3: Implementation Report
## Contextual Diversity Engine, Audit Tooling & Defective Item Quarantine

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.3 Implementation  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Status:** IMPLEMENTED & VERIFIED PASS  

---

## 1. Executive Summary & Implementation Mandate

Phase 3.4C.3 implements the **Contextual Diversity Engine** and **Administrative Audit Tooling** specified in the approved Phase 3.4C.2 architecture. The objective of this milestone is to establish computational infrastructure for evaluating evidence quality, contextual independence, and question-bank integrity.

### Strict Scope & Safeguards Enforced:
1. **Zero Numerical Transfer Scoring:** Numerical Transfer Competence ($\tau$) is **NOT** calculated in this milestone. $\tau$ remains strictly in `insufficient_data` with `score = null`.
2. **Zero Composite Scalar Index:** Composite scoring ($\theta/\tau$) is completely excluded.
3. **Staging Isolation Guard:** Every operation was guarded by `backend/scripts/run-with-staging-env.mjs`. Production was never contacted.
4. **Canonical Data Immutability:** `grammarpath-data` remains 100% clean on `main` (zero files modified).
5. **Historical Attempt Immutability:** Zero historical attempts in `QuestionAttemptItem` were deleted or altered.
6. **Pre-Modification Backup:** A recoverable snapshot of staging TOEIC tables was saved to `backend/recovery/phase3-4c3-pre-backup/` before database updates.

---

## 2. Mandatory Preflight: Defective Approved Item Quarantine

### 2.1 Inspection Findings
Preflight inspection of item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2`:
- **Prompt:** *"The IT technician is not at his desk because **he** _______ the server hardware in Room 3 right now."*
- **Approved Answer Key:** Option A: *"are / updating"* (`isCorrect: true`).
- **Defect:** Subject is 3rd-person singular pronoun *"he"*; *"he are updating"* is an objective subject-verb agreement defect.
- **Historical Attempts:** Verified exactly **0 attempts** in `QuestionAttemptItem` and 0 practice session items.

### 2.2 Audited Withdrawal Execution
The withdrawal was executed via [`backend/scripts/execute-phase3-4c3-withdrawal.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c3-withdrawal.mjs):
```typescript
await prisma.toeicQuestionBankItem.update({
  where: { id: "4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2" },
  data: {
    reviewStatus: "withdrawn",
    isLatestApproved: false,
    withdrawnReason: "Withdrawn in Phase 3.4C.3 preflight audit: ungrammatical answer key (Option A 'are / updating' with 3rd-person singular subject 'he'). Originally approved by fc2c140a-fa60-4146-b9f9-4b7f687e27c2 at 2026-11-13T19:15:44.925Z.",
    updatedAt: new Date(),
  },
});
```
- **Affected Rows:** Exactly 1 row.
- **Audit Preservation:** Original content, options, answer key, reviewer ID (`fc2c140a...`), reviewed timestamp, and review notes were permanently preserved.
- **Idempotency:** The script checks `if (item.reviewStatus === "withdrawn" && !item.isLatestApproved)` and exits cleanly on repeat execution.
- **Remaining Approved Active Items:** Exactly 3 items (`7d9abd94-df89-4762-8a86-a3217f0217b0`, `44931eb1-344b-4ec8-aceb-5524a952ed59`, `45e751fd-4915-4bac-a386-c7bae5295911`).

---

## 3. Test Contamination Prevention in `tests/phase3-4b-m2.test.ts`

### 3.1 Root Cause of Previous Contamination
In the previous implementation of [`backend/tests/phase3-4b-m2.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4b-m2.test.ts#L205-L250), the test suite queried a real legacy validated item from staging (`findFirst({ where: { unitNumber: 1, reviewStatus: "validated" } })`), approved it, created a Version 2 with the hardcoded prompt *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."*, and approved Version 2 without teardown. Consequently, every test run converted another real validated item into an approved duplicate prompt.

### 3.2 Implemented Refactoring
1. **Isolated Test Records:** The test now creates its own dedicated test item in `beforeAll` using `rootQuestionId = randomUUID()` and a unique SHA-256 content hash. Real staging inventory is never touched.
2. **Explicit Tracked Teardown:** An `afterAll` hook tracks all created question IDs in `createdItemIds` and user IDs in `createdUserIds`, deleting only those test-created records:
```typescript
afterAll(async () => {
  if (createdItemIds.length > 0) {
    await prisma.toeicQuestionOption.deleteMany({
      where: { questionBankItemId: { in: createdItemIds } },
    });
    await prisma.toeicQuestionBankItem.deleteMany({
      where: { id: { in: createdItemIds } },
    });
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});
```
3. **Repeatability Verification:** Running `tests/phase3-4b-m2.test.ts` repeatedly leaves staging question bank inventory completely invariant (37 items before == 37 items after).

---

## 4. Contextual Diversity Engine Implementation

The Contextual Diversity Engine is implemented in [`backend/src/services/contextual-diversity.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/contextual-diversity.service.ts).

### 4.1 The 5 Linguistic Signals

| Signal | Mathematical Formulation | Pedagogical / Psychometric Role |
|---|---|---|
| **1. $S_{\text{norm}}$** (Template Similarity) | $0.50 \cdot J_{2\text{-gram}}(T_A, T_B) + 0.50 \cdot \left(1 - \frac{\text{Lev}(T_A, T_B)}{\max(|T_A|, |T_B|)}\right)$ | Measures lexical carrier sentence identity with blanks normalized to `[BLANK]`. Detects identical template re-use across questions. |
| **2. $S_{\text{slot}}$** (Slot Alignment) | $0.50 \cdot J(W_{L,A}, W_{L,B}) + 0.50 \cdot J(W_{R,A}, W_{R,B})$ | Measures local syntactic frame overlap within a 3-token window before and after `[BLANK]`. Identifies identical governing subject/verb frames. |
| **3. $S_{\text{sem}}$** (Semantic Overlap) | $0.50 \cdot \mathbb{I}(\text{dom}_A = \text{dom}_B) + 0.50 \cdot J_{\text{content}}(W_A, W_B)$ | Evaluates workplace domain matching (8 domains) and entity keyword overlap. Quantifies scenario transfer distance. |
| **4. $S_{\text{dist}}$** (Distractor Profile) | $\frac{\|F_A \cap F_B\|}{\|F_A \cup F_B\|}$ | Compares inflectional (`-ing`, `-ed`, `-s`, base) and derivational (`-tion`, `-ly`, `-ive`) distractor suffix profiles. |
| **5. $S_{\text{rule}}$** (Rule Overlap) | $0.50 \cdot \mathbb{I}(c_A = c_B) + 0.20 \cdot \mathbb{I}(u_A = u_B) + 0.15 \cdot \mathbb{I}(s_A = s_B) + 0.15 \cdot \mathbb{I}(r_A = r_B)$ | Quantifies whether items target the identical concept, unit, skill, and micro-rule reference. |

### 4.2 Resolution of Phase 3.4C.2 Formula Inconsistency
In Phase 3.4C.2, $S_{\text{dist}}$ and $S_{\text{rule}}$ were defined in diagrams but omitted from $D_{\text{ctx}} = 1 - \max(S_{\text{norm}}, 0.60 S_{\text{slot}} + 0.40 S_{\text{sem}})$.
**The Resolution:** 
- $D_{\text{ctx}}$ strictly measures **Carrier Scenario Contextual Distance**:
  $$S_{\text{carrier}} = \max\Big(S_{\text{norm}}, \; 0.60 \cdot S_{\text{slot}} + 0.40 \cdot S_{\text{sem}}\Big)$$
  $$D_{\text{ctx}} = 1.0 - S_{\text{carrier}}$$
- $S_{\text{dist}}$ measures option morphological design.
- $S_{\text{rule}}$ measures target grammar concept alignment.
- Blending $S_{\text{rule}}$ into $D_{\text{ctx}}$ would incorrectly penalize two questions testing the *same concept* in *different domains* (e.g. Present Continuous in IT vs Logistics). 
- Using them orthogonally enables classifying question pairs into 4 distinct pedagogical types:
  1. `EXACT_DUPLICATE`: $S_{\text{norm}} \ge 0.95$ and options match.
  2. `TEMPLATE_DUPLICATE`: $S_{\text{norm}} \ge 0.85$, $D_{\text{ctx}} < 0.20$, but options vary.
  3. `SAME_RULE_NOVEL_CONTEXT`: $S_{\text{rule}} \ge 0.70$ and $D_{\text{ctx}} \ge 0.50$ (**Target Transfer Evidence**).
  4. `DIFFERENT_RULE_SIMILAR_CONTEXT`: $S_{\text{rule}} < 0.50$ and $S_{\text{carrier}} \ge 0.70$.

### 4.3 Context Clustering ($K_{\text{ctx}}$)
Using graph connected components where an edge exists if $D_{\text{ctx}}(q_i, q_j) < 0.50$, items are clustered into equivalence classes. The number of equivalence classes is $K_{\text{ctx}}$.

---

## 5. Administrative Audit Tooling

Implemented in [`backend/src/services/admin-toeic-audit.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/admin-toeic-audit.service.ts) and exposed via [`admin-toeic.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/admin-toeic.routes.ts):

### 5.1 Endpoints Added:
- `GET /api/v1/admin/toeic/diversity-audit`: Returns comprehensive audit summary, critical duplicate template warnings, and concept-level evidence sufficiency flags.
- `GET /api/v1/admin/toeic/inventory/contextual`: Returns concept-by-concept inventory reporting $N_q$ (question count) vs $K_{\text{ctx}}$ (context count).

### 5.2 Security & Authorization:
Both endpoints require administrative authentication (`requireAuth`, `requireAdmin`) and valid admin credentials or `x-admin-key`. Requests from standard learners are rejected with HTTP 403 FORBIDDEN.

---

## 6. Implementation File Manifest

| File Path | Type | Description |
|---|---|---|
| [`backend/scripts/execute-phase3-4c3-withdrawal.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c3-withdrawal.mjs) | Created | Deterministic, audited, idempotent preflight withdrawal script for defective item `4a1223fc`. |
| [`backend/src/services/contextual-diversity.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/contextual-diversity.service.ts) | Created | Core Contextual Diversity Engine: 5 signals, $D_{\text{ctx}}$, relationship classification, context clustering. |
| [`backend/src/services/admin-toeic-audit.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/admin-toeic-audit.service.ts) | Created | Admin audit service aggregating template duplicates, defective keys, and concept context inventories. |
| [`backend/src/controllers/admin-toeic.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/admin-toeic.controller.ts) | Modified | Added `getDiversityAuditHandler` and `getContextualInventoryHandler`. |
| [`backend/src/routes/admin-toeic.routes.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/admin-toeic.routes.ts) | Modified | Mounted `/diversity-audit` and `/inventory/contextual` routes under admin auth middleware. |
| [`backend/tests/phase3-4b-m2.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4b-m2.test.ts) | Modified | Refactored test suite to isolate test records, clean up in `afterAll`, and prevent staging inventory pollution. |
| [`backend/tests/phase3-4c3-contextual-diversity.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4c3-contextual-diversity.test.ts) | Created | 14 comprehensive unit/integration tests verifying all Phase 3.4C.3 acceptance criteria. |

---

## 7. Verification Summary

- Phase 3.4C.3 Suite (`phase3-4c3-contextual-diversity.test.ts`): 14/14 tests PASSED (0 failures).
- Phase 3.4B M2 Suite (`phase3-4b-m2.test.ts`): 11/11 tests PASSED (0 failures).
- Consolidated Regression Suite (8 files): 78/78 tests PASSED (0 failures).
- TypeScript check (`npx tsc --noEmit`): Exit code 0 (0 errors).
- Backend build (`npm run build`): Exit code 0 (0 errors).

**Implementation Verdict: VERIFIED PASS**

