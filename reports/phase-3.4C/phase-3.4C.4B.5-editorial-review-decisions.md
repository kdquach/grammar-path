# Phase 3.4C.4B.5 — Stage 14 Human Editorial Review: Editorial Decisions & Versioning Audit

**Executive Milestone Report**  
**Date:** November 16, 2026  
**System:** GrammarPath Adaptive Learning Platform  
**Target Environment:** Neon PostgreSQL Staging (`grammarpath-staging` / `ep-small-dream-a1lqsn1r`)  
**Canonical Repository:** `grammarpath-data` (Git Branch: `main` — Strictly Unchanged)  
**Provider & Tier:** Google AI Studio Free Tier (`gemini-3-flash-preview`)  
**Total Invoiced Billing:** **$0.00 USD**  

---

## 1. Executive Summary & Authorization Scope

In accordance with Phase 3.4C.4B.5 requirements, Stage 14 Human Editorial Review was executed on the eight Unit 3 pilot candidates generated during Phase 3.4C.4B.4.3.4.

### Editorial Determination Summary
- **4 Unchanged Items (Editorially Accepted):** `U03-P01`, `U03-P02`, `U03-P04`, and `U03-P08` were accepted without modification to their questions, stems, options, or explanations. Their editorial acceptance has been formally recorded in the database audit notes. In strict compliance with the **Zero Auto-Approval Rule**, their status remains `reviewStatus = "validated"` with `isLatestApproved = false`.
- **4 Revised Items (Version 2 Created):** `U03-P03`, `U03-P05`, `U03-P06`, and `U03-P07` underwent targeted editorial remediation to eliminate grammatical ambiguity, collective-noun variation, lexical redundancy, and unnatural collocations.
- **Immutable Lineage & Versioning:** All 4 revised items were persisted as brand-new immutable records with `version = 2`, linked to their respective `rootQuestionId`. Version 1 records remain preserved and unaltered in the database.
- **Quality Re-Validation:** All 4 Version 2 items passed deterministic Stages 6 through 12 and achieved unanimous agreement in an independent Batch Blind Critic evaluation (Stage 13) via Gemini Free Tier with 100% key agreement and naturalness scores of 4.8 to 5.0 / 5.0.
- **Zero Practice Leakage:** Querying practice-eligible Unit 3 questions strictly returns **0 items**, guaranteeing zero leakage into learner practice sessions prior to explicit activation authorization.

---

## 2. Editorially Accepted Items (4 Unchanged Candidates)

The four candidates below were reviewed and accepted with zero modifications. Their database records were updated with human editorial review metadata (`reviewedBy: "human_editor_stage14"`, `reviewNotes: "Stage 14 Editorial Review: Accepted without content changes pending final explicit approval."`), while strictly preserving `reviewStatus = "validated"` and `isLatestApproved = false`.

| Blueprint ID | Item ID (v1) | Root Question ID | Key | Content Hash | Editorial Note |
|---|---|---|:---:|---|---|
| **U03-P01-AFF-FACILITIES** | `841b8fe2-5d55-492f-9386-667ab8f38e57` | `868f3018-6d3b-4518-bde9-6eb132d66931` | **B** | `dbd11ea3932c147109c919671f57a4938ef36d69eb364957f847a84df7bd7a3c` | Accepted without content changes. Clear temporal anchor (*throughout this week*) contrasting with permanent routine. |
| **U03-P02-AFF-INFRASTRUCTURE** | `f691db84-18ef-49b3-a65b-49b4ac6e05ff` | `f138af1c-4f25-49cb-94d6-deaff6b05c89` | **A** | `23190f402e5ec41865bbe2e31adf6175607db14623e7f3d281fc1da09055bbbe` | Accepted without content changes. Clear action in progress (*right now*) with plural subject *Network administrators*. |
| **U03-P04-NEG-GOVERNANCE** | `d2574e34-16f1-43de-aa40-ea87bb1ba478` | `9afdfa8c-d994-4d34-a982-0f12a7a705a7` | **A** | `6472fbc3921870adc97bbe55a884e8fa0543e1c673a95c244e2889195fa1258e` | Accepted without content changes. Present continuous negative (*is not attending*) paired with immediate time marker (*this afternoon*). |
| **U03-P08-CON-HR** | `2e221f4f-e874-43ff-a7c7-aafe1a619995` | `fe746829-2568-43bc-91d2-07f8c284c932` | **A** | `012964879daf2b39e602c4560f52c116bb9cbce618563d33b0ff908ece92f75e` | Accepted without content changes. High-quality contrast between general habit (*typically hires*) and temporary project (*currently ... is recruiting*). |

