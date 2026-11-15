# GrammarPath — Phase 3.4C.4B.1: Version 3 Authoring Audit Report
## Linguistic, Syntactic, and Cryptographic Audit of Four New Candidate Bank Items

**Author:** Antigravity (Assessment Specialist & Lead Author)  
**Milestone:** Phase 3.4C.4B.1 (Approved Item Remediation & Version 3 Authoring)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Items Created:** 4 Records (Version 3 for Roots `3d71c0d1`, `6a54a874`, `0fda8409`, `634add4d`)  
**Editorial Status:** `validated` (UNAPPROVED CANDIDATE INVENTORY)  

---

## 1. Executive Summary & Authoring Protocol

In accordance with Phase 3.4C.4A editorial blueprints, four new Version 3 records were created in `toeic_question_bank_items` on Neon staging. 

### Mandatory Authoring Invariants Honored:
- [x] Version Lineage Preserved: All 4 items link to their canonical `root_question_id` with `version = 3`.
- [x] Zero Overwrites: Version 1 and Version 2 records remain completely preserved in the database.
- [x] Subject-Verb Agreement: Explicit agreement verified across singular and plural subjects.
- [x] Verb-Object Collocation: Natural, authentic business collocations verified.
- [x] Distractor Plausibility: Distractors target authentic learner error archetypes.
- [x] Concept Alignment: Mapped to `unit.001` (`Present continuous (I am doing)`) with confidence 1.00.
- [x] Contextual Independence: Pairwise $D_{\text{ctx}} \ge 0.50$ against existing items.
- [x] Unapproved Editorial State: All 4 items are strictly in `validated` review status with `is_latest_approved = false`.

---

## 2. Granular Record Audit (Four Version 3 Items)

### Item 1: `048df761-7f70-4249-b4f1-f075a87c9432` (Root `3d71c0d1`)
- **Root Question ID:** `3d71c0d1-6a2d-498a-b6f2-c5abad85657e` | **Version:** 3
- **Review Status:** `validated` | **isLatestApproved:** `false`
- **Unit Number:** 1 | **Concept:** `unit.001` (`Present continuous (I am doing)`)
- **Rule Reference:** Unit 1.B (Temporary situations / activities happening around now)
- **Workplace Domain:** `finance_accounting` | **Difficulty:** `medium`
- **Prompt:**
  > `"The chief financial officer is currently unavailable because she _______ the quarterly audit report with external consultants."`
- **Options Audit:**
  - `[A]` `reviews` (isCorrect: false) — Distractor: Habitual simple present conflicts with *"currently"*.
  - `[B]` `is reviewing` (isCorrect: true) — Single unambiguous key. 3rd-person singular *"she"* + auxiliary *"is"* + participle *"reviewing"*.
  - `[C]` `reviewed` (isCorrect: false) — Distractor: Completed past conflicts with *"currently"*.
  - `[D]` `was reviewing` (isCorrect: false) — Distractor: Past continuous conflicts with *"is unavailable"*.
- **Explanation:** *"The adverb 'currently' and the main clause 'is unavailable' indicate an ongoing activity taking place around the present time (Unit 1.B). The singular subject 'she' requires the present continuous structure 'is reviewing' (be + -ing). Simple present 'reviews' describes habitual facts, while past forms 'reviewed' and 'was reviewing' contradict the present time frame."*
- **Content Hash:** `44515ff81b4d0228b97443d76eabaf809a6ece88a309d15138ae951d9d7df6cd`
- **Source:** `curated_expert` | **Source Reference:** `"Editorial authoring v3: Blueprint Root 3d71c0d1 (Finance / Audit)"`

---

### Item 2: `add7a35b-e014-4747-82af-ef0d1239ee51` (Root `6a54a874`)
- **Root Question ID:** `6a54a874-c48b-4651-a3f5-b686dd51fb6b` | **Version:** 3
- **Review Status:** `validated` | **isLatestApproved:** `false`
- **Unit Number:** 1 | **Concept:** `unit.001` (`Present continuous (I am doing)`)
- **Rule Reference:** Unit 1.A (Action happening at moment of speaking, plural subject agreement)
- **Workplace Domain:** `logistics_shipping` | **Difficulty:** `medium`
- **Prompt:**
  > `"At the container terminal, customs officers _______ the cargo manifests right now before authorizing ship clearance."`
- **Options Audit:**
  - `[A]` `are inspecting` (isCorrect: true) — Single unambiguous key. Plural subject *"customs officers"* + auxiliary *"are"* + participle *"inspecting"*.
  - `[B]` `inspect` (isCorrect: false) — Distractor: Simple present routine incompatible with *"right now"*.
  - `[C]` `inspected` (isCorrect: false) — Distractor: Past tense incompatible with *"right now"*.
  - `[D]` `have inspected` (isCorrect: false) — Distractor: Present perfect does not denote action in progress.
- **Explanation:** *"The time expression 'right now' signals that the action is occurring at the moment of speaking (Unit 1.A). The plural noun phrase 'customs officers' serves as the subject, requiring the plural present continuous auxiliary 'are' followed by the -ing form 'inspecting'. The simple present 'inspect' expresses habitual procedure, while past and perfect forms do not convey an active ongoing inspection."*
- **Content Hash:** `f3823698acd2b61d4628fecd510c918b277b81484f8dbb1f807eba4ec32bf064`
- **Source:** `curated_expert` | **Source Reference:** `"Editorial authoring v3: Blueprint Root 6a54a874 (Logistics / Port Customs)"`

---

