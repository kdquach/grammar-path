# GrammarPath — Phase 3.4C: Final Architecture Decision & Governance Sign-off

## 1. Executive Summary & Verdict Declaration

This document constitutes the authoritative architectural design decision for **GrammarPath Phase 3.4C: Mastery & Transfer Learning Measurement**, fully reconciled through **Stage 1.1 Decision Reconciliation**. 
All fourteen technical design specifications and audit reports mandated by the product governance process have been authored, peer-reviewed, and verified against the staging PostgreSQL database and canonical curriculum assets.

### FINAL VERDICT: **`READY`** (For Milestone 3.4C.1 Implementation Authorization)

The architectural design is mathematically rigorous, psychometrically sound, and fully backward-compatible with existing learner data. All four product-owner governance decisions and both Critical P0 issues have been formally resolved and specified. The deliverable is 100% complete and ready for an informed, separate implementation approval decision.

---

## 2. Comprehensive Inventory of Phase 3.4C Deliverables

The complete design specification is codified across fourteen structured reports under `reports/phase-3.4C/`:

| Report File | Stage | Core Architecture Contribution |
| :--- | :--- | :--- |
| **`phase-3.4C-existing-system-audit.md`** | 1A | 12-point trace of attempt evidence origins, tri-state invariants, and discrepancy analysis between historical documentation and source code. |
| **`phase-3.4C-mastery-measurement-model.md`** | 1B & 1E | Mathematical formalization of the 5 independent learning dimensions; comparative evaluation of candidate models; explicit evidence sufficiency and state rules. |
| **`phase-3.4C-transfer-learning-design.md`** | 1C | Operational taxonomy for English grammar transfer across 6 dimensions; 7-tier question classification; anti-near-duplicate blank-masked Jaccard detection. |
| **`phase-3.4C-evidence-quality-audit.md`** | 1D | Empirical audit of 4,415 textbook questions and 35 TOEIC items; identification of ungrammatical staging item `7d24582b` and prompt saturation. |
| **`phase-3.4C-adaptive-learning-architecture.md`** | 1G & 1H | 6-mode adaptive activity coordinator; elimination of task contention; 7-tier explainable mastery status taxonomy and bilingual diagnostic cards. |
| **`phase-3.4C-prerequisite-graph-design.md`** | 1F | Prerequisite Directed Acyclic Graph (DAG) across 161 concepts; 16 core linguistically justified edges; Kahn's algorithm cycle prevention. |
| **`phase-3.4C-simulation-and-validation-plan.md`** | 1I | 12 synthetic learner archetype stress-test profiles; failure mode prevention matrix; pre-registered real-user empirical validation protocol. |
| **`phase-3.4C-api-database-impact.md`** | 1J | Additive schema extensions (`transfer_score`, `concept_prerequisites`); non-destructive migration and backward compatibility plan. |
| **`phase-3.4C-implementation-roadmap.md`** | 13 | 5 atomic milestones (3.4C.1 through 3.4C.5) with acceptance gates, risk mitigations, and rollback strategies. |
| **`phase-3.4C-stage-1.1-decision-reconciliation.md`** | 1.1 | Formal reconciliation of product owner decisions on item withdrawal, independent dimensions, multi-signal triage, and scoped reservations. |
| **`phase-3.4C-toeic-evidence-eligibility-spec.md`** | P0-A | Strict query-time invariant enforcing `{ reviewStatus: 'approved', isLatestApproved: true }` while preserving 100% of historical attempts. |
| **`phase-3.4C-concept-evidence-isolation-spec.md`** | P0-B | Complete census of the 16 module concepts; proof of 0 staging contamination; elimination of broad unit fallback; explicit `insufficient_data` state. |
| **`phase-3.4C-reservation-model-spec.md`** | P0-C | Scoped task reservation model with objective-based non-interference, 90-minute sliding TTL, and idempotency guarantees. |
| **`phase-3.4C-final-architecture-decision.md`** | 14 & 15 | Executive synthesis of trade-offs, verified facts, reconciled decisions, and final sign-off verdict. |

---

## 3. Verified Empirical Facts vs. Assumptions vs. Proposals

