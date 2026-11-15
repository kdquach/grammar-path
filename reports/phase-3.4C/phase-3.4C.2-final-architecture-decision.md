# GrammarPath — Phase 3.4C.2: Final Architecture Decision
## Formal Decision Record, Governance Directives, and Architecture Sign-Off

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Final Decision)  
**Date:** November 14, 2026  
**Final Architecture Verdict:** **READY WITH CONDITIONS**  

---

## 1. Executive Summary & Decision Context

Phase 3.4C.2 was commissioned to establish the formal architecture for measuring **Transfer Competence ($\tau$)**—the learner's ability to apply foundational grammar knowledge in novel TOEIC-style workplace contexts.

This milestone operated under **strict read-only and design-only constraints**:
- Neon staging was inspected strictly read-only via `backend/scripts/run-with-staging-env.mjs`.
- Zero database writes, zero schema migrations, and zero source code modifications were executed.
- Canonical curriculum in `grammarpath-data` remains 100% clean and untouched on `main`.
- Phase 3.4C.1 implementation invariants (strict eligibility, isolation, item `7d24582b` withdrawal) are 100% preserved.

Based on empirical audit findings and psychometric principles, the following architectural decisions are formally codified.

---

## 2. Formal Architecture Decisions

### Decision 1: Measurement Independence (Orthogonal Multi-Dimensionality)
- **Decision:** $\theta$ (Foundational Competence), $\tau$ (Transfer Competence), $R(t)$ (Retention), Accuracy, and Completion must remain strictly independent dimensions.
- **Directives:**
  1. A composite scalar index (such as $0.60\theta + 0.40\tau$) is **PERMANENTLY REJECTED**.
  2. No numerical $\tau$ score is computed in this milestone; $\tau$ exposes an explicit `insufficient_data` state.
  3. Learner interfaces will present dual-track competence indicators: **Nền tảng ($\theta$)** and **Ứng dụng TOEIC ($\tau$)**.

### Decision 2: Contextual Independence Requirement ($K_{\text{ctx}} \ge 3$)
- **Decision:** Question Count ($N_q$) is decoupled from Contextual Diversity ($K_{\text{ctx}}$).
- **Directives:**
  1. Three approved questions that share an identical sentence template constitute only **1 independent context**, not 3.
  2. A concept requires a minimum of $K_{\text{ctx}} \ge 3$ distinct workplace contexts before $\tau$ can exit `insufficient_data`.
  3. Distance threshold $D_{\text{ctx}} \ge 0.50$ defines context independence.

### Decision 3: Assessment Construct Scope & Category Quarantine
- **Decision:** Only construct-relevant items may contribute evidence to Grammar Transfer Mastery ($\tau$).
- **Directives:**
  1. **Part 5 Direct Grammar:** Primary valid evidence (100% eligible).
  2. **Part 5 Word Form & Morphology:** Secondary valid evidence (eligible for morphosyntactic concepts with confidence $\ge 0.90$).
  3. **Part 5 Vocabulary & Collocations:** **100% EXCLUDED** (construct-irrelevant variance; does not assess grammar).
  4. **Part 7 Reading Passages:** **100% EXCLUDED** (reading rate and vocabulary dominant).
  5. **Part 1–4 Listening Comprehension:** **100% EXCLUDED** (acoustic phonological decoding confound).

### Decision 4: Multi-Tier Contextual Diversity Engine
- **Decision:** Implement multi-tier similarity metrics ($S_{\text{norm}}$, $S_{\text{slot}}$, $S_{\text{dist}}$, $S_{\text{sem}}$) to compute Contextual Distance ($D_{\text{ctx}}$).
- **Directives:**
  1. Algorithmic similarity thresholds are **WARNING SIGNALS FOR HUMAN EDITORIAL REVIEW**, never automatic silent drops or unreviewed approvals.
  2. The admin review queue will display contextual duplicate alerts to editorial reviewers prior to approval.

### Decision 5: Attempt Immutability & Dynamic Evidence Projections
- **Decision:** Raw learner attempts in `QuestionAttemptItem` are append-only and permanently immutable.
- **Directives:**
  1. When an item is withdrawn, superseded, or reclassified, historical attempt rows are **NEVER deleted or mutated**.
  2. Live competence calculations dynamically filter attempts against active approved items (`reviewStatus = 'approved' AND isLatestApproved = true`).
  3. Withdrawn items immediately drop out of live calculations; affected concepts gracefully revert to `insufficient_data`.

