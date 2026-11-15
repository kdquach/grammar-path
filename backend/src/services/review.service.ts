import prisma from "../lib/prisma";
import { calculateConceptMastery } from "./mastery.service";
import { AppError } from "../middleware/error-handler";
import { evaluateQuestion, isEmptyStudentAnswer } from "../utils/grader";
import { runDeduplicatedSubmission, stableSerialize } from "../utils/idempotency";

export interface CompleteReviewPayload {
  answers: Record<string, unknown>;
  scheduleId?: string;
  submissionId?: string;
}

/**
 * Returns concepts currently due for spaced repetition review.
 */
export async function getDueReviews(userId: string) {
  const now = new Date();

  const dueSchedules = await prisma.conceptReviewSchedule.findMany({
    where: {
      userId,
      OR: [{ dueAt: { lte: now } }, { reviewState: "due" }],
    },
    include: {
      concept: {
        include: {
          theoryLinks: {
            include: {
              theorySection: {
                include: {
                  unit: {
                    select: { id: true, unitNumber: true, title: true },
                  },
                },
              },
            },
          },
          userMasteries: {
            where: { userId },
            select: {
              masteryScore: true,
              masteryStatus: true,
              retentionScore: true,
            },
          },
        },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const dueItems = [];

  for (const s of dueSchedules) {
    const c = s.concept;
    const theorySectionIds = c.theoryLinks.map((l) => l.theorySectionId);
    const unit = c.theoryLinks[0]?.theorySection.unit ?? null;
    const userMastery = c.userMasteries[0] ?? null;

    // Fetch 3-5 real practice questions from the curriculum (without spoilers)
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { explanation: { theorySectionId: { in: theorySectionIds } } },
          unit ? { exercise: { unitId: unit.id } } : {},
        ],
      },
      orderBy: { displayOrder: "asc" },
      take: 5,
      select: {
        id: true,
        questionId: true,
        questionContent: true,
        displayOrder: true,
        exercise: {
          select: {
            id: true,
            exerciseId: true,
            exerciseNumber: true,
            instruction: true,
            unitId: true,
            unit: {
              select: {
                unitNumber: true,
                title: true,
              },
            },
          },
        },
        blanks: {
          orderBy: { blankIndex: "asc" },
          select: {
            id: true,
            blankIndex: true,
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            optionKey: true,
            optionText: true,
          },
        },
      },
    });

    dueItems.push({
      scheduleId: s.id,
      conceptId: c.id,
      conceptCode: c.code,
      conceptName: c.name,
      category: c.category,
      unitNumber: unit?.unitNumber ?? null,
      unitTitle: unit?.title ?? null,
      dueAt: s.dueAt,
      isOverdue: s.dueAt < now,
      stabilityDays: s.stabilityDays,
      intervalDays: s.intervalDays,
      reviewCount: s.reviewCount,
      consecutiveCorrect: s.consecutiveCorrect,
      masteryStatus: userMastery?.masteryStatus ?? "needs_review",
      retentionScore: userMastery?.retentionScore ?? 0.5,
      practiceQuestions: questions,
    });
  }

  return {
    dueCount: dueItems.length,
    items: dueItems,
  };
}

/**
 * Returns all scheduled reviews for the learner.
 */
