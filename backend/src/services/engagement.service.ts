import prisma from "../lib/prisma";
import { getUserPreferences } from "./onboarding.service";

export interface EngagementSummaryResponse {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  activeDatesLast30Days: string[];
  weeklyDaysActive: number;
  weeklyGoalDays: number;
  dailyGoalMinutes: number;
  dailyMinutesCompletedToday: number;
  metrics: {
    unitsCompleted: number;
    totalUnits: number;
    completionPercentage: number;
    overallAccuracy: number | null;
    totalEvaluatedQuestions: number;
    masteredConceptsCount: number;
    practicingConceptsCount: number;
    needsReviewConceptsCount: number;
    averageRetention: number;
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getEngagementSummary(userId: string): Promise<EngagementSummaryResponse> {
  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = toDateKey(yesterdayDate);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    preferences,
    exerciseAttempts,
    reviewSchedules,
    toeicItems,
    planItems,
    totalUnits,
    completedUnits,
    attemptItems,
    userMasteries,
  ] = await Promise.all([
    getUserPreferences(userId),
    prisma.exerciseAttempt.findMany({
      where: { userId },
      select: { submittedAt: true },
    }),
    prisma.conceptReviewSchedule.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),
    prisma.toeicPracticeItem.findMany({
      where: { session: { userId }, answeredAt: { not: null } },
      select: { answeredAt: true },
    }),
    prisma.dailyLearningPlanItem.findMany({
      where: { plan: { userId }, status: "completed", completedAt: { not: null } },
      select: { completedAt: true, estimatedMinutes: true },
    }),
    prisma.unit.count(),
    prisma.learningProgress.count({
      where: { userId, status: "completed" },
    }),
    prisma.questionAttemptItem.findMany({
      where: { userId, attemptStatus: { not: "unanswered" } },
      select: { attemptStatus: true },
    }),
    prisma.userConceptMastery.findMany({
      where: { userId },
      select: { masteryStatus: true, retentionScore: true },
    }),
  ]);

  // 1. Gather all unique calendar dates with qualifying activity
  const activeDateSet = new Set<string>();

  for (const a of exerciseAttempts) {
    if (a.submittedAt) activeDateSet.add(toDateKey(a.submittedAt));
  }
  for (const r of reviewSchedules) {
    if (r.lastReviewedAt) activeDateSet.add(toDateKey(r.lastReviewedAt));
  }
  for (const t of toeicItems) {
    if (t.answeredAt) activeDateSet.add(toDateKey(t.answeredAt));
  }
  for (const p of planItems) {
    if (p.completedAt) activeDateSet.add(toDateKey(p.completedAt));
  }

  const sortedDates = Array.from(activeDateSet).sort();

  // 2. Compute current streak & longest streak
  let currentStreak = 0;
  let longestStreak = 0;

  const isActiveToday = activeDateSet.has(todayKey);
  const isActiveYesterday = activeDateSet.has(yesterdayKey);

  // If active today or yesterday, the streak is alive
  if (isActiveToday || isActiveYesterday) {
    let checkDate = isActiveToday ? now : yesterdayDate;
    while (true) {
      const key = toDateKey(checkDate);
      if (activeDateSet.has(key)) {
        currentStreak += 1;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  // Calculate longest historical streak
  let tempStreak = 0;
  let prevDateMs = 0;
  for (const dateKey of sortedDates) {
    const curMs = new Date(dateKey).getTime();
    if (prevDateMs === 0) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((curMs - prevDateMs) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    prevDateMs = curMs;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // 3. Weekly active days (current ISO week: Monday to Sunday)
  const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  const mondayThisWeek = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
  const mondayKey = toDateKey(mondayThisWeek);

  let weeklyDaysActive = 0;
  for (const d of sortedDates) {
    if (d >= mondayKey && d <= todayKey) {
      weeklyDaysActive += 1;
    }
  }

  // Daily minutes completed today
  const dailyMinutesCompletedToday = planItems
    .filter((p) => p.completedAt && toDateKey(p.completedAt) === todayKey)
    .reduce((sum, p) => sum + p.estimatedMinutes, 0);

  // Metrics
  const totalEvaluated = attemptItems.length;
  const correctEvaluated = attemptItems.filter((it) => it.attemptStatus === "correct").length;
  const overallAccuracy =
    totalEvaluated > 0 ? Math.round((correctEvaluated / totalEvaluated) * 1000) / 10 : null;

  const masteredConceptsCount = userMasteries.filter((m) => m.masteryStatus === "mastered").length;
  const practicingConceptsCount = userMasteries.filter(
    (m) => m.masteryStatus === "practicing" || m.masteryStatus === "proficient"
  ).length;
  const needsReviewConceptsCount = userMasteries.filter(
    (m) => m.masteryStatus === "needs_review"
  ).length;

  const retentionSum = userMasteries.reduce((sum, m) => sum + m.retentionScore, 0);
  const averageRetention =
    userMasteries.length > 0 ? Math.round((retentionSum / userMasteries.length) * 100) / 100 : 1.0;

  const thirtyDaysCutoff = toDateKey(thirtyDaysAgo);
  const activeDatesLast30Days = sortedDates.filter((d) => d >= thirtyDaysCutoff);

  return {
    currentStreak,
    longestStreak,
    isActiveToday,
    activeDatesLast30Days,
    weeklyDaysActive,
    weeklyGoalDays: (preferences.preferredDays as string[])?.length || 5,
    dailyGoalMinutes: preferences.dailyStudyMinutes || 20,
    dailyMinutesCompletedToday,
    metrics: {
      unitsCompleted: completedUnits,
      totalUnits,
      completionPercentage:
        totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 1000) / 10 : 0,
      overallAccuracy,
      totalEvaluatedQuestions: totalEvaluated,
      masteredConceptsCount,
      practicingConceptsCount,
      needsReviewConceptsCount,
      averageRetention,
    },
  };
}
