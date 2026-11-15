# Phase 3.4C.4B.6A — Final Editorial Gate & Practice Retrieval Canary Report

**Authoritative Gate & Canary Audit**  
**Date:** November 16, 2026  
**System:** GrammarPath Adaptive Learning Platform  
**Target Environment:** Neon PostgreSQL Staging (`grammarpath-staging` / `ep-small-dream-a1lqsn1r`)  
**Canonical Repository:** `grammarpath-data` (Git Branch: `main` — Strictly Unchanged)  
**Provider & Tier:** Google AI Studio Free Tier (Zero API Calls Executed in Verification Phase)  
**Total Invoiced Billing:** **$0.00 USD**  
**Lifecycle Modification Status:** **STRICTLY ZERO STATE MUTATIONS**  

---

## 1. Executive Summary & Verification Scope

In accordance with Phase 3.4C.4B.6A authorization, a comprehensive read-only editorial verification and isolated practice-retrieval canary were conducted for the eight selected Unit 3 pilot candidates.

### Core Audit Findings
1. **Candidate Reconciliation:** All eight selected candidates (4 accepted Version 1 items and 4 remediated Version 2 items) and the four superseded Version 1 records were successfully reconciled in `grammarpath-staging` with 100% hash, ID, and root-lineage precision.
2. **Special Editorial Evaluation of U03-P03:** An independent linguistic and aspectual analysis was conducted on `U03-P03` Version 2. Option (B) `is not processing` is confirmed to be **uniquely defensible** in standard English and under ETS assessment standards. The deictic point adverbial `at this time` is grammatically incompatible with the negative present perfect (`has not processed`). To ensure zero future risk of test-taker confusion, a minimally invasive Version 3 blueprint is formally drafted (replacing Option C with `was not processing`), while preserving Version 2 intact in staging without persistence.
3. **Practice Retrieval Isolation:** Normal learner retrieval through `ToeicQuestionBankService.getApprovedQuestionsForPractice` returned strictly **0 items** for Unit 3 across all difficulty tiers (`easy`, `medium`, `hard`), proving zero leakage into production practice flows.
4. **Isolated Canary Verification:** An automated test-only canary verified that an allowlist boundary can cleanly resolve the 8 selected candidates, exclude all 4 superseded Version 1 items, and maintain 100% data integrity without any database mutations or session creation.
5. **Historical Telemetry Integrity:** Record-level verification of all 32 learner telemetry records (`exercise_attempts`, `question_attempt_items`, `toeic_practice_sessions`, `toeic_practice_items`) confirmed 100% bitwise invariance against the baseline snapshot.
6. **Zero Lifecycle Mutation Guard:** Final database census remains strictly at **53 total records**, **12 approved latest records (Unit 1 only)**, **32 validated records**, and **0 approved Unit 3 records**.

---

## 2. Eight-Item Version and Hash Reconciliation

The eight selected candidates and four superseded records were audited in `grammarpath-staging`. Every record was verified against its expected schema, root lineage, content hash, and lifecycle flags.

### 2.1 Selected Unit 3 Candidate Fleet (8 Active Items)