### Item 3: `a4229728-763b-4b22-8bb9-6436a0ffba76` (Root `0fda8409`)
- **Root Question ID:** `0fda8409-0926-49c0-8b86-1564d83497ac` | **Version:** 3
- **Review Status:** `validated` | **isLatestApproved:** `false`
- **Unit Number:** 1 | **Concept:** `unit.001` (`Present continuous (I am doing)`)
- **Rule Reference:** Unit 1.A (Moment of speaking, spatial movement)
- **Workplace Domain:** `corporate_management` | **Difficulty:** `easy`
- **Prompt:**
  > `"The facility supervisor is not at the front desk because he _______ the executive conference suite right now."`
- **Options Audit:**
  - `[A]` `is entering` (isCorrect: true) — Single unambiguous key. Singular subject *"he"* pairs with *"is entering"*. Transitive verb *"enter"* naturally collocates with a physical room (*"the executive conference suite"*), resolving the defective v2 (*"entering hardware"*).
  - `[B]` `enters` (isCorrect: false) — Distractor: Simple present denotes habit or timetable.
  - `[C]` `entered` (isCorrect: false) — Distractor: Past tense incompatible with *"right now"*.
  - `[D]` `enter` (isCorrect: false) — Distractor: Agreement error (bare infinitive with singular *"he"*).
- **Explanation:** *"The clause 'because he ... right now' explains a present action taking place at the moment of speaking (Unit 1.A). The singular subject 'he' pairs with 'is entering'. Unlike the flawed Version 2 ('entering hardware'), 'enter' here naturally collocates with a physical room ('the executive conference suite')."*
- **Content Hash:** `4e9543d061b169051781cf2b37b5cc85e17028ef24c3837b022644f8e65049e9`
- **Source:** `curated_expert` | **Source Reference:** `"Editorial authoring v3: Blueprint Root 0fda8409 (Corporate Facility)"`

---

### Item 4: `8a41b01a-1c9b-4072-a584-86387d7e6f97` (Root `634add4d`)
- **Root Question ID:** `634add4d-5982-4de8-99de-6c4561c6ee44` | **Version:** 3
- **Review Status:** `validated` | **isLatestApproved:** `false`
- **Unit Number:** 1 | **Concept:** `unit.001` (`Present continuous (I am doing)`)
- **Rule Reference:** Unit 1.B (Temporary workplace activity)
- **Workplace Domain:** `human_resources` | **Difficulty:** `easy`
- **Prompt:**
  > `"The training coordinator is not at her desk because she _______ the revised safety guidelines to new employees right now."`
- **Options Audit:**
  - `[A]` `explains` (isCorrect: false) — Distractor: Habitual routine, not an immediate explanation.
  - `[B]` `is explaining` (isCorrect: true) — Single unambiguous key. Speech-act verb *"explain"* naturally selects an informational topic (*"the revised safety guidelines"*) and listeners (*"to new employees"*), resolving the defective v2 (*"explaining hardware"*).
  - `[C]` `explained` (isCorrect: false) — Distractor: Past tense conflicts with *"right now"*.
  - `[D]` `explain` (isCorrect: false) — Distractor: Agreement failure with 3rd-person singular *"she"*.
- **Explanation:** *"The immediate time indicator 'right now' requires the present continuous 'is explaining' (Unit 1.B). The verb 'explain' naturally selects an informational topic ('the revised safety guidelines') as its direct object, completely resolving the semantic anomaly present in Version 2 ('explaining hardware')."*
- **Content Hash:** `79aa79ddd5d1635904c97d0130dae52910d60cb371ee37600ef1563e532ae03b`
- **Source:** `curated_expert` | **Source Reference:** `"Editorial authoring v3: Blueprint Root 634add4d (HR Compliance Training)"`

---

## 3. Pairwise Diversity Metrics Against Active Bank Items

We calculated pairwise distance $D_{\text{ctx}} = 1 - S_{\text{carrier}}$ using `ContextualDiversityService` between the four Version 3 items and the retained approved item `45e751fd`:

```
┌──────────────────────────────────────┬──────────┬──────────┬───────────────────────────┐
│ Pair Description                     │ S_carrier│ D_ctx    │ Relationship              │
├──────────────────────────────────────┼──────────┼──────────┼───────────────────────────┤
│ (45e751fd Server, 048df761 CFO Audit)│ 0.227    │ 0.773    │ SAME_RULE_NOVEL_CONTEXT   │
│ (45e751fd Server, add7a35b Customs)  │ 0.177    │ 0.823    │ SAME_RULE_NOVEL_CONTEXT   │
│ (45e751fd Server, a4229728 Facility) │ 0.427    │ 0.573    │ SAME_RULE_NOVEL_CONTEXT   │
│ (45e751fd Server, 8a41b01a HR Train) │ 0.366    │ 0.634    │ SAME_RULE_NOVEL_CONTEXT   │
│ (048df761 CFO Audit, add7a35b Customs│ 0.149    │ 0.851    │ SAME_RULE_NOVEL_CONTEXT   │
│ (048df761 CFO Audit, a4229728 Facil.)│ 0.200    │ 0.800    │ SAME_RULE_NOVEL_CONTEXT   │
│ (048df761 CFO Audit, 8a41b01a HR Tr.)│ 0.223    │ 0.777    │ SAME_RULE_NOVEL_CONTEXT   │
│ (add7a35b Customs, a4229728 Facility)│ 0.161    │ 0.839    │ SAME_RULE_NOVEL_CONTEXT   │
│ (add7a35b Customs, 8a41b01a HR Train)│ 0.165    │ 0.835    │ SAME_RULE_NOVEL_CONTEXT   │
│ (a4229728 Facility, 8a41b01a HR Train│ 0.356    │ 0.644    │ SAME_RULE_NOVEL_CONTEXT   │
└──────────────────────────────────────┴──────────┴──────────┴───────────────────────────┘
```

**All pairwise distances exceed the threshold $\tau = 0.500$.** Every Version 3 item represents an independent workplace context.

