import crypto from "node:crypto";
import prisma from "../lib/prisma";
import { calculateConceptMastery } from "./mastery.service";
import { AppError } from "../middleware/error-handler";
import { evaluateQuestion, isEmptyStudentAnswer } from "../utils/grader";
import { runDeduplicatedSubmission, stableSerialize } from "../utils/idempotency";
import { generateToeicQuestionsForUnit } from "./toeic-generator.service";

export interface CompleteReviewPayload {
  answers: Record<string, unknown>;
  scheduleId?: string;
  submissionId?: string;
}

/**
 * Deterministic hash for TOEIC question bank items deduplication.
 */
function computeLocalToeicHash(
  prompt: string,
  options: Array<{ key?: string; optionKey?: string; text?: string; optionText?: string }>
): string {
  const normPrompt = prompt.trim().toLowerCase().replace(/\s+/g, " ");
  const sortedOptions = [...options]
    .sort((a, b) => (a.key || a.optionKey || "").localeCompare(b.key || b.optionKey || ""))
    .map((o) => `${o.key || o.optionKey}:${(o.text || o.optionText || "").trim().toLowerCase()}`)
    .join("|");
  return crypto.createHash("sha256").update(`${normPrompt}::${sortedOptions}`).digest("hex");
}

/**
 * Retrieves or dynamically generates Multiple Choice (TOEIC Part 5) review questions for a concept.
 */