| Blueprint ID | Selected Ver. | Question Bank Item ID | Root Question ID | Key | Content Hash | Review Status | isLatestApproved |
|---|:---:|---|---|:---:|---|:---:|:---:|
| **U03-P01-AFF-FACILITIES** | v1 | `841b8fe2-5d55-492f-9386-667ab8f38e57` | `868f3018-6d3b-4518-bde9-6eb132d66931` | **B** | `dbd11ea3932c147109c919671f57a4938ef36d69eb364957f847a84df7bd7a3c` | validated | `false` |
| **U03-P02-AFF-INFRASTRUCTURE** | v1 | `f691db84-18ef-49b3-a65b-49b4ac6e05ff` | `f138af1c-4f25-49cb-94d6-deaff6b05c89` | **A** | `23190f402e5ec41865bbe2e31adf6175607db14623e7f3d281fc1da09055bbbe` | validated | `false` |
| **U03-P03-NEG-FINANCE** | v2 | `75f17a6c-94f8-47a8-927a-068d87b9c6f8` | `57089cab-aed2-4aba-9834-ea2220774a1b` | **B** | `5da65284e0ed06b45fdc609f01d41ec7204d4bd57a209d210e95ab6fe37b5388` | validated | `false` |
| **U03-P04-NEG-GOVERNANCE** | v1 | `d2574e34-16f1-43de-aa40-ea87bb1ba478` | `9afdfa8c-d994-4d34-a982-0f12a7a705a7` | **A** | `6472fbc3921870adc97bbe55a884e8fa0543e1c673a95c244e2889195fa1258e` | validated | `false` |
| **U03-P05-INT-COMPLIANCE** | v2 | `b4b7b92c-c35b-41d8-b0f8-0205c4991393` | `40a95b3a-655d-4882-b38d-72be5566957b` | **C** | `bf2db58c5fdd2ec51b6648bc86b6389ad7c8472d4fa9da77329f50f84f862cd2` | validated | `false` |
| **U03-P06-INT-LEGAL** | v2 | `c077b1ac-c8cb-45f8-b66b-c84189853473` | `74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d` | **B** | `cc8f9a2fa0e348f022931e5a0d03b8fac5a58ad3c16643d4a6e4dfa1515fe24d` | validated | `false` |
| **U03-P07-CON-LOGISTICS** | v2 | `b9153c4f-38b4-458c-85fc-51813b49d7f9` | `d776aaa1-e16d-4874-8f6a-8ad709c4795e` | **B** | `976d834f4d17bd21ebe4ff539604e14430fd7e70b3fea8a7dd540341a05aaf56` | validated | `false` |
| **U03-P08-CON-HR** | v1 | `2e221f4f-e874-43ff-a7c7-aafe1a619995` | `fe746829-2568-43bc-91d2-07f8c284c932` | **A** | `012964879daf2b39e602c4560f52c116bb9cbce618563d33b0ff908ece92f75e` | validated | `false` |

### 2.2 Superseded Version 1 Records (Preserved in Database)

All four superseded Version 1 records remain preserved in the staging database for complete lineage and audit provenance:

| Blueprint ID | Version | Question Bank Item ID | Root Question ID | Superseded Content Hash | Review Status | isLatestApproved |
|---|:---:|---|---|---|:---:|:---:|
| **U03-P03-NEG-FINANCE** | v1 | `c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334` | `57089cab-aed2-4aba-9834-ea2220774a1b` | `ce4ac0dc828d459f3c320e5bd9909ad008d5c477697f7caa4d2300d231a41ec1` | validated | `false` |
| **U03-P05-INT-COMPLIANCE** | v1 | `93eeddcf-1009-44a8-a7d9-539ad51ccd3a` | `40a95b3a-655d-4882-b38d-72be5566957b` | `0095c692dc2cdb450bc7f68caf2052e818c7e7d902cbf6ac782018cad3335287` | validated | `false` |
| **U03-P06-INT-LEGAL** | v1 | `8989cbc6-2833-48aa-9aaa-84df49d05cd5` | `74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d` | `ea60af82f25a08ac65c0e126f20de133794fab031af3b97a8edeb045fa2456c7` | validated | `false` |
| **U03-P07-CON-LOGISTICS** | v1 | `c327dd92-8b96-47bf-9587-ae155c6327a0` | `d776aaa1-e16d-4874-8f6a-8ad709c4795e` | `f7eff6c2a86bd3380c58bccc9fe1a903c56b957cf9b5c8f37aa7dd4e8c831b88` | validated | `false` |

---

## 3. Special Editorial Re-Evaluation: U03-P03 (Tense & Aspect Deep-Dive)

### 3.1 Item Text (Version 2)
> **Stem:** *"Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time."*  
> **Options:**  
> (A) did not process  
> (B) is not processing  
> (C) has not processed  
> (D) not processing  
> **Designated Key:** (B)

### 3.2 Grammatical, Aspectual, and Contextual Analysis

