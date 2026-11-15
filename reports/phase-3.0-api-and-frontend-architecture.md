# GrammarPath — Phase 3.0 Workstreams G2, G3 & G4: API, Frontend, Security & Performance Architecture

> **Phase:** 3.0 — Design & Audit Only  
> **Date:** 2026-11-13  
> **Scope:** Backend API Contracts (G2), Frontend Component & Routing Architecture (G3), Security, Anti-Spoiler & Performance Architecture (G4).

---

## Part 1 — Workstream G2: Backend Service & API Architecture

### G2.1 Modular Service Layer Refactoring

To eliminate the duplicated in-memory analytics logic across [progress.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/progress.controller.ts), [adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts), and [toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts), Phase 3 organizes backend business logic into clean services under `backend/src/services/`:

| Service File | Responsibility |
|---|---|
| `concept-mapping.service.ts` | Resolves `Question -> Explanation.theorySectionId -> GrammarConcept`, exposes 16 Modules / 5 Stages / 95 Concepts + unit mappings (replacing hardcoded frontend `toeicRoadmap.ts`). |
| `mastery.service.ts` | Executes the deterministic Mastery & Retention model (Workstream C), excluding `attemptStatus = 'unanswered'`, recomputing affected `(userId, conceptId)` rows on submission events, and updating `user_daily_activity` + `user_mastery_snapshots`. |
| `recommendation.service.ts` | Evaluates `UserConceptMastery`, `LearningProgress`, and due SRS items to generate top 4 explainable `Recommendation` objects (`action`, `reason`, `evidence`, `expectedOutcome`). |
| `srs.service.ts` | Queries `user_concept_mastery` where `nextReviewAt <= now` or `retentionScore < 0.70`, coordinates due-review sessions, and updates `srsStage` / `halfLifeDays`. |
| `practice-generator.service.ts` | Builds Personalized Practice sets (Tier-1 canonical selector + rule templates; Tier-2 Gemini supplement). |
| `practice-validator.service.ts` | Enforces the 5-Gate validation pipeline on all Tier-2 AI items (and TOEIC AI items) prior to persistence. |
| `toeic-analytics.service.ts` | Aggregates `ToeicPracticeSession` / `ToeicPracticeItem` by mode, `toeicCategory`, and pace (`avgSecondsPerItem`). |

### G2.2 Backward Compatibility with Phase 1–2 Endpoints

All existing `/api/v1/*` routes remain live and backwards-compatible for existing tests and progressive UI rollout:
- `GET /api/v1/progress/overview` & `GET /api/v1/adaptive/analytics`: Fixed in Phase 3.1 to **exclude `attemptStatus = 'unanswered'` / `studentAnswer = null`**, preserving response shape while adding additive mastery/unanswered summary fields.
- `POST /api/v1/exercises/:exerciseId/check` & `POST /api/v1/questions/:questionId/check`: Continue returning identical feedback/grading responses, while writing `attemptStatus`, `attemptSource`, and triggering incremental `mastery.service.recomputeForUserConcepts(...)`.
- `POST /api/v1/adaptive/toeic-practice` & `/check`: Preserved as aliases/backwards-compatible delegates to the upgraded TOEIC service (adding validation gates + `conceptId` linking).

### G2.3 New / Upgraded Phase 3 API Endpoints (`/api/v1`)

All personalized, progress, mastery, practice, review, and TOEIC routes enforce `requireAuth` (returning `401 UNAUTHORIZED` otherwise) and strict `userId` ownership scoping.