---

## 3. Revised Items (4 Version 2 Candidates)

### 3.1 U03-P03-NEG-FINANCE (Ambiguity Resolution)
- **Root Question ID:** `57089cab-aed2-4aba-9834-ea2220774a1b`
- **Previous Record (v1):** `c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334` (Hash: `ce4ac0dc...`)
- **New Record (v2):** `75f17a6c-94f8-47a8-927a-068d87b9c6f8` (Hash: `5da65284e0ed06b45fdc609f01d41ec7204d4bd57a209d210e95ab6fe37b5388`)
- **Editorial Defect in v1:** Option (A) was `does not process`. In certain enterprise scenarios, test-takers could argue that a portal "does not process" credit transactions as a matter of policy during maintenance windows.
- **Editorial Remediation in v2:** Replaced Option (A) with `did not process`. Simple past tense is undeniably incompatible with the current outage window signaled by `tonight` and `at this time`, leaving Option (B) `is not processing` as the only defensible key.

```diff
- Option (A): does not process
+ Option (A): did not process
  Option (B): is not processing [CORRECT]
  Option (C): has not processed
  Option (D): not processing
```

### 3.2 U03-P05-INT-COMPLIANCE (Collective-Noun Resolution)
- **Root Question ID:** `40a95b3a-655d-4882-b38d-72be5566957b`
- **Previous Record (v1):** `93eeddcf-1009-44a8-a7d9-539ad51ccd3a` (Hash: `0095c692...`)
- **New Record (v2):** `b4b7b92c-c35b-41d8-b0f8-0205c4991393` (Hash: `bf2db58c5fdd2ec51b6648bc86b6389ad7c8472d4fa9da77329f50f84f862cd2`)
- **Editorial Defect in v1:** In v1 stem, the subject was `the environmental compliance team`. In standard British English, collective nouns like *team* frequently take plural agreement (*are*), which could cause dual-answer disputes when paired with auxiliary blanks.
- **Editorial Remediation in v2:** Replaced `team` with `department` (`the environmental compliance department`), which is universally singular in both American and British corporate English. Preserves the interrogative present continuous objective with singular auxiliary `is` (Option C).

```diff
- Stem: Why _______ the environmental compliance team inspecting the chemical processing plant this afternoon instead of during the regular quarterly review next month?
+ Stem: Why _______ the environmental compliance department inspecting the chemical processing plant this afternoon instead of during the regular quarterly review next month?
  Option (A): do
  Option (B): does
  Option (C): is [CORRECT]
  Option (D): are
```

### 3.3 U03-P06-INT-LEGAL (Redundancy & Rationale Correction)
- **Root Question ID:** `74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d`
- **Previous Record (v1):** `8989cbc6-2833-48aa-9aaa-84df49d05cd5` (Hash: `ea60af82...`)
- **New Record (v2):** `c077b1ac-c8cb-45f8-b66b-c84189853473` (Hash: `cc8f9a2fa0e348f022931e5a0d03b8fac5a58ad3c16643d4a6e4dfa1515fe24d`)
- **Editorial Defect in v1:** Lexical pleonasm `external legal attorneys` (attorneys are inherently legal). Additionally, the distractor rationale for Option (C) `reviewed` incorrectly claimed that `Are the attorneys reviewed...?` formed a valid passive clause, which was inaccurate in context because the clause governs an active direct object (*the revised acquisition agreement*).
- **Editorial Remediation in v2:** Streamlined the noun phrase to `external attorneys`. Revised Option (C) distractor rationale to correctly explain that the past participle cannot follow auxiliary *Are* when governing an active direct object in an active continuous interrogative. Preserved `reviewing` (Option B).

```diff
- Stem: Are the external legal attorneys currently _______ the revised acquisition agreement to ensure all antitrust regulations are satisfied?
+ Stem: Are the external attorneys currently _______ the revised acquisition agreement to ensure all antitrust regulations are satisfied?
  Option (A): review
  Option (B): reviewing [CORRECT]
- Option (C) Rationale: "Reviewed forms a passive structure which is grammatically possible but makes no sense."
+ Option (C) Rationale: "Past participle form cannot follow auxiliary 'Are' to govern an active direct object ('the revised acquisition agreement') in an active question."
  Option (D): reviews
```

