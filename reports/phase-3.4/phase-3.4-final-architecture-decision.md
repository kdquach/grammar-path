# Phase 3.4 — Final Architecture Decision & Sign-Off Report

**Status:** DESIGN ONLY (Audit & Architecture Stage Complete)  
**Author:** Principal Learning Systems Architect, Educational Data Scientist, Database Auditor, Production Readiness Engineer  
**Date:** 2026-11-13  
**Target Repositories:** `grammarpath-app`, `grammarpath-data`  
**Database:** Neon PostgreSQL Staging (`grammarpath-staging`)

---

## 1. Executive Summary & Final Verdict

A comprehensive architectural, learning-effectiveness, pedagogical, security, accessibility, and database audit has been conducted across the GrammarPath platform.

### Final Verdict: **`READY WITH CONDITIONS`**

The codebase and database schema possess exceptional foundational architecture: clean 3NF normalization, zero schema drift across 42 tables, comprehensive offline and staging test suites passing with 100% success rate, robust daily plan idempotency, and clean separation between curriculum content and student telemetry.

However, direct progression to production deployment is blocked by critical security and pedagogical defects identified during this audit. Implementation of Phase 3.4 may proceed immediately under the condition that **Subphase 3.4A (Security & Integrity)** and **Subphase 3.4B (TOEIC Question Bank)** are prioritized as initial execution gates before user-facing release.

---

## 2. Answers to the 10 Mandatory Architectural Questions

### 1. Does the current system reliably measure learning?
**Conditionally Yes, with two critical blindspots (`[OBSERVED IMPLEMENTATION]`):**
- **Textbook Mastery:** Within the Raymond Murphy curriculum, Bayesian Knowledge Tracing (BKT) accurately models concept acquisition from structured textbook exercises.
- **Blindspot 1 (Review Center Self-Grading `[BLOCKER: F-01]`):** Review completion currently relies on client-calculated `correctCount` where any non-empty input is counted as correct, corrupting review-based mastery evidence.
- **Blindspot 2 (Transfer Learning Disconnect):** The system does not incorporate TOEIC performance into concept mastery scores. A learner can achieve 100% "mastered" status in Murphy while failing all applied TOEIC questions on that same concept.

### 2. Does the spaced repetition model work as intended?
**Partially (`[OBSERVED IMPLEMENTATION]`):**
- The modified Ebisu / Half-Life exponential schedule ($S_{n+1} = S_n \times 2.0$) successfully spaces reviews and expands retention intervals for remembered concepts.
- **Defects:** 
  1. Exponential retention decay $R(t) = 2^{-t/S}$ begins on day 1 post-study, artificially deflating retention to 0.707 before the concept is even due.
  2. Completion grading is client-driven rather than server-authoritative.

### 3. Does the system adequately prepare learners for TOEIC?
**Not Yet (`[RISK: HIGH: F-02]`):**
- **Curated Coverage Deficit:** Only 4 units (Units 1, 2, 3, 4) possess authentic, curated TOEIC Part 5 items (53 total questions). Units 5–145 (97.2% of the curriculum) rely on live Gemini generation (introducing latency and 503 outage risks) or crude regex mutations on Murphy sentences, which lack authentic business/workplace context.
- **Persistent Storage Gap:** Zero rows currently exist in `toeic_practice_items` in staging because practice sessions are treated as ephemeral client activities.

### 4. Is the learning path genuinely personalized or mostly static?
**Mostly Static with Dynamic Overlays (`[OBSERVED IMPLEMENTATION]`):**
- All learners traverse a fixed linear sequence of 145 units partitioned into 5 stages.
- The 5-minute diagnostic assessment routes learners into only one of 3 fixed starting units (Unit 1, 25, or 53). It does not unlock non-linear paths, grant concept-level exemptions, or adapt module sequencing based on individual diagnostic strengths.
- No Directed Acyclic Graph (`ConceptDependency`) exists in the database to enable safe non-linear acceleration.