export async function fetchReviewQuestionsForConcept(
  conceptId: string,
  unit: { id: string; unitNumber: number; title: string } | null,
  theorySectionIds: string[]
) {
  const unitNumber = unit?.unitNumber ?? null;

  // 1. Priority 1: Check for approved/validated TOEIC Part 5 questions in ToeicQuestionBankItem
  if (conceptId || unitNumber) {
    const bankItems = await prisma.toeicQuestionBankItem.findMany({
      where: {
        OR: [
          { conceptId },
          unitNumber ? { unitNumber } : {},
        ],
        reviewStatus: { in: ["approved", "validated"] },
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
      orderBy: [
        { isLatestApproved: "desc" },
        { qualityScore: "desc" },
      ],
      take: 5,
    });

    if (bankItems.length >= 3) {
      return bankItems.map((item, idx) => ({
        id: item.id,
        questionId: item.id,
        questionContent: item.prompt,
        displayOrder: idx + 1,
        exercise: {
          id: `toeic-${item.unitNumber}`,
          exerciseId: `toeic-u${item.unitNumber}`,
          exerciseNumber: "TOEIC Part 5",
          instruction: "Chọn phương án đúng nhất (A, B, C hoặc D) để hoàn thành câu.",
          unitId: unit?.id || "",
          unit: {
            unitNumber: item.unitNumber,
            title: unit?.title || `Unit ${item.unitNumber}`,
          },
        },
        blanks: [],
        options: item.options.map((opt) => ({
          id: opt.id,
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      }));
    }
  }

  // 2. Priority 2: If unitNumber is available, try to generate & persist dynamic TOEIC/MCQ drills
  if (unitNumber && unit) {
    try {
      const fullUnit = await prisma.unit.findUnique({
        where: { id: unit.id },
        include: {
          theorySections: true,
          textbookExamples: true,
          exercises: {
            include: {
              questions: {
                include: {
                  blanks: { include: { acceptedAnswers: true } },
                  options: true,
                  explanation: true,
                },
              },
            },
          },
        },
      });

      if (fullUnit) {
        const allQuestions = fullUnit.exercises.flatMap((e) =>
          e.questions.map((q) => ({
            questionId: q.questionId,
            questionContent: q.questionContent,
            blanks: q.blanks,
            options: q.options,
            explanation: q.explanation,
            exercise: { exerciseId: e.exerciseId },
          }))
        );

        const generated = await generateToeicQuestionsForUnit({
          unitNumber,
          title: fullUnit.title,
          theorySections: fullUnit.theorySections.map((s) => ({
            sectionId: s.sectionId,
            heading: s.heading,
            sourceContent: s.sourceContent,
          })),
          textbookExamples: fullUnit.textbookExamples.map((e) => ({
            originalText: e.originalText,
            translationVi: e.translationVi,
          })),
          unitQuestions: allQuestions,
          count: 4,
          difficulty: "medium",
        });

        if (generated.questions && generated.questions.length >= 3) {
          const createdItems = [];
          for (const q of generated.questions) {
            const contentHash = computeLocalToeicHash(q.prompt, q.options);
            let item = await prisma.toeicQuestionBankItem.findUnique({
              where: { contentHash },
              include: { options: { orderBy: { displayOrder: "asc" } } },
            });

            if (!item) {
              item = await prisma.toeicQuestionBankItem.create({
                data: {
                  part: "PART_5",
                  format: "PART5_INCOMPLETE_SENTENCE",
                  prompt: q.prompt,
                  explanation: q.explanation,
                  difficulty: q.difficulty as any,
                  primarySkill: "direct_grammar",
                  unitNumber,
                  ruleReference: q.ruleReference,
                  conceptId,
                  reviewStatus: "approved",
                  isLatestApproved: true,
                  source: q.source === "curated" ? "legacy_seed" : "ai_generated",
                  sourceReference: `review-engine:unit-${unitNumber}`,
                  contentHash,
                  options: {
                    create: q.options.map((opt, oIdx) => ({
                      optionKey: opt.key,
                      optionText: opt.text,
                      isCorrect: opt.key.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase(),
                      displayOrder: oIdx,
                    })),
                  },
                },
                include: { options: { orderBy: { displayOrder: "asc" } } },
              });
            }
            createdItems.push(item);
          }

          if (createdItems.length >= 3) {
            return createdItems.map((item, idx) => ({
              id: item.id,
              questionId: item.id,
              questionContent: item.prompt,
              displayOrder: idx + 1,
              exercise: {
                id: `toeic-${item.unitNumber}`,
                exerciseId: `toeic-u${item.unitNumber}`,
                exerciseNumber: "TOEIC Part 5",
                instruction: "Chọn phương án đúng nhất (A, B, C hoặc D) để hoàn thành câu.",
                unitId: unit.id,
                unit: {
                  unitNumber: item.unitNumber,
                  title: unit.title,
                },
              },
              blanks: [],
              options: item.options.map((opt) => ({
                id: opt.id,
                optionKey: opt.optionKey,
                optionText: opt.optionText,
              })),
            }));
          }
        }
      }
    } catch {
      // Gracefully continue to fallback
    }
  }

  // 3. Fallback: Textbook questions, prioritizing any questions with options
  return await prisma.question.findMany({
    where: {
      OR: [
        { explanation: { theorySectionId: { in: theorySectionIds } } },
        unit ? { exercise: { unitId: unit.id } } : {},
      ],
    },
    orderBy: [
      { options: { _count: "desc" } },
      { displayOrder: "asc" },
    ],
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

    // Fetch 3-5 practice questions (prioritizing TOEIC Part 5 multiple-choice drills)
    const questions = await fetchReviewQuestionsForConcept(c.id, unit, theorySectionIds);

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
  const [questions, toeicBankItems] = await Promise.all([
    prisma.question.findMany({
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
    }),
    prisma.toeicQuestionBankItem.findMany({
      where: {
        id: { in: submittedKeys },
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
    }),
  ]);

  // Check for fabricated or foreign question IDs
  const foundKeys = new Set<string>();
  for (const q of questions) {
    foundKeys.add(q.id);
    foundKeys.add(q.questionId);
  }
  for (const b of toeicBankItems) {
    foundKeys.add(b.id);
  }

  const foreignOrFabricated = submittedKeys.filter((k) => !foundKeys.has(k));
  if (foreignOrFabricated.length > 0) {
    throw AppError.badRequest(
      `Submitted answers contain invalid or fabricated question ID: ${foreignOrFabricated.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }

  // 5. Server-Authoritative Grading
  const evaluatedTextbookItems = questions.map((question) => {
    const rawStudentAnswer = rawAnswers[question.id] ?? rawAnswers[question.questionId];
    const isUnanswered = isEmptyStudentAnswer(rawStudentAnswer);

    if (isUnanswered) {
      return {
        id: question.id,
        questionId: question.questionId,
        isToeic: false,
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
      id: question.id,
      questionId: question.questionId,
      isToeic: false,
      status: (isCorrect ? "correct" : "incorrect") as "correct" | "incorrect",
      isCorrect,
      studentAnswer: evalResult.studentAnswer ?? rawStudentAnswer,
      correctAnswers: evalResult.correctAnswers ?? [],
      expectedAnswers: evalResult.expectedAnswers ?? [],
      explanation: evalResult.explanation ?? null,
      ruleReference: evalResult.ruleReference ?? null,
    };
  });

  const evaluatedToeicItems = toeicBankItems.map((bankItem) => {
    const rawStudentAnswer = rawAnswers[bankItem.id];
    const isUnanswered = isEmptyStudentAnswer(rawStudentAnswer);
    const correctOpt = bankItem.options.find((o) => o.isCorrect);
    const expectedKey = correctOpt?.optionKey || "A";
    const expectedText = correctOpt?.optionText || "";

    if (isUnanswered) {
      return {
        id: bankItem.id,
        questionId: bankItem.id,
        isToeic: true,
        status: "unanswered" as const,
        isCorrect: false,
        studentAnswer: null,
        correctAnswers: [expectedKey],
        expectedAnswers: [`${expectedKey}. ${expectedText}`],
        explanation: bankItem.explanation,
        ruleReference: bankItem.ruleReference,
      };
    }

    const studentStr = String(rawStudentAnswer).trim().toLowerCase();
    const isCorrect =
      studentStr === expectedKey.toLowerCase() ||
      studentStr === expectedText.toLowerCase() ||
      studentStr === `${expectedKey.toLowerCase()}. ${expectedText.toLowerCase()}` ||
      studentStr === `${expectedKey.toLowerCase()}) ${expectedText.toLowerCase()}`;

    return {
      id: bankItem.id,
      questionId: bankItem.id,
      isToeic: true,
      status: (isCorrect ? "correct" : "incorrect") as "correct" | "incorrect",
      isCorrect,
      studentAnswer: rawStudentAnswer,
      correctAnswers: [expectedKey],
      expectedAnswers: [`${expectedKey}. ${expectedText}`],
      explanation: bankItem.explanation,
      ruleReference: bankItem.ruleReference,
    };
  });

  const evaluatedItems = [...evaluatedTextbookItems, ...evaluatedToeicItems];

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
            questionId: item.isToeic ? null : item.id,
            questionBankItemId: item.isToeic ? item.id : null,
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
            questionId: r.questionId,
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
          questionId: r.questionId,
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
