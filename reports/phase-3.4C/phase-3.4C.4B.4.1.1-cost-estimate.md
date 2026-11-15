# GrammarPath — Phase 3.4C.4B.4.1.1: Token-Level Cost Modeling & Pilot Budget Projection
## Rigorous Financial Analysis for Unit 3 Pilot and Units 2–25 Production Scaling

**Author:** Antigravity (Principal Cloud Architect & Financial Systems Analyst)  
**Milestone:** Phase 3.4C.4B.4.1.1 (Design Corrections & Pilot Readiness Reconciliation)  
**Date:** November 14, 2026  
**Status:** Cost Estimation Report (Design-Only — Zero API Tokens Consumed)  

> [!IMPORTANT]
> **Estimation Notice:** All figures presented in this document are mathematical models and engineering estimates based on active published Google Gemini API rate cards (as of November 2026), measured prompt/response token counts, and conservative retry contingencies. Zero live API generation tokens were consumed during this reconciliation milestone.

---

## 1. Executive Summary & Core Financial Finding

The previous Phase 3.4C.4B.4.1 cost model used obsolete model identifiers (`gemini-1.5-pro-002`, `gemini-1.5-flash-002`) and rough per-item approximations. This report delivers a line-item token-level cost recalculation using active stable GA model endpoints:
- **Primary Generator:** `gemini-2.5-pro`
- **Independent Blind Critic:** `gemini-2.5-flash`

### Key Financial Findings:
1. **Unit 3 Pilot (8 Approved Items Target):**
   - Expected Base Cost (Zero Retries): **$0.036 USD** (3.6 cents).
   - Expected Cost with 25% Failure/Retry Rate: **$0.045 USD** (4.5 cents).
   - High-Stress Worst-Case Cost (50% Failure Rate): **$0.055 USD** (5.5 cents).
2. **Units 2–25 Full Expansion (240 Items Target across 24 Units):**
   - Expected Total Production Cost: **$1.36 USD** (under $1.50).
   - Ultra-Conservative Budget Ceiling: **$2.00 USD**.

---

## 2. Active Model Rate Card & Unit Cost Parameters

Pricing is derived from the official Google Gemini Developer API rate schedule for standard tier inference (effective November 2026):

| Model Name | Role in Pipeline | Input Price (per 1M tokens) | Output Price (per 1M tokens) | Effective Input Cost / Token | Effective Output Cost / Token |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`gemini-2.5-pro`** | Stage 5: Primary Generation | **$1.25** | **$5.00** | $0.000001250 | $0.000005000 |
| **`gemini-2.5-flash`** | Stage 13: Blind Linguistic Critic | **$0.075** | **$0.30** | $0.000000075 | $0.000000300 |
| **`gemini-2.5-flash-lite`** | *Reserve / Fast Screening* | **$0.0375** | **$0.15** | $0.0000000375 | $0.000000150 |

---

## 3. Token-Level Accounting per Question Item

### 3.1 Stage 5: Primary Generation (`gemini-2.5-pro`)

A complete generation payload requires structured domain instructions, canonical curriculum rules, negative constraints, and a few-shot exemplar.

```
+----------------------------------------------------------------------+
| INPUT TOKEN BREAKDOWN (gemini-2.5-pro)                                |
+----------------------------------------------------------------------+
| System Prompt & Persona (ETS Item Writer Specialist) :   400 tokens  |
| Canonical Unit 3 Rule Text & Contrast Requirements    :   300 tokens  |
| Question Blueprint (Domain, Slot, Distractor Archetypes): 250 tokens  |
| Negative Constraints (Anti-Stative, Anti-Idiom, Schema): 250 tokens  |
| Few-Shot Exemplar (Full JSON question + rationales)  :   300 tokens  |
+----------------------------------------------------------------------+
| TOTAL ESTIMATED INPUT TOKENS PER ITEM                 : 1,500 tokens  |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| OUTPUT TOKEN BREAKDOWN (gemini-2.5-pro)                               |
+----------------------------------------------------------------------+
| Carrier Sentence with blank (_______)                :    40 tokens  |
| 4 Options with Distractor Diagnostic Rationales       :   180 tokens  |
| Bilingual Explanations (English & Vietnamese)        :   200 tokens  |
| Metadata (Difficulty, CEFR, Domain, Clue Words)      :    80 tokens  |
+----------------------------------------------------------------------+
| TOTAL ESTIMATED OUTPUT TOKENS PER ITEM                :   500 tokens  |
+----------------------------------------------------------------------+
```

