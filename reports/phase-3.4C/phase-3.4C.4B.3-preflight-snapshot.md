# GrammarPath — Phase 3.4C.4B.3: Preflight Snapshot & Baseline Census
## Pre-Mutation Environment Verification, Target Concept Inventory, and Backup Manifest

**Author:** Antigravity (Principal Backend Architect & Security Auditor)  
**Milestone:** Phase 3.4C.4B.3 (Unit 3 & Unit 4 Concept Remapping)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Safety Guard:** Verified Active (`run-with-staging-env.mjs`)  
**Execution Mode:** Pre-Mutation Snapshot & Read-Only Audit  

---

## 1. Environment & Target Database Guard Verification

Prior to any analytical or database operations, environment identity and fail-closed staging guards were executed:

```sql
SELECT current_database() as db_name, inet_server_addr() as server_ip, inet_server_port() as server_port;
```

- **Target Database:** `grammarpath-staging` (Confirmed)
- **Database Server IP:** `169.254.254.254:5432` (Neon connection pool proxy)
- **PostgreSQL Version:** PostgreSQL 16.8 on `x86_64-pc-linux-gnu`
- **Isolation Status:** `PASS`. Production database is not connected. Canonical `grammarpath-data` is untouched.

---

## 2. Baseline Question Bank Status Breakdown

Querying `toeic_question_bank_items` directly on Neon staging yields:

| Review Status | Count | Notes |
| :--- | :---: | :--- |
| `approved` | **12** | Certified active Unit 1 items (`Phase 3.4C.4B.2`) |
| `validated` | **20** | Unapproved candidate pool (Units 1, 2, 3, 4, 5) |
| `archived` | **5** | Historical Version 1 records |
| `withdrawn` | **4** | Historical defective items quarantined with audit notes |
| **Total Bank Records** | **41** | **Strict Invariant Maintained** |

### Learner Attempts Invariant:
- **Total Learner Attempts:** **5**
  - Textbook items: 2
  - Question bank item `44931eb1`: 3
  - Candidate 10 items: **0**
  - Withdrawn items: **0**

---

## 3. Snapshot of the 10 Candidate Items Under Review

| # | Item ID (Short) | Current Unit | Current Concept Code | Rule Ref | Review Status | Ver | Prompt Excerpt |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `43753724-dcb3-4681-adb5-5d0c71d34b7c` | 3 | `unit.003` | 3A | `validated` | 1 | *"Last Friday, the board members _______ to approve the proposed budget."* |
| **2** | `6948841f-9dc6-487c-83ed-04c6ebfbc9fe` | 3 | `unit.003` | 3B | `validated` | 1 | *"Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout..."* |
| **3** | `77299aeb-93d6-483e-9f77-4d5a8c67496a` | 3 | `unit.003` | 3B | `validated` | 1 | *"Had the compliance inspector _______ the discrepancy earlier, the company..."* |
| **4** | `c10918d0-496f-4766-a6c5-923445203650` | 3 | `unit.003` | 3B | `validated` | 1 | *"While the project coordinator _______ the contract terms, the client asked..."* |
| **5** | `6e803d45-15fe-4fb7-8f35-5f7636947888` | 4 | `unit.004` | 4A | `validated` | 1 | *"Listen to the speaker; she _______ the summary of today's meeting."* |
| **6** | `7addbaf6-e0f1-47c4-a31d-f0196200c087` | 4 | `unit.004` | 4A | `validated` | 1 | *"Listen to the CEO's keynote address; she _______ the company's visionary..."* |
| **7** | `ac0c643a-f264-4991-b5ae-08c0e8eb2848` | 4 | `unit.004` | 4B | `validated` | 1 | *"Dr. Evans _______ three medical research articles every year for the..."* |
| **8** | `fe61381a-7e1b-495f-a388-804cb27ea8f5` | 4 | `unit.004` | 4C | `validated` | 1 | *"The chief scientist _______ whether the synthesized compound remains..."* |
| **9** | `fa201c0b-4173-453b-8fd8-4df4019e6ca9` | 1 | `unit.001` | 1D | `validated` | 1 | *"Although the regional director usually _______ conservative investments..."* |
| **10** | `fe5dcc57-9a64-48a6-9ae3-2f4a5ebcecea` | 1 | `unit.001` | 1C | `validated` | 1 | *"The IT support team _______ a new cybersecurity protocol across all..."* |

---

## 4. Target Canonical Concepts Inventory

The target `GrammarConcept` entities in Neon PostgreSQL staging correspond to the canonical Murphy curriculum:

| Concept Code | UUID (`GrammarConcept.id`) | Canonical Title (*English Grammar in Use*) | Theory Links |
| :--- | :--- | :--- | :---: |
| `unit.001` | `201b07e6-1731-4105-ac7e-e1d763f54049` | Present continuous (I am doing) | 5 |
| `unit.002` | `89591d03-85a9-4992-a951-f5d06f767d89` | Present simple (I do) | 5 |
| `unit.003` | `7296dbb8-1ee8-4a52-a7e9-b6f132921da4` | Present continuous and present simple 1 (I am doing and I do) | 3 |
| `unit.004` | `de168594-622f-4543-ab04-5d22a5dfe7cf` | Present continuous and present simple 2 (I am doing and I do) | 5 |
| `unit.005` | `9f16b6e4-d5fd-48f2-ae12-ed721c924df9` | Past simple (I did) | 5 |
| `unit.006` | `54010bbc-eb52-45ea-af6f-daba266f8fe0` | Past continuous (I was doing) | 5 |
| `unit.040` | `63aff2d7-8f78-4551-a81c-87e5ae43db0d` | If I had known ... I wish I had known ... | 3 |

---

## 5. Recoverable Backup Manifest

A JSON-serialized snapshot of all relevant pre-execution state has been stored on disk:
- **Location:** `backend/recovery/phase3-4c4b3-pre-backup/`
- **Files Created:**
  - `sys_info.json`: Target database and connection telemetry.
  - `candidate10_items.json`: Full records of the 10 candidate items including options and concept links.
  - `status_breakdown.json`: Question bank census by `reviewStatus`.
  - `attempts.json`: Full learner attempt records.
  - `target_concepts.json`: Reference table of target GrammarConcept entities.
- **Rollback Readiness:** If any anomaly occurs during execution, the pre-mutation state can be restored immediately using the backup payload.