### Decision 6: Immediate Quarantine Recommendation for Staging Item `4a1223fc`
- **Decision:** An objective grammatical defect was discovered during the read-only audit of Neon staging:
  - **Item ID:** `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2`
  - **Prompt:** *"The IT technician is not at his desk because **he** _______ the server hardware in Room 3 right now."*
  - **Approved Key:** Option A: *"are / updating"* (`isCorrect: true`).
- **Directives:**
  1. In Milestone 3.4C.3, execute a formal audited withdrawal of `4a1223fc` (`reviewStatus = "withdrawn"`, `isLatestApproved = false`) before serving TOEIC items to learners.
  2. Ensure integration test `phase3-4b-m2.test.ts` is refactored to clean up its ephemeral approved test items.

---

## 3. Separation of Facts, Observations, Proposals, and Assumptions

To maintain absolute epistemological clarity, all claims in Phase 3.4C.2 are categorized:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. VERIFIED DATABASE FACTS (Neon Staging Inspection)                   │
│ • Staging has 37 total TOEIC items: 27 validated, 5 archived, 4 approved,│
│   1 withdrawn.                                                         │
│ • All 4 approved items in Unit 1 share identical prompt template:       │
│   "The IT technician is not at his desk because he _______ the server  │
│    hardware in Room 3 right now."                                      │
│ • Item 4a1223fc marks Option A ("are / updating") as correct with       │
│   subject "he".                                                        │
│ • Staging has 4 total learner attempts; 0 production learners affected.│
├────────────────────────────────────────────────────────────────────────┤
│ 2. CODE OBSERVATIONS (Backend Codebase Audit)                           │
│ • computeToeicItemContentHash includes options, so identical templates │
│   with varying options produce different hashes.                       │
│ • Admin /approve endpoint does not check duplicate or similarity flags.│
│ • tests/phase3-4b-m2.test.ts mutated items without database teardown.  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DESIGN PROPOSALS (Architecture Specifications)                      │
│ • Multi-tier similarity distance metric D_ctx = 1 - max(S_norm, ...).  │
│ • Contextual independence threshold D_ctx >= 0.50.                     │
│ • Strict construct isolation: Exclude vocabulary, listening, reading.  │
│ • 3-3-3 item generation blueprint (3 domains, 3 difficulty tiers).     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. ASSUMPTIONS (To Be Empirically Validated)                           │
│ • Target human learners will respond to Part 5 items with adequate     │
│   variance to calibrate a 2PL IRT model (requires N >= 500 trial).     │
│ • Contextual distance D_ctx >= 0.50 reliably prevents carrier priming. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Final Verdict & Conditional Authorization

**FINAL ARCHITECTURE VERDICT:** **`READY WITH CONDITIONS`**

The architecture for measuring Transfer Competence ($\tau$) is psychometrically rigorous, mathematically sound, and fully specified. 

Proceeding to **Milestone 3.4C.3 (Contextual Diversity Engine & Audit Tooling)** is authorized subject to the following **three mandatory conditions**:

### Condition 1: Quarantine of Defective Item `4a1223fc`
Prior to learner practice in Milestone 3.4C.3, item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` must be transitioned to `reviewStatus = "withdrawn"` and `isLatestApproved = false` via an audited migration script, preserving audit fields.

### Condition 2: Integration Test Teardown Hardening
The test `tests/phase3-4b-m2.test.ts` must be refactored to perform explicit database cleanup of all test-created and test-approved items, preventing carrier template pollution in staging.

### Condition 3: Preservation of Insufficient-Data State
The Transfer Competence ($\tau$) dimension must remain strictly in `status: "insufficient_data"` (with `score: null`) until Milestone 3.4C.4 establishes verified inventory ($\ge 3$ distinct contexts per unit) and Milestone 3.4C.5 implements the calibrated scoring engine.

---

## 5. Artifact Delivery Index

All eight required reports have been authored under [`reports/phase-3.4C/`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/):

1. [`phase-3.4C.2-existing-transfer-evidence-audit.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-existing-transfer-evidence-audit.md)
2. [`phase-3.4C.2-transfer-measurement-model.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-transfer-measurement-model.md)
3. [`phase-3.4C.2-assessment-blueprint.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-assessment-blueprint.md)
4. [`phase-3.4C.2-contextual-diversity-spec.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-contextual-diversity-spec.md)
5. [`phase-3.4C.2-versioning-and-evidence-lifecycle.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-versioning-and-evidence-lifecycle.md)
6. [`phase-3.4C.2-validation-plan.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-validation-plan.md)
7. [`phase-3.4C.2-implementation-roadmap.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-implementation-roadmap.md)
8. [`phase-3.4C.2-final-architecture-decision.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4C/phase-3.4C.2-final-architecture-decision.md)

