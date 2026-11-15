# GrammarPath — Phase 3.4C.4B.3: Verification & Invariants Report
## Comprehensive Post-Remapping Verification, Isolation Integrity, and Automated Test Results

**Author:** Antigravity (Principal Backend Architect & Quality Assurance Lead)  
**Milestone:** Phase 3.4C.4B.3 (Unit 3 & Unit 4 Concept Remapping)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Target Services:** `ToeicQuestionBankService`, `AdminToeicAuditService`  
**Test Suite:** `backend/tests/phase3-4c4b3-remapping.test.ts` (**8 / 8 Tests Passing**)  

---

## 1. Executive Summary

This report documents the post-remapping verification conducted on Neon PostgreSQL staging following the execution of Phase 3.4C.4B.3. 

All eight verification gates specified in the mandate were evaluated against the live database:
1. **Valid Foreign Key Targets:** Every remapped question resolves cleanly to an active `GrammarConcept` record without orphaned references.
2. **Unit 3 Cleansing:** Unit 3 (`unit.003`) is completely purged of invalid items (0 items remaining).
3. **Attempt Preservation:** Exactly 5 learner attempts remain intact. Zero attempts were created, modified, or deleted.
4. **Approval Invariant:** All 12 approved questions remain strictly confined to Unit 1 (`unit.001`). All 7 remapped items remain unapproved (`reviewStatus = "validated"`, `isLatestApproved = false`).
5. **Retrieval Security:** Practice queries return only approved items; zero remapped candidates leak into practice sessions.
6. **Mastery Isolation:** Audit reporting confirms `isEvidenceSufficient = false` for Unit 3, eliminating corrupt transfer telemetry.
7. **ACID Rollback Tested:** An intentional transactional abort demonstrated clean rollback without database mutation.
8. **Canonical Repository Clean:** The `grammarpath-data` repository remains completely clean with zero diffs on `main`.

---

## 2. Granular Verification Gate Results

### Gate 1: Concept Foreign Key Resolution & Zero Orphans
Each of the 7 remapped items was queried with Prisma relation joins to verify foreign key resolution:

| Question ID (Short) | Remapped Unit | Target Concept Code | Resolved `GrammarConcept.id` | Title Matched (*English Grammar in Use*) | Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `43753724` | 5 | `unit.005` | `9f16b6e4-d5fd-48f2-ae12-ed721c924df9` | *Past simple (I did)* | **RESOLVED** |
| `6948841f` | 6 | `unit.006` | `54010bbc-eb52-45ea-af6f-daba266f8fe0` | *Past continuous (I was doing)* | **RESOLVED** |
| `77299aeb` | 40 | `unit.040` | `63aff2d7-8f78-4551-a81c-87e5ae43db0d` | *If I had known ... I wish I had known ...* | **RESOLVED** |
| `c10918d0` | 6 | `unit.006` | `54010bbc-eb52-45ea-af6f-daba266f8fe0` | *Past continuous (I was doing)* | **RESOLVED** |
| `6e803d45` | 1 | `unit.001` | `201b07e6-1731-4105-ac7e-e1d763f54049` | *Present continuous (I am doing)* | **RESOLVED** |
| `7addbaf6` | 1 | `unit.001` | `201b07e6-1731-4105-ac7e-e1d763f54049` | *Present continuous (I am doing)* | **RESOLVED** |
| `ac0c643a` | 2 | `unit.002` | `89591d03-85a9-4992-a951-f5d06f767d89` | *Present simple (I do)* | **RESOLVED** |

**Orphan Check Query:**
```sql
SELECT id, prompt FROM toeic_question_bank_items 
WHERE concept_id IS NOT NULL AND concept_id NOT IN (SELECT id FROM grammar_concepts);
```
- **Result:** **0 rows returned.** Zero orphaned foreign keys exist in the question bank.

---

