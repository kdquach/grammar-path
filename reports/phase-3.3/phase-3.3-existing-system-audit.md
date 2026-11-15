# GrammarPath Phase 3.3 — Existing System Audit & Architecture Alignment

**Document Version:** 1.0.0  
**Date:** 2026-11-13  
**Author:** Senior Product Engineer, Learning Experience Architect, UX Engineer, and QA Engineer  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 3.3 elevates GrammarPath from a collection of powerful individual modules (curriculum reader, exercise grader, adaptive quiz, mistake review, TOEIC roadmap, mastery engine, and review center) into a unified, engaging, production-quality English grammar learning experience centered on Raymond Murphy's *English Grammar in Use* (4th Edition).

Before implementing Phase 3.3, this audit systematically inspected:
1. Frontend architecture (React 19, TypeScript, Vite, Tailwind CSS, Lucide icons).
2. Backend architecture (Node.js, Express, TypeScript, Prisma ORM 6.19.3).
3. Live staging database (PostgreSQL on Neon `ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`).
4. Canonical curriculum data (`grammarpath-data` on `main`, strictly clean and immutable).
5. Existing services (mastery calculation, spaced repetition scheduling, personalized recommendations, dashboard telemetry, TOEIC roadmap).
6. Phase 3.2 follow-up review-stability limit reconciliation.

---

## 2. Phase 3.2 Follow-up Consistency Check: Review Stability Limit

### 2.1 The Issue
The Phase 3.2 implementation narrative report (`phase-3.2-implementation-report.md`) referenced an early design draft proposing a 60-day maximum stability ceiling, whereas the independent verification report (`phase-3.2-independent-verification.md`) documented a 90-day ceiling.

