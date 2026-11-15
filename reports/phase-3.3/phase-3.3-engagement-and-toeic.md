# Phase 3.3 — Engagement Telemetry & TOEIC Foundation Bridge Report

## 1. Objectives & Behavioral Principles

Consistent learning requires sustained engagement. However, artificial or manipulative gamification (synthetic streaks, fabricated badges, arbitrary points) harms learner trust and creates a false sense of security.

Phase 3.3 implemented an **honest, evidence-grounded engagement system** and a **TOEIC Foundation Bridge**, adhering to these principles:
1. **Honest Streak Tracking:** Streaks represent real daily practice activity. If a learner has not practiced yet today, their active streak is preserved if they practiced yesterday; if they miss more than 1 calendar day, it cleanly resets to 0. No fake grace periods or artificial score inflation.
2. **Empirical Learning Telemetry:** Tracks true question attempts, total questions answered, answered accuracy, and distinct active study days.
3. **TOEIC Foundation Bridge:** Connects Murphy grammar concepts to TOEIC Part 5 & 6 practice questions, maintaining strict educational transparency: grammar mastery is foundational for TOEIC 800, but does not substitute for listening comprehension or reading speed.

---

## 2. Streak Computation Algorithm

The streak calculation logic in `backend/src/services/engagement.service.ts` inspects distinct calendar activity dates from `QuestionAttemptItem` and `ExerciseAttempt`:

```typescript
export function computeUserStreak(activityDatesUtc: string[], todayUtcDateString: string): {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
}
```

### 2.1 Rules & Edge Cases:
- **Active Today:** If the learner has completed at least one attempt today (`todayUtcDateString`), `isActiveToday = true` and `currentStreak` includes today.
- **Active Yesterday (Pending Today):** If the learner has not practiced yet today, but practiced yesterday (`today - 1 day`), `isActiveToday = false`, but `currentStreak` is preserved as continuous, giving the learner until midnight UTC to maintain their streak.
- **Dormant / Broken Streak:** If the most recent activity date is older than yesterday, `currentStreak = 0`.
- **Longest Streak:** Computed across the user's entire historical activity timeline as the maximum consecutive unbroken run of distinct calendar days.

---

## 3. Engagement Telemetry Schema & Summary

The engagement summary is served via `GET /api/v1/engagement/summary`, returning:

```typescript
interface EngagementSummaryResponse {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  totalStudyDays: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  recentActivity: Array<{
    date: string; // 'YYYY-MM-DD'
    count: number;
    accuracy: number;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    achievedAt: string | null;
  }>;
}
```

### 3.1 Honest Milestone Definitions:
- **First Step:** Completed first textbook exercise (`totalQuestionsAnswered >= 1`).
- **Consistent Learner:** Maintained a 3-day active streak (`currentStreak >= 3` or `longestStreak >= 3`).
- **Habit Formed:** Maintained a 7-day active streak (`longestStreak >= 7`).
- **Century Club:** Answered 100 grammar questions across curriculum exercises (`totalQuestionsAnswered >= 100`).
- **Concept Master:** Mastered at least 5 grammar concepts according to Phase 3.2 criteria.

---

## 4. TOEIC Foundation Bridge Integration

The TOEIC Foundation Bridge connects Murphy units directly to TOEIC Part 5 & 6 sentence completion challenges:

### 4.1 Transparent Educational Guardrails
The UI and API consistently state the educational boundary:
> *"GrammarPath focuses on English grammar mastery based on Murphy 4th Edition. Completing the grammar curriculum provides the structural foundation for high scores, but achieving TOEIC 800 also requires extensive listening practice, vocabulary expansion, and reading speed training."*

### 4.2 Seamless Practice Flow
- From the **TOEIC Roadmap Page** (`/roadmap`), learners view how all 145 Murphy units map to specific TOEIC grammar question types (verb tenses, modals, conditionals, prepositions, passive voice, noun clauses).
- Learners can launch targeted TOEIC practice drills directly from the roadmap or from the Daily Learning Plan.
- Incorrect answers in TOEIC drills create `unresolved_mistakes` linked to the underlying Murphy unit for targeted remediation.

---

## 5. Mobile Responsiveness & UX Polish

Phase 3.3 conducted rigorous viewport audits at mobile dimensions (375×812 viewport, iPhone standard):
- **Horizontal Overflow Check:** Verified `document.documentElement.scrollWidth <= window.innerWidth` (zero horizontal page drift).
- **Touch-Friendly Controls:** All clickable buttons, option selectors, and checkboxes adhere to minimum 44px touch targets.
- **Fluid Layouts:** Uses responsive flex and grid layouts with Tailwind (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).

---

## 6. Verification & Evidence

- **Unit Tests:** `backend/tests/phase3-3-unit.test.ts` tested streak continuity across boundaries (same day, consecutive days, 2-day gap, empty history).
- **Staging Database Verification:** `backend/tests/phase3-3-staging.api.test.ts` verified `GET /api/v1/engagement/summary` across real staging user accounts.
- **Frontend Component Tests:** `frontend/tests/phase3-3-experience.test.tsx` verified streak badge display, progress charts, and milestone states.
- **Playwright Live Verification:**
  - Journey 4 verified Active Streak counter on `/dashboard` (`05-daily-plan-dashboard.png`).
  - Journey 6 verified mobile responsive layout at 375×812 with `horizontalOverflow === false` (`06-mobile-responsive-375x812.png`).

