import prisma from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import { getDueReviews } from "./review.service";
import { getLatestUnresolvedMistakes } from "./mistakes.service";
import { getPersonalizedRecommendations } from "./recommendations.service";
import { getUserPreferences } from "./onboarding.service";

export interface DailyPlanResponse {
  id: string;
  planDate: string;
  status: string;
  targetMinutes: number;
  completedMinutes: number;
  summaryVi: string;
  items: Array<{
    id: string;
    activityType: string;
    status: string;
    title: string;
    description: string | null;
    estimatedMinutes: number;
    targetId: string | null;
    targetNumber: string | null;
    metadata: any;
    displayOrder: number;
    completedAt: string | null;
  }>;
}

function getTodayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns existing daily learning plan or idempotently generates a new realistic plan.
 */
export async function getOrCreateDailyPlan(
  userId: string,
  targetDate?: string
): Promise<DailyPlanResponse> {
  const planDate = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : getTodayUtcString();

  // 1. Check if a plan already exists for this user and date
  const existing = await prisma.dailyLearningPlan.findUnique({
    where: {
      userId_planDate: { userId, planDate },
    },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (existing) {
    return formatDailyPlan(existing);
  }

  // 2. Fetch user preferences & learning context to assemble a realistic plan
  const [preferences, dueReviews, mistakes, recs, inProgressUnit] = await Promise.all([
    getUserPreferences(userId),
    getDueReviews(userId).catch(() => ({ dueCount: 0, items: [] })),
    getLatestUnresolvedMistakes(userId).catch(() => []),
    getPersonalizedRecommendations(userId).catch(() => []),
    prisma.learningProgress.findFirst({
      where: { userId, status: "in_progress" },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            title: true,
            exercises: {
              take: 1,
              select: { id: true, exerciseNumber: true },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: "desc" },
    }),
  ]);

  const targetMinutes = preferences.dailyStudyMinutes || 20;
  let budgetedMinutes = 0;
  const itemsToCreate: Array<{
    activityType: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    targetId?: string;
    targetNumber?: string;
    metadata?: any;
    displayOrder: number;
  }> = [];

  // Item 1: High Priority Due Spaced Repetition Review (if any)
  if (dueReviews.dueCount > 0 && budgetedMinutes < targetMinutes) {
    const topDue = dueReviews.items[0];
    const est = 5;
    itemsToCreate.push({
      activityType: "spaced_review",
      title: `Ôn tập Spaced Repetition: ${topDue.conceptName}`,
      description: `Luyện tập 3–5 câu hỏi để duy trì trí nhớ ngữ pháp theo chu kỳ tối ưu.`,
      estimatedMinutes: est,
      targetId: topDue.conceptId,
      targetNumber: topDue.unitNumber ? `Unit ${topDue.unitNumber}` : undefined,
      metadata: { conceptCode: topDue.conceptCode },
      displayOrder: itemsToCreate.length,
    });
    budgetedMinutes += est;
  }

  // Item 2: Unresolved Mistakes Remediation (if any)
  if (mistakes.length > 0 && budgetedMinutes < targetMinutes) {
    const est = 5;
    itemsToCreate.push({
      activityType: "mistake_review",
      title: `Sửa lỗi câu sai gần đây (${mistakes.length} câu)`,
      description: `Xem lại và giải quyết các câu hỏi đã làm sai trước đó để tránh lặp lại lỗi.`,
      estimatedMinutes: est,
      displayOrder: itemsToCreate.length,
    });
    budgetedMinutes += est;
  }

  // Item 3: Core Curriculum Practice (In-progress unit OR top recommendation)
  if (budgetedMinutes < targetMinutes) {
    if (inProgressUnit) {
      const u = inProgressUnit.unit;
      const exNum = u.exercises[0]?.exerciseNumber ?? `${u.unitNumber}.1`;
      const est = Math.min(15, targetMinutes - budgetedMinutes);
      itemsToCreate.push({
        activityType: "exercise_practice",
        title: `Tiếp tục Unit ${u.unitNumber}: ${u.title}`,
        description: `Học lý thuyết và hoàn thành bài tập ${exNum}.`,
        estimatedMinutes: est,
        targetId: u.id,
        targetNumber: exNum,
        metadata: { unitNumber: u.unitNumber, exerciseNumber: exNum },
        displayOrder: itemsToCreate.length,
      });
      budgetedMinutes += est;
    } else if (recs.length > 0) {
      const topRec = recs[0];
      const est = Math.min(15, targetMinutes - budgetedMinutes);
      itemsToCreate.push({
        activityType: "exercise_practice",
        title: `${topRec.conceptName}: ${topRec.exerciseTitle}`.slice(0, 250),
        description: topRec.reasonVi,
        estimatedMinutes: est,
        targetId: topRec.conceptId,
        targetNumber: `Unit ${topRec.unitNumber}`,
        metadata: {
          conceptCode: topRec.conceptCode,
          exerciseTitle: topRec.exerciseTitle,
          unitNumber: topRec.unitNumber,
        },
        displayOrder: itemsToCreate.length,
      });
      budgetedMinutes += est;
    } else {
      // Fallback: Unit 1
      const est = 15;
      itemsToCreate.push({
        activityType: "theory_reading",
        title: "Bắt đầu Unit 1: Present continuous (I am doing)",
        description: "Đọc lý thuyết và làm bài tập 1.1 để thiết lập thói quen học mỗi ngày.",
        estimatedMinutes: est,
        targetNumber: "1.1",
        metadata: { unitNumber: 1, exerciseNumber: "1.1" },
        displayOrder: itemsToCreate.length,
      });
      budgetedMinutes += est;
    }
  }

  // Item 4: Short TOEIC Grammar Practice (if user has TOEIC prep objective and remaining time)
  if (
    preferences.learningObjective === "toeic_prep" &&
    budgetedMinutes + 8 <= targetMinutes + 5
  ) {
    const est = 8;
    itemsToCreate.push({
      activityType: "toeic_practice",
      title: "Luyện ngữ pháp định dạng TOEIC Part 5",
      description: "Thực hành 5 câu hỏi ngữ pháp trắc nghiệm định dạng TOEIC.",
      estimatedMinutes: est,
      displayOrder: itemsToCreate.length,
    });
    budgetedMinutes += est;
  }

  // 3. Persist new daily plan in transaction
  const createdPlan = await prisma.$transaction(async (tx) => {
    const plan = await tx.dailyLearningPlan.create({
      data: {
        userId,
        planDate,
        targetMinutes,
        completedMinutes: 0,
        status: "not_started",
        summaryVi: `Kế hoạch học tập ngày ${planDate}: ${itemsToCreate.length} hoạt động (${budgetedMinutes} phút dự kiến).`,
      },
    });

    for (const item of itemsToCreate) {
      await tx.dailyLearningPlanItem.create({
        data: {
          planId: plan.id,
          activityType: item.activityType,
          status: "not_started",
          title: item.title,
          description: item.description,
          estimatedMinutes: item.estimatedMinutes,
          targetId: item.targetId,
          targetNumber: item.targetNumber,
          metadata: item.metadata,
          displayOrder: item.displayOrder,
        },
      });
    }

    return tx.dailyLearningPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { items: { orderBy: { displayOrder: "asc" } } },
    });
  });

  return formatDailyPlan(createdPlan);
}