### 3.4 U03-P07-CON-LOGISTICS (Collocation Naturalness)
- **Root Question ID:** `d776aaa1-e16d-4874-8f6a-8ad709c4795e`
- **Previous Record (v1):** `c327dd92-8b96-47bf-9587-ae155c6327a0` (Hash: `f7eff6c2...`)
- **New Record (v2):** `b9153c4f-38b4-458c-85fc-51813b49d7f9` (Hash: `976d834f4d17bd21ebe4ff539604e14430fd7e70b3fea8a7dd540341a05aaf56`)
- **Editorial Defect in v1:** Used the less natural business preposition `via air courier`.
- **Editorial Remediation in v2:** Upgraded to the standard ETS corporate collocation `by air courier`, mirroring the parallel prepositional phrase `by cargo train` in the opening clause. Preserves the contrast between routine (`transports`) and temporary exception (`is dispatching`, Option B).

```diff
- Stem: ... but this week it _______ urgent shipments via air courier to prevent assembly line delays.
+ Stem: ... but this week it _______ urgent shipments by air courier to prevent assembly line delays.
  Option (A): dispatches
  Option (B): is dispatching [CORRECT]
  Option (C): dispatched
  Option (D): dispatch
```

---

## 4. Pipeline Validation & Blind Critic Evaluation

All 4 Version 2 items were executed through the complete validation pipeline prior to persistence.

### 4.1 Deterministic Quality Gates (Stages 6–12)
| Candidate | Stage 6 (Schema) | Stage 7 (Answer Key) | Stage 8 (Distractors) | Stage 9 (Explanations) | Stage 10 (Boundary) | Stage 11 (Diversity Min $D_{ctx}$) | Stage 12 (Difficulty) | Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **U03-P03 (v2)** | PASS | PASS (B) | PASS | PASS | PASS | PASS ($0.790 \ge 0.50$) | PASS (Medium) | **ACCEPTED** |
| **U03-P05 (v2)** | PASS | PASS (C) | PASS | PASS | PASS | PASS ($0.630 \ge 0.50$) | PASS (Medium) | **ACCEPTED** |
| **U03-P06 (v2)** | PASS | PASS (B) | PASS | PASS | PASS | PASS ($0.804 \ge 0.50$) | PASS (Medium) | **ACCEPTED** |
| **U03-P07 (v2)** | PASS | PASS (B) | PASS | PASS | PASS | PASS ($0.786 \ge 0.50$) | PASS (Hard) | **ACCEPTED** |

*Note on Stage 11 Diversity:* In accordance with versioning principles, the diversity evaluation pool for Version 2 items excluded prior versions of the same root question, ensuring that the contextual distance calculation accurately measured semantic and lexical separation against all other distinct questions in the bank ($D_{ctx} \in [0.630, 0.804]$).

### 4.2 Independent Batch Blind Critic (Stage 13)
The 4 revised items were submitted in a single blind prompt to Gemini Free Tier (`gemini-3-flash-preview`) with no answer keys or rationales:

| Candidate | Target Key | Critic Solved Key | Agreement | Single Defensible Key | Naturalness Score | Distractor Quality | Critic Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **U03-P03 (v2)** | **B** | **B** | **100%** | **Yes** | **5.0 / 5.0** | High | **PASS** |
| **U03-P05 (v2)** | **C** | **C** | **100%** | **Yes** | **4.8 / 5.0** | High | **PASS** |
| **U03-P06 (v2)** | **B** | **B** | **100%** | **Yes** | **5.0 / 5.0** | High | **PASS** |
| **U03-P07 (v2)** | **B** | **B** | **100%** | **Yes** | **5.0 / 5.0** | High | **PASS** |

The blind critic reached **100% unanimous agreement** on all designated keys, confirmed zero dual-defensible keys, and rated naturalness at an exceptional **4.8 to 5.0 / 5.0**.

---

## 5. Staging Database Census & Isolation Verification

### 5.1 Question Bank Census Reconciliation
```
Baseline Census (Pre-Stage 14):           49 records
  - Approved:                             12 records
  - Validated:                            28 records
  - Archived:                              5 records
  - Withdrawn:                             4 records

Stage 14 Operations:
  - Unchanged Items Accepted:              4 records (U03-P01, P02, P04, P08 updated with reviewNotes)
  - Version 2 Insertions:                 +4 records (U03-P03, P05, P06, P07 as new immutable v2 rows)

Post-Revision Staging Census:             53 records
  - Approved (isLatestApproved = true):   12 records (100% INVARIANT — Unit 1 only)
  - Validated:                            32 records (20 legacy + 8 Unit 3 v1 + 4 Unit 3 v2)
  - Archived:                              5 records
  - Withdrawn:                             4 records
```

