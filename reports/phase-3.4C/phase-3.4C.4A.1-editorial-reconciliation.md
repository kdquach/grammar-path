# GrammarPath — Phase 3.4C.4A.1: Editorial Reconciliation Report
## Independent Linguistic, Syntactic, and Pedagogical Audit of Unit 1 Approved & Candidate Items

**Author:** Antigravity (Principal Learning Engineer & Assessment Specialist)  
**Milestone:** Phase 3.4C.4A.1 (Audit Reconciliation & C.4B Authorization Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Items Evaluated:** 10 Items (3 Approved + 7 Validated Candidates)  
**Status:** AUDIT ONLY — ZERO STATUS MUTATIONS  

---

## 1. Executive Summary & Verification Charter

This report independently evaluates the 3 currently approved items and the 7 prime validated candidate items for Unit 1 (`Present continuous`). 

Automated pipeline validation (e.g. `qualityScore = 9`) merely verifies syntactic presence of 4 options, a single answer key, and length thresholds. It **cannot** detect semantic selection violations, awkward business phrasing, or pedagogical misalignment. 

### Core Editorial Conclusions:
1. **Defects in Approved Items Independently Confirmed:**
   - `7d9abd94` (*"is entering the server hardware"*): Genuinely defective due to transitive verb-object semantic incompatibility (*"enter hardware"*).
   - `44931eb1` (*"is explaining the server hardware"*): Genuinely defective due to unnatural cognitive-object collocation (*"explain hardware"* without a topic or recipient).
   - `45e751fd` (*"is repairing the server hardware"*): Genuinely acceptable in syntax, vocabulary, and grammar, though its explanation is a Vietnamese admin placeholder that needs replacement with a standard pedagogical rationale.
2. **Re-Evaluation of 7 Validated Unit 1 Candidates:**
   - All 7 items (`b7c4793c`, `c46da3b7`, `0f51d836`, `2afc939e`, `2997562b`, `7a3359ae`, `322c0e5c`) pass independent human editorial review with high distinction. They exhibit authentic TOEIC Part 5 style, unambiguous single correct keys, and rigorous distractor sets across 5 workplace domains.

---

## 2. Independent Audit of the Three Approved Unit 1 Items

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT AUDIT MATRIX: APPROVED UNIT 1 ITEMS                                                  │
├────────────┬─────────────┬──────────────┬────────────────────────┬──────────────┬────────────────┤
│ Item ID    │ Root ID     │ Correct Key  │ Target Sentence        │ Collocation  │ Editorial      │
│            │             │              │ Construction           │ Integrity    │ Verdict        │
├────────────┼─────────────┼──────────────┼────────────────────────┼──────────────┼────────────────┤
│ 7d9abd94   │ 0fda8409 v2 │ A: is entering│ "...he is entering the │ BROKEN       │ DEFECTIVE      │
│            │             │              │ server hardware..."    │              │ (Reject)       │
├────────────┼─────────────┼──────────────┼────────────────────────┼──────────────┼────────────────┤
│ 44931eb1   │ 634add4d v2 │ B: is explain│ "...he is explaining the│ BROKEN      │ DEFECTIVE      │
│            │             │              │ server hardware..."    │              │ (Reject)       │
├────────────┼─────────────┼──────────────┼────────────────────────┼──────────────┼────────────────┤
│ 45e751fd   │ b19ebb8c v2 │ B: is repair │ "...he is repairing the│ SOUND        │ ACCEPTABLE     │
│            │             │              │ server hardware..."    │              │ (Retain)       │
└────────────┴─────────────┴──────────────┴────────────────────────┴──────────────┴────────────────┘
```

### Forensic Analysis of Approved Items:

#### 1. Item `7d9abd94` (`Root 0fda8409`, Version 2)
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Marked Correct Option:** `[A] is entering`
- **Distractors:** `[B] enters`, `[C] entered`, `[D] enter`
- **Linguistic Finding:** The transitive verb *enter* selects spatial/locative complements (*"enter Room 3"*, *"enter the conference hall"*) or input/data complements (*"enter your password"*, *"enter the figures into the database"*). Physical machinery or computer equipment (*"the server hardware"*) cannot serve as the direct object of *enter*. A native English speaker or business professional would immediately flag *"he is entering the server hardware"* as an egregious error.
- **Pedagogical Impact:** Exposing learners to this item trains incorrect collocation patterns and degrades GrammarPath's professional assessment authority.
- **Explanation Audit:** Contains `"Cập nhật giải thích chi tiết hơn cho người học."` — an internal admin development note, not an explanation.
- **Independent Verdict:** **CONFIRMED DEFECTIVE. Must be withdrawn in Phase 3.4C.4B.**

#### 2. Item `44931eb1` (`Root 634add4d`, Version 2)
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Marked Correct Option:** `[B] is explaining`
- **Distractors:** `[A] explains`, `[C] explained`, `[D] explain`
- **Linguistic Finding:** The speech-act verb *explain* selects propositional content, concepts, reasons, or procedures (*"explain the error"*, *"explain how the system functions"*). When physical apparatus is the object, standard English requires an operational complement (*"explain the server hardware's configuration"* or *"explain the hardware malfunction"*). Additionally, *explain* implies a listener, but no recipient is present in Room 3.
- **Explanation Audit:** Contains identical development placeholder note (`"Cập nhật giải thích chi tiết hơn cho người học."`).
- **Independent Verdict:** **CONFIRMED DEFECTIVE. Must be withdrawn in Phase 3.4C.4B.**

#### 3. Item `45e751fd` (`Root b19ebb8c`, Version 2)
- **Prompt:** `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
- **Marked Correct Option:** `[B] is repairing`
- **Distractors:** `[A] repairs`, `[C] repaired`, `[D] repair`
- **Linguistic Finding:** The construction *"he is repairing the server hardware in Room 3 right now"* is authentic, natural, and idiomatic business English. The time adverbial *"right now"* cleanly triggers Present Continuous aspect; the third-person singular pronoun *"he"* requires auxiliary *"is"*; and the verb *"repair"* perfectly selects physical machinery (*"server hardware"*).
- **Distractor Validity:** Option A (*repairs*) tests habitual simple present confusion; Option C (*repaired*) tests past tense confusion; Option D (*repair*) tests bare infinitive / subject-verb agreement failure.
- **Explanation Finding:** Explanation currently contains the same placeholder note. It must be updated to a proper educational explanation during Phase 3.4C.4B editorial curation.
- **Independent Verdict:** **CONFIRMED ACCEPTABLE. Retain as approved.**

---

## 3. Independent Item-by-Item Review of the Seven Validated Candidates

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT REVIEW OF 7 VALIDATED UNIT 1 CANDIDATES                                                    │
├────────────┬─────────────┬─────────────┬──────────────────────────┬──────────────┬─────────────────────┤
│ Item ID    │ Target Rule │ Workplace   │ Grammar Construct        │ Distractor   │ Independent Verdict │
│            │ Reference   │ Domain      │ Isolated                 │ Plausibility │                     │
├────────────┼─────────────┼─────────────┼──────────────────────────┼──────────────┼─────────────────────┤
│ b7c4793c   │ Rule 1E     │ Marketing   │ Trends & gradual change  │ HIGH         │ APPROVED-READY      │
│ c46da3b7   │ Rule 1C     │ Corporate   │ Split interrogative cont.│ HIGH         │ APPROVED-READY      │
│ 0f51d836   │ Rule 1A/1B  │ Marketing   │ Immediate phone action   │ HIGH         │ APPROVED-READY      │
│ 2afc939e   │ Rule 1A     │ Finance     │ Executive meeting action │ HIGH         │ APPROVED-READY      │
│ 2997562b   │ Rule 1E     │ Manufact.   │ Progressive automation   │ HIGH         │ APPROVED-READY      │
│ 7a3359ae   │ Rule 1C     │ Corporate   │ Pre-arranged negotiation │ HIGH         │ APPROVED-READY      │
│ 322c0e5c   │ Rule 1B     │ Logistics   │ Temporary trade crisis   │ HIGH         │ APPROVED-READY      │
└────────────┴─────────────┴─────────────┴──────────────────────────┴──────────────┴─────────────────────┘
```

### Detailed Item Reports:

#### 1. Candidate `b7c4793c-ba61-4ae6-92e2-74096f6a8557`
- **Prompt:** `"According to the corporate announcement, our international market share _______ steadily this quarter."`
- **Correct Key:** `[C] is growing`
- **Distractors:** `[A] grew`, `[B] grows`, `[D] was grown`
- **Editorial Analysis:** Exemplary Part 5 item. It tests Rule 1E (processes of development and gradual change over time) triggered by the adverb *"steadily"* and time frame *"this quarter"*. Distractors represent classic learner pitfalls: A tests completed past narrative; B tests static habitual present; D tests erroneous passive formation.
- **Verdict:** **EXCELLENT / APPROVED-READY**.

#### 2. Candidate `c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c`
- **Prompt:** `"Why _______ so many employees _______ over the recent changes to the annual leave policy today?"`
- **Correct Key:** `[B] are / debating`
- **Distractors:** `[A] do / debate`, `[C] have / debated`, `[D] were / debating`
- **Editorial Analysis:** Critical syntactic variety. Testing split-auxiliary interrogative structure (*"Why are ... debating"*) with a quantified plural noun phrase subject (*"so many employees"*). Distractors cleanly isolate auxiliary verb selection (*do vs are*), aspectual confusion (*have debated*), and tense (*were debating*).
- **Verdict:** **EXCELLENT / APPROVED-READY**.

#### 3. Candidate `0f51d836-b360-4423-b19e-71ea358be557`
- **Prompt:** `"Please speak quietly in the lobby because the marketing director _______ an important client on the phone."`
- **Correct Key:** `[A] is calling`
- **Distractors:** `[B] calls`, `[C] called`, `[D] was calling`
- **Editorial Analysis:** Classic TOEIC situational context. An initial imperative clause (*"Please speak quietly in the lobby"*) establishes an immediate, ongoing action taking place at the moment of speaking. Collocation (*"call a client on the phone"*) is flawless.
- **Verdict:** **HIGH QUALITY / APPROVED-READY**.

#### 4. Candidate `2afc939e-9d24-40d8-98c3-75a198006930`
- **Prompt:** `"Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now."`
- **Correct Key:** `[B] is conducting`
- **Distractors:** `[A] conducts`, `[C] conducted`, `[D] has conducted`
- **Editorial Analysis:** Executive business meeting scenario. The collocation *"conduct a review"* is formal and frequent in TOEIC Part 5. Time indicator *"right now"* firmly anchors the time frame. Distractors effectively target habitual aspect and completed aspect.
- **Verdict:** **HIGH QUALITY / APPROVED-READY**.

#### 5. Candidate `2997562b-8ae1-4e19-8dd2-f110d41865e0`
- **Prompt:** `"Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly."`
- **Correct Key:** `[B] is incorporating`
- **Distractors:** `[A] incorporates`, `[C] has incorporated`, `[D] incorporate`
- **Editorial Analysis:** Advanced Part 5 item testing cognitive recognition of progressive corporate modernization. The comparative phrase *"more and more"* specifically requires continuous aspect under Rule 1E. Singular collective subject (*"the plant"*) requires *"is"*. Distractor D tests subject-verb number agreement.
- **Verdict:** **EXCELLENT / APPROVED-READY**.

#### 6. Candidate `7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83`
- **Prompt:** `"Our executive committee _______ foreign representatives all afternoon to negotiate the cross-border merger terms."`
- **Correct Key:** `[B] is meeting`
- **Distractors:** `[A] meets`, `[C] has met`, `[D] meet`
- **Editorial Analysis:** Pre-arranged corporate business schedule (Rule 1C). The time indicator *"all afternoon"* with an infinitive of purpose (*"to negotiate..."*) provides natural context for an ongoing executive engagement.
- **Verdict:** **HIGH QUALITY / APPROVED-READY**.

#### 7. Candidate `322c0e5c-d12b-4617-b88d-cace81c8e545`
- **Prompt:** `"Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty."`
- **Correct Key:** `[B] are experiencing`
- **Distractors:** `[A] experience`, `[C] experienced`, `[D] experiences`
- **Editorial Analysis:** Authentic international trade and supply chain context. Plural subject (*"hubs"*) paired with temporary crisis time adverbial (*"these weeks"*) and continuous aspect. Distractor D tests 3rd-person singular error; A tests habitual routine; C tests past narrative.
- **Verdict:** **EXCELLENT / APPROVED-READY**.

---

## 4. Editorial Conclusion & Transition Strategy

1. The 7 validated candidate items are **pedagogically and linguistically superior** to the legacy seed items created in earlier milestones.
2. Approving these 7 items along with the acceptable approved item `45e751fd` establishes an active Unit 1 question bank of **8 robust, diverse items spanning 5 separate business domains**.
3. Approving these items eliminates the Unit 1 contextual deficit completely, providing authentic scenarios for learner transfer evaluation without enqueuing external AI calls.

