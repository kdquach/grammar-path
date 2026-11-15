# GrammarPath Phase 3.4B — Report 10: Final Architecture Decision & Stage 1 Sign-Off
## Architecture Decision Record (ADR), Risk Analysis, and Stage 2 Readiness Sign-Off

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & Educational Data Scientist  
**Scope:** Phase 3.4B Architecture Decision, Risk Assessment, and Implementation Sign-Off  
**Final Stage 1 Verdict:** **READY FOR PHASE 3.4B IMPLEMENTATION**

---

## 1. Architecture Decision Record (ADR)

### ADR-01: Persistent Relational Question Bank vs On-the-Fly Generation
- **Context:** The existing system generates TOEIC practice questions on the fly during HTTP requests using Google Gemini, falling back to regex-based cloze masking of Murphy textbook sentences when Gemini times out or is in cooldown.
- **Decision:** **Adopt a Persistent Relational Question Bank** backed by `ToeicQuestionBankItem` and `ToeicQuestionOption`.
- **Consequences:**
  - *Positive:* Instant session loading (< 50ms vs 2–5s); zero external LLM dependencies on the user hot path; 100% auditable questions; consistent learner experience.
  - *Negative:* Requires a database schema migration and an offline generation/seeding phase.

### ADR-02: Asynchronous Offline AI Pipeline with Dual-Pass Blind Validation
- **Context:** Raw LLM generation frequently introduces subtle errors: secondary valid answers, unnatural collocations, or defective distractors.
- **Decision:** **Decouple generation into an offline batch pipeline** with a mandatory **Dual-Pass Blind Evaluator** (a secondary blind LLM pass that attempts to solve the question without the answer key). If the blind evaluator disagrees or flags ambiguity, the question is discarded before reaching human editors.
- **Consequences:** Eliminates ambiguous questions before persistence; guarantees authentic workplace context.

### ADR-03: Mastery Telemetry Bridge via `attemptSource: "toeic_practice"`
- **Context:** Currently, TOEIC practice is completely disconnected from the concept mastery engine (`UserConceptMastery`).
- **Decision:** When learners check a TOEIC question that maps to a `GrammarConcept`, persist a `QuestionAttemptItem` with `attemptSource: "toeic_practice"` inside an atomic `prisma.$transaction`.
- **Consequences:** Connects TOEIC practice to the dashboard and establishes the data foundation for transfer learning in Phase 3.4C.

---

## 2. Risk Assessment & Mitigations

| Identified Risk | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Question Inventory Deficit for High Units (Units 53–145)** | Medium | Focus Phase 3.4B seeding on Units 1–52 (which cover > 60% of TOEIC Part 5 tested grammar). Units 53–145 will continue to use existing roadmap metadata while batch generation scales in Phase 3.4C. |
| **Ambiguous Secondary Correct Answers** | High | Enforce Gate 2 Dual-Pass Blind Evaluation. Rebalance options across A/B/C/D to eliminate positional bias. |
| **External LLM Rate Limits during Seeding** | Low | Implement exponential backoff with jitter and automated model cascading (`gemini-3-flash-preview` → `gemini-flash-lite-latest` → `gemini-3.1-flash-lite-preview`). |
| **Schema Migration Drift** | Low | Strict staging isolation guard (`run-with-staging-env.mjs`) used for all migration and verification commands. Zero modifications to canonical `grammarpath-data`. |

---

## 3. Explicit Safety Confirmation

During this Stage 1 Architecture & Design phase:
1. **Zero Database Writes:** No DDL migrations, inserts, updates, or deletes were executed against Neon staging or any other database.
2. **Zero Canonical Modifications:** Canonical repository `grammarpath-data` remains 100% clean on branch `main` (all 145 units intact).
3. **Zero Production Access:** Production systems were neither accessed nor configured.
4. **Read-Only Staging Audit:** All staging inspections were conducted strictly through the staging guard in read-only mode.
5. **No Code Implementation:** Application source code was not modified. Stage 2 implementation has NOT been started.

---

## 4. Final Verdict

**Verdict:** **READY FOR PHASE 3.4B IMPLEMENTATION**

All 10 required architectural reports have been authored and verified under `reports/phase-3.4B/`:
1. [`phase-3.4B-existing-toeic-audit.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-existing-toeic-audit.md)
2. [`phase-3.4B-curriculum-coverage.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-curriculum-coverage.md)
3. [`phase-3.4B-question-bank-data-model.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-question-bank-data-model.md)
4. [`phase-3.4B-question-lifecycle-and-quality-gates.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-question-lifecycle-and-quality-gates.md)
5. [`phase-3.4B-ai-generation-pipeline.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-ai-generation-pipeline.md)
6. [`phase-3.4B-quality-evaluation-framework.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-quality-evaluation-framework.md)
7. [`phase-3.4B-api-and-frontend-integration.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-api-and-frontend-integration.md)
8. [`phase-3.4B-migration-and-import-strategy.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-migration-and-import-strategy.md)
9. [`phase-3.4B-implementation-roadmap.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-implementation-roadmap.md)
10. [`phase-3.4B-final-architecture-decision.md`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4B/phase-3.4B-final-architecture-decision.md)

Execution is stopped here in accordance with the Phase 3.4B Stage 1 charter. We await your explicit review and approval before proceeding to Stage 2 implementation.

