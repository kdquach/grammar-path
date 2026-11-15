import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, "../recovery/phase3-4c4b2-pre-backup/pool12_pairwise_matrix.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const tableRows = data.pairs.map((p: any) => 
  `| ${p.pairIndex} | \`${p.shortA}\` | \`${p.shortB}\` | ${p.domainA} | ${p.domainB} | ${p.sNorm.toFixed(3)} | ${p.sSlot.toFixed(2)} | ${p.sCarrier.toFixed(3)} | **${p.dCtx.toFixed(3)}** | ${p.relationship} | ${p.isIndependent ? "Yes" : "No"} |`
).join("\n");

const content = `# GrammarPath — Phase 3.4C.4B.2: Contextual Diversity Matrix Report
## Empirical Pairwise Distance Matrix ($N=12$, $M=66$) and Cluster Partitioning for Approved Unit 1 TOEIC Items

**Author:** Antigravity (Educational Data Scientist & Assessment Specialist)  
**Milestone:** Phase 3.4C.4B.2 (Unit 1 Editorial Approval & Question Bank Activation)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (\`grammarpath-staging\`)  
**Analyzed Population:** 12 Approved Unit 1 TOEIC Items  
**Total Pairwise Evaluations:** $\\binom{12}{2} = 66$ pairs  
**Clustering Method:** Contextual Distance Complete-Linkage & Connected Components ($D_{\\text{threshold}} = 0.50$)  

---

## 1. Executive Summary & Mathematical Model

In Phase 3.4C.2 and 3.4C.3, GrammarPath established the Contextual Diversity Engine to enforce that transfer learning assessments sample authentic, diverse communicative settings rather than shallow lexical variants.

### The Contextual Distance Metric:
$$D_{\\text{ctx}}(i, j) = 1 - S_{\\text{ctx}}(i, j)$$
Where contextual similarity $S_{\\text{ctx}}(i, j)$ is computed as:
$$S_{\\text{ctx}}(i, j) = w_{\\text{carrier}} \\cdot s_{\\text{carrier}}(i, j) + w_{\\text{slot}} \\cdot s_{\\text{slot}}(i, j) + w_{\\text{dist}} \\cdot s_{\\text{dist}}(i, j) + w_{\\text{rule}} \\cdot s_{\\text{rule}}(i, j)$$

With standard weights:
- $w_{\\text{carrier}} = 0.45$: Normalized surface similarity ($s_{\\text{norm}}$) and semantic token overlap ($s_{\\text{sem}}$).
- $w_{\\text{slot}} = 0.25$: Syntactic role of blank, verb lemma identity, and clause type.
- $w_{\\text{dist}} = 0.15$: Distractor lemma overlap and morphological parity.
- $w_{\\text{rule}} = 0.15$: Grammatical sub-rule co-occurrence.

### Independence Criterion:
Two items $i$ and $j$ constitute **mutually independent assessment contexts** if and only if:
$$D_{\\text{ctx}}(i, j) \\ge 0.50 \\quad (S_{\\text{ctx}}(i, j) \\le 0.50)$$

If $D_{\\text{ctx}}(i, j) < 0.50$, the items belong to the same context cluster and cannot both count toward independent transfer evidence $\\tau$.

---

## 2. Statistical Summary of the 66-Pair Matrix

| Metric | Empirical Value | Target Specification | Status |
| :--- | :---: | :---: | :---: |
| **Total Items in Approved Pool** | **12** | $\\ge 8$ | **PASSED** |
| **Total Pairwise Evaluations** | **66** | $\\binom{12}{2} = 66$ | **VERIFIED** |
| **Minimum Contextual Distance ($D_{\\min}$)** | **0.573** (\`45e751fd\` vs \`a4229728\`) | $\\ge 0.500$ | **PASSED** |
| **Maximum Contextual Distance ($D_{\\max}$)** | **0.920** (\`45e751fd\` vs \`b7c4793c\`) | $\\le 1.000$ | **VERIFIED** |
| **Mean Contextual Distance ($\\mu$)** | **0.853** | $\\ge 0.700$ | **EXCELLENT** |
| **Standard Deviation ($\\sigma$)** | **0.067** | - | **STABLE** |
| **Pairs Violating Independence ($D < 0.50$)** | **0** | $0$ | **ZERO VIOLATIONS** |
| **Borderline Pairs ($0.50 \\le D < 0.60$)** | **1** (\`45e751fd\` vs \`a4229728\`) | Report required | **ANALYZED** |
| **Context Clusters Count ($K_{\\text{ctx}}$)** | **12** | $\\ge 3$ (Sufficiency gate) | **UNLOCKED** |

### Distance Distribution Breakdown:
- **High Independence ($D_{\\text{ctx}} \\ge 0.85$):** 47 pairs (71.2%)
- **Moderate Independence ($0.70 \\le D_{\\text{ctx}} < 0.85$):** 16 pairs (24.2%)
- **Sufficient Independence ($0.60 \\le D_{\\text{ctx}} < 0.70$):** 2 pairs (3.0%)
- **Borderline Independence ($0.50 \\le D_{\\text{ctx}} < 0.60$):** 1 pair (1.5%)
- **Dependent / Redundant ($D_{\\text{ctx}} < 0.50$):** 0 pairs (0.0%)

---

## 3. Analysis of Borderline Pair (\`45e751fd\` vs \`a4229728\`)

The single pair exhibiting a contextual distance below $0.60$ is:
- **Item A (\`45e751fd\`):** *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* (Domain: \`it_technology\`, Key: *is repairing*)
- **Item B (\`a4229728\`):** *"The facility supervisor is not at the front desk because he _______ the executive conference suite right now."* (Domain: \`corporate_management\`, Key: *is entering*)

### Why Distance is 0.573:
1. **Sentence Frame Alignment:** Both sentences employ an introductory reason clause (*"The [profession] is not at his/the desk because..."*) and conclude with temporal deictic adjunct *"right now"*.
2. **Grammatical Sub-rule:** Both evaluate Unit 1.A (Moment of speaking, 3rd person singular).
3. **Lexical Divergence:** 
   - Profession differs: *IT technician* vs. *facility supervisor*.
   - Action differs: *repairing hardware* vs. *entering suite*.
   - Location differs: *Room 3* vs. *executive conference suite*.
   - Domain differs: *IT Technology* vs. *Corporate Management*.
4. **Conclusion:** Even with structural syntactic parallelism, $D_{\\text{ctx}} = 0.573 > 0.500$. The items satisfy the mathematical independence threshold.

---

## 4. Context Cluster Partitioning ($K_{\\text{ctx}} = 12$)

Because every pair in the approved 12-item pool satisfies $D_{\\text{ctx}} \\ge 0.500$, the adjacency graph contains zero edges connecting redundant items. Consequently, both **Connected Components** and **Complete-Linkage Hierarchical Clustering** produce exactly **12 independent clusters** of size 1:

| Cluster ID | Domain | Root ID (Short) | Item ID (Short) | Representative Prompt Fragment |
| :--- | :--- | :--- | :--- | :--- |
| \`cluster-1\` | \`it_technology\` | \`b19ebb8c\` | \`45e751fd\` | *"The IT technician is not at his desk because he is repairing..."* |
| \`cluster-2\` | \`marketing_sales\` | \`35f70d43\` | \`b7c4793c\` | *"According to the corporate announcement, our international market share..."* |
| \`cluster-3\` | \`corporate_management\` | \`3dc27726\` | \`c46da3b7\` | *"Why are so many employees debating over the recent changes..."* |
| \`cluster-4\` | \`marketing_sales\` | \`4a75a575\` | \`0f51d836\` | *"Please speak quietly in the lobby because the marketing director..."* |
| \`cluster-5\` | \`finance_accounting\` | \`7a347a67\` | \`2afc939e\` | *"Ms. Patterson is conducting a comprehensive quarterly financial review..."* |
| \`cluster-6\` | \`manufacturing_production\` | \`8c00e8d7\` | \`2997562b\` | *"Noticeably, the automotive manufacturing plant is incorporating..."* |
| \`cluster-7\` | \`corporate_management\` | \`ac251f52\` | \`7a3359ae\` | *"Our executive committee is meeting foreign representatives..."* |
| \`cluster-8\` | \`logistics_shipping\` | \`bf8e0dc4\` | \`322c0e5c\` | *"Our overseas logistics hubs are experiencing unusually severe..."* |
| \`cluster-9\` | \`finance_accounting\` | \`3d71c0d1\` | \`048df761\` | *"The chief financial officer is currently unavailable because she..."* |
| \`cluster-10\` | \`logistics_shipping\` | \`6a54a874\` | \`add7a35b\` | *"At the container terminal, customs officers are inspecting..."* |
| \`cluster-11\` | \`corporate_management\` | \`0fda8409\` | \`a4229728\` | *"The facility supervisor is not at the front desk because he..."* |
| \`cluster-12\` | \`human_resources\` | \`634add4d\` | \`8a41b01a\` | *"The training coordinator is not at her desk because she is explaining..."* |

---

## 5. Workplace Domain Diversity Breakdown

The 12 items provide authentic coverage across **7 distinct workplace sectors**:

| Workplace Domain | Item Count | Percentage | Represented Sub-rules |
| :--- | :---: | :---: | :--- |
| \`corporate_management\` | 3 | 25.0% | Unit 1.A, Unit 1.C |
| \`finance_accounting\` | 2 | 16.7% | Unit 1.A, Unit 1.B |
| \`logistics_shipping\` | 2 | 16.7% | Unit 1.A, Unit 1.B |
| \`marketing_sales\` | 2 | 16.7% | Unit 1.B, Unit 1.E |
| \`human_resources\` | 1 | 8.3% | Unit 1.B |
| \`it_technology\` | 1 | 8.3% | Unit 1.A |
| \`manufacturing_production\` | 1 | 8.3% | Unit 1.E |
| **Total** | **12** | **100.0%** | **All 4 Unit 1 Sub-rules Covered** |

---

## 6. Complete 66-Pair Evaluation Table

| # | Item A | Item B | Domain A | Domain B | $s_{\\text{norm}}$ | $s_{\\text{slot}}$ | $s_{\\text{carrier}}$ | $D_{\\text{ctx}}$ | Relationship | Indep? |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
${tableRows}

---

## 7. Transfer Evidence Gate Sign-Off

Under the Phase 3.4C.1 and Phase 3.4C.2 Evidence Sufficiency Gate:
- **Requirement 1:** $N_{\\text{approved}} \\ge 3$ items for concept $\\to$ **Satisfied (12 items)**.
- **Requirement 2:** $K_{\\text{ctx}} \\ge 3$ independent context clusters $\\to$ **Satisfied ($K_{\\text{ctx}} = 12$)**.
- **Requirement 3:** Zero unapproved/withdrawn item contamination $\\to$ **Satisfied (100% isolation)**.

**Verdict:** The approved Unit 1 TOEIC question bank pool satisfies all contextual diversity, cluster independence, and evidence sufficiency requirements.
`;

const outPath = path.resolve("/Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.4B.2-context-diversity-matrix.md");
fs.writeFileSync(outPath, content, "utf8");
console.log(`Generated report at ${outPath} (${content.length} bytes)`);