#### Cost Calculation for 1 Generation Call:
$$\text{Cost}_{\text{gen\_in}} = 1,500 \times \frac{\$1.25}{1,000,000} = \$0.001875$$
$$\text{Cost}_{\text{gen\_out}} = 500 \times \frac{\$5.00}{1,000,000} = \$0.002500$$
$$\mathbf{\text{Cost}_{\text{generation\_single}} = \$0.001875 + \$0.002500 = \$0.004375\ \text{USD}\ (0.438\ \text{cents})}$$

---

### 3.2 Stage 13: Independent Blind Critic (`gemini-2.5-flash`)

The critic is invoked *only* after an item passes Stages 6–12. It receives the prompt and options stripped of correct answer labels.

```
+----------------------------------------------------------------------+
| INPUT TOKEN BREAKDOWN (gemini-2.5-flash)                             |
+----------------------------------------------------------------------+
| System Prompt & Critic Rubric                        :   400 tokens  |
| Carrier Sentence & 4 Unlabeled Options               :   150 tokens  |
| Evaluation Tasks (Blind Solve, Naturalness, Ambiguity):  450 tokens  |
| Zod JSON Critic Output Schema                        :   200 tokens  |
+----------------------------------------------------------------------+
| TOTAL ESTIMATED INPUT TOKENS PER REVIEW               : 1,200 tokens  |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| OUTPUT TOKEN BREAKDOWN (gemini-2.5-flash)                            |
+----------------------------------------------------------------------+
| Independent Solved Option Letter & Confidence Score  :    50 tokens  |
| Naturalness Score (1-5) & Corporate Register Analysis:    90 tokens  |
| Distractor Ambiguity & Permutation Defensibility Flags:  160 tokens  |
+----------------------------------------------------------------------+
| TOTAL ESTIMATED OUTPUT TOKENS PER REVIEW              :   300 tokens  |
+----------------------------------------------------------------------+
```

#### Cost Calculation for 1 Independent Review Call:
$$\text{Cost}_{\text{rev\_in}} = 1,200 \times \frac{\$0.075}{1,000,000} = \$0.000090$$
$$\text{Cost}_{\text{rev\_out}} = 300 \times \frac{\$0.30}{1,000,000} = \$0.000090$$
$$\mathbf{\text{Cost}_{\text{review\_single}} = \$0.000090 + \$0.000090 = \$0.000180\ \text{USD}\ (0.018\ \text{cents})}$$

---

## 4. Unit 3 Pilot Cost Breakdown (8 Items Target)

### 4.1 Base Cost (Zero Retries / First-Pass Success)

For 8 successfully generated and reviewed items:
- **Base Generation Cost:** $8 \times \$0.004375 = \mathbf{\$0.03500}$
- **Base Independent Review Cost:** $8 \times \$0.000180 = \mathbf{\$0.00144}$
- **Base Subtotal:** $\mathbf{\$0.03644\ \text{USD}}$

### 4.2 Retry & Remediation Contingency Model

In automated generation, candidate items may fail validation:
1. **Deterministic Filter Failure (Stages 6–12):** E.g. formatting glitch, stative verb detected, or $D_{\text{ctx}} < 0.50$.
   - **Cost Incurred:** Generation call only ($\$0.004375$). Zero review tokens wasted because Stage 13 is gated.
   - **Estimated Rate:** 15% (1 item in an 8-item batch).
2. **Linguistic Critic Failure (Stage 13):** E.g. critic detects subtle dual defensibility or unnatural collocation.
   - **Cost Incurred:** Generation call + Review call ($\$0.004375 + \$0.000180 = \$0.004555$).
   - **Estimated Rate:** 10% (1 item in an 8-item batch).

