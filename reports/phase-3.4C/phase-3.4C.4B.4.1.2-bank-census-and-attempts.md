# GrammarPath — Phase 3.4C.4B.4.1.2: Question Bank Census & Historical Attempt Reconciliation
## Exact Relational Audit of 41 Staging Bank Items and Learner Telemetry Chains

**Author:** Antigravity (Principal Backend Architect & Security Auditor)  
**Milestone:** Phase 3.4C.4B.4.1.2 (Final Pre-Implementation Gate)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`, AWS ap-southeast-1)  
**Audit Protocol:** Read-Only Relational Queries via Staging Isolation Guard  

---

## 1. Executive Summary & Verification Master Balance

A live database audit was executed across all question bank items and telemetry tables on `grammarpath-staging`. Every balance, status cross-tabulation, unit partition, root lineage, and historical attempt chain reconciles with **zero discrepancy**.

### 1.1 Master Balance Formula
$$\text{Global Total (41)} = \text{Units 1–25 Inventory (40)} + \text{Out-of-Range Inventory (1)}$$
$$\text{Global Total (41)} = 12\ \text{approved} + 20\ \text{validated} + 5\ \text{archived} + 4\ \text{withdrawn}$$
$$\text{Global Roots (32)} = 31\ \text{roots (Units 1–25)} + 1\ \text{root (Unit 40)}$$

---

## 2. Global Inventory vs. Units 1–25 vs. Out-of-Range

```
+-----------------------------------------------------------------------------------------------------+
| RELATIONAL CENSUS BREAKDOWN: GLOBAL VS. UNITS 1-25 VS. OUT-OF-RANGE                                 |
+--------------------------+--------------------+--------------------+--------------------------------+
| Metric                   | Global Inventory   | Units 1–25 Pool    | Out-of-Range (> Unit 25)       |
+--------------------------+--------------------+--------------------+--------------------------------+
| Total Records            | 41                 | 40                 | 1 (Unit 40)                    |
| Distinct Root Lineages   | 32                 | 31                 | 1                              |
| Approved Status Items    | 12                 | 12                 | 0                              |
| Latest Approved (is_true)| 12                 | 12                 | 0                              |
| Validated Status Items   | 20                 | 19                 | 1                              |
| Archived Status Items    | 5                  | 5                  | 0                              |
| Withdrawn Status Items   | 4                  | 4                  | 0                              |
+--------------------------+--------------------+--------------------+--------------------------------+
```

### 2.1 Complete Status Distribution (Global)
- **`validated`:** 20 records (48.78%) — Staged pre-approval candidates awaiting editorial sign-off.
- **`approved`:** 12 records (29.27%) — Active production questions actively served to learners.
- **`archived`:** 5 records (12.20%) — Remediated earlier versions preserved for audit fidelity.
- **`withdrawn`:** 4 records (9.76%) — Formally withdrawn defective versions preserved for historical attempt integrity.
- **Total:** **41 records (100.00%)**.

### 2.2 Complete Unit Distribution (Global)
- **Unit 1:** 25 records (12 approved, 7 validated, 2 archived, 4 withdrawn).
- **Unit 2:** 9 records (0 approved, 8 validated, 1 archived, 0 withdrawn).
- **Unit 3:** 0 records (Active pilot will create 8 items).
- **Unit 4:** 1 record (0 approved, 1 validated, 0 archived, 0 withdrawn).
- **Unit 5:** 3 records (0 approved, 2 validated, 1 archived, 0 withdrawn).
- **Unit 6:** 2 records (0 approved, 1 validated, 1 archived, 0 withdrawn).
- **Unit 40:** 1 record (0 approved, 1 validated, 0 archived, 0 withdrawn).
- **Total:** **41 records (100.00%)**.

---

## 3. Detailed Audit of Out-of-Range Record: Unit 40

The single question bank item outside the Units 1–25 scope was remapped in Phase 3.4C.4B.3 to eliminate grammatical corruption:

```
+---------------------------------------------------------------------------------------+
| OUT-OF-RANGE RECORD AUDIT: UNIT 40 CANDIDATE                                          |
+----------------------+----------------------------------------------------------------+
| Question Bank Item ID| 77299aeb-93d6-483e-9f77-4d5a8c67496a                          |
| Root Question ID     | 77299aeb-93d6-483e-9f77-4d5a8c67496a                          |
| Version              | 1                                                              |
| Review Status        | validated                                                      |
| is_latest_approved   | false                                                          |
| Unit Number          | 40                                                             |
| Concept Code         | unit.040 (Passive 1: is done / was done)                       |
| Concept ID           | 1121d51a-d5ba-4f16-953b-e104f7f6f590                           |
| Remapping Rationale  | Prompt tests passive voice ("is regularly inspected").         |
|                      | Corrected from Unit 3 to eliminate cross-unit contamination.   |
| Learner Attempt Link | 0 learner attempts attached. Safely isolated in staging.       |
+----------------------+----------------------------------------------------------------+
```

---

## 4. Root Lineage & Multiplicity Analysis

Across all 41 records:
- **Total Distinct Root IDs:** **32**
  - **Single-Version Roots:** 27 roots (27 records).
  - **Two-Version Roots:** 1 root (2 records — Root `34e4fe58`: v1 withdrawn, v2 validated).
  - **Three-Version Roots:** 4 roots (12 records — Roots `4a1223fc`, `634add4d`, `a4d53862`, `b19ebb8c`, each possessing v1, v2, and v3 records).
  - **Arithmetic:** $27 + (1 \times 2) + (4 \times 3) = 27 + 2 + 12 = \mathbf{41\ \text{records}}$.
- **Latest Approved Invariant:**
  - Total records with `is_latest_approved = true`: **Exactly 12**.
  - Total records with `review_status = 'approved'`: **Exactly 12**.
  - Multiplicity: $\frac{12\ \text{approved}}{12\ \text{latest\_approved}} = \mathbf{1.0000}$ (Every approved item is latest-approved; zero orphan approvals).

---

## 5. Historical Learner Attempt Inventory

A comprehensive check of all attempt and session tables in PostgreSQL staging confirms that historical learner telemetry has been preserved with zero data loss:

```
+---------------------------------------------------------------------------------------+
| HISTORICAL ATTEMPT INVENTORY (LIVE POSTGRESQL STAGING)                                |
+-------------------------------+---------------+---------------------------------------+
| Table Name                    | Live Row Count| Description                           |
+-------------------------------+---------------+---------------------------------------+
| exercise_attempts             | 2             | Textbook practice exercise attempts   |
| question_attempt_items        | 5             | Granular question attempt telemetry   |
| toeic_practice_sessions       | 10            | TOEIC practice test session sessions  |
| toeic_practice_items          | 15            | TOEIC question attempt records        |
+-------------------------------+---------------+---------------------------------------+
```

### 5.1 Linkage to TOEIC Question Bank Items
Of the 15 records in `toeic_practice_items`:
- **2 attempts** link to approved item `45e751fd-4915-4bac-a386-c7bae5295911` (Root `b19ebb8c`, Unit 1, Version 2).
- **8 attempts** link to withdrawn item `44931eb1-344b-4ec8-aceb-5524a952ed59` (Root `634add4d`, Unit 1, Version 2).
- **5 attempts** originate from initial platform test runs without bank linkages.

All 10 question-linked attempts remain permanently preserved with their original immutable version associations.

