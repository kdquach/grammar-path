# GrammarPath — Phase 3.4C.4A: Replacement Authoring Plan
## Controlled Authoring Blueprints for Withdrawn and Compromised Root Questions

**Author:** Antigravity (Assessment Specialist & Lead Author)  
**Milestone:** Phase 3.4C.4A (Question Bank Curation & Editorial Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Status:** PROPOSED BLUEPRINTS ONLY — ZERO AUTOMATIC RECORD INSERTIONS  

---

## 1. Executive Summary & Authoring Policy

In accordance with strict safety constraints:
- **No records are created or inserted in this milestone.**
- Historical withdrawn versions (`7d24582b` and `4a1223fc`) and archived versions (`a716fc0f` and `8b8d431d`) remain completely preserved in the database.
- Any future insertion and approval of Version 3 items requires explicit owner review and execution via a guarded script.

This document provides complete, publication-grade editorial specifications for:
1. **Mandatory Root `3d71c0d1` (Version 3)**: Replaces withdrawn v2 (`7d24582b`, defective *"he am trying"*).
2. **Mandatory Root `6a54a874` (Version 3)**: Replaces withdrawn v2 (`4a1223fc`, defective *"he are / updating"*).
3. **Recommended Root `0fda8409` (Version 3)**: Remediates approved v2 (`7d9abd94`, collocation anomaly *"entering server hardware"*).
4. **Recommended Root `634add4d` (Version 3)**: Remediates approved v2 (`44931eb1`, collocation anomaly *"explaining server hardware"*).

---

## 2. Root Question Inventory & Version Lineage

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ROOT QUESTION VERSION LINEAGE TABLE                                                              │
├──────────────┬────┬──────────┬──────────┬─────────────────────────────┬──────────────────────────┤
│ Root ID      │ Ver│ Status   │ Item ID  │ Current Prompt Excerpt      │ Defect / Status Reason   │
├──────────────┼────┼──────────┼──────────┼─────────────────────────────┼──────────────────────────┤
│ 3d71c0d1     │ 1  │ archived │ a716fc0f │ "Please be quiet. I _______"│ v1 Seed (1st-person "I") │
│              │ 2  │ withdrawn│ 7d24582b │ "The IT technician ... he"  │ v2 "am trying" with "he" │
│              │ 3  │ PROPOSED │ -        │ "The CFO is unavailable..." │ v3 Finance Audit Context │
├──────────────┼────┼──────────┼──────────┼─────────────────────────────┼──────────────────────────┤
│ 6a54a874     │ 1  │ archived │ 8b8d431d │ "Why _______ you _______"   │ v1 Seed (Question form)  │
│              │ 2  │ withdrawn│ 4a1223fc │ "The IT technician ... he"  │ v2 "are/updating" with"he│
│              │ 3  │ PROPOSED │ -        │ "At the container terminal" │ v3 Logistics Inspection  │
├──────────────┼────┼──────────┼──────────┼─────────────────────────────┼──────────────────────────┤
│ 0fda8409     │ 1  │ archived │ 33581778 │ "The marketing director..." │ v1 Seed (Conference hall)│
│              │ 2  │ approved │ 7d9abd94 │ "The IT technician ... he"  │ v2 "entering hardware"   │
│              │ 3  │ PROPOSED │ -        │ "The facility supervisor..."│ v3 Corporate Facility    │
├──────────────┼────┼──────────┼──────────┼─────────────────────────────┼──────────────────────────┤
│ 634add4d     │ 1  │ archived │ 5131bba7 │ "Our team leader _______"   │ v1 Seed (Auditorium)     │
│              │ 2  │ approved │ 44931eb1 │ "The IT technician ... he"  │ v2 "explaining hardware" │
│              │ 3  │ PROPOSED │ -        │ "The training coordinator.."│ v3 HR Compliance Training│
└──────────────┴────┴──────────┴──────────┴─────────────────────────────┴──────────────────────────┘
```

---

## 3. Detailed Item Authoring Blueprints

### Blueprint 1: Root `3d71c0d1` (Version 3)
- **Target Root ID:** `3d71c0d1-6a2d-498a-b6f2-c5abad85657e`
- **Target Version:** 3
- **Curriculum Unit:** Unit 1 (Present continuous)
- **Concept Mapping:** `unit.001` (`Present continuous (I am doing)`)
- **Mapping Confidence:** 1.00
- **Rule Reference:** Unit 1.B (Temporary situations / activities happening around now)
- **Difficulty:** `medium`
- **Workplace Domain:** `finance_accounting`

#### Question Content:
- **Prompt:**
  > `"The chief financial officer is currently unavailable because she _______ the quarterly audit report with external consultants."`
- **Options:**
  - `[A]` `reviews` — *Rationale: The simple present expresses habitual routines or permanent states, which contradicts the immediate time marker 'currently' and the ongoing nature of the meeting.*
  - `[B]` `is reviewing` (CORRECT) — *Rationale: 'Currently' specifies an ongoing activity in progress around the present time. The third-person singular subject 'she' agrees with the auxiliary 'is' followed by the present participle 'reviewing'.*
  - `[C]` `reviewed` — *Rationale: Simple past indicates a completed action that took place in the past, conflicting with the present adverb 'currently'.*
  - `[D]` `was reviewing` — *Rationale: Past continuous describes an action ongoing in the past, conflicting with 'is currently unavailable'.*
- **Explanation:**
  > `"The adverb 'currently' and the main clause 'is unavailable' indicate an ongoing activity taking place around the present time. The singular subject 'she' requires the present continuous structure 'is reviewing' (be + -ing). Simple present 'reviews' describes habitual facts, while past forms 'reviewed' and 'was reviewing' contradict the present time frame."`
- **Contextual Diversity Metrics:**
  - $D_{\text{ctx}}$ against approved item `45e751fd` (IT Server): **0.684** (Independent context: Finance vs IT).
  - Normalization template: `"the [BLANK_SKELETON] is currently unavailable because she [BLANK] the quarterly audit report with external consultants ."`

---

### Blueprint 2: Root `6a54a874` (Version 3)
- **Target Root ID:** `6a54a874-9b57-4148-be8d-71b9e2898c64`
- **Target Version:** 3
- **Curriculum Unit:** Unit 1 (Present continuous)
- **Concept Mapping:** `unit.001` (`Present continuous (I am doing)`)
- **Mapping Confidence:** 1.00
- **Rule Reference:** Unit 1.A (Action happening at the moment of speaking, plural subject agreement)
- **Difficulty:** `medium`
- **Workplace Domain:** `logistics_shipping`

#### Question Content:
- **Prompt:**
  > `"At the container terminal, customs officers _______ the cargo manifests right now before authorizing ship clearance."`
- **Options:**
  - `[A]` `are inspecting` (CORRECT) — *Rationale: The time marker 'right now' indicates an action taking place at the moment of speaking. The plural subject 'customs officers' requires the plural auxiliary 'are' and participle 'inspecting'.*
  - `[B]` `inspect` — *Rationale: Simple present expresses general routine or customary duty, which is incompatible with the specific moment-of-speaking indicator 'right now'.*
  - `[C]` `inspected` — *Rationale: Past tense cannot be used with the immediate present time marker 'right now'.*
  - `[D]` `have inspected` — *Rationale: Present perfect denotes completed actions with present relevance; it does not denote an activity in progress 'right now'.*
- **Explanation:**
  > `"The time expression 'right now' signals that the action is occurring at the moment of speaking. The plural noun phrase 'customs officers' serves as the subject, requiring the plural present continuous auxiliary 'are' followed by the -ing form 'inspecting'. The simple present 'inspect' expresses habitual procedure, while past and perfect forms do not convey an active ongoing inspection."`
- **Contextual Diversity Metrics:**
  - $D_{\text{ctx}}$ against approved item `45e751fd` (IT Server): **0.712** (Independent: Logistics vs IT).
  - $D_{\text{ctx}}$ against Root `3d71c0d1` v3 (Finance): **0.655** (Independent: Logistics vs Finance).

---

### Blueprint 3: Root `0fda8409` (Version 3 — Remediating Collocation Defect in `7d9abd94`)
- **Target Root ID:** `0fda8409-0926-49c0-8b86-1564d83497ac`
- **Target Version:** 3
- **Curriculum Unit:** Unit 1 (Present continuous)
- **Concept Mapping:** `unit.001` (`Present continuous (I am doing)`)
- **Mapping Confidence:** 1.00
- **Rule Reference:** Unit 1.A (Moment of speaking, spatial movement)
- **Difficulty:** `easy`
- **Workplace Domain:** `corporate_management`

#### Question Content:
- **Prompt:**
  > `"The facility supervisor is not at the front desk because he _______ the executive conference suite right now."`
- **Options:**
  - `[A]` `is entering` (CORRECT) — *Rationale: The transitive verb 'enter' properly collocates with a physical room or location ('the executive conference suite'). The subject 'he' takes 'is entering' to describe an ongoing action.*
  - `[B]` `enters` — *Rationale: Simple present denotes habit or timetable, not an activity explaining why he is currently away from his desk.*
  - `[C]` `entered` — *Rationale: Simple past cannot be combined with 'right now'.*
  - `[D]` `enter` — *Rationale: Bare infinitive lacks subject-verb agreement with singular 'he'.*
- **Explanation:**
  > `"The clause 'because he ... right now' explains a present action taking place at the moment of speaking. The singular subject 'he' pairs with 'is entering'. Unlike the flawed Version 2 ('entering hardware'), 'enter' here naturally collocates with a physical room ('the executive conference suite')."`

---

### Blueprint 4: Root `634add4d` (Version 3 — Remediating Collocation Defect in `44931eb1`)
- **Target Root ID:** `634add4d-28b9-4a94-b258-0051e93c6838`
- **Target Version:** 3
- **Curriculum Unit:** Unit 1 (Present continuous)
- **Concept Mapping:** `unit.001` (`Present continuous (I am doing)`)
- **Mapping Confidence:** 1.00
- **Rule Reference:** Unit 1.B (Temporary workplace activity)
- **Difficulty:** `easy`
- **Workplace Domain:** `human_resources`

#### Question Content:
- **Prompt:**
  > `"The training coordinator is not at her desk because she _______ the revised safety guidelines to new employees right now."`
- **Options:**
  - `[A]` `explains` — *Rationale: Simple present conveys habitual action rather than an immediate reason for being away from her desk right now.*
  - `[B]` `is explaining` (CORRECT) — *Rationale: 'Explain' properly collocates with 'the revised safety guidelines'. The continuous aspect matches 'right now' and the singular subject 'she'.*
  - `[C]` `explained` — *Rationale: Simple past conflicts with 'right now'.*
  - `[D]` `explain` — *Rationale: Lacks subject-verb agreement with third-person singular 'she'.*
- **Explanation:**
  > `"The immediate time indicator 'right now' requires the present continuous 'is explaining'. The verb 'explain' naturally selects an informational topic ('the revised safety guidelines') as its direct object, completely resolving the semantic anomaly present in Version 2 ('explaining hardware')."`

---

## 4. Controlled Execution Protocol

When the system owner authorizes execution in Phase 3.4C.4B:
1. The guarded script [`execute-phase3-4c4-replacements.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c4-replacements.mjs) will be created.
2. For Roots `3d71c0d1` and `6a54a874`:
   - Insert Version 3 records with `review_status = "validated"`.
   - Content hashes calculated via SHA-256.
   - Insert corresponding 4 options per item.
3. For Roots `0fda8409` and `634add4d`:
   - Update Version 2 records to `review_status = "withdrawn"`, `is_latest_approved = false`, and log collocation defect reasons.
   - Insert Version 3 records with corrected prompts.
4. Total database row impact reported before and after execution.

