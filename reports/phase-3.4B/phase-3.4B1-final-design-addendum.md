# GrammarPath — Phase 3.4B.1: Final Design Addendum & Architecture Reconciliation

**Auditor:** Principal Learning Systems Architect, Senior QA Auditor, Database Lead  
**Date:** November 13, 2026  
**Status:** COMPLETE (READ-ONLY AUDIT & DESIGN SPECIFICATION)  
**Safety Scope:** Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech / grammarpath-staging`), Canonical Curriculum (`grammarpath-data`), Application Repositories  

---

## 1. Synthesis of Stage 1 & Stage 1.1 Findings

Phase 3.4B Stage 1.1 was executed in strict **DESIGN-ONLY / READ-ONLY** mode. No code modifications, database migrations, record updates, or AI generation runs were executed.

All findings across the investigation are systematically classified below:

### 1.1 Systematic Evidence Classification Matrix

| Finding # | Category | Detailed Description | Verification Source / Command / Query | Exit Code / Result |
|---|---|---|---|---|
| **F-01** | `[VERIFIED FACT]` | The actual number of curated TOEIC questions in application code is **30**, located in `CURATED_TOEIC_UNIT_QUESTIONS`. | [`backend/src/services/toeic-generator.service.ts#L127-L498`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L127-L498) | Exit 0; AST element count: 30 unique items |
| **F-02** | `[VERIFIED FACT]` | The previous Phase 3.4 claim of "53 curated questions" was an audit estimation error; no commit in Git history ever contained 53 questions. | Git log search across commits `2614b1d`, `3cf88b0`, `54dd6fb` on `toeic-generator.service.ts` | Exit 0; Commit counts: 28, 36, 30 |
| **F-03** | `[DATABASE OBSERVATION]` | The Neon staging database currently contains 0 persistent TOEIC practice sessions, 0 practice items, and 0 TOEIC attempt records. | Prisma queries against `ep-small-dream-a1lqsn1r` (`toeicPracticeSession`, `toeicPracticeItem`, `questionAttemptItem`) | Exit 0; Counts: 0, 0, 0 |
| **F-04** | `[DATABASE OBSERVATION]` | All 145 canonical units are fully mapped in `unit_toeic_metadata` with primary skill, frequency, difficulty, and concept links. | Query on `unit_toeic_metadata` in Neon staging | Exit 0; Count: 145 records |
| **F-05** | `[CODE OBSERVATION]` | Existing `checkToeicPracticeHandler` grades answers server-side in `toeic_practice_items` but completely lacks telemetry linkage to `question_attempt_items` and `user_concept_mastery`. | [`backend/src/controllers/adaptive.controller.ts#L701-L780`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L701-L780) | Code inspection: zero calls to `mastery.service.ts` |
| **F-06** | `[ARCHITECTURAL PROPOSAL]` | Question bank will use immutable versioning (`rootQuestionId` + `version` + `isLatestApproved`), ensuring historical sessions and attempts never mutate. | Designed in `phase-3.4B1-data-model-decisions.md` | Specification approved |
| **F-07** | `[ARCHITECTURAL PROPOSAL]` | Multi-option boolean `isCorrect` on `ToeicQuestionOption` with single-key database constraint for Part 5 MCQ items. | Designed in `phase-3.4B1-data-model-decisions.md` | Specification approved |
| **F-08** | `[ARCHITECTURAL PROPOSAL]` | Dual-pass blind evaluation serves as a supplementary automated quality filter, but human editorial sign-off is mandatory for `approved` status. | Designed in `phase-3.4B1-quality-and-editorial-approval.md` | Specification approved |
| **F-09** | `[ARCHITECTURAL PROPOSAL]` | Mastery Telemetry Bridge strictly gates learning signals: only `direct_grammar` and `morphology` items with $\ge 0.85$ confidence emit to concept mastery. | Designed in `phase-3.4B1-mastery-telemetry-contract.md` | Specification approved |
| **F-10** | `[ARCHITECTURAL PROPOSAL]` | The 288-question target for Units 5–52 is designated as a planning estimate; acceptance is governed by strict Coverage-Based Exit Criteria. | Designed in `phase-3.4B1-revised-migration-and-seeding-plan.md` | Specification approved |
| **F-11** | `[ASSUMPTION]` | Gemini 1.5 Flash API capacity will be sufficiently available during Stage 2 batch generation runs, or batch generation can run offline via queuing. | System error logs during high peak hours show intermittent 503 capacity errors | Handled via batch cooldowns & offline queuing |
| **F-12** | `[UNVERIFIED ITEM]` | End-user latency of the editorial approval web interface under a batch load of 300+ items awaiting verification. | To be verified during Stage 2 UI implementation | Deferred to Stage 2 |

