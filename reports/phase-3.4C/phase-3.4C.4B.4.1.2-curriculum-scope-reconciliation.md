# GrammarPath — Phase 3.4C.4B.4.1.2: Curriculum Scope Reconciliation
## Preserving Three Distinct Pedagogical Classifications for Unit 3 Section 3C

**Author:** Antigravity (Principal Assessment Engineer & Curriculum Lead)  
**Milestone:** Phase 3.4C.4B.4.1.2 (Final Pre-Implementation Gate)  
**Date:** November 14, 2026  
**Status:** Pedagogical Scope Specification (Design-Only — Zero Curriculum Mutations)  

---

## 1. Executive Summary & Epistemic Boundaries

In Phase 3.4C.4B.4.1.1, the curriculum mapping report recommended omitting **Section 3C** (*"I always do"* vs. *"I'm always doing"*) from the Unit 3 pilot. However, conflating temporary pilot exclusion with permanent pedagogical disqualification would introduce a serious conceptual error.

This specification formally establishes:
1. **Canonical Permanence:** Section 3C remains an authentic, immutable component of Unit 3 in canonical `grammarpath-data`. It will **never** be deleted or pruned from the curriculum repository.
2. **Strict Semantic Separation of Epistemic Conclusions:**
   - *Conclusion A:* Excluded from this immediate 8-item pilot.
   - *Conclusion B:* Eligible for TOEIC Part 5 assessment.
   - *Conclusion C:* Suitable for professional and workplace contexts.
3. These three conclusions are **not interchangeable**, and each carries distinct operational implications.

---

## 2. Tripartite Epistemic Taxonomy for Section 3C

```
+----------------------------------------------------------------------------------------------------+
| TRIPARTITE EPISTEMIC CLASSIFICATION: UNIT 3 SECTION 3C ("I always do" vs. "I'm always doing")     |
+------------------------------+--------------------+------------------------------------------------+
| Dimension                    | Classification     | Operational & Pedagogical Meaning              |
+------------------------------+--------------------+------------------------------------------------+
| 1. Immediate Pilot Status    | EXCLUDED           | Omitted strictly from the 8-item Unit 3 Pilot  |
|                              | (Temporary Scope)  | to isolate Section 3A and 3B core contrasts.   |
+------------------------------+--------------------+------------------------------------------------+
| 2. TOEIC Part 5 Eligibility  | FULLY ELIGIBLE     | Psychometrically valid for Part 5 when         |
|                              | (With Blueprint)   | context provides unambiguous pragmatic cues.   |
+------------------------------+--------------------+------------------------------------------------+
| 3. Workplace Register        | FULLY SUITABLE     | Valid in conversational business, HR reviews,  |
|                              | (Specific Domains) | customer service, and interpersonal dialogues.  |
+------------------------------+--------------------+------------------------------------------------+
```

### 2.1 Dimension 1: "Excluded from this Pilot" (Operational Scoping)
- **Definition:** An intentional, risk-minimizing choice to limit the scope of the first 8-item generation run to the two most straightforward aspectual contrasts in Unit 3:
  - **Section 3A:** Habitual routine vs. action in progress at the time of speaking.
  - **Section 3B:** Permanent workplace situation vs. temporary business assignment.
- **Why Excluded Here:** The primary goal of Phase 3.4C.4B.4.2 is to validate the automated generation pipeline, token-cost telemetry, schema parsing, and independent critic integration. Introducing subtle emotional aspect contrasts in the first 8 items would confound pipeline validation with nuanced prompt calibration.
- **Future Trajectory:** Once the pipeline is stabilized, Section 3C will be introduced in subsequent Unit 3 batches with tailored blueprints.

### 2.2 Dimension 2: "Eligible for TOEIC Part 5" (Assessment Validity)
- **Definition:** Whether a construct can be validly assessed in a standardized 4-option discrete sentence-completion item without creating dual-key ambiguity.
- **ETS Precedent:** TOEIC Part 5 frequently tests nuanced aspect in quoted speech, email excerpts, or internal memos where one speaker describes a recurring annoyance or chronic issue (e.g., equipment failures, chronic delivery delays).
- **Feasibility:** Section 3C **IS ELIGIBLE** for Part 5, provided the carrier sentence establishes a clear context of recurring frequency that exceeds normal expectations:
  - *Example:* *"The IT department issued a formal warning to the logistics coordinator because he is always misplacing the secure access keycards."*
  - Here, the emotional/annoyance context (*"issued a formal warning"*) makes *"is always misplacing"* the single intended correct answer and renders simple present distractor *"always misplaces"* non-target or structurally distinct.
- **Status:** Eligible, subject to dedicated few-shot calibration.

### 2.3 Dimension 3: "Suitable for Professional Contexts" (Sociolinguistic Register)
- **Definition:** Whether the grammatical construct naturally occurs in professional communications.
- **Linguistic Reality:** While *"I'm always doing"* is rarely found in legal contracts or statutory financial statements (which favor timeless, declarative simple present), it is a standard, authentic feature of:
  - Customer complaint correspondence (*"Your courier service is always delivering our supplies after business hours"*).
  - Performance feedback and HR coaching dialogues.
  - Workplace interpersonal emails and meeting transcript excerpts.
- **Status:** Entirely authentic to corporate English when situated within appropriate interpersonal or evaluative genres.

---

## 3. Curriculum Invariants & Database Integrity

1. **Canonical Schema Stability:** `data/units/unit-003.json` lines 33–39 define Section 3C as:
   ```json
   {
     "section_id": "3C",
     "title": "I always do and I'm always doing",
     "rules": [
       "I always do (something) = I do it every time",
       "I'm always doing something = I do it too often, more often than normal"
     ]
   }
   ```
2. **Zero Modification Policy:** No edits will be made to `unit-003.json` or database tables `theory_sections` and `concepts`.
3. **Pilot Isolation:** The 8 pilot blueprints authored in `phase-3.4C.4B.4.1.1-revised-unit3-pilot.md` will remain allocated 100% to Section 3A (4 items) and Section 3B (4 items).