export async function getAllReviews(userId: string) {
  const schedules = await prisma.conceptReviewSchedule.findMany({
    where: { userId },
    include: {
      concept: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
        },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const now = new Date();

  return {
    totalSchedules: schedules.length,
    reviews: schedules.map((s) => ({
      id: s.id,
      conceptId: s.conceptId,
      conceptCode: s.concept.code,
      conceptName: s.concept.name,
      category: s.concept.category,
      dueAt: s.dueAt,
      isDue: s.dueAt <= now || s.reviewState === "due",
      reviewState: s.reviewState,
      stabilityDays: s.stabilityDays,
      intervalDays: s.intervalDays,
      reviewCount: s.reviewCount,
      consecutiveCorrect: s.consecutiveCorrect,
      lastReviewedAt: s.lastReviewedAt,
    })),
  };
}

/**
 * Completes a review session for a concept, enforcing server-authoritative grading,
 * atomic database transactions, anti-spoiler feedback, and streak/plan synchronization.
 */
export async function completeConceptReview(
  userId: string,
  conceptId: string,
  payload: CompleteReviewPayload
) {
  // 1. Verify target concept exists
  const concept = await prisma.grammarConcept.findUnique({
    where: { id: conceptId },
    include: {
      theoryLinks: { select: { theorySectionId: true } },
      toeicUnits: { select: { unitId: true } },
    },
  });

  if (!concept) {
    throw AppError.notFound(`Concept '${conceptId}' not found`, "NOT_FOUND");
  }

  // 2. Verify schedule ownership and linkage (IDOR defense)
  let schedule = null;
  if (payload.scheduleId) {
    schedule = await prisma.conceptReviewSchedule.findUnique({
      where: { id: payload.scheduleId },
    });
    if (!schedule) {
      throw AppError.notFound(`Review schedule '${payload.scheduleId}' not found`, "NOT_FOUND");
    }
    if (schedule.userId !== userId) {
      throw AppError.forbidden("Access denied: You do not own this review schedule", "FORBIDDEN");
    }
    if (schedule.conceptId !== conceptId) {
      throw AppError.badRequest("Schedule does not match the specified concept", "VALIDATION_ERROR");
    }
  } else {
    schedule = await prisma.conceptReviewSchedule.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
  }

  // 3. Validate submitted answers payload
  const rawAnswers = payload.answers || {};
  const submittedKeys = Object.keys(rawAnswers);
  if (submittedKeys.length === 0) {
    throw AppError.badRequest("Please provide answers to review questions", "VALIDATION_ERROR");
  }

  // 4. Retrieve canonical questions, answer keys, options, and accepted answers from database
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { id: { in: submittedKeys } },
        { questionId: { in: submittedKeys } },
      ],
    },
    include: {
      answerKey: true,
      acceptedAnswers: true,
      blanks: {
        include: {
          acceptedAnswers: true,
        },
      },
      parts: {
        include: {
          acceptedAnswers: true,
        },
      },
      options: {
        orderBy: { displayOrder: "asc" },
      },
      explanation: true,
      exercise: {
        select: {
          id: true,
          unitId: true,
          exerciseNumber: true,
        },
      },
    },
  });

  // Check for fabricated or foreign question IDs
  const foundKeys = new Set<string>();
  for (const q of questions) {
    foundKeys.add(q.id);
    foundKeys.add(q.questionId);
  }

  const foreignOrFabricated = submittedKeys.filter((k) => !foundKeys.has(k));
  if (foreignOrFabricated.length > 0) {
    throw AppError.badRequest(
      `Submitted answers contain invalid or fabricated question ID: ${foreignOrFabricated.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }

  // 5. Server-Authoritative Grading using canonical engine
  const evaluatedItems = questions.map((question) => {
    const rawStudentAnswer = rawAnswers[question.id] ?? rawAnswers[question.questionId];
    const isUnanswered = isEmptyStudentAnswer(rawStudentAnswer);

    if (isUnanswered) {
      return {
        question,
        status: "unanswered" as const,
        isCorrect: false,
        studentAnswer: null,
        correctAnswers: [] as string[],
        expectedAnswers: [] as string[],
        explanation: null,
        ruleReference: null,
      };
    }

    const evalResult = evaluateQuestion(question, rawStudentAnswer);
    const isCorrect = evalResult.isCorrect === true;

    return {
      question,
      status: (isCorrect ? "correct" : "incorrect") as "correct" | "incorrect",
      isCorrect,
      studentAnswer: evalResult.studentAnswer ?? rawStudentAnswer,
      correctAnswers: evalResult.correctAnswers ?? [],
      expectedAnswers: evalResult.expectedAnswers ?? [],
      explanation: evalResult.explanation ?? null,
      ruleReference: evalResult.ruleReference ?? null,
    };
  });

  const totalCount = evaluatedItems.length;
  const correctCount = evaluatedItems.filter((r) => r.isCorrect).length;
  const unansweredCount = evaluatedItems.filter((r) => r.status === "unanswered").length;
  const evaluatedCount = Math.max(0, totalCount - unansweredCount);

  // 6. Deduplication & Idempotency guard for concurrent double-clicks
  const dedupeKey = payload.submissionId
    ? `review:${userId}:${conceptId}:sub:${payload.submissionId}`
    : `review:${userId}:${conceptId}:${stableSerialize(rawAnswers)}`;

  return await runDeduplicatedSubmission(dedupeKey, async () => {
    return await prisma.$transaction(async (tx) => {
      // Step A: Persist QuestionAttemptItem records for all questions in this review drill
      for (const item of evaluatedItems) {
        await tx.questionAttemptItem.create({
          data: {
            attemptId: null,
            userId,
            questionId: item.question.id,
            studentAnswer: (item.studentAnswer !== undefined ? item.studentAnswer : null) as any,
            isCorrect: item.isCorrect,
            attemptStatus: item.status,
            attemptSource: "single_check",
            createdAt: new Date(),
          },
        });
      }

      const currentStability = schedule?.stabilityDays ?? 2.0;
      const currentConsecutive = schedule?.consecutiveCorrect ?? 0;
      const currentCount = schedule?.reviewCount ?? 0;

      // Step B1: All questions unanswered -> reschedule for tomorrow without penalizing stability
      if (unansweredCount === totalCount) {
        const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const updatedSchedule = await tx.conceptReviewSchedule.upsert({
          where: { userId_conceptId: { userId, conceptId } },
          create: {
            userId,
            conceptId,
            dueAt,
            stabilityDays: currentStability,
            intervalDays: 1,
            reviewState: "due",
          },
          update: {
            dueAt,
            intervalDays: 1,
            reviewState: "due",
          },
        });

        return {
          status: "rescheduled_unanswered" as const,
          accuracy: 0,
          correctCount: 0,
          totalCount,
          unansweredCount,
          stabilityDays: currentStability,
          intervalDays: 1,
          dueAt: dueAt.toISOString(),
          schedule: updatedSchedule,
          messageVi: "Bạn chưa trả lời câu hỏi nào. Buổi ôn tập được lên lịch lại vào ngày mai.",
          results: evaluatedItems.map((r) => ({
            questionId: r.question.questionId,
            isCorrect: false,
            status: r.status,
            studentAnswer: null,
            correctAnswers: [],
            expectedAnswers: [],
            explanation: null,
            ruleReference: null,
          })),
        };
      }

      // Step B2: Evaluated answers -> calculate accuracy and update stability
      const accuracy = evaluatedCount > 0 ? correctCount / evaluatedCount : 0;

      let newStability: number;
      let newConsecutive: number;
      let newInterval: number;
      let reviewState: "scheduled" | "due";

      if (accuracy >= 0.7) {
        newConsecutive = currentConsecutive + 1;
        newStability = Math.min(90.0, Math.round(currentStability * 2.0 * 10) / 10);
        newInterval = Math.max(1, Math.round(newStability));
        reviewState = "scheduled";
      } else {
        newConsecutive = 0;
        newStability = Math.max(1.0, Math.round(currentStability * 0.5 * 10) / 10);
        newInterval = 1;
        reviewState = "due";
      }

      const dueAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

      const updatedSchedule = await tx.conceptReviewSchedule.upsert({
        where: { userId_conceptId: { userId, conceptId } },
        create: {
          userId,
          conceptId,
          dueAt,
          lastReviewedAt: new Date(),
          stabilityDays: newStability,
          intervalDays: newInterval,
          reviewCount: currentCount + 1,
          consecutiveCorrect: newConsecutive,
          reviewState,
        },
        update: {
          dueAt,
          lastReviewedAt: new Date(),
          stabilityDays: newStability,
          intervalDays: newInterval,
          reviewCount: currentCount + 1,
          consecutiveCorrect: newConsecutive,
          reviewState,
        },
      });

      // Step C: Recalculate concept mastery inside the atomic transaction
      const updatedMastery = await calculateConceptMastery(userId, conceptId, tx);

      // Step D: Synchronize Daily Learning Plan if an item exists for this spaced review today
      const todayStr = new Date().toISOString().slice(0, 10);
      await tx.dailyLearningPlanItem.updateMany({
        where: {
          plan: { userId, planDate: todayStr },
          activityType: "spaced_review",
          targetId: conceptId,
          status: { not: "completed" },
        },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      return {
        status: accuracy >= 0.7 ? ("success" as const) : ("reinforcement_needed" as const),
        accuracy: Math.round(accuracy * 100),
        correctCount,
        totalCount,
        unansweredCount,
        stabilityDays: newStability,
        intervalDays: newInterval,
        dueAt: dueAt.toISOString(),
        schedule: updatedSchedule,
        mastery: updatedMastery,
        messageVi:
          accuracy >= 0.7
            ? `Ghi nhớ tốt! Độ ổn định tăng lên ${newStability} ngày. Lần ôn tập tiếp theo: sau ${newInterval} ngày.`
            : `Cần củng cố thêm. Khoảng cách ôn tập được rút ngắn về 1 ngày để đảm bảo ghi nhớ.`,
        results: evaluatedItems.map((r) => ({
          questionId: r.question.questionId,
          isCorrect: r.isCorrect,
          status: r.status,
          studentAnswer: r.studentAnswer,
          correctAnswers: r.correctAnswers,
          expectedAnswers: r.expectedAnswers,
          explanation: r.explanation,
          ruleReference: r.ruleReference,
        })),
      };
    });
  });
}
