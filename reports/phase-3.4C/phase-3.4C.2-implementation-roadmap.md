# GrammarPath — Phase 3.4C.2: Implementation Roadmap
## Phased Architecture Evolution: From Design to Psychometric Production

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Implementation Roadmap)  

---

## 1. Executive Summary & Phased Delivery Strategy

Measuring Transfer Competence ($\tau$) requires a sequential, gated engineering progression. Attempting to compute numerical transfer scores without sufficient inventory, contextual diversity tooling, and human editorial sign-off results in invalid metrics and compromised learner trust.

This roadmap outlines the four-milestone sequence to transition the Phase 3.4C.2 architecture into full production.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Milestone 3.4C.2│     │ Milestone 3.4C.3│     │ Milestone 3.4C.4│     │ Milestone 3.4C.5│
│ Assessment      │────►│ Context Engine  │────►│ Bank Expansion  │────►│ Transfer Engine │
│ Architecture    │     │ & Editorial UI  │     │ & Diversification│    │ & Calibration   │
│ (DESIGN-ONLY)   │     │ (Implementation)│     │ (Content Gate)  │     │ (Live Scoring)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Milestone Breakdown & Delivery Sequence

### Milestone 3.4C.2: Transfer Assessment Architecture (CURRENT)
- **Status:** **COMPLETE (DESIGN-ONLY)**
- **Objectives:**
  - Audit existing transfer evidence and duplicate detection in staging.
  - Define psychometric model separating $\theta$ and $\tau$.
  - Establish construct boundaries (excluding vocabulary, reading passages, and audio).
  - Design multi-tier contextual similarity framework ($D_{\text{ctx}}$).
  - Formulate evidence lifecycle and versioning rules.
  - Deliver comprehensive 8-report architecture package.

---

### Milestone 3.4C.3: Contextual Diversity Engine & Audit Tooling
- **Target Mode:** Implementation on Neon Staging.
- **Prerequisites:** Phase 3.4C.2 approved by project owner.
- **Deliverables & Tasks:**
  1. **Audited Quarantine of Staging Item `4a1223fc`:**
     - Execute deterministic audited withdrawal for defective item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` (Option A *"are / updating"* with subject *"he"*).
  2. **Context Similarity Engine Implementation:**
     - Implement `context-similarity.service.ts` calculating $S_{\text{norm}}$, $S_{\text{slot}}$, $S_{\text{dist}}$, and $D_{\text{ctx}}$.
     - Unit test suite verifying $D_{\text{ctx}} = 0.00$ for IT technician duplicates and $D_{\text{ctx}} \ge 0.50$ for distinct domains.
  3. **Prisma Schema Update & Migration:**
     - Add `normalizedTemplate`, `workplaceDomain`, `contextSignature`, and `contextEquivalenceGroupId` to `ToeicQuestionBankItem`.
     - Add `ToeicItemAuditLog` table for tamper-evident lifecycle history.
  4. **Admin Editorial Queue UI Integration:**
     - Enhance `/api/v1/admin/toeic/queue` to compute and return contextual similarity warnings.
     - Add similarity badges to admin frontend review screen.
  5. **Safety Gate:** Verify 100% regression pass rate across all test suites.

---

### Milestone 3.4C.4: Question Bank Expansion & Curation Gate
- **Target Mode:** Staging Generation, Curation & Editorial Approval.
- **Prerequisites:** Milestone 3.4C.3 tooling deployed.
- **Deliverables & Tasks:**
  1. **Batch Generation Execution (Units 1–25):**
     - Execute persistent queue jobs with exponential backoff.
     - Generate candidate Part 5 items enforcing business scenario diversity.
  2. **Replacement Authorship:**
     - Author Version 3 for Root `3d71c0d1` (replacing withdrawn `7d24582b`).
     - Author Version 3 for Root `6a54a874` (replacing withdrawn `4a1223fc`).
  3. **Editorial Approval Campaign:**
     - Project owner reviews candidates in admin portal.
     - Enforce the **3-3-3 Rule** ($\ge 3$ distinct business domains, 3 difficulty tiers per unit).
     - Target: Minimum 6 approved, contextually independent items per unit for Units 1–25.
  4. **Inventory Audit:** Confirm staging possesses $\ge 150$ approved items with verified $D_{\text{ctx}} \ge 0.50$.

---

### Milestone 3.4C.5: Transfer Competence Calculation Engine & UI Integration
- **Target Mode:** Backend Engine & Frontend Learner Experience.
- **Prerequisites:** Milestone 3.4C.4 content target reached.
- **Deliverables & Tasks:**
  1. **Mastery Service Enhancement:**
     - Implement $K_{\text{ctx}}$ context grouping query in `mastery.service.ts`.
     - Implement Context-Discounted Transfer Index ($TI$) heuristic.
     - Maintain strict separation of $\theta$ and $\tau$ in database schema (`UserConceptMastery`).
  2. **Learner API & Dashboard Updates:**
     - Expose `transferCompetence` object in `getMasterySummary` and `getConceptMasteryDetail`.
     - Surface Vietnamese diagnostic feedback explaining transfer vs foundational status.
  3. **Frontend Progress Dashboard:**
     - Render dual-track progress bars: **Nền tảng ($\theta$)** vs **Ứng dụng TOEIC ($\tau$)**.
     - Display contextual diversity badges (e.g. *"Đã kiểm tra qua 3 ngữ cảnh: IT, Marketing, Logistics"*).
  4. **Field Trial Data Collection:**
     - Begin collecting learner attempt matrices for future IRT parameter calibration.

---

## 3. Dependency & Risk Management Matrix

| Risk / Dependency | Impact | Probability | Mitigation Strategy |
|---|:---:|:---:|---|
| **Defective Item `4a1223fc` remains live in practice** | HIGH | CERTAIN | Recommended for immediate quarantine at start of Milestone 3.4C.3. Practice selection excludes items with `isLatestApproved = false`. |
| **AI Generation yields repetitive prompts** | HIGH | MEDIUM | Quality Engine in Milestone 3.4C.3 flags prompt similarity $> 0.70$ before saving as `validated`. Review queue blocks unreviewed approvals. |
| **Sparse context coverage delaying learner progression** | MEDIUM | HIGH | Explicit `insufficient_data` state with clear Vietnamese UI message explaining that additional business topics must be attempted. |
| **Computational overhead of pairwise distance calculations** | LOW | LOW | Context signatures precomputed at ingestion and persisted in database column; runtime queries use indexed equivalence cluster IDs. |
| **Accidental production leak** | CRITICAL | ZERO | Staging Isolation Guard (`run-with-staging-env.mjs`) strictly enforces connection hostname and environment boundaries. |

---

## 4. Timeline & Milestone Verification Gates

```
Phase 3.4C.2 ──► Gate 1: Design Sign-off & Audit Review (Complete)
                 │
Phase 3.4C.3 ──► Gate 2: Context Engine Tests & Staging Quarantine (100% Pass)
                 │
Phase 3.4C.4 ──► Gate 3: Editorial Inventory Sign-off (>= 3 contexts/unit)
                 │
Phase 3.4C.5 ──► Gate 4: Dual-Track Mastery Live Deployment
```

---

## 5. Roadmap Conclusion

This phased roadmap ensures that GrammarPath builds on solid evidence foundations. Numerical transfer scores will be published only after the inventory satisfies rigorous diversity, validity, and editorial quality standards.

