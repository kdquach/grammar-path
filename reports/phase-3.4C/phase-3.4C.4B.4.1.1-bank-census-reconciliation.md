# GrammarPath — Phase 3.4C.4B.4.1.1: Question Bank Census Reconciliation Report
## Exhaustive Arithmetic Reconciliation of 41 Bank Items Across Units, Concepts, Statuses, and Root Lineages

**Author:** Antigravity (Principal Backend Architect & Security Auditor)  
**Milestone:** Phase 3.4C.4B.4.1.1 (Design Corrections & Pilot Readiness Reconciliation)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Audit Type:** Mathematical & Relational Database Census (Read-Only)  

---

## 1. Executive Summary & Reconciliation Arithmetic

Every question bank record in `toeic_question_bank_items` on Neon PostgreSQL staging was evaluated across four orthogonal relational dimensions:
1. **Editorial Review Status** (`review_status`)
2. **Curriculum Unit Number** (`unit_number`)
3. **Canonical Concept Foreign Key** (`concept_id` / `code`)
4. **Root Question Lineage & Latest Approved Invariant** (`root_question_id`, `version`, `is_latest_approved`)

### The Master Reconciliation Formula:
$$\text{Global Total} = \sum_{\text{status}} N_{\text{status}} = \sum_{\text{unit}} N_{\text{unit}} = \sum_{\text{concept}} N_{\text{concept}} = \sum_{\text{roots}} N_{\text{versions}} = 41$$

Every subtotal, row sum, column sum, and cross-tabulation reconciles with **zero discrepancy**.

---