/**
 * Updates status of a daily learning plan item and recalculates plan status.
 */
export async function updateDailyPlanItemStatus(
  userId: string,
  itemId: string,
  status: "not_started" | "in_progress" | "completed" | "deferred"
) {
  const item = await prisma.dailyLearningPlanItem.findUnique({
    where: { id: itemId },
    include: { plan: true },
  });

  if (!item) {
    throw AppError.notFound(`Daily plan item ${itemId} not found`);
  }

  if (item.plan.userId !== userId) {
    throw AppError.forbidden("You do not have permission to update this plan item");
  }

  const completedAt = status === "completed" ? new Date() : null;

  await prisma.dailyLearningPlanItem.update({
    where: { id: itemId },
    data: { status, completedAt },
  });

  // Re-fetch all items for the parent plan to update aggregate stats
  const allItems = await prisma.dailyLearningPlanItem.findMany({
    where: { planId: item.planId },
  });

  const completedMinutes = allItems
    .filter((it) => it.status === "completed")
    .reduce((sum, it) => sum + it.estimatedMinutes, 0);

  const nonDeferredItems = allItems.filter((it) => it.status !== "deferred");
  const allNonDeferredCompleted =
    nonDeferredItems.length > 0 &&
    nonDeferredItems.every((it) => it.status === "completed");
  const anyStarted = allItems.some(
    (it) => it.status === "in_progress" || it.status === "completed"
  );
  const allDeferred = allItems.every((it) => it.status === "deferred");

  let newPlanStatus = "not_started";
  if (allNonDeferredCompleted) {
    newPlanStatus = "completed";
  } else if (allDeferred) {
    newPlanStatus = "deferred";
  } else if (anyStarted) {
    newPlanStatus = "in_progress";
  }

  const updatedPlan = await prisma.dailyLearningPlan.update({
    where: { id: item.planId },
    data: {
      status: newPlanStatus,
      completedMinutes,
    },
    include: { items: { orderBy: { displayOrder: "asc" } } },
  });

  return formatDailyPlan(updatedPlan);
}

function formatDailyPlan(plan: any): DailyPlanResponse {
  return {
    id: plan.id,
    planDate: plan.planDate,
    status: plan.status,
    targetMinutes: plan.targetMinutes,
    completedMinutes: plan.completedMinutes,
    summaryVi: plan.summaryVi || "",
    items: plan.items.map((it: any) => ({
      id: it.id,
      activityType: it.activityType,
      status: it.status,
      title: it.title,
      description: it.description,
      estimatedMinutes: it.estimatedMinutes,
      targetId: it.targetId,
      targetNumber: it.targetNumber,
      metadata: it.metadata,
      displayOrder: it.displayOrder,
      completedAt: it.completedAt ? it.completedAt.toISOString() : null,
    })),
  };
}
