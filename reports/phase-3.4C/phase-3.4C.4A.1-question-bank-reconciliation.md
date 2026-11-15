# GrammarPath — Phase 3.4C.4A.1: Question Bank Reconciliation Report
## Exhaustive Verification and Cross-Check of All 37 Staging Question Bank Items

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.4A.1 (Audit Reconciliation & C.4B Authorization Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Scope:** Re-Query and Reconciliation of All 37 Database Items  

---

## 1. Executive Summary & Inventory Invariant Verification

All 37 records in table `toeic_question_bank_items` were re-queried directly from Neon PostgreSQL staging. The database inventory remains 100% invariant, with zero insertions, deletions, or modifications.

### Verified Status Totals:
- **`validated`**: **27** items (72.97%)
- **`archived`**: **5** items (13.51%)
- **`approved`**: **3** items (8.11%)
- **`withdrawn`**: **2** items (5.41%)
- **Total Records:** **37** items (100.00%)
- **`is_latest_approved` = true:** Exactly **3** items (`7d9abd94`, `44931eb1`, `45e751fd`).
- **`is_latest_approved` = false:** Exactly **34** items.

### Reconciled Discrepancy (Attempt Count):
- In the initial Phase 3.4C.4A census summary, bank item `44931eb1` was noted as having 2 attempts.
- Re-querying `question_attempt_items` reveals exactly **3 attempts** on item `44931eb1` (IDs `01f20d58`, `a2c8a2e3`, and `3e103036`), plus 2 attempts on textbook exercise question `0c657406`, bringing the database total to 5 attempts.
- The 3rd attempt on `44931eb1` was created during regression test suite execution in Phase 3.4C.3 (`phase3-4b-m3.test.ts`). Zero attempts exist on withdrawn items (`7d24582b`, `4a1223fc`).

---

## 2. Complete 37-Item Reconciled Census Table

```
Legend:
ID       : Item UUID (Prefix)
RootID   : Root Question UUID (Prefix)
V        : Version Number
Status   : Review Status (val = validated, app = approved, arc = archived, wdr = withdrawn)
LatestApp: is_latest_approved flag (T / F)
Unit     : Unit Number (1 - 5)
Concept  : Grammar Concept Code
Correct  : Correct Option Key and Text
Distract : Distractor Options List
Qual     : Automated Quality Score (0 - 10)
Cluster  : Assigned Context Equivalence Cluster
Attempts : Actual Count in question_attempt_items
Tau Elig : Eligible for Transfer Competence Evidence (T / F)
```

| # | ID | RootID | V | Status | LatestApp | Unit | Concept | Correct | Distractors | Qual | Cluster | Attempts | Tau Elig |
|---|----|--------|---|--------|-----------|------|---------|---------|-------------|------|---------|----------|----------|
| 1 | `33581778` | `0fda8409` | 1 | arc | F | 1 | `unit.001` | A: is entering | enters, entered, enter | 6 | `cluster-1` | 0 | F |
| 2 | `7d9abd94` | `0fda8409` | 2 | app | T | 1 | `unit.001` | A: is entering | enters, entered, enter | 6 | `cluster-2` | 0 | F* |
| 3 | `b7c4793c` | `35f70d43` | 1 | val | F | 1 | `unit.001` | C: is growing | grew, grows, was grown | 9 | `cluster-3` | 0 | F (val) |
| 4 | `a716fc0f` | `3d71c0d1` | 1 | arc | F | 1 | `unit.001` | B: am trying | try, tried, was trying | 6 | `cluster-4` | 0 | F |
| 5 | `7d24582b` | `3d71c0d1` | 2 | wdr | F | 1 | `unit.001` | B: am trying | try, tried, was trying | 6 | `cluster-2` | 0 | F (wdr) |
| 6 | `c46da3b7` | `3dc27726` | 1 | val | F | 1 | `unit.001` | B: are / debating | do/debate, have/debated, were/debating | 9 | `cluster-5` | 0 | F (val) |
| 7 | `0f51d836` | `4a75a575` | 1 | val | F | 1 | `unit.001` | A: is calling | calls, called, was calling | 9 | `cluster-6` | 0 | F (val) |
| 8 | `5131bba7` | `634add4d` | 1 | arc | F | 1 | `unit.001` | B: is explaining | explains, explained, explain | 6 | `cluster-7` | 0 | F |
| 9 | `44931eb1` | `634add4d` | 2 | app | T | 1 | `unit.001` | B: is explaining | explains, explained, explain | 6 | `cluster-2` | 3 | F* |
| 10| `8b8d431d` | `6a54a874` | 1 | arc | F | 1 | `unit.001` | A: are / updating | do/update, have/updated, were/updating | 6 | `cluster-8` | 0 | F |
| 11| `4a1223fc` | `6a54a874` | 2 | wdr | F | 1 | `unit.001` | A: are / updating | do/update, have/updated, were/updating | 6 | `cluster-2` | 0 | F (wdr) |
| 12| `2afc939e` | `7a347a67` | 1 | val | F | 1 | `unit.001` | B: is conducting | conducts, conducted, has conducted | 9 | `cluster-9` | 0 | F (val) |
| 13| `2997562b` | `8c00e8d7` | 1 | val | F | 1 | `unit.001` | B: is incorporating | incorporates, has incorporated, incorporate | 9 | `cluster-10`| 0 | F (val) |
| 14| `fa201c0b` | `944ee279` | 1 | val | F | 1 | `unit.001` | A: prefers | is preferring, preferred, prefer | 9 | `cluster-11`| 0 | F (val) |
| 15| `7a3359ae` | `ac251f52` | 1 | val | F | 1 | `unit.001` | B: is meeting | meets, has met, meet | 9 | `cluster-12`| 0 | F (val) |
| 16| `79355b82` | `b19ebb8c` | 1 | arc | F | 1 | `unit.001` | B: is repairing | repairs, repaired, repair | 6 | `cluster-2` | 0 | F |
| 17| `45e751fd` | `b19ebb8c` | 2 | app | T | 1 | `unit.001` | B: is repairing | repairs, repaired, repair | 6 | `cluster-2` | 0 | T |
| 18| `322c0e5c` | `bf8e0dc4` | 1 | val | F | 1 | `unit.001` | B: are experiencing | experience, experienced, experiences | 9 | `cluster-13`| 0 | F (val) |
| 19| `fe5dcc57` | `eb2ee69f` | 1 | val | F | 1 | `unit.001` | A: is installing | installed, installs, install | 9 | `cluster-2` | 0 | F (val) |
| 20| `32ed699c` | `08503402` | 1 | val | F | 2 | `unit.002` | A: delivers | is delivering, delivered, deliver | 9 | `cluster-1` | 0 | F (val) |
| 21| `a47fbe81` | `1c97a716` | 1 | val | F | 2 | `unit.002` | B: work | works, are working, worked | 9 | `cluster-2` | 0 | F (val) |
| 22| `eb746b7c` | `4f3ffc86` | 1 | val | F | 2 | `unit.002` | B: departs | depart, is departing, departed | 9 | `cluster-3` | 0 | F (val) |
| 23| `a6c7ae58` | `9704b1cc` | 1 | val | F | 2 | `unit.002` | A: does not approve| is not approving, did not approve, not approve| 9 | `cluster-4` | 0 | F (val) |
| 24| `f5381446` | `9899139c` | 1 | val | F | 2 | `unit.002` | A: does | is, did, has | 9 | `cluster-5` | 0 | F (val) |
| 25| `f89aceea` | `de3db8cc` | 1 | val | F | 2 | `unit.002` | A: opens | is opening, opened, open | 9 | `cluster-6` | 0 | F (val) |
| 26| `92a0e4b0` | `e15832a7` | 1 | val | F | 2 | `unit.002` | A: issues | is issuing, issued, issue | 9 | `cluster-7` | 0 | F (val) |
| 27| `a9d29ec3` | `fd6b2d49` | 1 | val | F | 2 | `unit.002` | A: relates | is relating, related, relate | 9 | `cluster-8` | 0 | F (val) |
| 28| `6948841f` | `23644090` | 1 | val | F | 3 | `unit.003` | B: was working | worked, works, has worked | 9 | `cluster-1` | 0 | F (val) |
| 29| `c10918d0` | `4acd072c` | 1 | val | F | 3 | `unit.003` | B: was reviewing | reviewed, has reviewed, is reviewing | 9 | `cluster-2` | 0 | F (val) |
| 30| `77299aeb` | `73bd1efe` | 1 | val | F | 3 | `unit.003` | A: noticed | notice, noticing, was noticing | 9 | `cluster-3` | 0 | F (val) |
| 31| `43753724` | `d083530a` | 1 | val | F | 3 | `unit.003` | B: voted | vote, were voting, are voting | 9 | `cluster-4` | 0 | F (val) |
| 32| `fe61381a` | `0d8b4ec8` | 1 | val | F | 4 | `unit.004` | A: doubts | is doubting, doubted, doubt | 9 | `cluster-1` | 0 | F (val) |
| 33| `ac0c643a` | `4735cd82` | 1 | val | F | 4 | `unit.004` | A: publishes | is publishing, publish, has published | 9 | `cluster-2` | 0 | F (val) |
| 34| `6e803d45` | `8fadde25` | 1 | val | F | 4 | `unit.004` | A: is giving | gives, gave, give | 9 | `cluster-3` | 0 | F (val) |
| 35| `7addbaf6` | `a87ba2aa` | 1 | val | F | 4 | `unit.004` | A: is explaining | explains, explained, has explained | 9 | `cluster-4` | 0 | F (val) |
| 36| `0707bbd2` | `6e6e0452` | 1 | val | F | 5 | `unit.005` | C: found | find, finds, founded | 8.5 | `cluster-1` | 0 | F (val) |
| 37| `4ce8fea3` | `b14c1c53` | 1 | val | F | 5 | `unit.005` | B: delivered | deliver, delivering, delivers | 8.5 | `cluster-2` | 0 | F (val) |

*\*Note on `7d9abd94` and `44931eb1`: Although marked `is_latest_approved = true` in the schema, they are disqualified from transfer evidence due to verb-object collocation defects ("enter hardware", "explain hardware"). Only item `45e751fd` is valid for $\tau$ evidence.*

---

## 3. Detailed Audit of Root Question Lineages

### Root `0fda8409-0926-49c0-8b86-1564d83497ac`
- **v1 (`33581778`):** `archived`. Prompt: *"Look! The marketing director _______ the main conference hall with our new client."* Correct: `is entering`.
- **v2 (`7d9abd94`):** `approved`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* Correct: `is entering`. Defect: Unnatural collocation *"enter hardware"*.

### Root `3d71c0d1-6a2d-498a-b6f2-c5abad85657e`
- **v1 (`a716fc0f`):** `archived`. Prompt: *"Please be quiet. I _______ to finish this quarterly report right now."* Correct: `am trying`.
- **v2 (`7d24582b`):** `withdrawn`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* Correct: `am trying`. Defect: 3rd-person singular *"he"* paired with 1st-person *"am trying"*.

### Root `634add4d-5982-4de8-99de-6c4561c6ee44`
- **v1 (`5131bba7`):** `archived`. Prompt: *"Listen! Our team leader _______ the new safety protocols in the auditorium."* Correct: `is explaining`.
- **v2 (`44931eb1`):** `approved`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* Correct: `is explaining`. Defect: Semantic anomaly *"explain hardware"*.

### Root `6a54a874-9b57-4148-be8d-71b9e2898c64`
- **v1 (`8b8d431d`):** `archived`. Prompt: *"Why _______ you _______ the project schedule today?"* Correct: `are / updating`.
- **v2 (`4a1223fc`):** `withdrawn`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* Correct: `are / updating`. Defect: 3rd-person singular *"he"* paired with plural/2nd-person *"are / updating"*.

### Root `b19ebb8c-9912-4cd7-8705-155d847282b0`
- **v1 (`79355b82`):** `archived`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3."* Correct: `is repairing`.
- **v2 (`45e751fd`):** `approved`. Prompt: *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* Correct: `is repairing`. **Valid and pedagogically authentic.**