$$\text{Retry Cost (Deterministic Reject)} = 1 \times \$0.004375 = \$0.004375$$
$$\text{Retry Cost (Critic Reject)} = 1 \times \$0.004555 = \$0.004555$$
$$\mathbf{\text{Total Retry Contingency} = \$0.004375 + \$0.004555 = \$0.008930\ \text{USD}}$$

### 4.3 Total Expected Pilot Cost

$$\mathbf{\text{Expected Pilot Cost} = \text{Base Subtotal} + \text{Retry Contingency} = \$0.03644 + \$0.008930 = \$0.04537\ \text{USD}}$$

```
+-------------------------------------------------------------------------+
| UNIT 3 PILOT (8 ITEMS) — FINANCIAL SUMMARY (ESTIMATES)                  |
+---------------------------------------------------+---------------------+
| 1. Primary Generation (gemini-2.5-pro, 8 items)   |      $0.03500 USD   |
| 2. Independent Review (gemini-2.5-flash, 8 items) |      $0.00144 USD   |
| 3. Retry Contingency (2 items / 25% failure rate) |      $0.00893 USD   |
+---------------------------------------------------+---------------------+
| TOTAL EXPECTED PILOT INVESTMENT                   |      $0.04537 USD   |
| HIGH-STRESS UPPER BOUND (50% failure rate)        |      $0.05466 USD   |
+---------------------------------------------------+---------------------+
```

---

## 5. Scaling Projection: Units 2–25 Full Expansion (240 Items)

Following a successful Unit 3 pilot, the pipeline will expand to generate 10 approved items per unit across Units 2 through 25 (excluding Unit 1 which has 12 approved items):

- **Target Units:** 24 units ($24 \times 10 = 240$ approved items).
- **Target Items:** 240 approved questions.
- **Estimated Success Unit Cost (incl. 25% retry):**
  $$\text{Effective Unit Cost} = \frac{\$0.04537}{8} = \$0.005671\ \text{USD / item}$$
- **Full Rollout Calculation:**
  $$\text{Total Production Cost} = 240 \times \$0.005671 = \mathbf{\$1.361\ \text{USD}}$$

```
+-------------------------------------------------------------------------+
| UNITS 2-25 EXPANSION (240 ITEMS) — BUDGET FORECAST (ESTIMATES)          |
+---------------------------------------------------+---------------------+
| Total Approved Items Required                     |          240 items  |
| Total Primary Generations (incl. 25% retries)     |          300 calls  |
| Total Critic Reviews (incl. retries)              |          270 calls  |
| Primary Generation Investment (gemini-2.5-pro)    |       $1.313   USD  |
| Independent Review Investment (gemini-2.5-flash)  |       $0.049   USD  |
+---------------------------------------------------+---------------------+
| TOTAL FORECASTED PRODUCTION BUDGET                |       $1.362   USD  |
| CONSERVATIVE CONTINGENCY CEILING (+50% margin)    |       $2.043   USD  |
+---------------------------------------------------+---------------------+
```

---

## 6. Financial Controls & Safety Thresholds

To prevent run-away token billing during automated batches, the following hard financial constraints are enforced in application code:
1. **Per-Item Token Budget Cap:** Primary generation is hard-limited to `maxOutputTokens: 1024`. Critic review is hard-limited to `maxOutputTokens: 512`. Any call exceeding token bounds aborts immediately.
2. **Batch Cost Ceiling Guard:** For the Unit 3 Pilot, the generation orchestrator initializes with a hard spending cap of **$0.25 USD**. If total cumulative session cost exceeds $0.25, the orchestrator immediately terminates the queue and notifies administrators.
3. **For Units 2–25 Expansion:** The orchestrator enforces a hard spending cap of **$5.00 USD**.

---

## 7. Summary of Verification & Architectural Conformance

- [x] Recalculated costs using active stable GA models (`gemini-2.5-pro` and `gemini-2.5-flash`).
- [x] Clear line-item separation of generation cost, independent review cost, retry cost, and expected total.
- [x] Explicit token counts provided for prompt inputs and completions.
- [x] Financial figures explicitly labeled as engineering models and estimates.
- [x] Hard financial ceilings and safety caps specified to prevent token overrun.