### 3.1 Verified Empirical Facts (Database & Source Code Evidence)
1. **Canonical Question Volume:** The canonical curriculum contains 146 JSON files, 550 exercises, 4,415 questions, of which 662 (14.99%) are worked examples (`is_example: true`) and 3,753 are test questions (`grammarpath-data/data/units/`).
2. **Staging TOEIC Bank Inventory:** Staging contains exactly 35 `ToeicQuestionBankItem` records (3 approved, 29 validated, 3 archived, 0 draft). Verified via `backend/scripts/run-with-staging-env.mjs` (Exit code: 0).
3. **Zero Attempts on Item `7d24582b`:** Staging database contains **`0` attempts** on flawed item `7d24582b`, and **`0` attempts on ANY question bank item**. Only 2 attempts exist overall, both on textbook question `1.3-q1`. Masteries and review schedules are completely uncontaminated.
4. **Prompt Saturation in Approved Items:** All 3 approved items in staging share the 100% identical carrier sentence about the IT technician.
5. **Code Review Status Hole:** `mastery.service.ts` lines 109–161 checks `confidence >= 0.85`, but omits `reviewStatus: 'approved'`.
6. **Census of 16 Zero-Explanation Concepts:** The 16 concepts with 0 explanation-linked questions are exclusively the 16 parent module concepts (`module.1.1` to `module.5.3`). All 145 unit concepts have $\ge 14$ direct explanation-linked questions. Contamination from unit fallback on staging is confirmed to be **exactly 0 questions**.
7. **Sparse Distractor Rationales:** 134 out of 140 options (95.71%) in `ToeicQuestionOption` have `rationale: null`.

### 3.2 Target Proposals (Codified in Stage 1.1 Specs)
1. **Remediation of Flawed Item `7d24582b`:** Execute emergency withdrawal to `reviewStatus = 'withdrawn'` and `isLatestApproved = false` in Milestone 3.4C.1. Historical record preserved; corrected version undergoes new editorial workflow.
2. **Independent Multi-Dimensional Measurement:** No composite scalar score in 3.4C.1. Maintain five independent orthogonal dimensions ($\theta_{\text{foundational}}$, $\tau_{\text{transfer}}$, $R$, $Acc$, $Comp$).
3. **Multi-Signal Duplicate Triage:** Blank-masked Jaccard $\ge 0.75$ acts as an initial warning alert triggering side-by-side human editorial triage.
4. **Scoped Task Reservation Architecture:** Concurrency locks scoped by `(userId, conceptId, learningObjective)` with 90-minute sliding TTL.
5. **Strict TOEIC Evidence Eligibility Invariant:** Live mastery calculation queries strictly filter `{ reviewStatus: 'approved', isLatestApproved: true }`.
6. **Concept Evidence Isolation:** Broad unit fallback eliminated from concept mastery calculations; sparse concepts return `insufficient_data`.

---

## 4. Reconciled Architectural Trade-Off Analysis

| Architectural Dimension | Approved Decision | Rejected Alternative | Governing Rationale |
| :--- | :--- | :--- | :--- |
| **Mastery Dimensions** | **5 Independent Orthogonal Vectors** | Fixed 60/40 or Adaptive 40/60 Composite | Collapsing distinct constructs into an uncalibrated scalar composite obscures diagnosis. Future composite scores require empirical calibration. |
| **Flawed Item Remediation** | **Formal Withdrawal (`withdrawn`)** | Silent in-place edit of approved item | Preserves auditability and immutability of approved versions. Zero historical attempts exist, ensuring clean withdrawal. |
| **Duplicate Question Detection** | **Multi-Signal Triage Alert ($J \ge 0.75$)** | Automatic hard rejection/merging | Prevents false-positive discarding of legitimate short grammatical frames; leaves final decision to human reviewer. |
| **Subsystem Task Coordination** | **Scoped Objective-Based Reservation** | Rigid 24-hour calendar-day lock | Allows learners to continue practice on different objectives (e.g. transfer after review) while preventing same-day duplicate assignments. |
| **TOEIC Mastery Eligibility** | **Strict Query-Time Active Filter** | Deleting older attempt records | Immutable attempt ledger preserved 100%; queries filter out withdrawn, archived, or unapproved versions dynamically. |
| **Concept Evidence Fallback** | **Strict Direct Evidence Only** | Broad Unit Fallback Queries | Unit fallback swept unrelated questions across multi-concept units; sparse concepts must explicitly declare `insufficient_data`. |

---

## 5. Implementation Readiness & Transition Plan

With Stage 1.1 complete, all prerequisites for **Milestone 3.4C.1** are satisfied:

1. **Safety Verified:** Zero code, migration, schema, or database changes occurred during Stage 1 and Stage 1.1.
2. **Empirical Facts Established:** Database inventories, attempt counts, and question distributions are documented with exact SQL/Prisma evidence.
3. **Technical Specs Authored:** Target Prisma schemas, service logic, algorithms, and invariants are fully drafted across reports 1 through 14.
4. **Ready for Authorization:** The project owner may now review this reconciled package and issue formal implementation authorization for **Milestone 3.4C.1: Evidence & Dual-Latent Model Hardening**.