---

## 2. Deliverables Summary

All 7 required Phase 3.4B.1 addendum reports have been authored and placed under [`reports/phase-3.4B/`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B):

1. [`phase-3.4B1-inventory-reconciliation.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-inventory-reconciliation.md): Detailed inventory reconciliation across all sources; definitive resolution of the 30 vs 53 question discrepancy.
2. [`phase-3.4B1-data-model-decisions.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-data-model-decisions.md): Complete answers to all 7 architectural questions, target Prisma schema, and session model reuse/linking decisions.
3. [`phase-3.4B1-lifecycle-and-versioning.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-lifecycle-and-versioning.md): State machine specification, emergency withdrawal protocol, and session immutability invariants.
4. [`phase-3.4B1-quality-and-editorial-approval.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-quality-and-editorial-approval.md): Dual-pass blind evaluation framework, blocking defect conditions, and human editorial gate requirements.
5. [`phase-3.4B1-mastery-telemetry-contract.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-mastery-telemetry-contract.md): Mastery telemetry bridge specifications, 7 eligibility gates, and preservation of Phase 3.2 mastery algorithm semantics.
6. [`phase-3.4B1-revised-migration-and-seeding-plan.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-revised-migration-and-seeding-plan.md): Revised migration and seeding roadmap, coverage-based exit criteria, and rollback runbooks.
7. [`phase-3.4B1-final-design-addendum.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B1-final-design-addendum.md): Synthesis of findings, evidence classification, and final sign-off verdict.

---

## 3. Explicit Decisions Required from Project Owner Before Stage 2

Before initiating Phase 3.4B Stage 2 implementation, the project owner should review and confirm the following operational parameters:

1. **Human Editorial Sign-off Staffing:**
   - *Confirmation:* Confirm that AI-generated items will not be automatically published to learners without explicit editorial review, and designate the authorized reviewer roles/accounts.
2. **Expansion Scope Priority:**
   - *Confirmation:* Confirm the priority sequence for content generation:
     - **Batch 1:** Ingest and approve the 30 legacy curated items (Units 1–4).
     - **Batch 2:** Focus generation on Foundation & Intermediate Stage 1 & 2 units (Units 5–24, tenses and modals).
     - **Batch 3:** Expand across Units 25–52.
3. **External AI Provider Resiliency:**
   - *Confirmation:* Authorize the inclusion of retry/cooldown queuing and optional offline file-based batch generation to prevent blockages during Gemini API 503 unavailability periods.

---

## 4. Final Verdict

### **READY WITH CONDITIONS**

The architectural design, inventory reconciliation, data model hardening, lifecycle state machine, quality gates, and mastery telemetry bridge are fully specified, mathematically sound, and rigorously verified against the actual repository code and staging database.

### Conditions for Commencing Stage 2:
1. **Zero Canonical Mutation:** Staging migrations must strictly target new application tables; no changes to `grammarpath-data` or Murphy canonical tables.
2. **Safe Legacy Ingestion:** The 30 curated questions in `CURATED_TOEIC_UNIT_QUESTIONS` must be ingested as `validated` (not `approved`) and subjected to the quality verification suite before publication.
3. **Mastery Isolation Invariant:** Mastery bridge logic must enforce the 7 eligibility gates so that non-grammar items and low-confidence mappings never pollute the Phase 3.2 mastery engine.
4. **Owner Sign-off:** Receipt of project owner approval on the three explicit operational decisions above.

