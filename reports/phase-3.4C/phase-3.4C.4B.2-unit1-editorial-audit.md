# GrammarPath — Phase 3.4C.4B.2: Unit 1 Editorial Audit Report
## Comprehensive Linguistic, Distractor, and Pedagogical Audit of Seven Existing Candidates and One Retained Approved Item

**Author:** Antigravity (Principal Learning Engineer, Educational Data Scientist, & Assessment Specialist)  
**Milestone:** Phase 3.4C.4B.2 (Unit 1 Editorial Approval & Question Bank Activation)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Scope:** 7 Existing Candidate Items + 1 Retained Approved Item (`45e751fd`)  
**Target Unit / Concept:** Unit 1 — Present Continuous (`unit.001`)  
**Editorial Authority:** `owner-editorial-board`  

---

## 1. Executive Summary

This report documents the rigorous editorial audit conducted on the 7 existing candidate items and 1 retained approved item for Unit 1 (`unit.001`: *Present continuous (I am doing)*) in the GrammarPath TOEIC Question Bank. 

Following the audit criteria established in Phase 3.4C.4A and the isolation protocols established in Phase 3.4C.4A.1, each item has been evaluated across four dimensions:
1. **Linguistic Accuracy & Authenticity:** Grammatical flawlessness, natural workplace syntax, idiomatic vocabulary, and lack of synthetic awkwardness.
2. **Key Unambiguity:** Presence of exactly one unambiguously correct answer under standard business English norms.
3. **Distractor Diagnostic Value:** Plausible foils representing distinct pedagogical error classes (e.g., tense confusion, aspect error, subject-verb agreement failure).
4. **Concept Mapping & Rule Alignment:** Strict mapping to Unit 1 sub-rules (1.A, 1.B, 1.C, 1.E) from *English Grammar in Use*.

All 7 candidates and the retained approved item passed all editorial criteria. The retained item `45e751fd` received an updated, pedagogy-focused explanation to replace its legacy placeholder.

---

## 2. Inventory Overview: 7 Candidates + 1 Retained Approved Item

| Item ID (Short) | Root ID (Short) | Ver | Diff | EGU Rule | Workplace Domain | Target Grammatical Phenomenon | Editorial Verdict |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| `b7c4793c` | `35f70d43` | v1 | med | Unit 1.E | `marketing_sales` | Gradual development (*grow steadily this quarter*) | **APPROVED** |
| `c46da3b7` | `3dc27726` | v1 | med | Unit 1.C | `corporate_management` | Temporary situation today (*are debating*) | **APPROVED** |
| `0f51d836` | `4a75a575` | v1 | med | Unit 1.B | `marketing_sales` | Action around now (*is calling client*) | **APPROVED** |
| `2afc939e` | `7a347a67` | v1 | med | Unit 1.A | `finance_accounting` | Action at moment of speech (*is conducting review right now*) | **APPROVED** |
| `2997562b` | `8c00e8d7` | v1 | hard | Unit 1.E | `manufacturing_production` | Changing trend (*is incorporating more and more*) | **APPROVED** |
| `7a3359ae` | `ac251f52` | v1 | hard | Unit 1.C | `corporate_management` | Pre-arranged temporary event (*is meeting foreign reps*) | **APPROVED** |
| `322c0e5c` | `bf8e0dc4` | v1 | hard | Unit 1.B | `logistics_shipping` | Temporary situation these weeks (*are experiencing delays*) | **APPROVED** |
| `45e751fd` | `b19ebb8c` | v2 | easy | Unit 1.A | `it_technology` | Action at moment of speech (*is repairing server right now*) | **RETAINED & ENRICHED** |

---

## 3. Detailed Item Audits (7 Existing Candidates)

### Item 1: `b7c4793c-ba61-4ae6-92e2-74096f6a8557` (Root `35f70d43`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.E — Changing or developing situations (*get, change, become, increase, rise, grow*)
- **Workplace Domain:** `marketing_sales`
- **Assigned Difficulty:** `medium`
- **Prompt:**
  > `"According to the corporate announcement, our international market share _______ steadily this quarter."`
- **Options & Analysis:**
  - `[A] grew` (Distractor) — Simple past indicates completed event; conflicts with the open timeframe marker *"this quarter"*.
  - `[B] grows` (Distractor) — Simple present expresses habitual general truth; fails to convey active dynamic quarterly growth.
  - `[C] is growing` (**CORRECT**) — 3rd-person singular agreement (*"international market share"* $\to$ *"is"*) + present participle (*"growing"*), expressing ongoing change/progression.
  - `[D] was grown` (Distractor) — Passive past structure; grammatically and semantically erroneous for intransitive growth.