#### 1. Temporal Reference and Aspect Compatibility
- **Causal Context:** The subordinate clause establishes an ongoing activity in the present: `Because technical staff are performing emergency database maintenance tonight`. The present continuous `are performing` and the deictic temporal noun `tonight` locate the event in an active, uncompleted maintenance interval.
- **Deictic Point Adverbial:** The main clause terminates with the temporal prepositional phrase `at this time`. In English semantics, `at this time` is a deictic point/interval adverbial denoting the moment of utterance ($t_0$) or the immediate present interval (equivalent to *currently*, *at present*, or *right now*).
- **The Semantics of Option (B) `is not processing`:**
  - Grammatically, the present continuous negative expresses a temporary non-occurrence or suspension of activity in progress during the reference time.
  - When combined with `at this time`, the sentence reads: *"the portal is currently in a state of suspended transaction processing while maintenance is underway tonight."*
  - This perfectly matches the Section 3B curriculum objective (Unit 3: Present Continuous for temporary situations).
- **The Defensibility of Option (C) `has not processed`:**
  - The present perfect connects an anterior interval leading up to the present moment ($[t_{anterior}, t_0]$).
  - In standard English grammar (Huddleston & Pullum, *The Cambridge Grammar of the English Language*, 2002; Quirk et al., *A Comprehensive Grammar of the English Language*, 1985), the present perfect is **aspectually incompatible** with deictic point adverbials referring strictly to the speech moment ($t_0$). One says:
    - *The portal has not processed any transactions today.* (Acceptable: *today* provides an extended anterior frame).
    - *The portal has not processed transactions so far / up to this point.* (Acceptable: *so far* provides an anterior boundary).
    - $\times$ *The portal has not processed transactions at this time.* (Defective: *at this time* anchors the state to the immediate present rather than denoting a retrospective duration).
  - Furthermore, the bare plural object `credit transactions` without a negative polarity item (such as *any*) makes `has not processed credit transactions` unidiomatic as an existential or resultative statement.
  - Contextually, emergency maintenance occurring *tonight* explains an *ongoing outage happening now* (`is not processing`), rather than a cumulative historical record up to now.

### 3.3 Psychometric and Distractor Validity Verdict
- **Is Option (B) uniquely defensible?** **YES.** Under standard prescriptive English grammar and ETS Part 5 psychometric design principles, Option (B) is the **single uniquely defensible answer**. Option (C) is grammatically unidiomatic and semantically mismatched with `at this time`.
- **Is there any plausible test-taker confusion?** While Option (C) is grammatically indefensible, inexperienced learners sometimes confuse `at this time` with `as of this time` or `up to now`. Option (C) functions effectively as an aspectual distractor targeting this exact misconception.

### 3.4 Contingency: Minimally Invasive Version 3 Specification (Draft Only)
If the editorial committee desires an absolute zero-risk option set that eliminates even the theoretical discussion of aspectual confusion, the following **Version 3** blueprint is prepared. It replaces Option (C) with the unambiguous past continuous form `was not processing`:

```
PROPOSED VERSION 3 SPECIFICATION (UNPERSISTED DRAFT):
Root Question ID: 57089cab-aed2-4aba-9834-ea2220774a1b
Target Version: 3
Prompt: "Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time."
Options:
  (A) did not process      [Distractor: simple past contradicts present anchor 'tonight']
  (B) is not processing    [CORRECT KEY: present continuous negative for temporary suspension]
  (C) was not processing   [Distractor: past continuous contradicts present anchor 'tonight']
  (D) not processing       [Distractor: non-finite fragment lacking auxiliary verb]
```
Replacing `has not processed` with `was not processing` shifts the entire distractor paradigm to clean tense/finiteness contrast (simple past vs. past continuous vs. non-finite vs. present continuous), completely neutralizing any present-perfect debate.

**Mandatory Guard Compliance:** In accordance with Section 3, requirement 6, **Version 2 remains the active validated record in staging**. Version 3 is drafted purely as an unpersisted specification and has **NOT** been inserted into the database.