### 5. What are the top technical risks before production?
1. **`[BLOCKER: F-01]` Client-side grading vulnerability in Review Center:** Allows arbitrary manipulation of memory stability and mastery metrics.
2. **`[HIGH: F-03]` Missing rate limiting on core transactional routes:** Exposes `/check`, `/learning-path`, and `/summary` to connection exhaustion and DoS attacks.
3. **`[HIGH]` Direct database connections without PgBouncer pooler:** Exposes Neon PostgreSQL to connection pool exhaustion during concurrent traffic spikes.

### 6. What are the top product / learning-experience risks?
1. **Severe Accessibility & Keyboard Deficit (`[RISK: MEDIUM]`):** Zero focus trapping in modals, lack of `Escape` key handling, and absence of keyboard shortcuts prevent keyboard-only and screen-reader learners from using the platform.
2. **Information Architecture Fragmentation (`[RISK: MEDIUM]`):** Competing roadmaps (`/roadmap` vs `/learning-path`) and duplicate dashboards (`/dashboard` vs `/progress`) create cognitive friction and confusion.
3. **Split Attention in Study Sessions:** Isolating Theory, Practice, and Summary into rigid tabs prevents learners from referencing rules during exercise completion.

### 7. Can the system support the learner's TOEIC 800 goal?
**Yes, but only after bridging the Murphy-to-TOEIC transfer gap (`[DESIGN PROPOSAL]`):**
- Murphy provides world-class conceptual foundations (syntax, morphology, aspect).
- However, TOEIC 800 requires rapid recognition of business vocabulary, collocations, discourse markers, and complex sentence structures in professional contexts.
- Without a curated bank of workplace-grounded items and transfer-weighted mastery calibration, Murphy mastery alone will plateau around TOEIC 600–650.

### 8. Should Phase 3.4 proceed directly to implementation, or does it require architectural changes first?
**Proceed with Architectural Staging (`[DESIGN PROPOSAL]`):**
- Full system re-architecture is **not** required. The database schema, Prisma configurations, Express controllers, and React architecture are highly modular and maintainable.
- However, implementation must follow a staged sequence: Subphase 3.4A must eliminate the grading vulnerability and secure routes before feature enhancements are released.

### 9. What is the recommended scope breakdown for Phase 3.4?
The recommended breakdown consists of four sequential, independently verifiable subphases:
1. **Subphase 3.4A:** Security, Server-Authoritative Review Grading & API Rate Limiting.
2. **Subphase 3.4B:** Curated TOEIC Question Bank (`ToeicQuestionBankItem`) & Assessment Quality Engine.
3. **Subphase 3.4C:** Mastery Engine Refinement (BKT Inertia Mitigation, TOEIC Transfer Learning, Grace-Period Decay, Model v2.0).
4. **Subphase 3.4D:** Accessibility (WCAG 2.1 AA Modal & Keyboard), Navigation Consolidation & Production Hardening.

### 10. What is the single biggest risk that could cause this project to fail?
**The "Pedagogical Transfer Illusion" (`[RISK: CRITICAL]`):**
If learners spend 6 months mastering Murphy's textbook exercises and achieve 100% "Mastery" in the app, but fail to achieve their target score on actual TOEIC tests due to authentic distractor traps and workplace vocabulary deficits, user trust will collapse. GrammarPath must validate learning gains against authentic, verified assessment items.

---

## 3. Comprehensive Findings & Vulnerability Matrix

