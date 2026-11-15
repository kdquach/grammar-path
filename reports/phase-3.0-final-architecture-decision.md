# GrammarPath — Phase 3.0 Final Architecture Decision

> **Phase:** 3.0 — Learning Experience Audit & Architecture Design (Design Only)  
> **Date:** 2026-11-13  
> **Deliverable Suite:** Phase 3.0 Audit & Architecture Reports (8/8)

---

## Final Verdict: `READY WITH CONDITIONS` (for Phase 3.1 Execution)

GrammarPath's existing textbook dataset (`grammarpath-data`), relational PostgreSQL core, polymorphic grading engine, and anti-spoiler architecture provide a strong foundation for Phase 3. However, Phase 3 implementation is **READY WITH CONDITIONS** rather than unconditionally ready because **two technical blockers in current telemetry/schema** and **one carried-over production operational prerequisite** must be resolved explicitly before user-facing mastery scores or personalized recommendations can be trusted.

---

## 1. Key Architectural Decisions Locked in Phase 3.0

1. **Preserve Canonical Textbook Purity:** Keep all 145 canonical JSON files (`grammarpath-data`) and canonical DB counts (`145` units, `542` theory sections, `549` exercises, `4,414` questions) untouched. Isolate AI-generated and template-generated practice items in dedicated `practice_session_items` and `toeic_practice_items` tables rather than mixing them into canonical `questions`.
2. **Introduce Normalized Grammar Concept Layer (`~95 Concepts`):** Because **4,414 / 4,414 (100%)** canonical explanations already match a same-unit `TheorySection.sectionId` (`512/542` linked, `30` intro sections unlinked), add `Explanation.theorySectionId` FK plus `GrammarConcept` and `ConceptTheoryLink` tables, migrating the 5 Stages / 16 Modules / priority / TOEIC-part metadata out of frontend-hardcoded [toeicRoadmap.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/data/toeicRoadmap.ts) into PostgreSQL.
3. **Deterministic Mastery Model Before ML:** Launch an explainable, auditable formula separating **Completion**, **Accuracy**, **Mastery (`0–100` + tier)**, and **Retention (`R(t)` exponential decay)** with:
   - Bayesian prior smoothing (`m = 4.0, p0 = 0.40`) + `< 3` distinct-item **`Not enough practice data`** suppression to eliminate `1/1 = 100%` false precision.
   - Same-day retry cap (`0.70`, lifting to `0.90`/`1.00` only after `>= 24h` spaced recall) to prevent brute-force score inflation.
   - Strict exclusion of skipped/unanswered items (`attemptStatus = 'unanswered'`) from all mastery, accuracy, and error calculations.
4. **Materialized Mastery & Activity Tables (`O(1)` Dashboard Reads):** Add `user_concept_mastery`, `user_mastery_snapshots`, and `user_daily_activity` updated incrementally on grading events, eliminating full-history Node-memory scans over `question_attempt_items`.
5. **5-Gate Validated Hybrid Practice Generator:** Keep Tier-1 deterministic selectors and rule templates as the zero-hallucination backbone; gate all Tier-2 Gemini-generated items through structural, anti-leak, rule-grounding, secondary consistency, and anti-spoiler validation checks with automatic Tier-1 fallback.
6. **Honest TOEIC Grammar Scoping:** Support Part 5 (`unit_drill`, `weak_topics`, `mixed_grammar`, `timed_sprint`) and **grammar-only Part 6** short business memos, while closing the Units 5–145 curated content gap in waves—and clearly communicating that grammar mastery supports the path toward TOEIC 800 without guaranteeing Listening, vocabulary, or full Reading speed readiness.
7. **Zero-Bloat Frontend Architecture:** Upgrade IA to 6 areas (`Dashboard`, `Learn`, `Practice`, `Review`, `TOEIC Training`, `Progress & Analytics`) using existing React 18 + Tailwind + Lucide + lightweight accessible `<svg>` charts (no heavy charting library dependencies required).

---

## 2. Mandatory Conditions Before / During Phase 3 Rollout

| # | Condition | Severity | Gate Timing | Evidence Reference |
|---|---|---|---|---|
| **C1** | **Fix the Unanswered-as-Incorrect Analytics Bug:** Backfill `attemptStatus` on `question_attempt_items` (`studentAnswer IS NULL` -> `'unanswered'`) and exclude `'unanswered'` rows across `progress.controller.ts`, `adaptive.controller.ts`, and all mastery jobs. | **Blocker** | **Phase 3.1 Day 1** (before any mastery calculation) | [exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L439-L451), [progress.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts#L74-L87) |
| **C2** | **Add `Explanation.theorySectionId` & Seed `GrammarConcept` Taxonomy:** Materialize the 145-unit / 542-section concept mapping in PostgreSQL and normalize frontend `toeicRoadmap.ts` typos (`"Listening Part 2"`, `"Reading Part 5"`). | **Required** | **Phase 3.1** | [toeicRoadmap.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/data/toeicRoadmap.ts) |
| **C3** | **Production DB & Migration Parity (Phase 2.2.2 Carryover):** Confirm production DB applies `20261113000000_add_practice_sessions`, reconciles Unit 110 canonical parity, and adds `directUrl` (or direct-endpoint migration override) in [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma) before Phase 3 production migrations. | **Operational Gate** | **Before Production Deploy** | [phase-2.2.2-production-preflight.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-2.2.2-production-preflight.md) |
| **C4** | **Horizontal Scaling Store for Rate Limits / Idempotency:** Keep single-instance Node deployment per Phase 2.2.2, or swap `MemoryStore` ([rate-limit.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts)) and in-memory `Map` ([idempotency.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/idempotency.ts)) to Redis before scaling to multiple API replicas. | **Scaling Condition** | **Before Multi-Replica Scaling** | [rate-limit.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts) |

---

## 3. Complete Phase 3.0 Deliverable Index

1. [phase-3.0-existing-system-audit.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-existing-system-audit.md) — Workstream A: Canonical data, Prisma schema, backend, frontend, and limitation audit.
2. [phase-3.0-learning-experience-design.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-learning-experience-design.md) — Workstream B: Navigation IA, Dashboard, end-to-end learning loop, mastery visualization, and explainable recommendation UX.
3. [phase-3.0-mastery-model.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-mastery-model.md) — Workstream C: Deterministic mastery & retention math, anti-inflation rules, and 4 worked numerical examples.
4. [phase-3.0-data-architecture.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-data-architecture.md) — Workstreams D & G1: Grammar concept taxonomy mapping and PostgreSQL / Prisma schema extensions + ERD.
5. [phase-3.0-personalization-and-toeic-design.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-personalization-and-toeic-design.md) — Workstreams E & F: Personalized practice engine, 5-Gate AI validator, TOEIC Part 5 & grammar-Part 6 training design, and content gap plan.
6. [phase-3.0-api-and-frontend-architecture.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-api-and-frontend-architecture.md) — Workstreams G2, G3 & G4: REST API contracts, React component/routing plan, security, anti-spoiler, and performance indexes.
7. [phase-3.0-implementation-roadmap.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-implementation-roadmap.md) — Workstreams H & I: Phases 3.1–3.4 roadmap, deterministic test matrix, and release gates.
8. [phase-3.0-final-architecture-decision.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.0-final-architecture-decision.md) — Executive summary of decisions, rollout conditions, and `READY WITH CONDITIONS` verdict.