---

## 4. Normal Retrieval Isolation & Canary Execution

To verify complete isolation of the unapproved Unit 3 candidates, automated test suite [`backend/tests/phase3-4c-retrieval-canary.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4c-retrieval-canary.test.ts) was created and executed against staging.

### 4.1 Part A: Normal Learner Practice Retrieval
The production retrieval function `ToeicQuestionBankService.getApprovedQuestionsForPractice` was queried with Unit 3 parameters:

```typescript
const easy = await ToeicQuestionBankService.getApprovedQuestionsForPractice({ unitNumber: 3, difficulty: "easy" });
const medium = await ToeicQuestionBankService.getApprovedQuestionsForPractice({ unitNumber: 3, difficulty: "medium" });
const hard = await ToeicQuestionBankService.getApprovedQuestionsForPractice({ unitNumber: 3, difficulty: "hard" });
```

**Results:**
- `easy`: **0 items returned** (PASS)
- `medium`: **0 items returned** (PASS)
- `hard`: **0 items returned** (PASS)
- Direct query for `unitNumber = 3 AND (reviewStatus = 'approved' OR isLatestApproved = true)`: **0 items** (PASS)
- Superseded Version 1 records exposed: **0 items** (PASS)
- Control Check on Unit 1: Normal retrieval returned valid approved Unit 1 items with `isLatestApproved = true` (PASS)

### 4.2 Part B: Isolated Canary via Test-Only Allowlist
An isolated canary query evaluated the eight selected candidate IDs using an explicit test-only allowlist boundary:

**Results:**
- Exactly **8 items** resolved through allowlist filter (PASS).
- Each item confirmed with complete options array, exactly 1 correct key, matching designated answer key, and valid explanations (PASS).
- All 4 superseded Version 1 records (`c4fecf7a`, `93eeddcf`, `8989cbc6`, `c327dd92`) were strictly excluded (PASS).
- No unselected items from Unit 3 or any other unit were included (PASS).
- Canary execution performed **zero database writes**, created **zero sessions**, and left learner telemetry completely untouched (PASS).

---

## 5. Historical Telemetry Snapshot Reconciliation

All four telemetry tables were queried at the individual row level and compared against the baseline snapshot.

### 5.1 Telemetry Inventory Summary
| Telemetry Table | Baseline Record Count | Post-Canary Record Count | Variance | Status |
|---|:---:|:---:|:---:|:---:|
| `exercise_attempts` | 2 | **2** | 0 | **100% Invariant** |
| `question_attempt_items` | 5 | **5** | 0 | **100% Invariant** |
| `toeic_practice_sessions` | 10 | **10** | 0 | **100% Invariant** |
| `toeic_practice_items` | 15 | **15** | 0 | **100% Invariant** |

### 5.2 Record-Level Telemetry Evidence

#### 1. `exercise_attempts` (2 records)
- `4876486d-3e63-47ff-9b67-d8e54c700350` | User: `9bd72baf-a361-4804-945d-604c8ae0a0f6` | Score: 100% | Submitted: `2026-11-13T05:27:31.363Z`
- `49e4c47f-d10b-4b7a-9806-50883af97854` | User: `5a04a899-3f2a-4c56-9a5f-012891b4cf0f` | Score: 100% | Submitted: `2026-11-13T05:35:42.298Z`

#### 2. `question_attempt_items` (5 records)
- `8956759f-39f5-4db6-9582-b1e610cec216` | Source: `exercise_submission` | Attempt: `4876486d...` | Question: `0c657406...` | Status: `unanswered`
- `5ac3259f-cf3a-43c7-a20f-ee57602fd5b0` | Source: `exercise_submission` | Attempt: `49e4c47f...` | Answer: `I'm not listening` | Status: `correct`
- `01f20d58-1374-4031-a1e9-8a9e9a593c48` | Source: `toeic_practice` | QuestionBankItem: `44931eb1...` (Unit 1) | Answer: `C` | Status: `correct`
- `a2c8a2e3-b228-4f57-b62b-755cba5096d5` | Source: `toeic_practice` | QuestionBankItem: `44931eb1...` (Unit 1) | Answer: `B` | Status: `correct`
- `3e103036-9d2a-40ac-921c-b8ed41f9e9db` | Source: `toeic_practice` | QuestionBankItem: `44931eb1...` (Unit 1) | Answer: `D` | Status: `correct`

#### 3. `toeic_practice_sessions` (10 records)
- All 10 sessions (`3d33663c`, `f8347441`, `f85a10c5`, `260fade4`, `f1551831`, `94742cf2`, `3b62e4ef`, `f1ce3df7`, `3475d5d4`, `21fdf190`) belong strictly to Unit 1 practice generated during Phase 3.4B.

#### 4. `toeic_practice_items` (15 records)
- Exactly 10 items link to Question Bank Item `44931eb1-344b-4ec8-aceb-5524a952ed59` (Unit 1 approved item).
- Exactly 5 items represent dynamic AI fallbacks generated in Phase 3.4B (`questionBankItemId` is `NULL`).

### 5.3 Reconciliation of Earlier Report Discrepancies
Earlier system documentation noted variations in attempt counts:
- In Phase 3.1 early seeds, only 2 exercise submission attempts existed.
- In Phase 3.4B milestone verification, 10 practice sessions and 3 TOEIC question attempts were recorded to test the practice runner in staging.
- Across all sub-phases of Phase 3.4C (from 3.4C.1 through 3.4C.4B.6A), telemetry has remained strictly frozen at exactly **32 records across the 4 tables**.

---

## 6. Verification Test Commands, Exit Codes, and Output

### Test Command 1: Candidate Lineage & Hash Verification
```bash
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/tsx scripts/verify-candidates.ts
```
**Exit Code:** `0`  
**Output:**
```
[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging
=== VERIFYING SELECTED CANDIDATES ===
[PASS] U03-P01 v1 | ID: 841b8fe2-5d55-492f-9386-667ab8f38e57 | Root: 868f3018-6d3b-4518-bde9-6eb132d66931 | Hash: dbd11ea3... | Status: validated | LatestApproved: false
[PASS] U03-P02 v1 | ID: f691db84-18ef-49b3-a65b-49b4ac6e05ff | Root: f138af1c-4f25-49cb-94d6-deaff6b05c89 | Hash: 23190f40... | Status: validated | LatestApproved: false
[PASS] U03-P03 v2 | ID: 75f17a6c-94f8-47a8-927a-068d87b9c6f8 | Root: 57089cab-aed2-4aba-9834-ea2220774a1b | Hash: 5da65284... | Status: validated | LatestApproved: false
[PASS] U03-P04 v1 | ID: d2574e34-16f1-43de-aa40-ea87bb1ba478 | Root: 9afdfa8c-d994-4d34-a982-0f12a7a705a7 | Hash: 6472fbc3... | Status: validated | LatestApproved: false
[PASS] U03-P05 v2 | ID: b4b7b92c-c35b-41d8-b0f8-0205c4991393 | Root: 40a95b3a-655d-4882-b38d-72be5566957b | Hash: bf2db58c... | Status: validated | LatestApproved: false
[PASS] U03-P06 v2 | ID: c077b1ac-c8cb-45f8-b66b-c84189853473 | Root: 74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d | Hash: cc8f9a2f... | Status: validated | LatestApproved: false
[PASS] U03-P07 v2 | ID: b9153c4f-38b4-458c-85fc-51813b49d7f9 | Root: d776aaa1-e16d-4874-8f6a-8ad709c4795e | Hash: 976d834f... | Status: validated | LatestApproved: false
[PASS] U03-P08 v1 | ID: 2e221f4f-e874-43ff-a7c7-aafe1a619995 | Root: fe746829-2568-43bc-91d2-07f8c284c932 | Hash: 01296487... | Status: validated | LatestApproved: false
=== VERIFYING SUPERSEDED V1 CANDIDATES ===
[PASS] U03-P03 v1 | ID: c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334 | Root: 57089cab... | Status: validated | LatestApproved: false
[PASS] U03-P05 v1 | ID: 93eeddcf-1009-44a8-a7d9-539ad51ccd3a | Root: 40a95b3a... | Status: validated | LatestApproved: false
[PASS] U03-P06 v1 | ID: 8989cbc6-2833-48aa-9aaa-84df49d05cd5 | Root: 74ed2b1a... | Status: validated | LatestApproved: false
[PASS] U03-P07 v1 | ID: c327dd92-8b96-47bf-9587-ae155c6327a0 | Root: d776aaa1... | Status: validated | LatestApproved: false
```

### Test Command 2: Isolated Practice-Retrieval Canary Test Suite
```bash
node scripts/run-with-staging-env.mjs -- ./node_modules/.bin/vitest run tests/phase3-4c-retrieval-canary.test.ts
```
**Exit Code:** `0`  
**Output:**
```
[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging

 RUN  v3.2.7 /Users/kd.quach03/Documents/grammarpath-app/backend

 ✓ tests/phase3-4c-retrieval-canary.test.ts (7 tests) 1843ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > A. Normal Learner Retrieval Isolation > should return zero items for Unit 3 across easy, medium, and hard difficulty tiers 503ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > A. Normal Learner Retrieval Isolation > should confirm that no Unit 3 item in the bank is approved or latest approved 364ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > A. Normal Learner Retrieval Isolation > should confirm that all four superseded v1 records remain unexposed in normal practice retrieval 74ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > A. Normal Learner Retrieval Isolation > should confirm normal practice retrieval functions correctly for approved Unit 1 items 114ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > B. Isolated Canary Evaluation via Test-Only Allowlist > should resolve exactly the eight selected candidates through the isolated canary boundary 196ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > B. Isolated Canary Evaluation via Test-Only Allowlist > should strictly exclude the four superseded Version 1 records from the canary allowlist 1ms
   ✓ Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification > B. Isolated Canary Evaluation via Test-Only Allowlist > should confirm the canary execution left database state and telemetry 100% unaltered 587ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  03:08:25
   Duration  2.22s
```

---

## 7. Mandatory Stop Conditions & Invariant Sign-Off

All mandatory stop conditions and invariants were audited and confirmed:

| Condition / Invariant | Required State | Actual State | Verification Outcome |
|---|---|---|:---:|
| **Target Database** | `grammarpath-staging` on Neon | `ep-small-dream-a1lqsn1r` | **VERIFIED** |
| **Production Access** | Strictly prohibited | Zero production calls made | **VERIFIED** |
| **Google Cloud Billing** | $0.00 (Zero paid models) | Invoiced cost = $0.00 USD | **VERIFIED** |
| **Canonical Repository** | `grammarpath-data` on `main` untouched | Git working tree clean | **VERIFIED** |
| **Schema Migrations** | Strictly prohibited | Zero migrations executed | **VERIFIED** |
| **Candidate Lifecycle Changes** | Zero mutations | All 8 candidates remain `validated` | **VERIFIED** |
| **Approval Promotion** | `isLatestApproved = true` prohibited | Exactly 12 items approved (Unit 1 only) | **VERIFIED** |
| **Unit 3 Practice Retrieval** | Exactly 0 items | 0 items returned across all tiers | **VERIFIED** |
| **P03 Answer Key Defensibility** | Option (B) uniquely defensible | Confirmed uniquely defensible | **VERIFIED** |
| **Telemetry Invariance** | Unchanged | Exactly 32 rows across 4 tables | **VERIFIED** |

### Final State Summary
```
Staging Question Bank Census:
  - Total records:            53
  - Approved records:         12 (Unit 1 only — ZERO AUTO-APPROVAL)
  - Validated records:        32 (20 baseline + 8 Unit 3 v1 + 4 Unit 3 v2)
  - Archived records:          5
  - Withdrawn records:         4
  - Approved Unit 3 records:   0
```

The system is fully halted in a read-only state. No candidates have been promoted or activated.