| Endpoint | Method | Purpose & Auth | Request / Response Highlights |
|---|---|---|---|
| `/curriculum/roadmap` | `GET` | Public/OptionalAuth | Returns authoritative 5 Stages, 16 Modules, ~95 `GrammarConcept`s, normalized `toeicParts`, and per-user completion/mastery overlay if signed in. |
| `/dashboard/summary` | `GET` | `requireAuth` | Single fast aggregate reading `user_concept_mastery`, `learning_progress`, `user_daily_activity`, and top recommendations: returns `curriculumCoverage` (`opened`, `completed`, `exercisesAttempted`, `questionsAnswered`), `masteryDistribution`, `dueReviewCount`, `unresolvedMistakeCount`, `rollingAccuracy14d`, `streakDays`, `weakestConcepts` (top 4, `insufficient_data` excluded), `topRecommendations`, and `recentActivity`. |
| `/mastery/concepts` | `GET` | `requireAuth` | Query filters: `stage`, `moduleCode`, `toeicCategory`, `level`, `dueOnly`. Returns all concepts with `masteryScore`, `masteryLevel`, `confidenceLevel`, `rawAccuracy`, `retentionScore`, `distinctQuestionsAttempted`, `unresolvedMistakeCount`, `nextReviewAt`, and linked `unitNumbers`. |
| `/mastery/trends` | `GET` | `requireAuth` | Query `?days=30\|90`. Reads `user_mastery_snapshots` + `user_daily_activity` + question-type accuracy rollup (`fill_blank`, `transformation`, `sentence_correction`, `multiple_choice`, etc.). |
| `/recommendations` | `GET` | `requireAuth` | Returns up to 4 explainable cards `{ id, type, title, actionLabel, reason, evidence: { accuracy, gradedCount, unresolvedMistakes, daysSinceLastSuccess, confidenceLevel }, expectedOutcome, targetRoute, payload }`. |
| `/review/queue` | `GET` | `requireAuth` | Unified Review inbox: returns `{ dueConcepts: [...], unresolvedMistakes: [...] }` combining SRS-due concepts and `mistakes.service.ts` items. |
| `/practice/sessions` | `POST` | `requireAuth` + `aiRateLimiter` (when AI invoked) | Body: `{ mode: 'weak_concept' \| 'review_srs' \| 'mixed_reinforcement', conceptIds?: string[], questionCount: 5..15, difficulty?: 'easy'\|'medium'\|'hard'\|'adaptive', allowAi?: boolean }`. Creates `PracticeSession` + validated `PracticeSessionItem`s. **Strips `correctAnswer` and `explanation` (Anti-Spoiler).** |
| `/practice/sessions/:sessionId` | `GET` | `requireAuth` (owner check) | Fetches active/completed session. Only includes `correctAnswer` & `explanation` on items where `attemptStatus IS NOT NULL` (`answeredAt != null`). |
| `/practice/sessions/:sessionId/submit` | `POST` | `requireAuth` (owner check) | Body: `{ submissionId?, answers: Record<itemId, answer>, elapsedSeconds?: number }`. Grades non-empty answers (unsubmitted items marked `unanswered`), updates `UserConceptMastery`, `srsStage`, and resolves matching mistakes if spaced. Returns item feedback + updated concept mastery delta! |
| `/toeic/sessions` | `POST` | `requireAuth` + `aiRateLimiter` (if AI used) | Body: `{ mode: 'unit_drill' \| 'weak_topics' \| 'mixed_grammar' \| 'timed_sprint' \| 'part6_grammar', unitNumber?, conceptIds?, difficulty?, questionCount: 5\|10\|15\|20\|30, timeLimitSeconds? }`. Generates 5-Gate validated TOEIC-style drill (`correctAnswer` & `explanation` stripped pre-submit). |
| `/toeic/sessions/:sessionId/submit` | `POST` | `requireAuth` (owner check) | Server computes elapsed time against `startedAt + timeLimitSeconds`, grades answers, stores `attemptStatus` & `conceptId`, triggers `mastery.service` + `toeicAnalytics`. Returns breakdown by `toeicCategory` and pace (`avgSecondsPerItem`). |
| `/toeic/analytics` | `GET` | `requireAuth` | Returns cumulative TOEIC practice count, accuracy by `toeicCategory` (6 categories), timed vs untimed accuracy, `avgSecondsPerItem`, and non-ETS / non-guarantee disclaimer metadata. |

