import prisma from "../lib/prisma";
import { getLatestUnresolvedMistakes } from "./mistakes.service";
import {
  computeNullableAccuracy,
  computeNullableAverageScore,
} from "../utils/attempt-telemetry";

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLastNDaysKeys(days: number, now: Date): string[] {
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)
    );
    keys.push(toUtcDateKey(d));
  }
  return keys;
}

export async function buildLearnerDashboardSummary(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUnits,
    totalExercises,
    learningProgressRows,
    exerciseAttemptCount,
    uniqueExercisesAttempted,
    avgExerciseScore,
    recentExerciseAttempts,
    evaluatedAttemptItems,
    unansweredAttemptCount,
    sourceGroupCounts,
    toeicSessions,
    toeicAnsweredItems,
    unresolvedMistakes,
    recentExerciseActivityDates,
    recentItemActivityDates,
    recentToeicActivityDates,
  ] = await Promise.all([
    prisma.unit.count(),
    prisma.exercise.count(),
    prisma.learningProgress.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            title: true,
            _count: {
              select: { exercises: true },
            },
            toeicMetadata: {
              select: {
                priority: true,
                toeicTag: true,
                toeicParts: true,
                grammarFocus: true,
              },
            },
          },
        },
      },
    }),
    prisma.exerciseAttempt.count({ where: { userId } }),
    prisma.exerciseAttempt.groupBy({
      by: ["exerciseId"],
      where: { userId },
    }),
    prisma.exerciseAttempt.aggregate({
      where: { userId },
      _avg: { scorePercentage: true },
    }),
    prisma.exerciseAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 6,
      include: {
        items: {
          select: { attemptStatus: true },
        },
        exercise: {
          select: {
            exerciseId: true,
            exerciseNumber: true,
            unit: {
              select: {
                unitNumber: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.questionAttemptItem.findMany({
      where: {
        userId,
        attemptStatus: { not: "unanswered" },
        isCorrect: { not: null },
      },
      select: {
        questionId: true,
        questionBankItemId: true,
        isCorrect: true,
        attemptStatus: true,
        attemptSource: true,
        createdAt: true,
        question: {
          select: {
            exercise: {
              select: {
                unit: {
                  select: {
                    unitNumber: true,
                    title: true,
                    toeicMetadata: {
                      select: {
                        concept: {
                          select: {
                            code: true,
                            category: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.questionAttemptItem.count({
      where: { userId, attemptStatus: "unanswered" },
    }),
    prisma.questionAttemptItem.groupBy({
      by: ["attemptSource"],
      where: {
        userId,
        attemptStatus: { not: "unanswered" },
        isCorrect: { not: null },
      },
      _count: { id: true },
    }),
    prisma.toeicPracticeSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          select: {
            isCorrect: true,
            answeredAt: true,
          },
        },
      },
    }),
    prisma.toeicPracticeItem.findMany({
      where: {
        session: { userId },
        answeredAt: { not: null },
      },
      select: {
        isCorrect: true,
        answeredAt: true,
      },
    }),
    getLatestUnresolvedMistakes(userId),
    prisma.exerciseAttempt.findMany({
      where: { userId, submittedAt: { gte: thirtyDaysAgo } },
      select: { submittedAt: true },
    }),
    prisma.questionAttemptItem.findMany({
      where: {
        userId,
        attemptStatus: { not: "unanswered" },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, attemptStatus: true },
    }),
    prisma.toeicPracticeItem.findMany({
      where: {
        session: { userId },
        answeredAt: { gte: thirtyDaysAgo },
      },
      select: { answeredAt: true },
    }),
  ]);

  // 1. Units & Completion (separating opened vs completed!)
  const completedCount = learningProgressRows.filter(
    (p) => p.status === "completed"
  ).length;
  const inProgressCount = learningProgressRows.filter(
    (p) => p.status === "in_progress"
  ).length;
  const openedCount = completedCount + inProgressCount;
  const notStartedCount = Math.max(0, totalUnits - openedCount);
  const completionPercentage =
    totalUnits > 0 ? Math.round((completedCount / totalUnits) * 1000) / 10 : 0;

  // 2. Question-level Accuracy (STRICTLY excludes 'unanswered' rows!)
  const totalQuestionsAnswered = evaluatedAttemptItems.length;
  const totalCorrect = evaluatedAttemptItems.filter(
    (item) => item.attemptStatus === "correct"
  ).length;
  const totalIncorrect = evaluatedAttemptItems.filter(
    (item) => item.attemptStatus === "incorrect"
  ).length;

  const uniqueAnsweredIds = new Set<string>();
  const uniqueCorrectIds = new Set<string>();
  for (const item of evaluatedAttemptItems) {
    const qId = item.questionId || item.questionBankItemId;
    if (qId) {
      uniqueAnsweredIds.add(qId);
      if (item.attemptStatus === "correct") {
        uniqueCorrectIds.add(qId);
      }
    }
  }

  const accuracyPercentage = computeNullableAccuracy(
    totalCorrect,
    totalQuestionsAnswered
  );
  const averageExerciseScorePercentage = computeNullableAverageScore(
    avgExerciseScore._avg.scorePercentage,
    exerciseAttemptCount
  );

  // Source Attribution breakdown
  const sourceBreakdown: Record<string, number> = {
    exercise_submission: 0,
    single_check: 0,
    mistake_retry: 0,
    adaptive_quiz: 0,
    legacy_unknown: 0,
  };
  for (const row of sourceGroupCounts) {
    sourceBreakdown[row.attemptSource] = row._count.id;
  }

  // 3. Weak Units (evaluated items only — NEVER counted from unanswered skips)
  const unitPerfMap = new Map<
    number,
    {
      unitNumber: number;
      unitTitle: string;
      evaluatedCount: number;
      correctCount: number;
      errorCount: number;
      conceptCode: string | null;
      category: string | null;
    }
  >();

  for (const item of evaluatedAttemptItems) {
    if (!item.question) continue;
    const unit = item.question.exercise.unit;
    const entry = unitPerfMap.get(unit.unitNumber) || {
      unitNumber: unit.unitNumber,
      unitTitle: unit.title,
      evaluatedCount: 0,
      correctCount: 0,
      errorCount: 0,
      conceptCode: unit.toeicMetadata?.concept?.code ?? null,
      category: unit.toeicMetadata?.concept?.category ?? null,
    };
    entry.evaluatedCount += 1;
    if (item.attemptStatus === "correct") {
      entry.correctCount += 1;
    } else {
      entry.errorCount += 1;
    }
    unitPerfMap.set(unit.unitNumber, entry);
  }

  const weakUnits = Array.from(unitPerfMap.values())
    .filter((u) => u.errorCount > 0)
    .map((u) => ({
      unitNumber: u.unitNumber,
      unitTitle: u.unitTitle,
      evaluatedCount: u.evaluatedCount,
      errorCount: u.errorCount,
      accuracyPercentage: computeNullableAccuracy(u.correctCount, u.evaluatedCount),
      conceptCode: u.conceptCode,
      category: u.category,
    }))
    .sort((a, b) => {
      if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
      return (a.accuracyPercentage ?? 0) - (b.accuracyPercentage ?? 0);
    })
    .slice(0, 5);

  // 4. Activity metrics derived strictly from persisted timestamps
  const activeDates30 = new Set<string>();
  const activeDates7 = new Set<string>();
  const sevenDayCutoffKey = toUtcDateKey(sevenDaysAgo);

  const registerDate = (d: Date | null | undefined) => {
    if (!d) return;
    const key = toUtcDateKey(d);
    activeDates30.add(key);
    if (key >= sevenDayCutoffKey) {
      activeDates7.add(key);
    }
  };

  for (const a of recentExerciseActivityDates) registerDate(a.submittedAt);
  for (const i of recentItemActivityDates) registerDate(i.createdAt);
  for (const t of recentToeicActivityDates) registerDate(t.answeredAt);

  const last14Keys = buildLastNDaysKeys(14, now);
  const dailyMap = new Map(
    last14Keys.map((date) => [
      date,
      {
        date,
        answeredCount: 0,
        correctCount: 0,
        exerciseSubmissions: 0,
        toeicItemsAnswered: 0,
      },
    ])
  );

  for (const a of recentExerciseActivityDates) {
    if (a.submittedAt >= fourteenDaysAgo) {
      const bucket = dailyMap.get(toUtcDateKey(a.submittedAt));
      if (bucket) bucket.exerciseSubmissions += 1;
    }
  }
  for (const item of recentItemActivityDates) {
    if (item.createdAt >= fourteenDaysAgo) {
      const bucket = dailyMap.get(toUtcDateKey(item.createdAt));
      if (bucket) {
        bucket.answeredCount += 1;
        if (item.attemptStatus === "correct") bucket.correctCount += 1;
      }
    }
  }
  for (const t of recentToeicActivityDates) {
    if (t.answeredAt && t.answeredAt >= fourteenDaysAgo) {
      const bucket = dailyMap.get(toUtcDateKey(t.answeredAt));
      if (bucket) bucket.toeicItemsAnswered += 1;
    }
  }

  let latestTimestamp: Date | null = null;
  const considerTs = (dt: Date | null | undefined) => {
    if (!dt) return;
    if (!latestTimestamp || dt > latestTimestamp) latestTimestamp = dt;
  };
  for (const p of learningProgressRows) considerTs(p.lastAccessedAt);
  for (const a of recentExerciseAttempts) considerTs(a.submittedAt);
  for (const item of evaluatedAttemptItems) considerTs(item.createdAt);
  for (const t of toeicAnsweredItems) considerTs(t.answeredAt);

  // 5. Continue / Resume Unit Suggestion (no fake mastery heuristic)
  const latestInProgress = learningProgressRows.find(
    (p) => p.status === "in_progress"
  );
  let resumeUnit: {
    unitNumber: number;
    title: string;
    reason: "in_progress" | "next_recommended" | "all_completed";
    lastAccessedAt: string | null;
    toeicTag: string | null;
    priority: string | null;
  } | null = null;

  if (latestInProgress) {
    resumeUnit = {
      unitNumber: latestInProgress.unit.unitNumber,
      title: latestInProgress.unit.title,
      reason: "in_progress",
      lastAccessedAt: latestInProgress.lastAccessedAt.toISOString(),
      toeicTag: latestInProgress.unit.toeicMetadata?.toeicTag ?? null,
      priority: latestInProgress.unit.toeicMetadata?.priority ?? null,
    };
  } else {
    const completedSet = new Set(
      learningProgressRows
        .filter((p) => p.status === "completed")
        .map((p) => p.unit.unitNumber)
    );
    const nextUnit = await prisma.unit.findFirst({
      where:
        completedSet.size > 0
          ? { unitNumber: { notIn: Array.from(completedSet) } }
          : { unitNumber: 1 },
      orderBy: { unitNumber: "asc" },
      select: {
        unitNumber: true,
        title: true,
        toeicMetadata: {
          select: {
            toeicTag: true,
            priority: true,
          },
        },
      },
    });
    if (nextUnit) {
      resumeUnit = {
        unitNumber: nextUnit.unitNumber,
        title: nextUnit.title,
        reason: "next_recommended",
        lastAccessedAt: null,
        toeicTag: nextUnit.toeicMetadata?.toeicTag ?? null,
        priority: nextUnit.toeicMetadata?.priority ?? null,
      };
    } else if (completedCount >= totalUnits && totalUnits > 0) {
      resumeUnit = {
        unitNumber: 1,
        title: "All 145 units completed — review weak spots or practice TOEIC drills",
        reason: "all_completed",
        lastAccessedAt: null,
        toeicTag: null,
        priority: null,
      };
    }
  }

  // 6. Unified Recent Activity (Exercise Attempts + TOEIC Drills)
  const exerciseFeed = recentExerciseAttempts.map((a) => {
    const answeredCount = a.items.filter(
      (i) => i.attemptStatus !== "unanswered"
    ).length;
    const unansweredCount = a.items.filter(
      (i) => i.attemptStatus === "unanswered"
    ).length;
    return {
      id: a.id,
      type: "exercise_attempt" as const,
      unitNumber: a.exercise.unit.unitNumber,
      unitTitle: a.exercise.unit.title,
      exerciseNumber: a.exercise.exerciseNumber,
      scorePercentage: a.scorePercentage,
      correctCount: a.correctCount,
      answeredCount: a.items.length > 0 ? answeredCount : a.totalQuestions,
      unansweredCount,
      totalQuestions: a.totalQuestions,
      occurredAt: a.submittedAt.toISOString(),
    };
  });

  const toeicFeed = toeicSessions.map((s) => {
    const answeredCount = s.items.filter((i) => i.answeredAt !== null).length;
    const correctCount = s.items.filter((i) => i.isCorrect === true).length;
    return {
      id: s.id,
      type: "toeic_practice" as const,
      unitNumber: s.unitNumber,
      difficulty: s.difficulty,
      answeredCount,
      correctCount,
      totalQuestions: s.actualCount,
      accuracyPercentage: computeNullableAccuracy(correctCount, answeredCount),
      occurredAt: s.createdAt.toISOString(),
    };
  });

  const recentActivity = [...exerciseFeed, ...toeicFeed]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 8);

  // 7. TOEIC Practice Stats
  const toeicTotalItemsAnswered = toeicAnsweredItems.length;
  const toeicTotalItemsCorrect = toeicAnsweredItems.filter(
    (t) => t.isCorrect === true
  ).length;
  const totalToeicSessions = await prisma.toeicPracticeSession.count({
    where: { userId },
  });

  return {
    completion: {
      totalUnits,
      openedCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionPercentage,
      totalExercises,
      uniqueExercisesAttempted: uniqueExercisesAttempted.length,
      totalExerciseSubmissions: exerciseAttemptCount,
      averageExerciseScorePercentage,
    },
    accuracy: {
      totalQuestionsAnswered,
      totalCorrect,
      totalIncorrect,
      totalUnansweredSkipped: unansweredAttemptCount,
      uniqueQuestionsAnswered: uniqueAnsweredIds.size,
      uniqueQuestionsCorrect: uniqueCorrectIds.size,
      accuracyPercentage,
      sourceBreakdown,
    },
    activity: {
      lastActivityAt: latestTimestamp ? (latestTimestamp as Date).toISOString() : null,
      activeDaysLast7: activeDates7.size,
      activeDaysLast30: activeDates30.size,
      dailyLast14: Array.from(dailyMap.values()),
      recentActivity,
    },
    resumeUnit,
    mistakes: {
      unresolvedCount: unresolvedMistakes.length,
      recentItems: unresolvedMistakes.slice(0, 5).map((m) => ({
        questionId: m.questionId,
        questionContent: m.questionContent,
        exerciseNumber: m.exerciseNumber,
        unitNumber: m.unitNumber,
        unitTitle: m.unitTitle,
        ruleReference: m.ruleReference,
        lastStudentAnswer: m.lastStudentAnswer,
        lastAttemptedAt: m.lastAttemptedAt.toISOString(),
      })),
    },
    weakUnits,
    toeic: {
      totalSessions: totalToeicSessions,
      itemsAnswered: toeicTotalItemsAnswered,
      itemsCorrect: toeicTotalItemsCorrect,
      accuracyPercentage: computeNullableAccuracy(
        toeicTotalItemsCorrect,
        toeicTotalItemsAnswered
      ),
      isOfficialToeic: false,
      scopeDisclaimer:
        "TOEIC grammar practice supports Part 5–6 sentence structures from your textbook units; it does not simulate Listening audio or full timed Reading comprehension.",
    },
    masteryStatus: {
      engineActive: false,
      note: "Concept mastery modeling will be introduced in Phase 3.2. Dashboard figures distinguish curriculum completion, answered accuracy, and recent activity.",
    },
  };
}