- **Pedagogical Assessment:**
  - Evaluates learner ability to differentiate between simple present (static/habitual) and present continuous (dynamic change around the current period).
  - Authentic business collocation: *market share grows steadily*.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 2: `c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c` (Root `3dc27726`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.C — Periods around the present (*today, this week, this season*)
- **Workplace Domain:** `corporate_management`
- **Assigned Difficulty:** `medium`
- **Prompt:**
  > `"Why _______ so many employees _______ over the recent changes to the annual leave policy today?"`
- **Options & Analysis:**
  - `[A] do / debate` (Distractor) — Simple present interrogative; denotes permanent routine rather than active discourse triggered *"today"*.
  - `[B] are / debating` (**CORRECT**) — Present continuous interrogative split: auxiliary *"are"* agrees with plural subject *"so many employees"*, followed by participle *"debating"*, matching the time frame *"today"*.
  - `[C] have / debated` (Distractor) — Present perfect; focuses on completed experience rather than ongoing debate occurring *"today"*.
  - `[D] were / debating` (Distractor) — Past continuous; conflicts with the present temporal anchor *"today"*.
- **Pedagogical Assessment:**
  - Evaluates question formation syntax with split auxiliary/verb and plural subject agreement.
  - Authentic corporate scenario: HR policy revision discussion.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 3: `0f51d836-b360-4423-b19e-71ea358be557` (Root `4a75a575`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.B — Temporary action happening around now / moment of speaking
- **Workplace Domain:** `marketing_sales`
- **Assigned Difficulty:** `medium`
- **Prompt:**
  > `"Please speak quietly in the lobby because the marketing director _______ an important client on the phone."`
- **Options & Analysis:**
  - `[A] is calling` (**CORRECT**) — Imperative introductory clause (*"Please speak quietly in the lobby"*) establishes immediate acoustic constraint at speech time; singular subject *"the marketing director"* requires *"is calling"*.
  - `[B] calls` (Distractor) — Simple present routine; nonsensical justification for an immediate imperative quiet request.
  - `[C] called` (Distractor) — Simple past completed action; cannot justify quietness in the present.
  - `[D] was calling` (Distractor) — Past continuous; incompatible with present imperative.
- **Pedagogical Assessment:**
  - Tests contextual pragmatic deduction where the situation itself (imperative cue) demands continuous aspect.
  - Clean TOEIC Part 5 structure.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 4: `2afc939e-9d24-40d8-98c3-75a198006930` (Root `7a347a67`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.A — Action happening at the moment of speaking
- **Workplace Domain:** `finance_accounting`
- **Assigned Difficulty:** `medium`
- **Prompt:**
  > `"Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now."`
- **Options & Analysis:**
  - `[A] conducts` (Distractor) — Simple present habitual; incompatible with explicit instantaneous time marker *"right now"*.
  - `[B] is conducting` (**CORRECT**) — Singular subject *"Ms. Patterson"* + auxiliary *"is"* + present participle *"conducting"*. Perfectly aligns with *"right now"*.
  - `[C] conducted` (Distractor) — Simple past; conflicts directly with *"right now"*.
  - `[D] has conducted` (Distractor) — Present perfect; expresses completion/result, incompatible with simultaneous ongoing conference room session.
- **Pedagogical Assessment:**
  - Classic TOEIC Part 5 item testing aspect selection with explicit time adjunct (*"right now"*).
  - Business collocations: *conduct a financial review*, *quarterly review*.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 5: `2997562b-8ae1-4e19-8dd2-f110d41865e0` (Root `8c00e8d7`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.E — Trends and gradual transitions (*more and more*)
- **Workplace Domain:** `manufacturing_production`
- **Assigned Difficulty:** `hard`
- **Prompt:**
  > `"Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly."`
- **Options & Analysis:**
  - `[A] incorporates` (Distractor) — Simple present; fails to capture the progressive transition signified by *"more and more"*.
  - `[B] is incorporating` (**CORRECT**) — Singular collective noun phrase *"the automotive manufacturing plant"* takes *"is incorporating"*; correctly matches the comparative progressive construction (*"more and more automated robotic units"*).
  - `[C] has incorporated` (Distractor) — Present perfect; expresses completed state rather than progressive ongoing adoption.
  - `[D] incorporate` (Distractor) — Subject-verb agreement failure (plural verb with singular subject).
- **Pedagogical Assessment:**
  - High diagnostic value for advanced TOEIC learners (650+). Recognizes the *more and more* progressive gradient marker described in Unit 1.E.
  - Authentic industrial manufacturing vocabulary.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 6: `7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83` (Root `ac251f52`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.C — Temporary ongoing arrangement around the current period
- **Workplace Domain:** `corporate_management`
- **Assigned Difficulty:** `hard`
- **Prompt:**
  > `"Our executive committee _______ foreign representatives all afternoon to negotiate the cross-border merger terms."`
- **Options & Analysis:**
  - `[A] meets` (Distractor) — Simple present; describes general schedule or recurring habit, inappropriate for an intensive duration marker (*"all afternoon"*).
  - `[B] is meeting` (**CORRECT**) — Collective singular subject *"Our executive committee"* treated as an institutional unit taking singular *"is meeting"*; duration adjunct *"all afternoon"* reinforces continuous activity.
  - `[C] has met` (Distractor) — Present perfect; implies meeting has already finished, clashing with the ongoing purpose infinitive clause (*"to negotiate..."*).
  - `[D] meet` (Distractor) — Agreement violation under standard American/TOEIC business usage for singular committee entity.
- **Pedagogical Assessment:**
  - High-tier item testing collective noun treatment and continuous aspect with extended present duration (*all afternoon*).
  - Executive M&A context.
- **Editorial Decision:** **APPROVED** without modification.

---

### Item 7: `322c0e5c-d12b-4617-b88d-cace81c8e545` (Root `bf8e0dc4`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.B / 1.C — Temporary situation around now (*these weeks / these days*)
- **Workplace Domain:** `logistics_shipping`
- **Assigned Difficulty:** `hard`
- **Prompt:**
  > `"Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty."`
- **Options & Analysis:**
  - `[A] experience` (Distractor) — Simple present; conveys permanent or chronic state, conflicting with the temporary qualifier *"these weeks"*.
  - `[B] are experiencing` (**CORRECT**) — Plural subject *"Our overseas logistics hubs"* takes plural auxiliary *"are"*; continuous participle *"experiencing"* denotes a temporary ongoing condition governed by *"these weeks"*.
  - `[C] experienced` (Distractor) — Simple past; conflicts with the open deictic time marker *"these weeks"*.
  - `[D] experiences` (Distractor) — Subject-verb agreement failure (singular verb with plural subject).
- **Pedagogical Assessment:**
  - Demonstrates mastery of temporary vs permanent aspect (EGU Unit 1.B/1.C distinction against Unit 2).
  - Authentic supply-chain / international logistics context.
- **Editorial Decision:** **APPROVED** without modification.

---

## 4. Retained Approved Item Audit & Explanation Enrichment

### Retained Item: `45e751fd-4915-4bac-a386-c7bae5295911` (Root `b19ebb8c`)
- **Unit & Concept:** Unit 1 | `unit.001` (*Present continuous*)
- **EGU Rule:** Unit 1.A — Action at the moment of speaking
- **Workplace Domain:** `it_technology`
- **Assigned Difficulty:** `easy`
- **Prompt:**
  > `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Options & Analysis:**
  - `[A] repairs` (Distractor) — Simple present habitual; incompatible with *"right now"*.
  - `[B] is repairing` (**CORRECT**) — Singular subject *"he"* + auxiliary *"is"* + transitive participle *"repairing"* taking physical direct object *"the server hardware"*.
  - `[C] repaired` (Distractor) — Simple past; incompatible with *"is not at his desk"* and *"right now"*.
  - `[D] repair` (Distractor) — Bare infinitive / agreement error.
- **Legacy Flaw Identified:**
  - The item prompt and options were sound, but its explanation field contained an informal placeholder (*"Cập nhật giải thích chi tiết hơn cho người học."*).
- **Editorial Enrichment Applied in Transaction:**
  > *"The immediate time indicator 'right now' signals that the action is taking place at the moment of speaking (Unit 1.A). The third-person singular subject 'he' requires the auxiliary 'is' followed by the present participle 'repairing'. Simple present 'repairs' expresses habitual routine, while past tense 'repaired' contradicts 'right now'."*
- **Editorial Decision:** **RETAINED AS APPROVED**; explanation successfully updated to canonical pedagogical standard.

---

## 5. Summary of Editorial Quality & Coverage

1. **Answer Key Correctness:** 8 of 8 items exhibit exactly one grammatically valid, idiomatic correct key. No ambiguity, typo, or dual-correctness found.
2. **Distractor Ecology:** Every distractor maps cleanly to standard learner misconceptions:
   - Simple present confusion (failure to detect continuous aspect cues): 8 instances.
   - Past tense confusion (failure to process deictic time anchors): 7 instances.
   - Agreement errors (morphosyntactic failure): 4 instances.
   - Passive / perfective confusion: 3 instances.
3. **Sub-rule Balance:**
   - Unit 1.A: 2 items (`2afc939e`, `45e751fd`)
   - Unit 1.B: 2 items (`0f51d836`, `322c0e5c`)
   - Unit 1.C: 2 items (`c46da3b7`, `7a3359ae`)
   - Unit 1.E: 2 items (`b7c4793c`, `2997562b`)
4. **Conclusion:** All 7 candidates and the retained approved item satisfy the strictest pedagogical and psychometric standards for TOEIC Part 5 assessment.

