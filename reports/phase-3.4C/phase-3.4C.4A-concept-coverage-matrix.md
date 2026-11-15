# GrammarPath — Phase 3.4C.4A: Concept Coverage Matrix
## Granular Mapping of Question Bank Depth, Context Diversity, and Evidence Sufficiency

**Author:** Antigravity (Educational Data Scientist & Psychometric Architect)  
**Milestone:** Phase 3.4C.4A (Question Bank Curation & Editorial Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Curriculum Mapping Target:** English Grammar in Use Units 1–5  

---

## 1. Executive Summary & Epistemological Boundaries

To evaluate transfer learning validly, assessments must map questions to specific, fine-grained **Grammar Concepts**, rather than coarse chapter/unit containers. 

A learner practicing Unit 1 may see questions testing:
- Action happening at the moment of speaking (Rule 1A).
- Temporary situations happening around now (Rule 1B).
- Definite future arrangements (Rule 1C).
- Changing or developing situations (Rule 1E).

### Preliminary Evidence Sufficiency Gate:
A concept achieves preliminary evidence sufficiency if and only if:
1. $N_{\text{app}} \ge 3$: At least three active, approved question bank items exist.
2. $K_{\text{ctx}} \ge 3$: These approved items span at least three independent context clusters ($D_{\text{ctx}} \ge 0.50$).
3. Zero critical answer-key or semantic defects exist in the approved pool.

> [!IMPORTANT]
> **Scientific Caveat:** Satisfying $K_{\text{ctx}} \ge 3$ is merely a *preliminary technical prerequisite* to unlock transfer evaluation. It does NOT constitute empirical proof of grammar mastery, transferability, or construct validity. Psychometric validity requires human learner response matrices and IRT parameter calibration.

---

## 2. Concept Coverage & Evidence Sufficiency Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CONCEPT COVERAGE & EVIDENCE SUFFICIENCY MATRIX (STAGING BASELINE)                                      │
├──────────┬─────────────────────────────┬──────┬──────┬──────┬──────┬──────┬─────────┬────────┬───────────┤
│ Concept  │ Canonical Concept Name      │ Total│ Appr │ Val  │ Arc/ │ K_ctx│ K_ctx   │ Mis-   │ Evidence  │
│ Code     │                             │ (Nq) │ (Napp│ (Nval│ Wdr  │ (All)│ (Appr)  │ aligned│ Status    │
├──────────┼─────────────────────────────┼──────┼──────┼──────┼──────┼──────┼─────────┼────────┼───────────┤
│ unit.001 │ Present continuous          │ 19   │ 3*   │ 9    │ 7    │ 13   │ 1*      │ 1      │ NOT READY │
│ unit.002 │ Present simple              │ 8    │ 0    │ 8    │ 0    │ 8    │ 0       │ 0      │ NOT READY │
│ unit.003 │ Present cont. & simple 1    │ 4    │ 0    │ 4    │ 0    │ 4    │ 0       │ 4      │ NOT READY │
│ unit.004 │ Present cont. & simple 2    │ 4    │ 0    │ 4    │ 0    │ 4    │ 0       │ 3      │ NOT READY │
│ unit.005 │ Past simple                 │ 2    │ 0    │ 2    │ 0    │ 2    │ 0       │ 0      │ NOT READY │
├──────────┴─────────────────────────────┼──────┼──────┼──────┼──────┼──────┼─────────┼────────┼───────────┤
│ TOTALS ACROSS ACTIVE BANK:             │ 37   │ 3    │ 27   │ 7    │ 31   │ 1       │ 8      │ 0/5 READY │
└────────────────────────────────────────┴──────┴──────┴──────┴──────┴──────┴─────────┴────────┴───────────┘
*Note: For unit.001, Napp=3 items exist, but all 3 share the identical IT server template, yielding K_ctx(Appr)=1. Additionally, 2 of those 3 approved items have verb-object collocation defects.
```

---

## 3. Granular Concept-by-Concept Deep Dive

### 3.1 Concept `unit.001`: Present continuous (`I am doing`)
- **Total Inventory:** 19 items (3 approved, 9 validated, 5 archived, 2 withdrawn).
- **Approved Active Items ($N_{\text{app}} = 3$):**
  - `7d9abd94` (*"he is entering the server hardware"*) — Collocation error.
  - `44931eb1` (*"he is explaining the server hardware"*) — Collocation error.
  - `45e751fd` (*"he is repairing the server hardware"*) — Valid.
- **Approved Distinct Contexts:** $K_{\text{ctx}} = 1$. All 3 approved items map to `cluster-2` (`it_technology`).
- **Validated Inventory Available for Approval ($N_{\text{val}} = 9$):**
  - Spans **7 distinct workplace domains** (`marketing_sales`, `corporate_management`, `finance_accounting`, `manufacturing_production`, `logistics_shipping`, `it_technology`).
  - Total candidate clusters across all items: $K_{\text{ctx}} = 13$.
- **Evidence Sufficiency Verdict:** **INSUFFICIENT ($1 < 3$)**.
- **Path to Sufficiency:** Upon editorial approval of validated items `b7c4793c` (Marketing), `2afc939e` (Finance), and `2997562b` (Manufacturing), $N_{\text{app}}$ reaches 4 (with `45e751fd`) and $K_{\text{ctx}}$ immediately jumps from **1 to 4**, satisfying the preliminary sufficiency gate without generating new items.

---

### 3.2 Concept `unit.002`: Present simple (`I do`)
- **Total Inventory:** 8 items (0 approved, 8 validated, 0 archived, 0 withdrawn).
- **Approved Active Items:** $N_{\text{app}} = 0$.
- **Validated Inventory ($N_{\text{val}} = 8$):**
  - Spans **5 distinct workplace domains**:
    - `32ed699c` (`logistics_shipping`)
    - `a47fbe81` (`it_technology`)
    - `eb746b7c` (`hospitality_travel`)
    - `92a0e4b0` (`corporate_management`)
    - `a6c7ae58`, `f5381446`, `f89aceea`, `a9d29ec3` (`general_business`)
  - Distinct candidate context clusters: $K_{\text{ctx}} = 8$.
- **Evidence Sufficiency Verdict:** **INSUFFICIENT ($0 < 3$)**.
- **Path to Sufficiency:** All 8 validated items passed linguistic checks. The owner can immediately approve 3–5 items across logistics, IT, travel, and management to achieve $K_{\text{ctx}} \ge 3$ instantly.

---

### 3.3 Concept `unit.003`: Present continuous and simple 1 (`I am doing and I do`)
- **Total Inventory:** 4 items (0 approved, 4 validated).
- **Misalignment Analysis:**
  - `6948841f`: Past continuous (*was working*) $\to$ Belongs to `unit.006`.
  - `c10918d0`: Past continuous (*was reviewing*) $\to$ Belongs to `unit.006`.
  - `77299aeb`: Third conditional (*Had noticed*) $\to$ Belongs to `unit.038`/`040`.
  - `43753724`: Past simple (*voted*) $\to$ Belongs to `unit.005`.
- **Valid Unit 3 Items in Bank:** **0**.
- **Evidence Sufficiency Verdict:** **CRITICAL DEFICIT / NOT READY**.
- **Path to Sufficiency:** Requires authoring a brand new set of 4–6 Part 5 items contrasting habitual present vs ongoing temporary present (e.g., *"Although Mr. Vance usually works at headquarters, he _______ from our regional branch this month"*).

---

### 3.4 Concept `unit.004`: Present continuous and simple 2 (`Stative Verbs`)
- **Total Inventory:** 4 items (0 approved, 4 validated).
- **Misalignment Analysis:**
  - `fe61381a`: Stative verb (*doubts*) $\to$ Valid `unit.004`.
  - `ac0c643a`: Habitual action (*publishes*) $\to$ Belongs to `unit.002`.
  - `6e803d45`: Action happening now (*is giving*) $\to$ Belongs to `unit.001`.
  - `7addbaf6`: Action happening now (*is explaining*) $\to$ Belongs to `unit.001`.
- **Valid Unit 4 Items in Bank:** **1** (`fe61381a`).
- **Evidence Sufficiency Verdict:** **DEFICIT / NOT READY**.
- **Path to Sufficiency:** Needs 3 additional stative verb items (testing *contain*, *prefer*, *belong*, *know* in corporate Part 5 contexts).

---

### 3.5 Concept `unit.005`: Past simple (`I did`)
- **Total Inventory:** 2 items (0 approved, 2 validated).
- **Validated Items:**
  - `0707bbd2`: Irregular verb (*found*) $\to$ Valid `unit.005`.
  - `4ce8fea3`: Regular verb (*delivered*) $\to$ Valid `unit.005`.
- **Plus misclassified item from Unit 3:**
  - `43753724`: Past simple regular (*voted*) $\to$ Can be reclassified to `unit.005`.
- **Evidence Sufficiency Verdict:** **INSUFFICIENT ($0 < 3$)**.
- **Path to Sufficiency:** With the reclassification of `43753724`, Unit 5 reaches 3 candidate items. Approving all three yields $N_{\text{app}} = 3$ and $K_{\text{ctx}} = 3$.

---

## 4. Prohibition of Unit-Level Context Substitution

A recurring risk in learning analytics is aggregating contexts at the **Unit level** rather than the **Concept level**.

```
PROHIBITED REASONING:
"Unit 1 has 19 total questions and 13 context clusters, therefore Unit 1 has sufficient evidence."

CORRECT REASONING:
"Evidence sufficiency is evaluated strictly at the individual Concept level (and rule sub-skill level). A learner who demonstrates transfer on 'actions happening now' (Rule 1A) has NOT demonstrated transfer on 'trends and developing processes' (Rule 1E). Context counts cannot be cross-subsidized across distinct cognitive constructs."
```

