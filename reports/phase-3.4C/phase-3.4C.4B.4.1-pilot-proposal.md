# GrammarPath — Phase 3.4C.4B.4.1: Unit 3 Controlled Pilot Proposal
## Small-Scale Controlled Generation Pilot for Unit 3 (Present Continuous vs. Present Simple Contrast)

**Author:** Antigravity (Principal Assessment Specialist & Lead Learning Engineer)  
**Milestone:** Phase 3.4C.4B.4.1 (AI TOEIC Question Generation Pipeline — Design & Readiness Audit)  
**Date:** November 14, 2026  
**Status:** Pilot Proposal (Design-Only — Execution Deferred)  
**Target Unit:** Unit 3 — `unit.003` (*Present continuous and present simple 1*)  

---

## 1. Pilot Objectives & Rationale

Following the Phase 3.4C.4B.3 concept remapping, Unit 3 was purged of 4 severely misclassified items (which tested Past Simple, Past Continuous, and Conditionals). Unit 3 is currently **completely empty** (0 approved, 0 candidate questions).

This pilot proposes generating a small, controlled batch of **8 high-quality TOEIC Part 5 questions** targeting genuine Unit 3 grammatical contrasts, validating the new 15-stage pipeline and quality checkers before larger-scale expansion.

---

## 2. Pilot Blueprint & Grammatical Rule Specifications

| Item Blueprint | Sub-Rule | Target Grammatical Construct | Target Key & Structure | Domain | Target Diff |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **U3-BP-01** | Rule 3A | Habitual routine vs. ongoing temporary project | *operates* (Simple Present with *usually*) | `logistics_shipping` | **easy** |
| **U3-BP-02** | Rule 3A | Action at present moment vs. permanent truth | *is auditing* (Present Continuous with *this week*) | `finance_accounting` | **easy** |
| **U3-BP-03** | Rule 3A | Developing temporary quarterly shift | *are relying* (Continuous for temporary period) | `marketing_sales` | **medium** |
| **U3-BP-04** | Rule 3B | Negative contrast: habit vs. active task | *does not handle* (Negative Simple Present) | `corporate_management` | **medium** |
| **U3-BP-05** | Rule 3B | Interrogative split: temporary reason inquiry | *is / negotiating* (Present Continuous Question) | `corporate_management` | **medium** |
| **U3-BP-06** | Rule 3A | Workplace schedule vs. temporary delay | *departs* (Timetable Simple Present) | `logistics_shipping` | **medium** |
| **U3-BP-07** | Rule 3C | Expressing annoying / frequent recurrence | *is always misplacing* (*always* + Continuous) | `corporate_management` | **hard** |
| **U3-BP-08** | Rule 3C | Contrast: *"I always do"* vs. *"I'm always doing"* | *always submits* (*always* + Simple Present habit) | `finance_accounting` | **hard** |

---

## 3. Workplace Domain & Difficulty Distributions

### Difficulty Tier Breakdown:
- **Easy (2 items / 25%):** Straightforward deictic contrast cues (*usually* vs. *this week*).
- **Medium (4 items / 50%):** Standard TOEIC workplace contexts, complex subjects, interrogative/negative forms.
- **Hard (2 items / 25%):** Nuanced contrast between *"I always do"* (regular routine) and *"I am always doing"* (abnormal/excessive recurrence, Rule 3C).

### Domain Coverage (4 Sectors):
- `corporate_management`: 3 items (37.5%)
- `finance_accounting`: 2 items (25.0%)
- `logistics_shipping`: 2 items (25.0%)
- `marketing_sales`: 1 item (12.5%)

---

## 4. Acceptance Thresholds & Quality Gates

A generated item in this pilot must satisfy all of the following criteria to qualify for `validated` candidate inventory:

1. **Overall Quality Score:** $\ge 8.50 / 10.00$.
2. **Critical Blocking Codes:** Exactly **0** (`BLK_FORMAT`, `BLK_WRONG_KEY`, `BLK_AMBIGUITY`, `BLK_DISTRACTOR`, `BLK_STUTTER_AUX`, `BLK_AGREEMENT`, `BLK_COLLOCATION`, `BLK_DUPLICATE`, `BLK_MAPPING`).
3. **Contextual Diversity Distance:** Pairwise $D_{\text{ctx}} \ge 0.55$ across all 8 items.
4. **Independent Context Clusters:** Connected-components clustering must yield $K_{\text{ctx}} \ge 6$ across the 8 items.
5. **Human Editorial Review:** All 8 items must be reviewed and signed off by the human assessment specialist before any activation transaction.

---

## 5. Estimated Token Consumption and Operational Cost

| Step | Calls | Model Pinned | Est. Input Tokens | Est. Output Tokens | Est. Cost (USD) |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Blueprint Generation** | 8 | `gemini-1.5-pro-002` | 12,000 | 4,800 | \$0.039 |
| **Structural & NLP Screening** | 8 | `gemini-1.5-flash-002` | 4,000 | 1,600 | \$0.001 |
| **Total Estimated Pilot Cost** | **16** | | **16,000** | **6,400** | **\$0.040 USD** |

---

## 6. Execution Boundary

**This pilot is strictly proposed and documented.**
In accordance with Phase 3.4C.4B.4.1 constraints:
- Zero Gemini generation calls have been made in this milestone.
- Zero records have been inserted into the database.
- Execution requires explicit authorization in subsequent Phase 3.4C.4B.4.2.