### Gate 2: Curriculum Cleansing of Unit 3 & Unit 4
- **Unit 3 Items:**
  ```sql
  SELECT COUNT(*) FROM toeic_question_bank_items 
  WHERE unit_number = 3 OR concept_id IN (SELECT id FROM grammar_concepts WHERE code = 'unit.003');
  ```
  - **Count:** **0 items.** Unit 3 is 100% empty of non-Unit 3 items.
- **Unit 4 Items:**
  - **Count:** **1 item** (`fe61381a-7e1b-495f-a388-804cb27ea8f5`).
  - **Concept:** `unit.004` (Stative verb *doubt*). Validated authentic candidate.

---

### Gate 3: Question Bank Total Census & Invariant Preservation

| Category | Pre-Remap Count | Post-Remap Count | Invariant Expected | Discrepancy |
| :--- | :---: | :---: | :---: | :---: |
| `approved` | 12 | 12 | 12 | 0 |
| `validated` | 20 | 20 | 20 | 0 |
| `archived` | 5 | 5 | 5 | 0 |
| `withdrawn` | 4 | 4 | 4 | 0 |
| **Total Question Records** | **41** | **41** | **41** | **0** |

---

### Gate 4: Learner Attempts Preservation
- **Total Attempts:** **5** (Unchanged).
- **Attempts on Withdrawn Items:** **0**.
- **Attempts on Remapped Items:** **0**.
- **Attempts on Historical Item `44931eb1`:** **3** (100% preserved).

---

### Gate 5: Practice Retrieval Leakage Check
Practice retrieval queries via `ToeicQuestionBankService.getApprovedQuestionsForPractice` were executed:
- **Unit 1 Retrieval:** Returns 12 approved items.
- **Remapped Items Leakage:** **0 of 7 remapped items** appeared in practice results.
- **Unapproved Candidate Leakage:** **0 of 20 validated items** appeared in practice results.

---

### Gate 6: Administrative Audit Service Output
The administrative audit engine confirmed:
- `unit.001`: `approvedQuestionCount: 12`, `independentContextCount: 12`, `isEvidenceSufficient: true`.
- `unit.003`: `approvedQuestionCount: 0`, `independentContextCount: 0`, `isEvidenceSufficient: false`.
- `unit.004`: `approvedQuestionCount: 0`, `independentContextCount: 0`, `isEvidenceSufficient: false`.

Learner mastery calculations for Unit 3 and Unit 4 are completely protected against corrupt evaluation.

---

### Gate 7: Transactional Rollback Test
Before the execute run, an intentional exception within `prisma.$transaction` was executed. The test proved that a failed database transaction in PostgreSQL rolls back completely with zero mutation.

---

### Gate 8: Canonical Data Repository Cleanliness
A git status check in `/Users/kd.quach03/Documents/grammarpath-data` confirmed:
- **Branch:** `main`
- **Working Tree:** Clean (zero uncommitted files, zero diffs).

---

## 3. Automated Test Suite Results

```text
 ✓ tests/phase3-4c4b3-remapping.test.ts (8 tests) 2820ms
   ✓ 1. Verifies all 7 remapped questions resolve to exact valid GrammarConcept records without orphans
   ✓ 2. Verifies that Unit 3 is completely cleansed of corrupting non-Unit-3 items (count = 0)
   ✓ 3. Verifies that Unit 4 has exactly 1 valid candidate item (fe61381a) mapping to unit.004
   ✓ 4. Verifies question bank total count and reviewStatus invariants (41 items: 12 app, 20 val, 5 arc, 4 wdr)
   ✓ 5. Verifies historical learner attempts invariant (exactly 5 attempts preserved, zero contaminated)
   ✓ 6. Verifies that approved items remain exclusively the 12 certified Unit 1 items
   ✓ 7. Verifies practice retrieval continues to return exactly 12 approved Unit 1 items and 0 remapped items
   ✓ 8. Verifies AdminToeicAuditService reports 0 approved questions for unit.003 and prevents invalid evidence

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  3.07s
```

All 8 tests passed with 0 failures and 0 warnings.