## 2. Global Census Matrix: Unit vs. Editorial Status

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ QUESTION BANK INVENTORY MATRIX (N = 41 RECORDS)                                                        │
├───────┬──────────────────────────┬──────────┬───────────┬──────────┬───────────┬───────┬───────────────────┤
│ Unit  │ Concept Title            │ Approved │ Validated │ Archived │ Withdrawn │ Total │ Scope Category    │
├───────┼──────────────────────────┼──────────┼───────────┼──────────┼───────────┼───────┼───────────────────┤
│ U1    │ Present continuous       │ 12       │ 4         │ 5        │ 4         │ 25    │ Units 1–25 Core   │
│ U2    │ Present simple           │ 0        │ 9         │ 0        │ 0         │ 9     │ Units 1–25 Core   │
│ U3    │ Present cont & simple 1  │ 0        │ 0         │ 0        │ 0         │ 0     │ Units 1–25 (Empty)│
│ U4    │ Present cont & simple 2  │ 0        │ 1         │ 0        │ 0         │ 1     │ Units 1–25 Core   │
│ U5    │ Past simple              │ 0        │ 3         │ 0        │ 0         │ 3     │ Units 1–25 Core   │
│ U6    │ Past continuous          │ 0        │ 2         │ 0        │ 0         │ 2     │ Units 1–25 Core   │
├───────┼──────────────────────────┼──────────┼───────────┼──────────┼───────────┼───────┼───────────────────┤
│ U7–25 │ Perfects / Futures / Mods│ 0        │ 0         │ 0        │ 0         │ 0     │ Units 1–25 (Unpop)│
├───────┼──────────────────────────┼──────────┼───────────┼──────────┼───────────┼───────┼───────────────────┤
│ [SUB] │ Subtotal Units 1–25      │ 12       │ 19        │ 5        │ 4         │ 40    │ Units 1–25 Range  │
├───────┼──────────────────────────┼──────────┼───────────┼──────────┼───────────┼───────┼───────────────────┤
│ U40   │ Conditionals (Inversion) │ 0        │ 1         │ 0        │ 0         │ 1     │ Out-of-Range (>25)│
├───────┼──────────────────────────┼──────────┼───────────┼──────────┼───────────┼───────┼───────────────────┤
│ TOTAL │ Global Reconciled Total  │ 12       │ 20        │ 5        │ 4         │ 41    │ Exactly Reconciled│
└───────┴──────────────────────────┴──────────┴───────────┴──────────┴───────────┴───────┴───────────────────┘
```

---

## 3. Sub-Inventory Breakdown & Boundary Arithmetic

### 3.1 Units 1–25 Inventory (40 records):
- **Approved Items (12):** Certified Unit 1 items (`45e751fd`, `8a41b01a`, `a4229728`, `048df761`, `0f51d836`, `2afc939e`, `add7a35b`, `b7c4793c`, `c46da3b7`, `2997562b`, `322c0e5c`, `7a3359ae`).
- **Validated Candidate Items (19):**
  - Unit 1: 4 items (`fa201c0b`, `fe5dcc57`, `6e803d45`, `7addbaf6`)
  - Unit 2: 9 items (`32ed699c`, `92a0e4b0`, `a47fbe81`, `a6c7ae58`, `a9d29ec3`, `eb746b7c`, `f5381446`, `f89aceea`, `ac0c643a`)
  - Unit 3: 0 items (cleansed)
  - Unit 4: 1 item (`fe61381a`)
  - Unit 5: 3 items (`0707bbd2`, `4ce8fea3`, `43753724`)
  - Unit 6: 2 items (`6948841f`, `c10918d0`)
  - Sum: $4 + 9 + 0 + 1 + 3 + 2 = 19$ validated items.
- **Archived Items (5):** Historical Version 1 records (`33581778`, `5131bba7`, `79355b82`, `8b8d431d`, `a716fc0f`).
- **Withdrawn Items (4):** Quarantined Version 2 records (`44931eb1`, `4a1223fc`, `7d24582b`, `7d9abd94`).
- **Units 1–25 Subtotal:** $12 + 19 + 5 + 4 = 40$ records.

### 3.2 Out-of-Range Inventory (1 record):
- **Item ID:** `77299aeb-93d6-483e-9f77-4d5a8c67496a`
- **Unit Number:** 40
- **Concept Code:** `unit.040` (`If I had known ... I wish I had known ...`)
- **Review Status:** `validated`
- **Latest Approved:** `false`
- **Out-of-Range Subtotal:** Exactly **1 record**.

### 3.3 Global Reconciliation Check:
$$\text{Units 1–25 Subtotal (40)} + \text{Out-of-Range Subtotal (1)} = 41 \quad \text{[100.0\% Match]}$$

---

## 4. Concept Code Distribution Reconciliation

Every record links via `concept_id` to an active `GrammarConcept` entity:

| Concept Code | Curriculum Title | Record Count | Notes |
| :--- | :--- | :---: | :--- |
| `unit.001` | *Present continuous (I am doing)* | **25** | 12 approved, 4 validated, 5 archived, 4 withdrawn |
| `unit.002` | *Present simple (I do)* | **9** | 9 validated candidates (Audit ready) |
| `unit.003` | *Present continuous and simple 1* | **0** | Cleaned; 0 items remaining |
| `unit.004` | *Present continuous and simple 2* | **1** | 1 validated candidate (`fe61381a`) |
| `unit.005` | *Past simple (I did)* | **3** | 3 validated candidates |
| `unit.006` | *Past continuous (I was doing)* | **2** | 2 validated candidates |
| `unit.040` | *If I had known ...* | **1** | 1 validated candidate (Out of range) |
| **Total** | | **41** | **Matches Global Total Exactly** |

---

## 5. Root Lineage & Version Multiplicity Reconciliation

The 41 records represent **32 distinct root question lineages**:

1. **Single-Version Root Questions (27 roots $\times$ 1 version = 27 records):**
   - 7 approved Unit 1 items from initial seeds (`0f51d836`, `2997562b`, `2afc939e`, `322c0e5c`, `7a3359ae`, `b7c4793c`, `c46da3b7`).
   - 20 validated candidates across Units 1, 2, 4, 5, 6, 40.
2. **Three-Version Root Lineages (4 roots $\times$ 3 versions = 12 records):**
   - Root `3d71c0d1`: v1 archived (`8b8d431d`), v2 withdrawn (`4a1223fc`), v3 approved (`048df761`).
   - Root `6a54a874`: v1 archived (`a716fc0f`), v2 withdrawn (`7d24582b`), v3 approved (`add7a35b`).
   - Root `0fda8409`: v1 archived (`79355b82`), v2 withdrawn (`7d9abd94`), v3 approved (`a4229728`).
   - Root `634add4d`: v1 archived (`5131bba7`), v2 withdrawn (`44931eb1`), v3 approved (`8a41b01a`).
3. **Two-Version Root Lineage (1 root $\times$ 2 versions = 2 records):**
   - Root `b19ebb8c`: v1 archived (`33581778`), v2 approved (`45e751fd`).

### Root Arithmetic:
$$(27 \times 1) + (4 \times 3) + (1 \times 2) = 27 + 12 + 2 = 41 \quad \text{records across 32 roots.}$$

### Approved Uniqueness Invariant:
- Total records with `isLatestApproved = true`: **Exactly 12 records**.
- Total distinct roots with an approved version: **Exactly 12 roots**.
- **Multiplicity Invariant:** $\frac{12 \text{ approved versions}}{12 \text{ distinct roots}} = 1.000$ (Zero duplicates).

