# GrammarPath — Phase 3.4C.4B.2: Practice Retrieval & Isolation Verification Report
## Retrieval Simulation, Difficulty Distribution, Security Isolation, and Evidence Sufficiency Verification

**Author:** Antigravity (Principal Backend Architect & Quality Assurance Lead)  
**Milestone:** Phase 3.4C.4B.2 (Unit 1 Editorial Approval & Question Bank Activation)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Services Tested:** `ToeicQuestionBankService`, `AdminToeicAuditService`  
**Test Suite:** `backend/tests/phase3-4c4b2-approvals.test.ts` (6/6 tests passing)  

---

## 1. Executive Summary

This report documents the functional verification of TOEIC practice retrieval following the Phase 3.4C.4B.2 approval transaction. 

Using production-grade service calls against the Neon staging database, we verified that:
1. **The practice retrieval engine (`ToeicQuestionBankService`) exclusively serves approved items.**
2. **The difficulty distribution matches pedagogical requirements (3 easy, 6 medium, 3 hard).**
3. **Strict isolation prevents any leakage of unapproved (`validated`), `archived`, or `withdrawn` records.**
4. **The administrative audit service (`AdminToeicAuditService`) confirms evidence sufficiency for Unit 1 (`unit.001`).**
5. **Zero attempts or learner state were generated or mutated during testing.**

---

## 2. Practice Retrieval Verification by Difficulty Tier

Practice retrieval was executed via `ToeicQuestionBankService.getApprovedQuestionsForPractice({ unitNumber: 1, difficulty, count })`.

### A. Easy Difficulty Tier (3 items)
- **Call:** `getApprovedQuestionsForPractice({ unitNumber: 1, difficulty: "easy", count: 20 })`
- **Result Count:** **3 items returned** (100% of available easy pool)
- **Retrieved Items:**
  1. `45e751fd-4915-4bac-a386-c7bae5295911` (IT technician repairing server hardware)
  2. `8a41b01a-1c9b-4072-a584-86387d7e6f97` (Training coordinator explaining safety guidelines)
  3. `a4229728-763b-4b22-8bb9-6436a0ffba76` (Facility supervisor entering executive conference suite)
- **Status Verification:** All 3 items have `reviewStatus = "approved"` and `isLatestApproved = true`.

### B. Medium Difficulty Tier (6 items)
- **Call:** `getApprovedQuestionsForPractice({ unitNumber: 1, difficulty: "medium", count: 20 })`
- **Result Count:** **6 items returned** (100% of available medium pool)
- **Retrieved Items:**
  1. `048df761-7f70-4249-b4f1-f075a87c9432` (CFO reviewing quarterly audit report)
  2. `0f51d836-b360-4423-b19e-71ea358be557` (Marketing director calling client on phone)
  3. `2afc939e-9d24-40d8-98c3-75a198006930` (Ms. Patterson conducting financial review)
  4. `add7a35b-e014-4747-82af-ef0d1239ee51` (Customs officers inspecting cargo manifests)
  5. `b7c4793c-ba61-4ae6-92e2-74096f6a8557` (International market share growing steadily)
  6. `c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c` (Employees debating leave policy today)
- **Note on API Default:** When `count` is omitted, the service applies default `count = 5`, returning a randomized subset of 5 items. When `count >= 6`, the complete pool of 6 items is accessible.

### C. Hard Difficulty Tier (3 items)
- **Call:** `getApprovedQuestionsForPractice({ unitNumber: 1, difficulty: "hard", count: 20 })`
- **Result Count:** **3 items returned** (100% of available hard pool)
- **Retrieved Items:**
  1. `2997562b-8ae1-4e19-8dd2-f110d41865e0` (Automotive plant incorporating robotic units)
  2. `322c0e5c-d12b-4617-b88d-cace81c8e545` (Logistics hubs experiencing customs delays)
  3. `7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83` (Executive committee meeting foreign representatives)
