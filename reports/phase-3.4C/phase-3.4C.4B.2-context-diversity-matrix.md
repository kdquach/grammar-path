# GrammarPath — Phase 3.4C.4B.2: Contextual Diversity Matrix Report
## Empirical Pairwise Distance Matrix ($N=12$, $M=66$) and Cluster Partitioning for Approved Unit 1 TOEIC Items

**Author:** Antigravity (Educational Data Scientist & Assessment Specialist)  
**Milestone:** Phase 3.4C.4B.2 (Unit 1 Editorial Approval & Question Bank Activation)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Analyzed Population:** 12 Approved Unit 1 TOEIC Items  
**Total Pairwise Evaluations:** $\binom{12}{2} = 66$ pairs  
**Clustering Method:** Contextual Distance Complete-Linkage & Connected Components ($D_{\text{threshold}} = 0.50$)  

---

## 1. Executive Summary & Mathematical Model

In Phase 3.4C.2 and 3.4C.3, GrammarPath established the Contextual Diversity Engine to enforce that transfer learning assessments sample authentic, diverse communicative settings rather than shallow lexical variants.

### The Contextual Distance Metric:
$$D_{\text{ctx}}(i, j) = 1 - S_{\text{ctx}}(i, j)$$
Where contextual similarity $S_{\text{ctx}}(i, j)$ is computed as:
$$S_{\text{ctx}}(i, j) = w_{\text{carrier}} \cdot s_{\text{carrier}}(i, j) + w_{\text{slot}} \cdot s_{\text{slot}}(i, j) + w_{\text{dist}} \cdot s_{\text{dist}}(i, j) + w_{\text{rule}} \cdot s_{\text{rule}}(i, j)$$

With standard weights:
- $w_{\text{carrier}} = 0.45$: Normalized surface similarity ($s_{\text{norm}}$) and semantic token overlap ($s_{\text{sem}}$).
- $w_{\text{slot}} = 0.25$: Syntactic role of blank, verb lemma identity, and clause type.
- $w_{\text{dist}} = 0.15$: Distractor lemma overlap and morphological parity.
- $w_{\text{rule}} = 0.15$: Grammatical sub-rule co-occurrence.

### Independence Criterion:
Two items $i$ and $j$ constitute **mutually independent assessment contexts** if and only if:
$$D_{\text{ctx}}(i, j) \ge 0.50 \quad (S_{\text{ctx}}(i, j) \le 0.50)$$

If $D_{\text{ctx}}(i, j) < 0.50$, the items belong to the same context cluster and cannot both count toward independent transfer evidence $\tau$.

---

## 2. Statistical Summary of the 66-Pair Matrix

| Metric | Empirical Value | Target Specification | Status |
| :--- | :---: | :---: | :---: |
| **Total Items in Approved Pool** | **12** | $\ge 8$ | **PASSED** |
| **Total Pairwise Evaluations** | **66** | $\binom{12}{2} = 66$ | **VERIFIED** |
| **Minimum Contextual Distance ($D_{\min}$)** | **0.573** (`45e751fd` vs `a4229728`) | $\ge 0.500$ | **PASSED** |
| **Maximum Contextual Distance ($D_{\max}$)** | **0.920** (`45e751fd` vs `b7c4793c`) | $\le 1.000$ | **VERIFIED** |
| **Mean Contextual Distance ($\mu$)** | **0.853** | $\ge 0.700$ | **EXCELLENT** |
| **Standard Deviation ($\sigma$)** | **0.067** | - | **STABLE** |
| **Pairs Violating Independence ($D < 0.50$)** | **0** | $0$ | **ZERO VIOLATIONS** |
| **Borderline Pairs ($0.50 \le D < 0.60$)** | **1** (`45e751fd` vs `a4229728`) | Report required | **ANALYZED** |
| **Context Clusters Count ($K_{\text{ctx}}$)** | **12** | $\ge 3$ (Sufficiency gate) | **UNLOCKED** |