| ID | Title | Severity | Impacted Area | Subphase | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | Client-Authoritative Review Grading Vulnerability | `BLOCKER` | `ReviewCenterPage`, `review.controller.ts` | 3.4A | **Action Required** |
| **F-02** | 97.2% Curated TOEIC Item Deficit (Units 5–145) | `HIGH` | `toeic-generator.service.ts`, DB Schema | 3.4B | **Action Required** |
| **F-03** | Missing Rate Limiting on Core Transactional Routes | `HIGH` | `rate-limit.ts`, `routes/index.ts` | 3.4A | **Action Required** |
| **F-04** | Missing Neon PgBouncer Pooler Configuration | `HIGH` | `lib/prisma.ts`, `env.ts` | 3.4D | **Action Required** |
| **F-05** | BKT Learning Inertia at High Attempt Volumes ($N > 20$) | `MEDIUM` | `mastery.service.ts` | 3.4C | **Action Required** |
| **F-06** | Premature Exponential Retention Decay ($R(t)$ on Day 1) | `MEDIUM` | `spaced-repetition.service.ts` | 3.4C | **Action Required** |
| **F-07** | Absence of Prerequisite Graph (`ConceptDependency`) | `MEDIUM` | DB Schema, `learning-path.service.ts` | 3.4B | **Action Required** |
| **F-08** | Severe Accessibility Deficit (No Focus Traps, 1 onKeyDown) | `MEDIUM` | `AuthModal`, `OnboardingModal`, Layout | 3.4D | **Action Required** |
| **F-09** | Navigation Fragmentation (Duplicate Dashboards & Roadmaps) | `MEDIUM` | `Sidebar.tsx`, `App.tsx` | 3.4D | **Action Required** |
| **F-10** | Unbounded In-Memory Historical Telemetry Aggregation | `MEDIUM` | `dashboard.service.ts` | 3.4D | **Action Required** |
| **F-11** | Non-Transactional Review Completion Pipeline | `MEDIUM` | `review.service.ts` | 3.4A | **Action Required** |
| **F-12** | Split-Attention Layout on StudySessionPage | `LOW` | `StudySessionPage.tsx` | 3.4D | **Action Required** |
| **F-13** | Lack of Centralized Application Error Monitoring | `LOW` | `error-handler.ts` | 3.4D | **Action Required** |

---

## 4. Verification of Strict Safety Invariants

During the execution of this Stage 1 audit and architecture design, all strict safety gates were 100% maintained:
- `[VERIFIED FACT]` **Canonical Repository Immutability:** `grammarpath-data` branch `main` (`490ccc5`) has 0 uncommitted changes. All 145 canonical units (`unit-001.json` to `unit-145.json`) were verified against `HEAD` with 0 diffs.
- `[VERIFIED FACT]` **Database Safety & Isolation:** Zero schema migrations were executed. Zero write mutations were committed. The staging database (`grammarpath-staging`) remains untouched and consistent.
- `[VERIFIED FACT]` **Zero Production Access:** No connections to production environments or credentials were made.
- `[VERIFIED FACT]` **Strict DESIGN ONLY Scope:** Zero application code, test scripts, or data files were modified. All deliverables consist exclusively of design and audit documentation in `reports/phase-3.4/`.

---

## 5. Artifact Delivery Summary

All 10 mandated Stage 1 architectural reports have been produced and published to [`reports/phase-3.4/`](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.4/):

1. `phase-3.4-existing-system-audit.md` (System baseline, test metrics, schema & code health)
2. `phase-3.4-mastery-and-learning-effectiveness.md` (BKT calibration, inertia analysis, transfer model)
3. `phase-3.4-spaced-repetition-audit.md` (Ebisu/Half-life schedule, review queueing, decay calibration)
4. `phase-3.4-toeic-quality-audit.md` (Part 5/6 alignment, distractor quality, workplace context)
5. `phase-3.4-personalization-audit.md` (Diagnostic assessment, linear sequence vs DAG, daily plan)
6. `phase-3.4-ux-and-accessibility-audit.md` (WCAG 2.1 AA audit, keyboard navigation, modal focus traps)
7. `phase-3.4-production-readiness-audit.md` (Security threat model, rate limiting, connection pooling)
8. `phase-3.4-data-architecture-audit.md` (42 tables audit, missing models, versioning strategy)
9. `phase-3.4-implementation-roadmap.md` (4-subphase sequential roadmap with test & rollback plans)
10. `phase-3.4-final-architecture-decision.md` (10 mandatory answers, findings matrix, sign-off verdict)