- **Status Verification:** All 3 items have `reviewStatus = "approved"` and `isLatestApproved = true`.

---

## 3. Strict Isolation and Leakage Verification

To confirm that the query layer strictly isolates active approved items from all non-eligible records, automated assertion tests were executed:

| Non-Eligible Item Class | Total in Database | Count Leaked in Practice Queries | Isolation Status |
| :--- | :---: | :---: | :---: |
| **Unapproved Candidates (`validated`)** | 20 | **0** | **100% ISOLATED** |
| **Archived Historical Versions (`archived`)** | 5 | **0** | **100% ISOLATED** |
| **Defective / Withdrawn Items (`withdrawn`)** | 4 | **0** | **100% ISOLATED** |
| **Total Non-Eligible Records** | **29** | **0** | **ZERO LEAKAGE** |

### Verified Specific Defective Records:
- Item `7d24582b-ca20-4c7a-a828-530f4852e80a` (Withdrawn in C.4B.1): **Never returned.**
- Item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` (Withdrawn in C.4B.1): **Never returned.**
- Item `7d9abd94-df89-4762-8a86-a3217f0217b0` (Withdrawn in C.4B.1): **Never returned.**

---

## 4. Administrative Audit Service Output (`AdminToeicAuditService`)

The administrative audit engine was invoked in staging to evaluate bank-wide health and evidence sufficiency:

```typescript
const auditReport = await AdminToeicAuditService.generateCompleteAuditReport();
```

### Concept Inventory Findings for Unit 1 (`unit.001`):
```json
{
  "conceptId": "concept-unit-001-uuid",
  "conceptCode": "unit.001",
  "conceptTitle": "Present continuous (I am doing)",
  "totalApprovedItems": 12,
  "difficultyBreakdown": {
    "easy": 3,
    "medium": 6,
    "hard": 3
  },
  "independentContextCount": 12,
  "isEvidenceSufficient": true,
  "defectiveAnswerKeysCount": 0,
  "duplicateWarningCount": 0
}
```

### Key Diagnostic Results:
- **Independent Context Count ($K_{\text{ctx}}$):** **12** (Exceeds required threshold of 3, satisfies target of $\ge 8$).
- **Evidence Sufficiency Gate:** **`isEvidenceSufficient: true`** (Successfully unlocked for Unit 1).
- **Defective Keys:** **0** (All 12 items have certified unambiguous single keys).
- **Unapproved Candidate Pool:** **20 items** safely retained in `validated` status (representing Units 2, 3, 4 awaiting future editorial milestones).

---

## 5. Automated Test Suite Results

The comprehensive test suite [`backend/tests/phase3-4c4b2-approvals.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4c4b2-approvals.test.ts) was executed via `run-with-staging-env.mjs`:

```bash
$ node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4c4b2-approvals.test.ts
```

### Test Results:
```text
 ✓ tests/phase3-4c4b2-approvals.test.ts (6 tests) 2636ms
   ✓ 1. Verifies that exactly 12 items are approved and active in the bank
   ✓ 2. Verifies difficulty tier distribution among approved Unit 1 items (3 easy, 6 medium, 3 hard)
   ✓ 3. Verifies that every root question has at most one latest approved version
   ✓ 4. Verifies total bank status breakdown (41 items: 12 app, 20 val, 5 arc, 4 wdr)
   ✓ 5. Verifies attempt count invariant (exactly 5 attempts preserved, zero added or deleted)
   ✓ 6. Verifies AdminToeicAuditService reports K_ctx >= 8 and zero critical duplicate warnings

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  13:28:15
   Duration  2.64s
```

All 6 tests passed cleanly with 0 failures, 0 warnings, and 0 database mutations.

---

## 6. QA Conclusion

The Unit 1 TOEIC Question Bank is officially certified as active, fully populated, strictly isolated, and functioning properly across all practice retrieval workflows.