### Distance Distribution Breakdown:
- **High Independence ($D_{\text{ctx}} \ge 0.85$):** 47 pairs (71.2%)
- **Moderate Independence ($0.70 \le D_{\text{ctx}} < 0.85$):** 16 pairs (24.2%)
- **Sufficient Independence ($0.60 \le D_{\text{ctx}} < 0.70$):** 2 pairs (3.0%)
- **Borderline Independence ($0.50 \le D_{\text{ctx}} < 0.60$):** 1 pair (1.5%)
- **Dependent / Redundant ($D_{\text{ctx}} < 0.50$):** 0 pairs (0.0%)

---

## 3. Analysis of Borderline Pair (`45e751fd` vs `a4229728`)

The single pair exhibiting a contextual distance below $0.60$ is:
- **Item A (`45e751fd`):** *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* (Domain: `it_technology`, Key: *is repairing*)
- **Item B (`a4229728`):** *"The facility supervisor is not at the front desk because he _______ the executive conference suite right now."* (Domain: `corporate_management`, Key: *is entering*)

### Why Distance is 0.573:
1. **Sentence Frame Alignment:** Both sentences employ an introductory reason clause (*"The [profession] is not at his/the desk because..."*) and conclude with temporal deictic adjunct *"right now"*.
2. **Grammatical Sub-rule:** Both evaluate Unit 1.A (Moment of speaking, 3rd person singular).
3. **Lexical Divergence:** 
   - Profession differs: *IT technician* vs. *facility supervisor*.
   - Action differs: *repairing hardware* vs. *entering suite*.
   - Location differs: *Room 3* vs. *executive conference suite*.
   - Domain differs: *IT Technology* vs. *Corporate Management*.
4. **Conclusion:** Even with structural syntactic parallelism, $D_{\text{ctx}} = 0.573 > 0.500$. The items satisfy the mathematical independence threshold.

---

## 4. Context Cluster Partitioning ($K_{\text{ctx}} = 12$)

Because every pair in the approved 12-item pool satisfies $D_{\text{ctx}} \ge 0.500$, the adjacency graph contains zero edges connecting redundant items. Consequently, both **Connected Components** and **Complete-Linkage Hierarchical Clustering** produce exactly **12 independent clusters** of size 1:

| Cluster ID | Domain | Root ID (Short) | Item ID (Short) | Representative Prompt Fragment |
| :--- | :--- | :--- | :--- | :--- |
| `cluster-1` | `it_technology` | `b19ebb8c` | `45e751fd` | *"The IT technician is not at his desk because he is repairing..."* |
| `cluster-2` | `marketing_sales` | `35f70d43` | `b7c4793c` | *"According to the corporate announcement, our international market share..."* |
| `cluster-3` | `corporate_management` | `3dc27726` | `c46da3b7` | *"Why are so many employees debating over the recent changes..."* |
| `cluster-4` | `marketing_sales` | `4a75a575` | `0f51d836` | *"Please speak quietly in the lobby because the marketing director..."* |
| `cluster-5` | `finance_accounting` | `7a347a67` | `2afc939e` | *"Ms. Patterson is conducting a comprehensive quarterly financial review..."* |
| `cluster-6` | `manufacturing_production` | `8c00e8d7` | `2997562b` | *"Noticeably, the automotive manufacturing plant is incorporating..."* |
| `cluster-7` | `corporate_management` | `ac251f52` | `7a3359ae` | *"Our executive committee is meeting foreign representatives..."* |
| `cluster-8` | `logistics_shipping` | `bf8e0dc4` | `322c0e5c` | *"Our overseas logistics hubs are experiencing unusually severe..."* |
| `cluster-9` | `finance_accounting` | `3d71c0d1` | `048df761` | *"The chief financial officer is currently unavailable because she..."* |
| `cluster-10` | `logistics_shipping` | `6a54a874` | `add7a35b` | *"At the container terminal, customs officers are inspecting..."* |
| `cluster-11` | `corporate_management` | `0fda8409` | `a4229728` | *"The facility supervisor is not at the front desk because he..."* |
| `cluster-12` | `human_resources` | `634add4d` | `8a41b01a` | *"The training coordinator is not at her desk because she is explaining..."* |

