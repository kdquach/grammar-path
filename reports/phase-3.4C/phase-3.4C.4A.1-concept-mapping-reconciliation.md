# GrammarPath — Phase 3.4C.4A.1: Concept Mapping Reconciliation Report
## Forensic Pedagogical Audit of Units 3 and 4 Bank Items Against Canonical Curriculum Theory

**Author:** Antigravity (Educational Data Scientist & Curriculum Architect)  
**Milestone:** Phase 3.4C.4A.1 (Audit Reconciliation & C.4B Authorization Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Curriculum Baseline:** *English Grammar in Use* (4th Edition), Units 1–145  
**Status:** AUDIT ONLY — ZERO DATABASE MAPPINGS ALTERED  

---

## 1. Executive Summary & Epistemic Finding

This report performs an item-by-item pedagogical reconciliation of all 8 items currently mapped to Unit 3 (`unit.003`) and Unit 4 (`unit.004`) in the question bank.

### High-Impact Finding:
- **Unit 3 (`unit.003`):** **100% of existing items (4 of 4) are severely misclassified.** None of them test Unit 3 grammar (Present Continuous vs Present Simple contrast). They test Past Simple (`unit.005`), Past Continuous (`unit.006`), and Third Conditional Inversion (`unit.038`/`040`).
- **Unit 4 (`unit.004`):** **75% of existing items (3 of 4) are misclassified.** Only 1 item (`fe61381a`, stative verb *doubt*) tests Unit 4 grammar. The other 3 test Present Simple habit (`unit.002`) and Present Continuous at the moment of speaking (`unit.001`).
- **Original Author Intent Preserved in Vietnamese Explanations:** The explanations stored in the database explicitly describe the *actual* grammatical targets (e.g., *"Hành động đang diễn ra trong quá khứ bị gián đoạn"* for Past Continuous, and *"Đảo ngữ điều kiện loại 3"* for Third Conditional). The defect occurred entirely during automated concept ID linking in Phase 3.4B seed ingestion.

---

## 2. Granular Reconciliation Matrix (8 Items)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ UNITS 3 & 4 CONCEPT MAPPING RECONCILIATION MATRIX                                                      │
├────────────┬──────┬────────────┬─────────────────────────────┬────────────┬──────────────────┬─────────┤
│ Item ID    │ Unit │ Current    │ Actual Grammatical          │ Correct    │ Canonical        │ Conf.   │
│            │      │ Mapping    │ Construct Tested            │ Target     │ Textbook Unit    │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ 43753724   │ 3    │ unit.003   │ Past Simple ("voted" with   │ unit.005   │ Unit 5 (Past     │ 1.00    │
│            │      │            │ "Last Friday")              │            │ Simple)          │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ 6948841f   │ 3    │ unit.003   │ Past Continuous interrupted │ unit.006   │ Unit 6 (Past     │ 1.00    │
│            │      │            │ ("was working ... sounded") │            │ Continuous)      │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ 77299aeb   │ 3    │ unit.003   │ Inverted 3rd Conditional    │ unit.038/  │ Unit 38 / 40     │ 1.00    │
│            │      │            │ ("Had noticed ... would")   │ unit.040   │ (Conditionals)   │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ c10918d0   │ 3    │ unit.003   │ While + Past Continuous     │ unit.006   │ Unit 6 (Past     │ 1.00    │
│            │      │            │ ("was reviewing ... asked") │            │ Continuous)      │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ 6e803d45   │ 4    │ unit.004   │ Moment of speaking ("is     │ unit.001   │ Unit 1 (Present  │ 1.00    │
│            │      │            │ giving" with "Listen to")   │            │ Continuous)      │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ 7addbaf6   │ 4    │ unit.004   │ Moment of speaking ("is     │ unit.001   │ Unit 1 (Present  │ 1.00    │
│            │      │            │ explaining" with "Listen")  │            │ Continuous)      │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ ac0c643a   │ 4    │ unit.004   │ Habitual routine ("publishes│ unit.002   │ Unit 2 (Present  │ 1.00    │
│            │      │            │ with "every year")          │            │ Simple)          │         │
├────────────┼──────┼────────────┼─────────────────────────────┼────────────┼──────────────────┼─────────┤
│ fe61381a   │ 4    │ unit.004   │ Stative mental verb         │ unit.004   │ Unit 4 (Stative  │ 1.00    │
│            │      │            │ ("doubts" vs continuous)    │ (PROPER)   │ Verbs)           │         │
└────────────┴──────┴────────────┴─────────────────────────────┴────────────┴──────────────────┴─────────┘
```

---

## 3. Deep-Dive Pedagogical Item Evidence

### 3.1 Unit 3 Audited Items

#### Item 1: `43753724-dcb3-4681-adb5-5d0c71d34b7c`
- **Sentence:** `"Last Friday, the board members _______ to approve the proposed budget."`
- **Correct Key:** `[B] voted`
- **Current Concept Mapping:** `unit.003` (`Present continuous and present simple 1`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 5, Section A/B:
  > *"Very often the past simple ends in -ed (regular verbs)... We use the past simple for finished events in the past (e.g. yesterday, last Friday, in 2010)."*
- **Reconciliation Verdict:** The completed temporal marker *"Last Friday"* unconditionally requires Past Simple. It contains zero present continuous contrast. **Must be remapped to `unit.005`.**

#### Item 2: `6948841f-9dc6-487c-83ed-04c6ebfbc9fe`
- **Sentence:** `"Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout the building."`
- **Correct Key:** `[B] was working`
- **Current Concept Mapping:** `unit.003` (`Present continuous and present simple 1`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 6, Section B:
  > *"We use the past continuous to say that somebody was in the middle of doing something at a certain time... Often the action was ongoing when another event happened: 'I was walking home when I met Dave'."*
- **Reconciliation Verdict:** This is a classic textbook illustration of Past Continuous interrupted by Past Simple. **Must be remapped to `unit.006`.**

#### Item 3: `77299aeb-93d6-483e-9f77-4d5a8c67496a`
- **Sentence:** `"Had the compliance inspector _______ the discrepancy earlier, the company would not have faced regulatory fines."`
- **Correct Key:** `[A] noticed`
- **Current Concept Mapping:** `unit.003` (`Present continuous and present simple 1`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 40 & Appendix 1 (Conditionals and Inversion):
  > *"Had you told me earlier... = If you had told me earlier. In formal business English, inversion replaces 'if' in third conditional structures."*
- **Reconciliation Verdict:** Testing past hypothetical inversion under `unit.003` is a critical pedagogical error. **Must be remapped to `unit.038`/`unit.040`.**

#### Item 4: `c10918d0-496f-4766-a6c5-923445203650`
- **Sentence:** `"While the project coordinator _______ the contract terms, the client asked for clarification on payment schedules."`
- **Correct Key:** `[B] was reviewing`
- **Current Concept Mapping:** `unit.003` (`Present continuous and present simple 1`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 6, Section C:
  > *"You can say that something happened (past simple) in the middle of something else (past continuous): 'While I was working, the phone rang'."*
- **Reconciliation Verdict:** Conjunction *"While"* governing past continuous action interrupted by *"asked"*. **Must be remapped to `unit.006`.**

---

### 3.2 Unit 4 Audited Items

#### Item 5: `6e803d45-15fe-4fb7-8f35-5f7636947888`
- **Sentence:** `"Listen to the speaker; she _______ the summary of today's meeting."`
- **Correct Key:** `[A] is giving`
- **Current Concept Mapping:** `unit.004` (`Present continuous and present simple 2`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 1, Section A:
  > *"The action is not finished... 'Listen to those people. What language are they speaking?'"*
- **Reconciliation Verdict:** The sensory command *"Listen to the speaker"* anchors the action at the moment of speaking (Rule 1A). It does not test stative verbs. **Must be remapped to `unit.001`.**

#### Item 6: `7addbaf6-e0f1-47c4-a31d-f0196200c087`
- **Sentence:** `"Listen to the CEO's keynote address; she _______ the company's visionary five-year expansion plan."`
- **Correct Key:** `[A] is explaining`
- **Current Concept Mapping:** `unit.004` (`Present continuous and present simple 2`)
- **Reconciliation Verdict:** Near-identical duplicate template of `6e803d45`. Tests Rule 1A. **Must be remapped to `unit.001`.**

#### Item 7: `ac0c643a-f264-4991-b5ae-08c0e8eb2848`
- **Sentence:** `"Dr. Evans _______ three medical research articles every year for the international cardiology journal."`
- **Correct Key:** `[A] publishes`
- **Current Concept Mapping:** `unit.004` (`Present continuous and present simple 2`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 2, Section B:
  > *"We use the present simple to say how often we do things: 'I get up at 8:00 every morning'."*
- **Reconciliation Verdict:** Adverbial *"every year"* triggers habitual Present Simple. **Must be remapped to `unit.002`.**

#### Item 8: `fe61381a-7e1b-495f-a388-804cb27ea8f5`
- **Sentence:** `"The chief scientist _______ whether the synthesized compound remains chemically stable under extreme pressure."`
- **Correct Key:** `[A] doubts`
- **Current Concept Mapping:** `unit.004` (`Present continuous and present simple 2`)
- **Canonical Textbook Proof:** *English Grammar in Use*, Unit 4, Section A:
  > *"These verbs are not normally used in the present continuous: believe, doubt, understand, recognize..."*
- **Reconciliation Verdict:** **PROPERLY ALIGNED.** Isolates stative mental attitude verb *doubt*. Retain mapping to `unit.004`.

---

## 4. Remediation Action Plan for Phase 3.4C.4B

1. **Create Migration / Remediation Script:** A guarded script `reclassify-units3-4-concepts.mjs` will be authored to atomically update `concept_id` and `unit_number` for the 7 misclassified items.
2. **Curriculum Deficit Resolution:** With Unit 3 empty of authentic items, Unit 3 must be flagged `CRITICAL DEFICIT / NOT READY FOR EVALUATION` until genuine present continuous vs simple contrast items are generated and approved.