### 2.2 Inspection of Source Code and Database
- **Implementation in [`review.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts#L232):**
  ```typescript
  if (accuracy >= 0.7) {
    // PASS / REMEMBERED: Expand interval exponentially
    newConsecutive = currentConsecutive + 1;
    newStability = Math.min(90.0, Math.round(currentStability * 2.0 * 10) / 10);
    newInterval = Math.max(1, Math.round(newStability));
    reviewState = "scheduled";
  }
  ```
- **Database Schema & Constraints:**
  Table `concept_review_schedules.stability_days` is a `DOUBLE PRECISION` column with no SQL CHECK restriction capping at 60.
- **Unit and Staging Tests:**
  Tests in [`phase3-2-staging.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-2-staging.api.test.ts) and [`phase3-2-unit.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-2-unit.test.ts) assert monotonic growth up to the 90.0-day mathematical limit.

### 2.3 Verdict & Source-of-Truth Determination
The actual code, tests, and database source-of-truth is **90.0 days**. The 60-day reference was an early design proposal that was expanded to 90.0 days (approximately 3 months, aligning with a standard academic quarter) during Phase 3.2 development to accommodate long-term mastery retention. No code change is necessary; this reconciliation settles the documentation discrepancy.

---

## 3. Inventory of Existing Functionality to Reuse

| Subsystem | Existing Component / Service | Capabilities Available for Reuse |
|---|---|---|
| **Curriculum & Theory** | `units.controller.ts`, `theory.controller.ts`, `TheoryViewer.tsx` | Fetch 145 units, 542 theory sections, illustrative examples with Vietnamese translations, and rule reference modals. |
| **Exercise Grading** | `exercises.controller.ts`, `grading.service.ts`, `QuestionCard.tsx` | Deterministic server-side grading, multi-blank input, case/punctuation normalization, accepted alternatives, and answer protection. |
| **Mastery Engine** | `mastery.service.ts`, `mastery.controller.ts`, `MasteryPage.tsx` | Concept-level mastery calculation with repeat discounting $d(k) = \max(0.1, 0.5^k)$, same-day penalty ($0.5\times$), recency decay ($e^{-0.02t}$), distinct question gating ($D \ge 5$). |
| **Review Scheduler** | `review.service.ts`, `review.controller.ts`, `ReviewCenterPage.tsx` | Two-component memory model ($R=e^{-t/S}$), stability growth on $\ge 70\%$, lapse on $< 70\%$, micro-drill generation from real curriculum. |
| **Recommendations** | `recommendations.service.ts`, `recommendations.controller.ts` | 4-tier prioritized recommendations: Due reviews (100) $\to$ Weaknesses (80) $\to$ Evidence building (60) $\to$ Progression (40). |
| **Dashboard Telemetry** | `dashboard.service.ts`, `dashboard.controller.ts`, `DashboardPage.tsx` | 30-day activity tracking, separate completed vs opened units, question-level accuracy (excluding unanswered), weak units analysis. |
| **TOEIC Integration** | `adaptive.controller.ts`, `ToeicRoadmapPage.tsx`, `ToeicPracticeModal.tsx` | Curated Murphy units mapped to TOEIC parts, practice item generation, attempt source `toeic_practice`. |
| **Authentication** | `auth.controller.ts`, `AuthContext.tsx`, `AuthModal.tsx` | JWT-based auth with secure localStorage persistence, auto-refresh, and login/register modal. |

---

## 4. Existing UX Inconsistencies & Friction Points

1. **Fragmented Learning Journeys:**
   Currently, a user reads theory in `UnitPage.tsx`, then switches tabs to exercises, submits, views mistakes in `MistakeReviewPage.tsx`, checks mastery in `MasteryPage.tsx`, and opens reviews in `ReviewCenterPage.tsx`. There is no seamless end-to-end "Study Session" guiding the learner from concept discovery through practice, review, and reflection.
2. **Lack of Guided Onboarding:**
   New users land on the raw 145-unit Catalog with no orientation, diagnostic level assessment, or personalized starting point. They must guess whether to start at Unit 1 or jump around.
3. **No Realistic Daily Study Plan:**
   Learners do not know *how much* to study each day based on their available time (e.g., 15 vs 30 vs 45 minutes). Without a structured daily plan, learners either burn out or drop off.
4. **Dashboard Overload vs Next Action:**
   The current dashboard has many statistical cards but lacks a prominent, singular "Next Step" workflow and daily checklist.
5. **Separation of TOEIC from Core Learning:**
   The TOEIC Roadmap exists as a standalone page rather than being woven into recommended daily practice for learners with TOEIC goals.

---

## 5. Architectural Gaps & Justified Schema Additions

To fulfill Phase 3.3 without duplicating any existing systems, the following targeted schema additions are justified:

### 5.1 `UserLearningPreferences` (1-to-1 with `User`)
- **Justification:** Captures learner onboarding inputs (confidence level, learning goals, daily available minutes, study days, optional TOEIC score target).
- **Constraints:** `@unique([userId])`, cascade delete on user deletion.

### 5.2 `DiagnosticAssessment` & `DiagnosticAssessmentItem`
- **Justification:** Persists diagnostic assessment sessions conducted using canonical Murphy questions, recording baseline proficiency and strengths/weaknesses without artificially inflating mastery.
- **Constraints:** Cascade delete on user deletion.

### 5.3 `DailyLearningPlan` & `DailyLearningPlanItem`
- **Justification:** Powers the daily learning plan. Each calendar date has at most one plan per user (`@unique([userId, planDate])`), ensuring idempotent generation.
- **Constraints:** `planDate` formatted as ISO date string (`YYYY-MM-DD`). State machine: `not_started`, `in_progress`, `completed`, `partially_completed`, `deferred`.

### 5.4 Dynamic Streak & Engagement Computation
- **Justification:** Rather than creating a brittle separate streak table that risks desynchronization or timezone drift, qualifying daily engagement is computed dynamically from persisted `ExerciseAttempt`, `ToeicPracticeSession`, and `DailyLearningPlan` records using calendar date sets in the user's local timezone.

---

## 6. Product Safety & Data Integrity Guarantees

1. **Staging Environment Only:** All backend operations and tests run through [`run-with-staging-env.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-with-staging-env.mjs) against `grammarpath-staging`.
2. **Canonical Curriculum Immutability:** `grammarpath-data` remains 100% untouched.
3. **Zero Answer Key Exposure:** Assessment and study session questions sanitize answer keys and explanations until submitted for server-side evaluation.
4. **No Metric Conflation:** Curriculum completion, accuracy, concept mastery, retention, and engagement remain distinctly calculated and displayed.