---

## Part 2 — Workstream G3: Frontend Architecture & Component Plan

### G3.1 Routing & Layout Changes ([App.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/App.tsx), [Sidebar.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/layout/Sidebar.tsx))

```
/                  -> Smart Entry: Dashboard if authenticated, Learn Catalog + Guest Hero if guest
/dashboard         -> DashboardPage (signed-in actionable hub; guest preview CTA)
/learn             -> CatalogPage (145-unit Murphy browser; /catalog redirects or aliases)
/roadmap           -> ToeicRoadmapPage (synced from GET /curriculum/roadmap)
/units/:unitNumber -> UnitPage (Theory + Canonical Exercises + RuleReferenceModal + Unit TOEIC Bridge)
/practice          -> PracticeHubPage (Weak-concept drills, active session runner, history)
/review            -> ReviewHubPage (Tab 1: Spaced Review Queue | Tab 2: Unresolved Mistakes; /mistakes aliases Tab 2)
/toeic             -> ToeicTrainingPage (Unit Drill, Weak Topics, Mixed Part 5, Timed Sprint, Part 6 Grammar, Analytics)
/progress          -> ProgressAnalyticsPage (Stage/Module Mastery Matrix, 145-Unit Heatmap, Format Breakdown, Trends)
```

### G3.2 New & Reused Components (Zero New Heavy Dependencies)

Inspecting [frontend/package.json](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/package.json) shows React 18, Lucide React, and TailwindCSS 3.4. **No external charting library (`recharts`/`chart.js`) is required** for Phase 3—custom accessible inline `<svg>` components (`TrendSparklineSVG`, `MasteryDonutSVG`, `UnitHeatmapGrid`) eliminate bundle bloat, avoid React 18 peer conflicts, and integrate natively with Tailwind styling and Playwright selectors.

| Component Group | Reuse Existing | New / Upgraded Components |
|---|---|---|
| **Shared Feedback & Inputs** | [QuestionCard.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx), [QuestionFeedbackPanel.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx), [RuleReferenceModal.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/theory/RuleReferenceModal.tsx) | Extend shared `QuizSessionRunner` component used by both `/practice` and `/toeic` (supports countdown timer bar, question navigator pills, unanswered confirmation dialog, post-submit mastery delta badge). |
| **Mastery & Explainability UI** | — | `MasteryTierBadge` (displays `"Not enough practice data"` when `N < 3`), `ConfidenceIndicator` (`none/low/medium/high`), `ExplainableRecommendationCard` (renders Action, Reason, Evidence chips, Expected Outcome), `RetentionDuePill`. |
| **Analytics Visualizations** | — | `AccuracyTrendChart` (accessible SVG dual-line/area chart with keyboard hover tooltips), `ConceptMasteryMatrix` (16 Modules + expandable concepts), `UnitHeatmap145` (clickable 145-tile grid), `QuestionTypeComparisonBars`. |
| **Cleanup / Deduplication** | [AdaptiveReviewPanel.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveReviewPanel.tsx) | Retire duplicate embedding of `AdaptiveReviewPanel` inside `MistakeReviewPage`; move modal quiz flows ([AdaptiveQuizModal.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/AdaptiveQuizModal.tsx), [ToeicPracticeModal.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx)) to thin wrappers or direct navigation to `/practice` & `/toeic` with prefilled params (`?unit=13&mode=unit_drill`). |

### G3.3 State Handling Matrix

