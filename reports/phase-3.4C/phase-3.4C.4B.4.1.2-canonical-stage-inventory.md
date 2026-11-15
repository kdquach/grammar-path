# GrammarPath — Phase 3.4C.4B.4.1.2: Canonical Stage Inventory & Reconciliation
## Resolution of Stage Count Arithmetic and Definitive 15-Stage Lifecycle Specification

**Author:** Antigravity (Principal Backend Architect & AI Systems Specialist)  
**Milestone:** Phase 3.4C.4B.4.1.2 (Final Pre-Implementation Gate)  
**Date:** November 14, 2026  
**Status:** Canonical Lifecycle Specification (Design-Only — Zero Code Mutations)  

---

## 1. Executive Summary & Root Cause Analysis of Count Discrepancy

In Phase 3.4C.4B.4.1.1, the generation stage classification report claimed a 15-stage lifecycle but summarized the categorization as:
- 13 deterministic code stages
- 2 AI stages
- 1 human editorial gate
Total: $13 + 2 + 1 = 16$ stages.

### 1.1 The Root Cause Identified
A line-by-line audit of `phase-3.4C.4B.4.1.1-generation-stage-classification.md` reveals that **Stage 13 ("Independent Quality Review Scoring") was double-counted**:
- It was classified in the text as hybrid `"A / B"` because it executes both deterministic score aggregation (rubric weighting) and an optional AI blind critic call.
- When computing the category subtotals, Stage 13 was added to Category A ($12 + 1 = 13$) **and** counted in Category B ($1 + 1 = 2$).
- Adding Category C (Stage 14, 1 stage) resulted in $13 + 2 + 1 = 16$.

### 1.2 The Resolution
To establish complete architectural consistency, Stage 13 is formally and exclusively classified under **Category B (AI-Assisted Linguistic Validation)** because its defining architectural capability is the independent blind critic model call. The deterministic rubric aggregation that tallies scores from Stages 6–12 is an internal sub-step of Stage 13 before the critic is invoked.

With this correction:
$$\text{Total Stages} = N_{\text{Category A}} + N_{\text{Category B}} + N_{\text{Category C}} = 12 + 2 + 1 = \mathbf{15}$$

Every stage appears exactly once. All totals reconcile with zero arithmetic discrepancy.

---

## 2. Canonical 15-Stage Lifecycle Inventory

The following table constitutes the sole canonical, immutable reference for the 15-stage TOEIC generation lifecycle:

| Stage # | Stage Name | Category | Primary Execution Engine | Model Invocation? | Max Tokens | Failure State |
| :---: | :--- | :---: | :--- | :---: | :---: | :--- |
| **1** | Curriculum Rule Extraction | **A** | TypeScript / PostgreSQL Query | **NO (0)** | 0 | Fail-Closed (Halt) |
| **2** | Learning Objective Definition | **A** | Deterministic Pedagogical Map | **NO (0)** | 0 | Fail-Closed (Halt) |
| **3** | Question Blueprint Creation | **A** | Deterministic Combinatorial Engine | **NO (0)** | 0 | Fail-Closed (Halt) |
| **4** | Prompt Assembly & Constraints | **A** | Deterministic Template Interpolator | **NO (0)** | 0 | Fail-Closed (Halt) |
| **5** | Primary AI Generation | **B** | Google Gemini REST (`gemini-2.5-pro`) | **YES (1)** | 2,048 | Retry Backoff (Max 2) |
| **6** | Schema & JSON Validation | **A** | Zod Schema Validator | **NO (0)** | 0 | Reject / Staging Draft |
| **7** | Answer-Key & Blank Verification | **A** | Deterministic AST / Regex Matcher | **NO (0)** | 0 | Reject / Staging Draft |
| **8** | Distractor Diagnostic Analysis | **A** | Morphological / Lexical Analyzer | **NO (0)** | 0 | Reject / Staging Draft |
| **9** | Dual-Language Explanation Validation | **A** | String Length & Clue Word Matcher | **NO (0)** | 0 | Flag Warning / Draft |
| **10** | Concept & Boundary Mapping | **A** | Stative Verb Blacklist Filter | **NO (0)** | 0 | Reject / Staging Draft |
| **11** | Contextual Diversity Evaluation | **A** | Deterministic Diversity Engine ($D_{\text{ctx}}$) | **NO (0)** | 0 | Reject / Staging Draft |
| **12** | Difficulty Calibration & Tagging | **A** | Flesch-Kincaid & Syntax Analyzer | **NO (0)** | 0 | Recalibrate Tier |
| **13** | Independent Linguistic Critic Review | **B** | Google Gemini REST (`gemini-2.5-flash`)| **YES (1)** | 1,500 | Reject / Flag Defect |
| **14** | Human Editorial Approval | **C** | Admin Review Portal / Human Editor | **NO (0)** | 0 | Approve / Remediate |
| **15** | Immutable Version Publication | **A** | Atomic PostgreSQL Transaction | **NO (0)** | 0 | Transaction Rollback |

---

## 3. Mathematical Reconciliation by Category

### 3.1 Category Breakdown

```
+--------------------------------------------------------------------------+
| CANONICAL STAGE CLASSIFICATION SUMMARY                                    |
+-----------------------------------+----------+---------------------------+
| Category                          | Count    | Stages Included           |
+-----------------------------------+----------+---------------------------+
| Category A: Deterministic Code    |    12    | 1, 2, 3, 4, 6, 7, 8,      |
|                                   |          | 9, 10, 11, 12, 15         |
| Category B: AI Generation/Review  |     2    | 5, 13                     |
| Category C: Human Editorial Gate  |     1    | 14                        |
+-----------------------------------+----------+---------------------------+
| TOTAL CANONICAL STAGES            |    15    | Exact Reconciliation      |
+-----------------------------------+----------+---------------------------+
```

### 3.2 Invariants Preserved
1. **Zero Redundant Stages:** No stages have been created, deleted, or merged. The original 15 functional boundaries established in `phase-3.4C.4B.4.1` are fully preserved.
2. **Single Category Assignment:** Every stage is assigned to exactly one category:
   $$\text{Stages} = \text{Category A} \cup \text{Category B} \cup \text{Category C}$$
   $$\text{Category A} \cap \text{Category B} = \emptyset,\quad \text{Category A} \cap \text{Category C} = \emptyset,\quad \text{Category B} \cap \text{Category C} = \emptyset$$
3. **Model Call Upper Bound:** A candidate item traverses at most **two API model calls** in its entire lifecycle:
   - Call 1 (Stage 5): Generation via `gemini-2.5-pro`.
   - Call 2 (Stage 13): Blind critic validation via `gemini-2.5-flash`.
   - All other 13 stages execute with zero network calls and zero token consumption.
4. **Early Exit Guarantee:** If any stage among Stages 6 through 12 fails, processing halts immediately. Stage 13 is never called, ensuring zero review tokens are consumed by structurally invalid items.

