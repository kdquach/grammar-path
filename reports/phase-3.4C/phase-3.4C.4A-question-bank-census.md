# GrammarPath — Phase 3.4C.4A: Question Bank Complete Census Report
## Item-by-Item Baseline Audit of 37 Question Bank Records

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.4A (Question Bank Curation & Editorial Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Scope:** Complete Read-Only Audit of All 37 Bank Items  

---

## 1. Executive Summary

This census provides an exhaustive, immutable baseline audit of every record currently resident in the `toeic_question_bank_items` table in the Neon staging database. 

No items were deleted, modified, or auto-approved during this audit. Staging database isolation was verified prior to query execution.

### Staging Inventory Summary
- **Total Records:** 37
- **Review Status Distribution:**
  - `validated`: 27 (72.97%)
  - `archived`: 5 (13.51%)
  - `approved`: 3 (8.11%)
  - `withdrawn`: 2 (5.41%)
- **`is_latest_approved` Distribution:**
  - `true`: 3
  - `false`: 34
- **Curriculum Unit Distribution:**
  - Unit 1 (Present continuous): 19 items
  - Unit 2 (Present simple): 8 items
  - Unit 3 (Present continuous and present simple 1): 4 items
  - Unit 4 (Present continuous and present simple 2): 4 items
  - Unit 5 (Past simple): 2 items
- **Attempt History Status:**
  - 4 total attempts exist on staging (2 on textbook questions, 2 on approved bank item `44931eb1`).
  - Zero attempts exist on withdrawn items (`7d24582b`, `4a1223fc`).

---

## 2. Complete Inventory Census Table

The table below catalogs all 37 records across all 15 audit dimensions specified in the Phase 3.4C.4A charter.

```
Key to Columns:
#    : Index (1 to 37)
ID   : Item UUID (Prefix)
Root : Root Question UUID (Prefix)
V    : Version Number
Stat : Review Status (val=validated, app=approved, arc=archived, wdr=withdrawn)
Appr : is_latest_approved (T=true, F=false)
Unit : Unit Number
Concept : Concept Code
Key  : Correct Option Key
Valid: Answer-Key Validity (T=true, F=false)
Dist : Distractor Validity (T=true, F=false)
ExpQ : Explanation Quality (Adequate / Minimal)
Conf : Concept Mapping Confidence (0.0 to 1.0)
Prov : Content Provenance Source
Clust: Assigned Context Cluster ID
Tau  : Eligible for Transfer Evidence (T=true, F=false)
```

| # | ID | Root | V | Stat | Appr | Unit | Concept | Key | Valid | Dist | ExpQ | Conf | Prov | Clust | Tau |
|---|----|------|---|------|------|------|---------|-----|-------|------|------|------|------|-------|-----|
| 1 | `33581778` | `0fda8409` | 1 | arc | F | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-1` | F |
| 2 | `7d9abd94` | `0fda8409` | 2 | app | T | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | T* |
| 3 | `b7c4793c` | `35f70d43` | 1 | val | F | 1 | `unit.001` | C | T | T | Adequate | 1.0 | legacy_seed | `cluster-3` | F |
| 4 | `a716fc0f` | `3d71c0d1` | 1 | arc | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-4` | F |
| 5 | `7d24582b` | `3d71c0d1` | 2 | wdr | F | 1 | `unit.001` | B | F | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 6 | `c46da3b7` | `3dc27726` | 1 | val | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-5` | F |
| 7 | `0f51d836` | `4a75a575` | 1 | val | F | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-6` | F |
| 8 | `5131bba7` | `634add4d` | 1 | arc | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-7` | F |
| 9 | `44931eb1` | `634add4d` | 2 | app | T | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | T* |
| 10| `8b8d431d` | `6a54a874` | 1 | arc | F | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-8` | F |
| 11| `4a1223fc` | `6a54a874` | 2 | wdr | F | 1 | `unit.001` | A | F | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 12| `2afc939e` | `7a347a67` | 1 | val | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-9` | F |
| 13| `2997562b` | `8c00e8d7` | 1 | val | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-10`| F |
| 14| `fa201c0b` | `944ee279` | 1 | val | F | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-11`| F |
| 15| `7a3359ae` | `ac251f52` | 1 | val | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-12`| F |
| 16| `79355b82` | `b19ebb8c` | 1 | arc | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 17| `45e751fd` | `b19ebb8c` | 2 | app | T | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | T  |
| 18| `322c0e5c` | `bf8e0dc4` | 1 | val | F | 1 | `unit.001` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-13`| F |
| 19| `fe5dcc57` | `eb2ee69f` | 1 | val | F | 1 | `unit.001` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 20| `32ed699c` | `08503402` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-1` | F |
| 21| `a47fbe81` | `1c97a716` | 1 | val | F | 2 | `unit.002` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 22| `eb746b7c` | `4f3ffc86` | 1 | val | F | 2 | `unit.002` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-3` | F |
| 23| `a6c7ae58` | `9704b1cc` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-4` | F |
| 24| `f5381446` | `9899139c` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-5` | F |
| 25| `f89aceea` | `de3db8cc` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-6` | F |
| 26| `92a0e4b0` | `e15832a7` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-7` | F |
| 27| `a9d29ec3` | `fd6b2d49` | 1 | val | F | 2 | `unit.002` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-8` | F |
| 28| `6948841f` | `23644090` | 1 | val | F | 3 | `unit.003` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-1` | F |
| 29| `c10918d0` | `4acd072c` | 1 | val | F | 3 | `unit.003` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 30| `77299aeb` | `73bd1efe` | 1 | val | F | 3 | `unit.003` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-3` | F |
| 31| `43753724` | `d083530a` | 1 | val | F | 3 | `unit.003` | B | T | T | Adequate | 1.0 | legacy_seed | `cluster-4` | F |
| 32| `fe61381a` | `0d8b4ec8` | 1 | val | F | 4 | `unit.004` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-1` | F |
| 33| `ac0c643a` | `4735cd82` | 1 | val | F | 4 | `unit.004` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-2` | F |
| 34| `6e803d45` | `8fadde25` | 1 | val | F | 4 | `unit.004` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-3` | F |
| 35| `7addbaf6` | `a87ba2aa` | 1 | val | F | 4 | `unit.004` | A | T | T | Adequate | 1.0 | legacy_seed | `cluster-4` | F |
| 36| `0707bbd2` | `6e6e0452` | 1 | val | F | 5 | `unit.005` | C | T | T | Adequate | 0.9 | ai_generated| `cluster-1` | F |
| 37| `4ce8fea3` | `b14c1c53` | 1 | val | F | 5 | `unit.005` | B | T | T | Adequate | 0.9 | ai_generated| `cluster-2` | F |

*\*Note on `Tau` eligibility for `7d9abd94` and `44931eb1`: While these meet mechanical database conditions (`approved`, `is_latest_approved`, `answerKeyValid`), Section 3 details semantic collocation defects that disqualify them from educational validity.*

---

## 3. Detailed Item Records

### Unit 1 Items (Present continuous: 19 records)

#### Item 1: `33581778-c58e-40ed-b138-cfebece4f823`
- **Root ID:** `0fda8409-0926-49c0-8b86-1564d83497ac` | **Version:** 1 | **Status:** `archived` | **Latest Approved:** `false`
- **Rule Reference:** 1A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Look! The marketing director _______ the main conference hall with our new client."`
- **Options:** `[A] is entering` (Correct), `[B] enters`, `[C] entered`, `[D] enter`
- **Explanation:** Adequate (120 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][easy]`)
- **Assigned Context Cluster:** `cluster-1` (`marketing_sales`)
- **Transfer Evidence Eligible:** `false` (Archived)

#### Item 2: `7d9abd94-df89-4762-8a86-a3217f0217b0`
- **Root ID:** `0fda8409-0926-49c0-8b86-1564d83497ac` | **Version:** 2 | **Status:** `approved` | **Latest Approved:** `true`
- **Rule Reference:** 1A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options:** `[A] is entering` (Correct), `[B] enters`, `[C] entered`, `[D] enter`
- **Explanation:** Adequate (47 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (Revision of v1)
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Collocation Defect:** "he is entering the server hardware" is a semantic anomaly. One does not "enter" hardware.
- **Transfer Evidence Eligible:** Mechanically eligible; pedagogically compromised.

#### Item 3: `b7c4793c-ba61-4ae6-92e2-74096f6a8557`
- **Root ID:** `35f70d43-1a56-446c-b49b-9ad72b6185ce` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1E | **Primary Skill:** `direct_grammar`
- **Prompt:** `"According to the corporate announcement, our international market share _______ steadily this quarter."`
- **Options:** `[A] grew`, `[B] grows`, `[C] is growing` (Correct), `[D] was grown`
- **Explanation:** Adequate (114 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][medium]`)
- **Assigned Context Cluster:** `cluster-3` (`marketing_sales`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 4: `a716fc0f-edb9-4f98-9b5b-d3e4092a47fe`
- **Root ID:** `3d71c0d1-6a2d-498a-b6f2-c5abad85657e` | **Version:** 1 | **Status:** `archived` | **Latest Approved:** `false`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Please be quiet. I _______ to finish this quarterly report right now."`
- **Options:** `[A] try`, `[B] am trying` (Correct), `[C] tried`, `[D] was trying`
- **Explanation:** Adequate (157 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][easy]`)
- **Assigned Context Cluster:** `cluster-4` (`finance_accounting`)
- **Transfer Evidence Eligible:** `false` (Archived)

#### Item 5: `7d24582b-ca20-4c7a-a828-530f4852e80a`
- **Root ID:** `3d71c0d1-6a2d-498a-b6f2-c5abad85657e` | **Version:** 2 | **Status:** `withdrawn` | **Latest Approved:** `false`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options:** `[A] try`, `[B] am trying` (Marked Correct), `[C] tried`, `[D] was trying`
- **Explanation:** Adequate (47 chars) | **Mapping Confidence:** 1.00
- **Withdrawal Reason:** Ungrammatical answer key (Option B 'am trying' with 3rd-person singular subject 'he').
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** `false` (Withdrawn)

#### Item 6: `c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c`
- **Root ID:** `3dc27726-1100-4e84-959f-66ac95e7e588` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Why _______ so many employees _______ over the recent changes to the annual leave policy today?"`
- **Options:** `[A] do / debate`, `[B] are / debating` (Correct), `[C] have / debated`, `[D] were / debating`
- **Explanation:** Adequate (107 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][hard]`)
- **Assigned Context Cluster:** `cluster-5` (`corporate_management`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 7: `0f51d836-7c9b-4394-bb9c-6a84d436c84c`
- **Root ID:** `4a75a575-d852-4e67-897d-6ff58444a7f3` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Please speak quietly in the lobby because the marketing director _______ an important client on the phone."`
- **Options:** `[A] is calling` (Correct), `[B] calls`, `[C] called`, `[D] call`
- **Explanation:** Adequate (100 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][easy]`)
- **Assigned Context Cluster:** `cluster-6` (`marketing_sales`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 8: `5131bba7-4156-4ce0-b6bb-858c20ff4d48`
- **Root ID:** `634add4d-28b9-4a94-b258-0051e93c6838` | **Version:** 1 | **Status:** `archived` | **Latest Approved:** `false`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Listen! Our team leader _______ the new safety protocols in the auditorium."`
- **Options:** `[A] explains`, `[B] is explaining` (Correct), `[C] explained`, `[D] explain`
- **Explanation:** Adequate (118 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][easy]`)
- **Assigned Context Cluster:** `cluster-7` (`corporate_management`)
- **Transfer Evidence Eligible:** `false` (Archived)

#### Item 9: `44931eb1-344b-4ec8-aceb-5524a952ed59`
- **Root ID:** `634add4d-28b9-4a94-b258-0051e93c6838` | **Version:** 2 | **Status:** `approved` | **Latest Approved:** `true`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options:** `[A] explains`, `[B] is explaining` (Correct), `[C] explained`, `[D] explain`
- **Explanation:** Adequate (47 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (Revision of v1)
- **Collocation Defect:** "he is explaining the server hardware" is an unnatural collocation. One explains a process or problem, not hardware.
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** Mechanically eligible; pedagogically compromised.

#### Item 10: `8b8d431d-e682-4e96-bde3-227dc089b272`
- **Root ID:** `6a54a874-9b57-4148-be8d-71b9e2898c64` | **Version:** 1 | **Status:** `archived` | **Latest Approved:** `false`
- **Rule Reference:** 1C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Why _______ you _______ the project schedule today?"`
- **Options:** `[A] are / updating` (Correct), `[B] do / update`, `[C] have / updated`, `[D] were / updating`
- **Explanation:** Adequate (138 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][medium]`)
- **Assigned Context Cluster:** `cluster-8` (`general_business`)
- **Transfer Evidence Eligible:** `false` (Archived)

#### Item 11: `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2`
- **Root ID:** `6a54a874-9b57-4148-be8d-71b9e2898c64` | **Version:** 2 | **Status:** `withdrawn` | **Latest Approved:** `false`
- **Rule Reference:** 1C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options:** `[A] are / updating` (Marked Correct), `[B] do / update`, `[C] have / updated`, `[D] were / updating`
- **Explanation:** Adequate (47 chars) | **Mapping Confidence:** 1.00
- **Withdrawal Reason:** Ungrammatical answer key (Option A 'are / updating' with 3rd-person singular subject 'he').
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** `false` (Withdrawn)

#### Item 12: `2afc939e-d5bb-4363-95c5-bf67246416f5`
- **Root ID:** `7a347a67-0248-4cb5-829d-4cf3fa244199` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now."`
- **Options:** `[A] conducts`, `[B] is conducting` (Correct), `[C] conducted`, `[D] conduct`
- **Explanation:** Adequate (107 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][medium]`)
- **Assigned Context Cluster:** `cluster-9` (`finance_accounting`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 13: `2997562b-65e3-46aa-b2b9-eef79a61ce58`
- **Root ID:** `8c00e8d7-7278-4cfb-b54c-5f891eb6d525` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1E | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly."`
- **Options:** `[A] incorporates`, `[B] is incorporating` (Correct), `[C] incorporated`, `[D] was incorporated`
- **Explanation:** Adequate (123 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][hard]`)
- **Assigned Context Cluster:** `cluster-10` (`manufacturing_production`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 14: `fa201c0b-1936-41ea-bfcf-eecf2c4fe8e2`
- **Root ID:** `944ee279-7a30-4e12-b9e7-49dbeae204f6` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1D | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Although the regional director usually _______ conservative investments, she is currently considering higher-yield instruments."`
- **Options:** `[A] prefers` (Correct), `[B] is preferring`, `[C] preferred`, `[D] prefer`
- **Explanation:** Adequate (129 chars) | **Mapping Confidence:** 1.00
- **Pedagogical Note:** Blank requires "prefers" (stative verb of preference / present simple habit vs current consideration). Mapped to Unit 1, but actually tests Unit 3/4 contrast.
- **Assigned Context Cluster:** `cluster-11` (`corporate_management`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial review / concept reclassification)

#### Item 15: `7a3359ae-21e1-4545-af4e-5a0ec7977ddf`
- **Root ID:** `ac251f52-87c2-4876-905a-5264b31a89c8` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Our executive committee _______ foreign representatives all afternoon to negotiate the cross-border merger terms."`
- **Options:** `[A] meets`, `[B] is meeting` (Correct), `[C] met`, `[D] have met`
- **Explanation:** Adequate (107 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][medium]`)
- **Assigned Context Cluster:** `cluster-12` (`corporate_management`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 16: `79355b82-e2db-4857-b78f-53716b0b7f39`
- **Root ID:** `b19ebb8c-c692-4eec-8c6c-829d671bfce9` | **Version:** 1 | **Status:** `archived` | **Latest Approved:** `false`
- **Rule Reference:** 1A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3."`
- **Options:** `[A] repairs`, `[B] is repairing` (Correct), `[C] repaired`, `[D] repair`
- **Explanation:** Adequate (119 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][easy]`)
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** `false` (Archived)

#### Item 17: `45e751fd-4915-4bac-a386-c7bae5295911`
- **Root ID:** `b19ebb8c-c692-4eec-8c6c-829d671bfce9` | **Version:** 2 | **Status:** `approved` | **Latest Approved:** `true`
- **Rule Reference:** 1A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options:** `[A] repairs`, `[B] is repairing` (Correct), `[C] repaired`, `[D] repair`
- **Explanation:** Adequate (47 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (Revision of v1)
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** `true` (Valid, Approved, Natural Collocation)

#### Item 18: `322c0e5c-cb32-47e0-9ef2-5f6534575f70`
- **Root ID:** `bf8e0dc4-8eb1-469b-8be8-278c2e684073` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty."`
- **Options:** `[A] experience`, `[B] are experiencing` (Correct), `[C] experienced`, `[D] experiences`
- **Explanation:** Adequate (128 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][hard]`)
- **Assigned Context Cluster:** `cluster-13` (`logistics_shipping`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

#### Item 19: `fe5dcc57-195b-42fa-9a4f-56093d56ce99`
- **Root ID:** `eb2ee69f-4375-430b-9bc2-3c130ba278db` | **Version:** 1 | **Status:** `validated` | **Latest Approved:** `false`
- **Rule Reference:** 1C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The IT support team _______ a new cybersecurity protocol across all company computers this week."`
- **Options:** `[A] is installing` (Correct), `[B] installs`, `[C] installed`, `[D] install`
- **Explanation:** Adequate (116 chars) | **Mapping Confidence:** 1.00
- **Provenance:** `legacy_seed` (`CURATED_TOEIC_UNIT_QUESTIONS[1][medium]`)
- **Assigned Context Cluster:** `cluster-2` (`it_technology`)
- **Transfer Evidence Eligible:** `false` (Awaiting editorial approval)

---

### Unit 2 Items (Present simple: 8 records)

All 8 records in Unit 2 are currently in `validated` review status and mapped to `unit.002`.

#### Item 20: `32ed699c-36ec-4aa3-bfd0-f13886566415`
- **Root ID:** `08503402-4fc4-411a-ab61-9c3f4e397c76` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The mail courier always _______ packages to the reception desk before 10 A.M."`
- **Options:** `[A] delivers` (Correct), `[B] is delivering`, `[C] delivered`, `[D] deliver`
- **Assigned Context Cluster:** `cluster-1` (`logistics_shipping`) | **Domain:** `logistics_shipping`

#### Item 21: `a47fbe81-678a-40a8-b64d-3b7c8585e507`
- **Root ID:** `1c97a716-e5ce-401d-beea-6825c941c49b` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Most software developers in our branch _______ in modern open-space cubicles."`
- **Options:** `[A] works`, `[B] work` (Correct), `[C] are working`, `[D] worked`
- **Assigned Context Cluster:** `cluster-2` (`it_technology`) | **Domain:** `it_technology`

#### Item 22: `eb746b7c-f1e5-4f4c-bc63-d14ae424ea64`
- **Root ID:** `4f3ffc86-10b2-4d1a-8cfa-57a5c898b6cb` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Our regional express shuttle _______ from the central station every thirty minutes."`
- **Options:** `[A] depart`, `[B] departs` (Correct), `[C] is departing`, `[D] departed`
- **Assigned Context Cluster:** `cluster-3` (`hospitality_travel`) | **Domain:** `hospitality_travel`

#### Item 23: `a6c7ae58-fdd3-4927-9c98-1e4344d67397`
- **Root ID:** `9704b1cc-a477-4f81-a96c-48c08fb4f0bb` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The legal department _______ contracts that contain ambiguous termination clauses."`
- **Options:** `[A] does not approve` (Correct), `[B] is not approving`, `[C] did not approve`, `[D] not approve`
- **Assigned Context Cluster:** `cluster-4` (`general_business`) | **Domain:** `general_business`

#### Item 24: `f5381446-5ec5-408b-9e47-e2a15c32863a`
- **Root ID:** `9899139c-5c42-4f36-8169-be535c5dfb5e` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2C | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Seldom _______ the senior partner endorse investments without conducting thorough due diligence."`
- **Options:** `[A] does` (Correct), `[B] is`, `[C] did`, `[D] has`
- **Assigned Context Cluster:** `cluster-5` (`general_business`) | **Domain:** `general_business`

#### Item 25: `f89aceea-1f74-4b53-b09e-7117e3f88f1c`
- **Root ID:** `de3db8cc-9883-49b8-bf9b-ec60d057a66f` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"Our office _______ at 8:00 A.M. and closes at 6:00 P.M. every Monday through Friday."`
- **Options:** `[A] opens` (Correct), `[B] is opening`, `[C] opened`, `[D] open`
- **Assigned Context Cluster:** `cluster-6` (`general_business`) | **Domain:** `general_business`

#### Item 26: `92a0e4b0-a544-4861-ac32-e0573e3aee48`
- **Root ID:** `e15832a7-fefd-4a1d-a0bb-2646d5c5896a` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2A | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The human resources manager usually _______ employment verification letters within two business days."`
- **Options:** `[A] issues` (Correct), `[B] is issuing`, `[C] issued`, `[D] issue`
- **Assigned Context Cluster:** `cluster-7` (`corporate_management`) | **Domain:** `corporate_management`

#### Item 27: `a9d29ec3-9db8-4034-8c85-26330689b9cf`
- **Root ID:** `fd6b2d49-43c2-475a-bc3e-4b4457bf97d3` | **Version:** 1 | **Status:** `validated`
- **Rule Reference:** 2B | **Primary Skill:** `direct_grammar`
- **Prompt:** `"The chief economist emphasizes that currency volatility _______ directly to fluctuating crude oil pricing."`
- **Options:** `[A] relates` (Correct), `[B] is relating`, `[C] related`, `[D] relate`
- **Assigned Context Cluster:** `cluster-8` (`general_business`) | **Domain:** `general_business`

---

### Unit 3 Items (Present continuous and present simple 1: 4 records)

All 4 records are in `validated` review status and nominally mapped to `unit.003`. As detailed in the Item Editorial Audit, **none of these 4 items actually test Unit 3 grammar**.

#### Item 28: `6948841f-a36c-482f-8cce-b48be0d77d70`
- **Root ID:** `23644090-4e55-46eb-8eec-4c6883f3ee82` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout the building."`
- **Options:** `[A] works`, `[B] was working` (Correct), `[C] is working`, `[D] worked`
- **Actual Concept:** Past continuous (`unit.006`), NOT `unit.003`.

#### Item 29: `c10918d0-aa1e-4509-9069-b5f7e71f92c5`
- **Root ID:** `4acd072c-f601-443b-8517-ddadff37bfb1` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"While the project coordinator _______ the contract terms, the client asked for clarification on payment schedules."`
- **Options:** `[A] reviews`, `[B] was reviewing` (Correct), `[C] is reviewing`, `[D] reviewed`
- **Actual Concept:** Past continuous (`unit.006`), NOT `unit.003`.

#### Item 30: `77299aeb-093a-4dd2-8bc1-12c85d883017`
- **Root ID:** `73bd1efe-9b4e-4f7f-801a-88fae1f0e21a` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Had the compliance inspector _______ the discrepancy earlier, the company would not have faced regulatory fines."`
- **Options:** `[A] noticed` (Correct), `[B] notice`, `[C] noticing`, `[D] notices`
- **Actual Concept:** Inverted Third Conditional (`unit.038`/`unit.040`), NOT `unit.003`.

#### Item 31: `43753724-ea66-419b-abdf-147ee56d10db`
- **Root ID:** `d083530a-ae83-4a11-bba6-5f532a8198f7` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Last Friday, the board members _______ to approve the proposed budget."`
- **Options:** `[A] vote`, `[B] voted` (Correct), `[C] are voting`, `[D] have voted`
- **Actual Concept:** Past simple (`unit.005`), NOT `unit.003`.

---

### Unit 4 Items (Present continuous and present simple 2: 4 records)

All 4 records are in `validated` review status and nominally mapped to `unit.004`.

#### Item 32: `fe61381a-6df4-469b-9860-2fe8442fae09`
- **Root ID:** `0d8b4ec8-c4ef-4b40-9fe4-16a7f80dbba4` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"The chief scientist _______ whether the synthesized compound remains chemically stable under extreme pressure."`
- **Options:** `[A] doubts` (Correct), `[B] is doubting`, `[C] doubted`, `[D] doubt`
- **Actual Concept:** Stative verb of mental state (`unit.004`). Properly aligned.

#### Item 33: `ac0c643a-f264-4991-b5ae-08c0e8eb2848`
- **Root ID:** `4735cd82-f9bc-46f2-9d2d-f6ec468afce9` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Dr. Evans _______ three medical research articles every year for the international cardiology journal."`
- **Options:** `[A] publishes` (Correct), `[B] is publishing`, `[C] publish`, `[D] has published`
- **Actual Concept:** Habitual / frequency simple present (`unit.002`), NOT `unit.004`.

#### Item 34: `6e803d45-15fe-4fb7-8f35-5f7636947888`
- **Root ID:** `8fadde25-da30-4891-bcf4-1d952603deaf` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Listen to the speaker; she _______ the summary of today's meeting."`
- **Options:** `[A] is giving` (Correct), `[B] gives`, `[C] gave`, `[D] give`
- **Actual Concept:** Action happening now (`unit.001`), NOT `unit.004`.

#### Item 35: `7addbaf6-e0f1-47c4-a31d-f0196200c087`
- **Root ID:** `a87ba2aa-96df-4fe9-b174-2d1851640b88` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Listen to the CEO's keynote address; she _______ the company's visionary five-year expansion plan."`
- **Options:** `[A] is explaining` (Correct), `[B] explains`, `[C] explained`, `[D] has explained`
- **Actual Concept:** Action happening now (`unit.001`), NOT `unit.004`. Near-template duplicate of Item 34.

---

### Unit 5 Items (Past simple: 2 records)

Both items generated by AI run `f16fa7fb-e205-4995-b1ec-b05a25be5b1f` and mapped to `unit.005`.

#### Item 36: `0707bbd2-7ee1-46c5-b285-55ead26e9c7f`
- **Root ID:** `6e6e0452-dc31-4386-b162-713e312c4a0d` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"The technician _______ the problem with the network server during his visit last week."`
- **Options:** `[A] find`, `[B] finds`, `[C] found` (Correct), `[D] founded`
- **Rationales:** Vietnamese distractor explanations provided from generation pipeline.
- **Actual Concept:** Past simple irregular verb (`unit.005`). Properly aligned.

#### Item 37: `4ce8fea3-4481-4b96-abf9-79f2d8eb398d`
- **Root ID:** `b14c1c53-88bd-4f47-a456-2caaf945750e` | **Version:** 1 | **Status:** `validated`
- **Prompt:** `"Ms. Tanaka _______ the marketing report to the manager's office yesterday afternoon."`
- **Options:** `[A] deliver`, `[B] delivered` (Correct), `[C] delivering`, `[D] delivers`
- **Rationales:** Vietnamese distractor explanations provided from generation pipeline.
- **Actual Concept:** Past simple regular verb (`unit.005`). Properly aligned.

---

## 4. Integrity and Preservation Verification

1. **Zero Database Modifications**: All 37 items, 148 option records, 4 attempt records, and 161 concept records remain strictly untouched during this census.
2. **Version Lineage Preserved**:
   - Roots `0fda8409`, `3d71c0d1`, `634add4d`, `6a54a874`, and `b19ebb8c` retain their complete multi-version history (v1 and v2 records linked via `root_question_id`).
   - Historical v1 items remain safely marked `archived` with `is_latest_approved = false`.
   - Flawed v2 items remain safely marked `withdrawn` with immutable `withdrawn_reason` audit trails.