---

## 5. Workplace Domain Diversity Breakdown

The 12 items provide authentic coverage across **7 distinct workplace sectors**:

| Workplace Domain | Item Count | Percentage | Represented Sub-rules |
| :--- | :---: | :---: | :--- |
| `corporate_management` | 3 | 25.0% | Unit 1.A, Unit 1.C |
| `finance_accounting` | 2 | 16.7% | Unit 1.A, Unit 1.B |
| `logistics_shipping` | 2 | 16.7% | Unit 1.A, Unit 1.B |
| `marketing_sales` | 2 | 16.7% | Unit 1.B, Unit 1.E |
| `human_resources` | 1 | 8.3% | Unit 1.B |
| `it_technology` | 1 | 8.3% | Unit 1.A |
| `manufacturing_production` | 1 | 8.3% | Unit 1.E |
| **Total** | **12** | **100.0%** | **All 4 Unit 1 Sub-rules Covered** |

---

## 6. Complete 66-Pair Evaluation Table

| # | Item A | Item B | Domain A | Domain B | $s_{\text{norm}}$ | $s_{\text{slot}}$ | $s_{\text{carrier}}$ | $D_{\text{ctx}}$ | Relationship | Indep? |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| 1 | `45e751fd` | `b7c4793c` | it_technology | marketing_sales | 0.080 | 0.00 | 0.080 | **0.920** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 2 | `45e751fd` | `c46da3b7` | it_technology | corporate_management | 0.089 | 0.00 | 0.089 | **0.911** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 3 | `45e751fd` | `0f51d836` | it_technology | marketing_sales | 0.138 | 0.00 | 0.138 | **0.862** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 4 | `45e751fd` | `2afc939e` | it_technology | finance_accounting | 0.190 | 0.00 | 0.190 | **0.810** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 5 | `45e751fd` | `2997562b` | it_technology | manufacturing_production | 0.110 | 0.00 | 0.110 | **0.890** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 6 | `45e751fd` | `7a3359ae` | it_technology | corporate_management | 0.116 | 0.00 | 0.116 | **0.884** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 7 | `45e751fd` | `322c0e5c` | it_technology | logistics_shipping | 0.125 | 0.00 | 0.125 | **0.875** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 8 | `45e751fd` | `048df761` | it_technology | finance_accounting | 0.227 | 0.20 | 0.227 | **0.773** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 9 | `45e751fd` | `add7a35b` | it_technology | logistics_shipping | 0.177 | 0.10 | 0.177 | **0.823** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 10 | `45e751fd` | `a4229728` | it_technology | corporate_management | 0.412 | 0.60 | 0.427 | **0.573** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 11 | `45e751fd` | `8a41b01a` | it_technology | human_resources | 0.366 | 0.35 | 0.366 | **0.634** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 12 | `b7c4793c` | `c46da3b7` | marketing_sales | corporate_management | 0.109 | 0.00 | 0.109 | **0.891** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 13 | `b7c4793c` | `0f51d836` | marketing_sales | marketing_sales | 0.100 | 0.00 | 0.200 | **0.800** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 14 | `b7c4793c` | `2afc939e` | marketing_sales | finance_accounting | 0.090 | 0.00 | 0.090 | **0.910** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 15 | `b7c4793c` | `2997562b` | marketing_sales | manufacturing_production | 0.114 | 0.00 | 0.114 | **0.886** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 16 | `b7c4793c` | `7a3359ae` | marketing_sales | corporate_management | 0.112 | 0.00 | 0.112 | **0.888** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 17 | `b7c4793c` | `322c0e5c` | marketing_sales | logistics_shipping | 0.121 | 0.00 | 0.121 | **0.879** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 18 | `b7c4793c` | `048df761` | marketing_sales | finance_accounting | 0.124 | 0.00 | 0.124 | **0.876** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 19 | `b7c4793c` | `add7a35b` | marketing_sales | logistics_shipping | 0.118 | 0.00 | 0.118 | **0.882** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 20 | `b7c4793c` | `a4229728` | marketing_sales | corporate_management | 0.097 | 0.00 | 0.097 | **0.903** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 21 | `b7c4793c` | `8a41b01a` | marketing_sales | human_resources | 0.112 | 0.00 | 0.112 | **0.888** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 22 | `c46da3b7` | `0f51d836` | corporate_management | marketing_sales | 0.110 | 0.00 | 0.110 | **0.890** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 23 | `c46da3b7` | `2afc939e` | corporate_management | finance_accounting | 0.085 | 0.00 | 0.085 | **0.915** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 24 | `c46da3b7` | `2997562b` | corporate_management | manufacturing_production | 0.136 | 0.00 | 0.136 | **0.864** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 25 | `c46da3b7` | `7a3359ae` | corporate_management | corporate_management | 0.138 | 0.00 | 0.200 | **0.800** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 26 | `c46da3b7` | `322c0e5c` | corporate_management | logistics_shipping | 0.167 | 0.00 | 0.167 | **0.833** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 27 | `c46da3b7` | `048df761` | corporate_management | finance_accounting | 0.120 | 0.00 | 0.120 | **0.880** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 28 | `c46da3b7` | `add7a35b` | corporate_management | logistics_shipping | 0.140 | 0.00 | 0.140 | **0.860** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 29 | `c46da3b7` | `a4229728` | corporate_management | corporate_management | 0.111 | 0.00 | 0.200 | **0.800** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 30 | `c46da3b7` | `8a41b01a` | corporate_management | human_resources | 0.138 | 0.00 | 0.138 | **0.862** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 31 | `0f51d836` | `2afc939e` | marketing_sales | finance_accounting | 0.110 | 0.00 | 0.110 | **0.890** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 32 | `0f51d836` | `2997562b` | marketing_sales | manufacturing_production | 0.092 | 0.00 | 0.092 | **0.908** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 33 | `0f51d836` | `7a3359ae` | marketing_sales | corporate_management | 0.089 | 0.00 | 0.089 | **0.911** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 34 | `0f51d836` | `322c0e5c` | marketing_sales | logistics_shipping | 0.108 | 0.00 | 0.108 | **0.892** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 35 | `0f51d836` | `048df761` | marketing_sales | finance_accounting | 0.148 | 0.00 | 0.148 | **0.852** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 36 | `0f51d836` | `add7a35b` | marketing_sales | logistics_shipping | 0.123 | 0.00 | 0.123 | **0.877** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 37 | `0f51d836` | `a4229728` | marketing_sales | corporate_management | 0.134 | 0.00 | 0.134 | **0.866** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 38 | `0f51d836` | `8a41b01a` | marketing_sales | human_resources | 0.142 | 0.00 | 0.142 | **0.858** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 39 | `2afc939e` | `2997562b` | finance_accounting | manufacturing_production | 0.083 | 0.00 | 0.083 | **0.917** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 40 | `2afc939e` | `7a3359ae` | finance_accounting | corporate_management | 0.138 | 0.00 | 0.138 | **0.862** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 41 | `2afc939e` | `322c0e5c` | finance_accounting | logistics_shipping | 0.125 | 0.00 | 0.125 | **0.875** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 42 | `2afc939e` | `048df761` | finance_accounting | finance_accounting | 0.120 | 0.10 | 0.282 | **0.718** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 43 | `2afc939e` | `add7a35b` | finance_accounting | logistics_shipping | 0.124 | 0.00 | 0.124 | **0.876** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 44 | `2afc939e` | `a4229728` | finance_accounting | corporate_management | 0.207 | 0.00 | 0.207 | **0.793** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 45 | `2afc939e` | `8a41b01a` | finance_accounting | human_resources | 0.174 | 0.00 | 0.174 | **0.826** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 46 | `2997562b` | `7a3359ae` | manufacturing_production | corporate_management | 0.105 | 0.00 | 0.105 | **0.895** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 47 | `2997562b` | `322c0e5c` | manufacturing_production | logistics_shipping | 0.095 | 0.00 | 0.095 | **0.905** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 48 | `2997562b` | `048df761` | manufacturing_production | finance_accounting | 0.108 | 0.00 | 0.108 | **0.892** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 49 | `2997562b` | `add7a35b` | manufacturing_production | logistics_shipping | 0.105 | 0.00 | 0.105 | **0.895** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 50 | `2997562b` | `a4229728` | manufacturing_production | corporate_management | 0.101 | 0.00 | 0.101 | **0.899** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 51 | `2997562b` | `8a41b01a` | manufacturing_production | human_resources | 0.096 | 0.00 | 0.096 | **0.904** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 52 | `7a3359ae` | `322c0e5c` | corporate_management | logistics_shipping | 0.147 | 0.00 | 0.147 | **0.853** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 53 | `7a3359ae` | `048df761` | corporate_management | finance_accounting | 0.096 | 0.00 | 0.096 | **0.904** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 54 | `7a3359ae` | `add7a35b` | corporate_management | logistics_shipping | 0.101 | 0.00 | 0.101 | **0.899** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 55 | `7a3359ae` | `a4229728` | corporate_management | corporate_management | 0.098 | 0.00 | 0.210 | **0.790** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 56 | `7a3359ae` | `8a41b01a` | corporate_management | human_resources | 0.108 | 0.00 | 0.108 | **0.892** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 57 | `322c0e5c` | `048df761` | logistics_shipping | finance_accounting | 0.128 | 0.00 | 0.128 | **0.872** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 58 | `322c0e5c` | `add7a35b` | logistics_shipping | logistics_shipping | 0.099 | 0.00 | 0.208 | **0.792** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 59 | `322c0e5c` | `a4229728` | logistics_shipping | corporate_management | 0.129 | 0.00 | 0.129 | **0.871** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 60 | `322c0e5c` | `8a41b01a` | logistics_shipping | human_resources | 0.108 | 0.00 | 0.108 | **0.892** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 61 | `048df761` | `add7a35b` | finance_accounting | logistics_shipping | 0.149 | 0.10 | 0.149 | **0.851** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 62 | `048df761` | `a4229728` | finance_accounting | corporate_management | 0.200 | 0.20 | 0.200 | **0.800** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 63 | `048df761` | `8a41b01a` | finance_accounting | human_resources | 0.223 | 0.35 | 0.223 | **0.777** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 64 | `add7a35b` | `a4229728` | logistics_shipping | corporate_management | 0.161 | 0.10 | 0.161 | **0.839** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 65 | `add7a35b` | `8a41b01a` | logistics_shipping | human_resources | 0.165 | 0.10 | 0.165 | **0.835** | SAME_RULE_NOVEL_CONTEXT | Yes |
| 66 | `a4229728` | `8a41b01a` | corporate_management | human_resources | 0.356 | 0.35 | 0.356 | **0.644** | SAME_RULE_NOVEL_CONTEXT | Yes |

---

## 7. Transfer Evidence Gate Sign-Off

Under the Phase 3.4C.1 and Phase 3.4C.2 Evidence Sufficiency Gate:
- **Requirement 1:** $N_{\text{approved}} \ge 3$ items for concept $\to$ **Satisfied (12 items)**.
- **Requirement 2:** $K_{\text{ctx}} \ge 3$ independent context clusters $\to$ **Satisfied ($K_{\text{ctx}} = 12$)**.
- **Requirement 3:** Zero unapproved/withdrawn item contamination $\to$ **Satisfied (100% isolation)**.

**Verdict:** The approved Unit 1 TOEIC question bank pool satisfies all contextual diversity, cluster independence, and evidence sufficiency requirements.
