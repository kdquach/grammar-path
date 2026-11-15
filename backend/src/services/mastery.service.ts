import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const CURRENT_MASTERY_MODEL_VERSION = "v1.0";

export type MasteryStatus =
  | "not_started"
  | "insufficient_data"
  | "developing"
  | "practicing"
  | "proficient"
  | "mastered"
  | "needs_review";

export interface ConceptMasteryExplanation {
  status: MasteryStatus;
  statusLabelVi: string;
  masteryScore: number | null;
  retentionScore: number;
  evidenceCount: number;
  distinctQuestionCount: number;
  correctCount: number;
  incorrectCount: number;
  repeatedAttemptCount: number;
  confidenceLevel: "high" | "medium" | "needs_review";
  lastPracticedAt: Date | null;
  nextReviewDueAt: Date | null;
  explanationVi: string;
  recommendedActionVi: string;
}

/**
 * Calculates and persists mastery for a single concept and user.
 * Deterministic: given identical attempt history, produces identical output.
 */
export async function calculateConceptMastery(
  userId: string,
  conceptId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;

  // 1. Fetch concept with theory links, unit metadata, and child concepts (for parent modules)
  const concept = await db.grammarConcept.findUnique({
    where: { id: conceptId },
    include: {
      theoryLinks: {
        include: {
          theorySection: {
            select: { id: true, unitId: true, sectionId: true },
          },
        },
      },
      toeicUnits: {
        select: { unitId: true },
      },
      childConcepts: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  // 1b. Parent Module Aggregation (if concept has child unit concepts)
  if (concept.childConcepts && concept.childConcepts.length > 0) {
    const childIds = concept.childConcepts.map((c) => c.id);
    const childMasteries = await db.userConceptMastery.findMany({
      where: {
        userId,
        conceptId: { in: childIds },
      },
    });

    const activeChildMasteries = childMasteries.filter(
      (m) => m.distinctQuestionCount > 0 && m.masteryScore !== null
    );

    const totalEvidence = childMasteries.reduce((sum, m) => sum + m.evidenceCount, 0);
    const totalDistinct = childMasteries.reduce((sum, m) => sum + m.distinctQuestionCount, 0);
    const totalCorrect = childMasteries.reduce((sum, m) => sum + m.correctCount, 0);
    const totalIncorrect = childMasteries.reduce((sum, m) => sum + m.incorrectCount, 0);
    const totalRepeated = childMasteries.reduce((sum, m) => sum + m.repeatedAttemptCount, 0);

    let latestPracticedAt: Date | null = null;
    childMasteries.forEach((m) => {
      if (m.lastPracticedAt && (!latestPracticedAt || m.lastPracticedAt > latestPracticedAt)) {
        latestPracticedAt = m.lastPracticedAt;
      }
    });

    let avgRetention = 1.0;
    if (childMasteries.length > 0) {
      avgRetention =
        Math.round(
          (childMasteries.reduce((sum, m) => sum + m.retentionScore, 0) / childMasteries.length) * 100
        ) / 100;
    }

    let moduleScore: number | null = null;
    let moduleStatus: MasteryStatus = "not_started";

    if (totalDistinct === 0 || activeChildMasteries.length === 0) {
      moduleStatus = "not_started";
      moduleScore = null;
    } else {
      const weightedSum = activeChildMasteries.reduce(
        (sum, m) => sum + (m.masteryScore ?? 0) * m.distinctQuestionCount,
        0
      );
      moduleScore = Math.round((weightedSum / totalDistinct) * 10) / 10;

      if (totalDistinct < 3) {
        moduleStatus = "insufficient_data";
      } else if (moduleScore < 70) {
        moduleStatus = "developing";
      } else if (moduleScore < 85) {
        moduleStatus = "practicing";
      } else if (moduleScore >= 85 && totalDistinct < 5) {
        moduleStatus = "proficient";
      } else if (moduleScore >= 85 && totalDistinct >= 5) {
        moduleStatus = avgRetention >= 0.6 ? "mastered" : "needs_review";
      }
    }

    const updatedModuleMastery = await db.userConceptMastery.upsert({
      where: {
        userId_conceptId: { userId, conceptId },
      },
      create: {
        userId,
        conceptId,
        masteryScore: moduleScore,
        masteryStatus: moduleStatus,
        retentionScore: avgRetention,
        evidenceCount: totalEvidence,
        distinctQuestionCount: totalDistinct,
        correctCount: totalCorrect,
        incorrectCount: totalIncorrect,
        repeatedAttemptCount: totalRepeated,
        modelVersion: CURRENT_MASTERY_MODEL_VERSION,
        lastPracticedAt: latestPracticedAt,
        lastCalculatedAt: new Date(),
      },
      update: {
        masteryScore: moduleScore,
        masteryStatus: moduleStatus,
        retentionScore: avgRetention,
        evidenceCount: totalEvidence,
        distinctQuestionCount: totalDistinct,
        correctCount: totalCorrect,
        incorrectCount: totalIncorrect,
        repeatedAttemptCount: totalRepeated,
        modelVersion: CURRENT_MASTERY_MODEL_VERSION,
        lastPracticedAt: latestPracticedAt,
        lastCalculatedAt: new Date(),
      },
    });

    return updatedModuleMastery;
  }

  // 2. Determine theorySectionIds and confidence
  const theorySectionIds = concept.theoryLinks.map((l) => l.theorySectionId);
  const confidenceRatings = concept.theoryLinks.map((l) => l.confidence);

  // Overall mapping confidence for this concept
  let mappingConfidence: "high" | "medium" | "needs_review" = "high";
  if (confidenceRatings.every((c) => c === "needs_review")) {
    mappingConfidence = "needs_review";
  } else if (confidenceRatings.some((c) => c === "needs_review" || c === "medium")) {
    mappingConfidence = "medium";
  }

  // 3. Find questions linked via direct explanations ONLY (Phase 3.4C.1: No broad unit fallback)
  const questionsByExplanation = await db.question.findMany({
    where: {
      isExample: false,
      explanation: {
        theorySectionId: { in: theorySectionIds },
      },
    },
    select: { id: true },
  });

  const mappedQuestionIds = Array.from(new Set(questionsByExplanation.map((q) => q.id)));

  // 3b. Count eligible TOEIC Question Bank items mapped to this concept
  // INVARIANT (Phase 3.4C.1): Only approved and currently active (latest) versions qualify
  const eligibleBankItemCount = await db.toeicQuestionBankItem.count({
    where: {
      conceptId,
      primarySkill: { in: ["direct_grammar", "word_form_morphology"] },
      conceptMappingConfidence: { gte: 0.85 },
      reviewStatus: "approved",
      isLatestApproved: true,
    },
  });

  if (mappedQuestionIds.length === 0 && eligibleBankItemCount === 0) {
    // No questions exist for this concept
    const currentMastery = await db.userConceptMastery.upsert({
      where: {
        userId_conceptId: { userId, conceptId },
      },
      create: {
        userId,
        conceptId,
        masteryScore: null,
        masteryStatus: "not_started",
        retentionScore: 1.0,
        evidenceCount: 0,
        distinctQuestionCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        repeatedAttemptCount: 0,
        modelVersion: CURRENT_MASTERY_MODEL_VERSION,
        lastCalculatedAt: new Date(),
      },
      update: {
        masteryScore: null,
        masteryStatus: "not_started",
        lastCalculatedAt: new Date(),
      },
    });
    return currentMastery;
  }

  // 4. Retrieve evaluated attempts on mapped textbook questions or eligible TOEIC bank questions
  const attemptCriteria: Prisma.QuestionAttemptItemWhereInput[] = [];
  if (mappedQuestionIds.length > 0) {
    attemptCriteria.push({ questionId: { in: mappedQuestionIds } });
  }
  if (eligibleBankItemCount > 0) {
    attemptCriteria.push({
      attemptSource: "toeic_practice",
      questionBankItem: {
        conceptId,
        primarySkill: { in: ["direct_grammar", "word_form_morphology"] },
        conceptMappingConfidence: { gte: 0.85 },
        reviewStatus: "approved",
        isLatestApproved: true,
      },
    });
  }

  const attempts = await db.questionAttemptItem.findMany({
    where: {
      userId,
      attemptStatus: { not: "unanswered" },
      isCorrect: { not: null },
      OR: attemptCriteria.length > 0 ? attemptCriteria : undefined,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      questionId: true,
      questionBankItemId: true,
      isCorrect: true,
      attemptStatus: true,
      attemptSource: true,
      createdAt: true,
    },
  });

  // Check for active unresolved mistakes on this concept
  const activeMistakesCount = await db.questionAttemptItem.count({
    where: {
      userId,
      attemptStatus: "incorrect",
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // recent error
      },
      OR: attemptCriteria.length > 0 ? attemptCriteria : undefined,
    },
  });

  // 5. Group attempts by questionId to discount repeated attempts
  const questionAttempts = new Map<string, typeof attempts>();
  let correctCount = 0;
  let incorrectCount = 0;

  for (const att of attempts) {
    if (att.isCorrect) correctCount++;
    else incorrectCount++;

    const targetKey = att.questionId || (att.questionBankItemId ? `bank:${att.questionBankItemId}` : att.id);
    const list = questionAttempts.get(targetKey) || [];
    list.push(att);
    questionAttempts.set(targetKey, list);
  }

  const distinctQuestionCount = questionAttempts.size;
  let repeatedAttemptCount = 0;
  let totalWeightedCorrect = 0;
  let totalWeightedEvidence = 0;
  let lastPracticedAt: Date | null = null;

  for (const [, qAtts] of questionAttempts.entries()) {
    for (let k = 0; k < qAtts.length; k++) {
      const att = qAtts[k];
      if (!lastPracticedAt || att.createdAt > lastPracticedAt) {
        lastPracticedAt = att.createdAt;
      }
      if (k > 0) {
        repeatedAttemptCount++;
      }

      // Diminishing returns on repeating the exact same question
      // k=0 (1st attempt): 1.0
      // k=1 (2nd attempt): 0.5
      // k=2 (3rd attempt): 0.25
      // k>=3: 0.1
      const repeatDiscount = Math.max(0.1, Math.pow(0.5, k));

      // Same-day retry discount (cramming factor)
      let sameDayFactor = 1.0;
      if (k > 0) {
        const prev = qAtts[k - 1];
        const isSameDay =
          att.createdAt.toISOString().slice(0, 10) ===
          prev.createdAt.toISOString().slice(0, 10);
        if (isSameDay) {
          sameDayFactor = 0.5;
        }
      }

      // Recency decay: half-life ~35 days
      const daysSinceAttempt = Math.max(
        0,
        (Date.now() - att.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyWeight = Math.exp(-0.02 * daysSinceAttempt);

      // Mapping confidence discount
      const mappingWeight =
        mappingConfidence === "high" ? 1.0 : mappingConfidence === "medium" ? 0.75 : 0.0;

      const effectiveWeight = repeatDiscount * sameDayFactor * recencyWeight * mappingWeight;

      if (effectiveWeight > 0) {
        totalWeightedEvidence += effectiveWeight;
        if (att.isCorrect) {
          totalWeightedCorrect += effectiveWeight;
        }
      }
    }
  }

  // 6. Compute Raw Weighted Mastery Score
  let masteryScore: number | null = null;
  if (totalWeightedEvidence > 0) {
    masteryScore = Math.round((totalWeightedCorrect / totalWeightedEvidence) * 1000) / 10;
  }

  // 7. Calculate Retention Score & Stability
  const existingSchedule = await db.conceptReviewSchedule.findUnique({
    where: {
      userId_conceptId: { userId, conceptId },
    },
  });

  let stabilityDays = existingSchedule?.stabilityDays ?? 2.0;
  let retentionScore = 1.0;

  if (lastPracticedAt) {
    const daysSincePractice = Math.max(
      0,
      (Date.now() - lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    retentionScore = Math.max(
      0.0,
      Math.min(1.0, Math.round(Math.exp(-daysSincePractice / stabilityDays) * 100) / 100)
    );
  }

  // 8. Determine Mastery Status with Evidence Thresholds
  let masteryStatus: MasteryStatus = "not_started";

  if (distinctQuestionCount === 0) {
    masteryStatus = "not_started";
    masteryScore = null;
  } else if (distinctQuestionCount < 3) {
    // Insufficient evidence: cannot claim mastery on only 1 or 2 questions
    masteryStatus = "insufficient_data";
  } else {
    // We have at least 3 distinct questions
    const score = masteryScore ?? 0;

    if (score < 70) {
      masteryStatus = "developing";
    } else if (score < 85) {
      masteryStatus = "practicing";
    } else if (score >= 85 && distinctQuestionCount < 5) {
      masteryStatus = "proficient";
    } else if (score >= 85 && distinctQuestionCount >= 5) {
      // Requirements for mastered:
      // 1. >= 5 distinct questions
      // 2. weighted score >= 85%
      // 3. mapping confidence must not be needs_review
      // 4. retention must be >= 0.60
      // 5. no unresolved recent errors
      if (mappingConfidence === "needs_review") {
        masteryStatus = "practicing"; // Capped due to unreviewed mapping
      } else if (retentionScore < 0.6 || activeMistakesCount > 0) {
        masteryStatus = "needs_review";
      } else {
        masteryStatus = "mastered";
      }
    }
  }

  // Check if previously proficient/mastered concept decayed
  const previousRecord = await db.userConceptMastery.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });

  if (
    previousRecord &&
    (previousRecord.masteryStatus === "mastered" || previousRecord.masteryStatus === "proficient") &&
    retentionScore < 0.6
  ) {
    masteryStatus = "needs_review";
  }

  // 9. Persist to user_concept_mastery
  const updatedMastery = await db.userConceptMastery.upsert({
    where: {
      userId_conceptId: { userId, conceptId },
    },
    create: {
      userId,
      conceptId,
      masteryScore,
      masteryStatus,
      retentionScore,
      evidenceCount: attempts.length,
      distinctQuestionCount,
      correctCount,
      incorrectCount,
      repeatedAttemptCount,
      modelVersion: CURRENT_MASTERY_MODEL_VERSION,
      lastPracticedAt,
      lastCalculatedAt: new Date(),
    },
    update: {
      masteryScore,
      masteryStatus,
      retentionScore,
      evidenceCount: attempts.length,
      distinctQuestionCount,
      correctCount,
      incorrectCount,
      repeatedAttemptCount,
      modelVersion: CURRENT_MASTERY_MODEL_VERSION,
      lastPracticedAt,
      lastCalculatedAt: new Date(),
    },
  });

  // 10. Record State Transition Event if status changed
  if (previousRecord && previousRecord.masteryStatus !== masteryStatus) {
    await db.conceptMasteryEvent.create({
      data: {
        userId,
        conceptId,
        previousStatus: previousRecord.masteryStatus,
        newStatus: masteryStatus,
        previousScore: previousRecord.masteryScore,
        newScore: masteryScore,
        reason:
          retentionScore < 0.6
            ? "retention_decay"
            : distinctQuestionCount >= 5 && (masteryScore ?? 0) >= 85
            ? "mastery_threshold_reached"
            : "attempt_evaluation",
      },
    });
  }

  // 11. Ensure Review Schedule is synchronized
  let nextDueDays = Math.max(1, Math.round(stabilityDays));
  let reviewState: "new" | "scheduled" | "due" | "completed" | "suspended" = "scheduled";

  if (masteryStatus === "not_started") {
    reviewState = "new";
  } else if (masteryStatus === "needs_review" || retentionScore < 0.6) {
    reviewState = "due";
    nextDueDays = 0; // due now
  } else if (mappingConfidence === "needs_review") {
    reviewState = "suspended";
  }

  const dueAt = new Date(Date.now() + nextDueDays * 24 * 60 * 60 * 1000);

  await db.conceptReviewSchedule.upsert({
    where: {
      userId_conceptId: { userId, conceptId },
    },
    create: {
      userId,
      conceptId,
      dueAt,
      lastReviewedAt: lastPracticedAt,
      stabilityDays,
      intervalDays: nextDueDays,
      reviewState,
    },
    update: {
      dueAt: reviewState === "due" ? new Date() : undefined,
      lastReviewedAt: lastPracticedAt ?? undefined,
      reviewState,
    },
  });

  return updatedMastery;
}

/**
 * Returns overall mastery dashboard summary for a user.
 */
export async function getMasterySummary(userId: string) {
  const [totalConceptsCount, masteries, dueReviewsCount] = await Promise.all([
    prisma.grammarConcept.count(),
    prisma.userConceptMastery.findMany({
      where: { userId },
      include: {
        concept: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            displayOrder: true,
          },
        },
      },
      orderBy: { concept: { displayOrder: "asc" } },
    }),
    prisma.conceptReviewSchedule.count({
      where: {
        userId,
        OR: [{ dueAt: { lte: new Date() } }, { reviewState: "due" }],
      },
    }),
  ]);

  const statusCounts = {
    not_started: totalConceptsCount - masteries.length,
    insufficient_data: 0,
    developing: 0,
    practicing: 0,
    proficient: 0,
    mastered: 0,
    needs_review: 0,
  };

  let totalEvaluatedScore = 0;
  let evaluatedScoreCount = 0;
  let totalRetention = 0;

  for (const m of masteries) {
    if (m.masteryStatus in statusCounts) {
      statusCounts[m.masteryStatus as keyof typeof statusCounts]++;
    }
    if (m.masteryScore !== null) {
      totalEvaluatedScore += m.masteryScore;
      evaluatedScoreCount++;
    }
    totalRetention += m.retentionScore;
  }

  const averageMastery =
    evaluatedScoreCount > 0
      ? Math.round((totalEvaluatedScore / evaluatedScoreCount) * 10) / 10
      : null;

  const averageRetention =
    masteries.length > 0
      ? Math.round((totalRetention / masteries.length) * 100) / 100
      : 1.0;

  return {
    totalConcepts: totalConceptsCount,
    startedConcepts: masteries.length,
    statusCounts,
    averageMastery,
    averageRetention,
    dueReviewsCount,
    masteries: masteries.map((m) => ({
      conceptId: m.conceptId,
      conceptCode: m.concept.code,
      conceptName: m.concept.name,
      category: m.concept.category,
      masteryStatus: m.masteryStatus,
      masteryScore: m.masteryScore,
      retentionScore: m.retentionScore,
      evidenceCount: m.evidenceCount,
      distinctQuestionCount: m.distinctQuestionCount,
      lastPracticedAt: m.lastPracticedAt,
    })),
  };
}

/**
 * Returns explainable concept detail with human-readable rationale.
 */
export async function getConceptMasteryDetail(userId: string, conceptId: string) {
  const [concept, mastery, schedule, events] = await Promise.all([
    prisma.grammarConcept.findUnique({
      where: { id: conceptId },
      include: {
        theoryLinks: {
          include: {
            theorySection: {
              include: {
                unit: { select: { unitNumber: true, title: true } },
              },
            },
          },
        },
      },
    }),
    prisma.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    }),
    prisma.conceptReviewSchedule.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    }),
    prisma.conceptMasteryEvent.findMany({
      where: { userId, conceptId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  let userMastery = mastery;
  if (!userMastery) {
    userMastery = await calculateConceptMastery(userId, conceptId);
  }

  const status: MasteryStatus = (userMastery?.masteryStatus as MasteryStatus) ?? "not_started";
  const distinctCount = userMastery?.distinctQuestionCount ?? 0;
  const score = userMastery?.masteryScore ?? null;
  const retention = userMastery?.retentionScore ?? 1.0;

  let explanationVi = "Chưa có dữ liệu làm bài cho chủ điểm ngữ pháp này.";
  let recommendedActionVi = "Làm bài tập thuộc bài học tương ứng để bắt đầu xây dựng dữ liệu ghi nhớ.";

  switch (status) {
    case "not_started":
      explanationVi = "Bạn chưa hoàn thành câu hỏi nào thuộc chủ điểm này.";
      recommendedActionVi = "Bắt đầu làm bài tập Unit để hệ thống đánh giá năng lực ban đầu.";
      break;
    case "insufficient_data":
      explanationVi = `Bạn mới làm ${distinctCount} câu hỏi khác nhau. Hệ thống cần tối thiểu 3 câu hỏi riêng biệt để ước lượng độ thành thạo đáng tin cậy.`;
      recommendedActionVi = `Làm thêm ít nhất ${3 - distinctCount} câu hỏi độc lập để hoàn tất đánh giá bước đầu.`;
      break;
    case "developing":
      explanationVi = `Bạn đã trả lời ${distinctCount} câu hỏi, nhưng tỉ lệ chính xác (${score ?? 0}%) còn nhiều lỗi sai cần khắc phục.`;
      recommendedActionVi = "Đọc lại phần lý thuyết và ôn lại các câu trả lời sai trong mục Mistake Review.";
      break;
    case "practicing":
      explanationVi = `Đang tiến bộ tốt (${score ?? 0}% độ chính xác qua ${distinctCount} câu hỏi). Cần củng cố thêm để đạt mức thành thạo cao.`;
      recommendedActionVi = "Làm thêm 2-3 câu hỏi để nâng độ thành thạo lên mức Proficient.";
      break;
    case "proficient":
      explanationVi = `Thành thạo tốt (${score ?? 0}% qua ${distinctCount} câu hỏi). Cần đạt mốc 5 câu hỏi khác biệt để xác nhận Mastered.`;
      recommendedActionVi = "Làm thêm bài tập mở rộng hoặc bài tập TOEIC để đạt huy hiệu Mastered.";
      break;
    case "mastered":
      explanationVi = `Xuất sắc! Bạn đã chứng minh sự am hiểu vững chắc với ${distinctCount} câu hỏi khác nhau và điểm số ${score}%.`;
      recommendedActionVi = "Duy trì lịch ôn tập ngắt quãng (Spaced Repetition) khi đến hạn để không quên kiến thức.";
      break;
    case "needs_review":
      explanationVi = `Chủ điểm này đã đến hạn ôn tập hoặc có lỗi sai gần đây (độ ghi nhớ ước tính giảm còn ${Math.round(retention * 100)}%).`;
      recommendedActionVi = "Hoàn thành buổi ôn tập nhanh (Quick Review) để phục hồi độ ghi nhớ về 100%.";
      break;
  }

  return {
    concept: {
      id: concept.id,
      code: concept.code,
      name: concept.name,
      description: concept.description,
      category: concept.category,
      relatedUnits: concept.theoryLinks.map((l) => ({
        unitNumber: l.theorySection.unit.unitNumber,
        unitTitle: l.theorySection.unit.title,
        sectionId: l.theorySection.sectionId,
        confidence: l.confidence,
      })),
    },
    mastery: {
      status,
      score,
      retentionScore: retention,
      evidenceCount: userMastery?.evidenceCount ?? 0,
      distinctQuestionCount: distinctCount,
      correctCount: userMastery?.correctCount ?? 0,
      incorrectCount: userMastery?.incorrectCount ?? 0,
      repeatedAttemptCount: userMastery?.repeatedAttemptCount ?? 0,
      lastPracticedAt: userMastery?.lastPracticedAt ?? null,
      nextReviewDueAt: schedule?.dueAt ?? null,
      reviewState: schedule?.reviewState ?? "new",
      stabilityDays: schedule?.stabilityDays ?? 2.0,
      explanationVi,
      recommendedActionVi,
    },
    historyEvents: events.map((e) => ({
      id: e.id,
      previousStatus: e.previousStatus,
      newStatus: e.newStatus,
      previousScore: e.previousScore,
      newScore: e.newScore,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  };
}

/**
 * Recalculates all active concept masteries for a user.
 */
export async function recalculateUserMastery(userId: string) {
  // Find all distinct concepts where user has attempted questions
  const userAttempts = await prisma.questionAttemptItem.findMany({
    where: {
      userId,
      attemptStatus: { not: "unanswered" },
    },
    select: { questionId: true, questionBankItemId: true },
    distinct: ["questionId", "questionBankItemId"],
  });

  const questionIds = userAttempts
    .map((a) => a.questionId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const bankItemIds = userAttempts
    .map((a) => a.questionBankItemId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // Find linked theory sections and concepts
  const questions = questionIds.length > 0 ? await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: {
      explanation: {
        include: {
          theorySection: {
            include: { conceptLinks: true },
          },
        },
      },
      exercise: {
        select: { unitId: true },
      },
    },
  }) : [];

  const conceptIds = new Set<string>();

  for (const q of questions) {
    if (q.explanation?.theorySection?.conceptLinks) {
      q.explanation.theorySection.conceptLinks.forEach((l) => conceptIds.add(l.conceptId));
    }
  }

  // Also include concepts from TOEIC bank items
  if (bankItemIds.length > 0) {
    const bankItems = await prisma.toeicQuestionBankItem.findMany({
      where: { id: { in: bankItemIds }, conceptId: { not: null } },
      select: { conceptId: true },
    });
    bankItems.forEach((b) => {
      if (b.conceptId) conceptIds.add(b.conceptId);
    });
  }

  // Also query concepts mapped to these exercises' units
  const unitIds = Array.from(new Set(questions.map((q) => q.exercise.unitId)));
  const unitConcepts = await prisma.conceptTheoryLink.findMany({
    where: {
      theorySection: { unitId: { in: unitIds } },
    },
    select: { conceptId: true },
  });
  unitConcepts.forEach((c) => conceptIds.add(c.conceptId));

  const results = [];
  for (const cId of conceptIds) {
    const res = await calculateConceptMastery(userId, cId);
    results.push(res);
  }

  return {
    recalculatedCount: results.length,
    conceptIds: Array.from(conceptIds),
  };
}

/**
 * Incremental trigger: finds concepts for a given question and triggers recalculation.
 */
export async function triggerIncrementalMasteryUpdate(userId: string, questionId: string) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        explanation: {
          include: {
            theorySection: {
              include: { conceptLinks: true },
            },
          },
        },
        exercise: { select: { unitId: true } },
      },
    });

    if (!question) return;

    const conceptIds = new Set<string>();

    if (question.explanation?.theorySection?.conceptLinks) {
      question.explanation.theorySection.conceptLinks.forEach((l) =>
        conceptIds.add(l.conceptId)
      );
    }

    if (conceptIds.size === 0 && question.exercise?.unitId) {
      const unitLinks = await prisma.conceptTheoryLink.findMany({
        where: { theorySection: { unitId: question.exercise.unitId } },
        select: { conceptId: true },
      });
      unitLinks.forEach((l) => conceptIds.add(l.conceptId));
    }

    for (const cId of conceptIds) {
      await calculateConceptMastery(userId, cId);
    }
  } catch (err) {
    console.error("Incremental mastery update error:", err);
  }
}

/**
 * Incremental trigger for TOEIC practice attempts: recalculates mastery for linked concept.
 */
export async function triggerToeicMasteryUpdate(userId: string, conceptId: string): Promise<void> {
  try {
    await calculateConceptMastery(userId, conceptId);
  } catch (err) {
    console.error("Incremental TOEIC mastery update error:", err);
  }
}