### 5.2 Unit 3 Bank Lineage Verification
Unit 3 now contains exactly **12 items** spanning **8 distinct root questions**:
- **4 Single-Version Roots (v1 Accepted):**
  1. `U03-P01`: `841b8fe2-5d55-492f-9386-667ab8f38e57` (root: `868f3018...`, v1)
  2. `U03-P02`: `f691db84-18ef-49b3-a65b-49b4ac6e05ff` (root: `f138af1c...`, v1)
  3. `U03-P04`: `d2574e34-16f1-43de-aa40-ea87bb1ba478` (root: `9afdfa8c...`, v1)
  4. `U03-P08`: `2e221f4f-e874-43ff-a7c7-aafe1a619995` (root: `fe746829...`, v1)
- **4 Dual-Version Roots (v1 Preserved + v2 Persisted):**
  5. `U03-P03`: v1 `c4fecf7a...` | v2 `75f17a6c-94f8-47a8-927a-068d87b9c6f8` (root: `57089cab...`)
  6. `U03-P05`: v1 `93eeddcf...` | v2 `b4b7b92c-c35b-41d8-b0f8-0205c4991393` (root: `40a95b3a...`)
  7. `U03-P06`: v1 `8989cbc6...` | v2 `c077b1ac-c8cb-45f8-b66b-c84189853473` (root: `74ed2b1a...`)
  8. `U03-P07`: v1 `c327dd92...` | v2 `b9153c4f-38b4-458c-85fc-51813b49d7f9` (root: `d776aaa1...`)

### 5.3 Zero Practice Retrieval Leakage
```sql
SELECT COUNT(*) FROM "toeic_question_bank_items" 
WHERE "unit_number" = 3 AND "review_status" = 'approved' AND "is_latest_approved" = true;
-- RESULT: 0
```
Practice retrieval strictly returns **0 items** for Unit 3.

### 5.4 Historical Telemetry Invariance
All historical telemetry tables remain untouched:
- `exercise_attempts`: **2** records
- `question_attempt_items`: **5** records (2 exercise submission, 3 TOEIC practice)
- `toeic_practice_sessions`: **10** records
- `toeic_practice_items`: **15** records (10 bank-linked, 5 dynamic)

---

## 6. Financial & Repository Safety Invariants

1. **Google Cloud Billing:** Zero billable requests were initiated. All critic calls ran under the Google AI Studio Free Tier rate limits. Total invoiced cost: **$0.00 USD**.
2. **Canonical Data Integrity:** The canonical repository at `/Users/kd.quach03/Documents/grammarpath-data` on branch `main` is completely untouched and clean (`git status` reports working tree clean).
3. **Database Guard:** All migrations, queries, and writes occurred strictly on Neon staging (`grammarpath-staging`). No production databases exist or were accessed.

---

## 7. Editorial Recommendations & Next Steps

All 8 Unit 3 pilot items are now in their final, editorially refined state:
- **4 candidates:** Original Version 1 (`U03-P01`, `U03-P02`, `U03-P04`, `U03-P08`)
- **4 candidates:** Remediated Version 2 (`U03-P03`, `U03-P05`, `U03-P06`, `U03-P07`)

### Recommendation
1. **Maintain Staging Hold:** Keep all 8 active candidates in `reviewStatus = "validated"` and `isLatestApproved = false`.
2. **Promotion Gate:** When the user explicitly authorizes production promotion (Phase 3.4C.4B.6 / Final Approval):
   - Promote `U03-P01` (v1), `U03-P02` (v1), `U03-P04` (v1), and `U03-P08` (v1) to `reviewStatus = "approved"`, `isLatestApproved = true`.
   - Promote `U03-P03` (v2), `U03-P05` (v2), `U03-P06` (v2), and `U03-P07` (v2) to `reviewStatus = "approved"`, `isLatestApproved = true`.
   - Mark the four superseded v1 records (`U03-P03` v1, `U03-P05` v1, `U03-P06` v1, `U03-P07` v1) as `reviewStatus = "archived"`, ensuring their historical provenance remains permanently intact.