- **Guest State:** `/learn`, `/roadmap`, and `/units/:unitNumber` remain browsable; `/dashboard`, `/practice`, `/review`, `/progress`, and `/toeic` show a clear sign-in prompt with value preview (`AuthModal`) and zero fake user metrics.
- **Cold-Start Authenticated User (`0` attempts):** Shows `0 / 145 completed`, `"Not enough practice data"` across concepts, and a Starter Onboarding recommendation card.
- **Partial Submission Warning:** Before submitting a practice/TOEIC session with blank items, UI indicates `"X unanswered questions will be skipped (not graded as wrong)"` transparently.
- **AI Degraded Mode:** If Gemini hits rate limit or circuit breaker cooldown (`fallback` / Tier-1 source), UI shows a non-alarmist info chip (`"Generated from verified grammar rule templates"`) without blocking practice.

---

## Part 3 — Workstream G4: Security, Anti-Spoiler & Performance Architecture

### G4.1 Security & Isolation Controls

1. **Strict Session Ownership (IDOR Prevention):** Every `GET`/`POST` on `/practice/sessions/:sessionId*`, `/toeic/sessions/:sessionId*`, `/dashboard/*`, `/mastery/*`, `/review/*` queries with `{ where: { id: sessionId, userId: req.user!.id } }` and returns `404` / `403` on cross-user access.
2. **Anti-Spoiler Enforcement Across New Modes:**
   - Apply `assertNoSpoilerQueryParams` ([exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts#L23-L44)) across all Practice & TOEIC `GET` endpoints.
   - `POST /practice/sessions` and `POST /toeic/sessions` select explicit non-answer DTO fields (never `correctAnswer` or `explanation`!). Solutions are returned **only** inside `/submit` response or on `GET` for items already having `answeredAt != null`.
3. **Timer Integrity (`timed_sprint`):** Client countdown timer is UX-only; server sets `startedAt` and `timeLimitSeconds` at session creation and validates `elapsedSeconds` server-side at submit time.
4. **Prompt Injection & Cost Bounding:**
   - User-provided parameters to practice/TOEIC generators are **strictly structured enums/UUIDs/unit integers** validated by Zod—zero free-text user prompt interpolation into Practice/TOEIC Gemini prompts.
   - Rate limiting ([rate-limit.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts)): apply `aiRateLimiter` specifically when `allowAi !== false` and Tier-2 Gemini is needed (default `20 / 15min` per `user:${id}`), while Tier-1 deterministic drills and `GET` analytics use higher standard authenticated limits (`120 / 15min`) so learners aren't locked out of studying.
   - **Multi-Instance Scaling Condition:** As identified in [phase-2.2.2-production-preflight.md](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-2.2.2-production-preflight.md#L32), if deployment scales beyond 1 Node replica, migrate `rate-limit-redis` / shared store for rate limits and idempotency keys ([idempotency.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/idempotency.ts)).

### G4.2 Performance & Database Indexing Strategy

- **Eliminate Full-History Scans:**
  - Dashboard (`/dashboard/summary`) queries `user_concept_mastery` (~95 indexed rows/user), `learning_progress` (~145 rows max), `user_daily_activity` (last 30 rows), and recent attempts (`take: 10`), turning `O(all lifetime attempts)` into **`O(1)` (~15–30ms)**.
- **Event-Driven Mastery Recomputation:**
  - Submitting a 10-question exercise touches 1–2 `GrammarConcept`s. `mastery.service.recomputeForConcepts(userId, conceptIds)` reads **only** attempts linked to those `conceptIds` via indexed `Explanation.theorySectionId -> ConceptTheoryLink`, avoiding cross-curriculum scans.
- **Required Database Indexes:**
  - `question_attempt_items(user_id, attempt_status, created_at DESC)` — fast non-unanswered filtering & 14-day rolling accuracy.
  - `explanations(theory_section_id)` — fast join from `Question` -> `TheorySection` -> `GrammarConcept`.
  - `user_concept_mastery(user_id, next_review_at)` & `user_concept_mastery(user_id, mastery_level)` — instant Due Queue and weakest concept retrieval.
  - `practice_sessions(user_id, started_at DESC)` & `toeic_practice_sessions(user_id, mode, created_at DESC)` — fast history & TOEIC analytics.

