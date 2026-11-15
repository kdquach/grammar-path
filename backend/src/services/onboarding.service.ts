import prisma from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import { evaluateQuestion } from "../utils/grader";

export interface UserPreferencesDto {
  grammarConfidence: string;
  learningObjective: string;
  dailyStudyMinutes: number;
  preferredDays: string[];
  targetToeicScore: number | null;
  targetDate: string | null;
  onboardingCompleted: boolean;
}

export interface UpdatePreferencesInput {
  grammarConfidence?: string;
  learningObjective?: string;
  dailyStudyMinutes?: number;
  preferredDays?: string[];
  targetToeicScore?: number | null;
  targetDate?: string | null;
}

/**
 * Retrieves the user's learning preferences or creates defaults.
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesDto> {
  const existing = await prisma.userLearningPreferences.findUnique({
    where: { userId },
  });

  if (existing) {
    return {
      grammarConfidence: existing.grammarConfidence,
      learningObjective: existing.learningObjective,
      dailyStudyMinutes: existing.dailyStudyMinutes,
      preferredDays: existing.preferredDays as string[],
      targetToeicScore: existing.targetToeicScore,
      targetDate: existing.targetDate ? existing.targetDate.toISOString() : null,
      onboardingCompleted: existing.onboardingCompleted,
    };
  }

  // Return standard defaults if not yet created
  return {
    grammarConfidence: "elementary",
    learningObjective: "foundation",
    dailyStudyMinutes: 20,
    preferredDays: ["mon", "tue", "wed", "thu", "fri"],
    targetToeicScore: 650,
    targetDate: null,
    onboardingCompleted: false,
  };
}

/**
 * Saves or updates user learning preferences and marks onboarding completed.
 */
export async function updateUserPreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<UserPreferencesDto> {
  const updated = await prisma.userLearningPreferences.upsert({
    where: { userId },
    create: {
      userId,
      grammarConfidence: input.grammarConfidence ?? "elementary",
      learningObjective: input.learningObjective ?? "foundation",
      dailyStudyMinutes: input.dailyStudyMinutes ?? 20,
      preferredDays: input.preferredDays ?? ["mon", "tue", "wed", "thu", "fri"],
      targetToeicScore: input.targetToeicScore ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      onboardingCompleted: true,
    },
    update: {
      ...(input.grammarConfidence && { grammarConfidence: input.grammarConfidence }),
      ...(input.learningObjective && { learningObjective: input.learningObjective }),
      ...(input.dailyStudyMinutes !== undefined && { dailyStudyMinutes: input.dailyStudyMinutes }),
      ...(input.preferredDays && { preferredDays: input.preferredDays }),
      ...(input.targetToeicScore !== undefined && { targetToeicScore: input.targetToeicScore }),
      ...(input.targetDate !== undefined && {
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      }),
      onboardingCompleted: true,
    },
  });

  return {
    grammarConfidence: updated.grammarConfidence,
    learningObjective: updated.learningObjective,
    dailyStudyMinutes: updated.dailyStudyMinutes,
    preferredDays: updated.preferredDays as string[],
    targetToeicScore: updated.targetToeicScore,
    targetDate: updated.targetDate ? updated.targetDate.toISOString() : null,
    onboardingCompleted: updated.onboardingCompleted,
  };
}

/**
 * Starts a diagnostic assessment session by selecting real Murphy curriculum questions
 * across core foundation concepts without revealing answers.
 */
export async function startDiagnosticAssessment(userId: string) {
  // 1. Check for existing in-progress assessment within 24h
  const existing = await prisma.diagnosticAssessment.findFirst({
    where: {
      userId,
      status: "in_progress",
      startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
        include: {
          question: {
            include: {
              blanks: { orderBy: { blankIndex: "asc" } },
              options: { orderBy: { displayOrder: "asc" } },
              exercise: {
                select: {
                  exerciseNumber: true,
                  questionType: true,
                  unit: { select: { unitNumber: true, title: true } },
                },
              },
            },
          },
          concept: { select: { id: true, code: true, name: true, category: true } },
        },
      },
    },
  });

  if (existing && existing.items.length > 0) {
    return {
      assessmentId: existing.id,
      status: existing.status,
      startedAt: existing.startedAt,
      totalQuestions: existing.totalQuestions,
      questions: existing.items.map((it) => ({
        id: it.question.id,
        questionId: it.question.questionId,
        exerciseNumber: it.question.exercise.exerciseNumber,
        unitNumber: it.question.exercise.unit.unitNumber,
        unitTitle: it.question.exercise.unit.title,
        promptText: it.question.questionContent,
        questionType: it.question.exercise.questionType,
        concept: it.concept,
        blanks: it.question.blanks.map((b) => ({
          blankIndex: b.blankIndex,
        })),
        options: it.question.options.map((o) => ({
          key: o.optionKey,
          text: o.optionText,
        })),
      })),
    };
  }

  // 2. Select 6 representative units for diagnostic:
  // Units 1 (Present Continuous), 2 (Present Simple), 7 (Past Simple),
  // 19 (Present Perfect), 25 (Future), 26 (Can/Could/Be able to)
  const targetUnitNumbers = [1, 2, 7, 19, 25, 26];

  const units = await prisma.unit.findMany({
    where: { unitNumber: { in: targetUnitNumbers } },
    include: {
      exercises: {
        take: 2,
        include: {
          questions: {
            where: { isExample: false },
            take: 2,
            include: {
              blanks: { orderBy: { blankIndex: "asc" } },
              options: { orderBy: { displayOrder: "asc" } },
              exercise: {
                select: {
                  exerciseNumber: true,
                  questionType: true,
                  unit: { select: { unitNumber: true, title: true } },
                },
              },
              explanation: {
                include: {
                  theorySection: {
                    include: {
                      conceptLinks: {
                        include: { concept: true },
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
  });

  // Pick 1 question from each unit (total 6 questions)
  const selectedQuestions: Array<{
    question: any;
    conceptId: string | null;
    conceptMeta: any;
  }> = [];

  for (const unit of units) {
    for (const ex of unit.exercises) {
      if (ex.questions.length > 0) {
        const q = ex.questions[0];
        // Resolve concept from explanation link or null
        const link = q.explanation?.theorySection?.conceptLinks?.[0];
        selectedQuestions.push({
          question: q,
          conceptId: link?.concept?.id ?? null,
          conceptMeta: link?.concept
            ? {
                id: link.concept.id,
                code: link.concept.code,
                name: link.concept.name,
                category: link.concept.category,
              }
            : null,
        });
        break;
      }
    }
  }

  if (selectedQuestions.length === 0) {
    throw AppError.internal(
      "No diagnostic curriculum questions available in database",
      "DIAGNOSTIC_CURRICULUM_EMPTY"
    );
  }

  // 3. Create assessment session
  const assessment = await prisma.$transaction(async (tx) => {
    const created = await tx.diagnosticAssessment.create({
      data: {
        userId,
        status: "in_progress",
        totalQuestions: selectedQuestions.length,
      },
    });

    for (let i = 0; i < selectedQuestions.length; i++) {
      const sq = selectedQuestions[i];
      await tx.diagnosticAssessmentItem.create({
        data: {
          assessmentId: created.id,
          questionId: sq.question.id,
          conceptId: sq.conceptId,
          displayOrder: i,
        },
      });
    }

    return created;
  });

  return {
    assessmentId: assessment.id,
    status: assessment.status,
    startedAt: assessment.startedAt,
    totalQuestions: selectedQuestions.length,
    questions: selectedQuestions.map((sq) => ({
      id: sq.question.id,
      questionId: sq.question.questionId,
      exerciseNumber: sq.question.exercise.exerciseNumber,
      unitNumber: sq.question.exercise.unit.unitNumber,
      unitTitle: sq.question.exercise.unit.title,
      promptText: sq.question.questionContent,
      questionType: sq.question.exercise.questionType,
      concept: sq.conceptMeta,
      blanks: sq.question.blanks.map((b: any) => ({
        blankIndex: b.blankIndex,
      })),
      options: sq.question.options.map((o: any) => ({
        key: o.optionKey,
        text: o.optionText,
      })),
    })),
  };
}

/**
 * Submits and grades the diagnostic assessment.
 */
export async function submitDiagnosticAssessment(
  userId: string,
  assessmentId: string,
  answers: Record<string, any>
) {
  const assessment = await prisma.diagnosticAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
        include: {
          question: {
            include: {
              blanks: {
                orderBy: { blankIndex: "asc" },
                include: { acceptedAnswers: { orderBy: { displayOrder: "asc" } } },
              },
              parts: {
                orderBy: { displayOrder: "asc" },
                include: { acceptedAnswers: { orderBy: { displayOrder: "asc" } } },
              },
              options: { orderBy: { displayOrder: "asc" } },
              acceptedAnswers: { orderBy: { displayOrder: "asc" } },
              explanation: {
                include: {
                  theorySection: {
                    select: { sectionId: true, heading: true, unitId: true },
                  },
                },
              },
              exercise: {
                select: {
                  exerciseNumber: true,
                  unit: { select: { id: true, unitNumber: true, title: true } },
                },
              },
            },
          },
          concept: true,
        },
      },
    },
  });

  if (!assessment) {
    throw AppError.notFound(`Diagnostic assessment ${assessmentId} not found`);
  }

  if (assessment.userId !== userId) {
    throw AppError.forbidden("You do not have permission to submit this assessment");
  }

  // Grade each item
  let correctCount = 0;
  const gradedItems = [];
  const conceptScores: Record<string, { name: string; total: number; correct: number }> = {};

  for (const item of assessment.items) {
    // Try lookup by item.question.id or item.question.questionId
    const submittedAnswer = answers[item.question.id] ?? answers[item.question.questionId] ?? null;

    const evaluation = evaluateQuestion(item.question, submittedAnswer);
    const isCorrect = Boolean(evaluation.isCorrect);

    if (isCorrect) {
      correctCount += 1;
    }

    if (item.concept) {
      const cId = item.concept.id;
      if (!conceptScores[cId]) {
        conceptScores[cId] = { name: item.concept.name, total: 0, correct: 0 };
      }
      conceptScores[cId].total += 1;
      if (isCorrect) conceptScores[cId].correct += 1;
    }

    // Persist result on item
    await prisma.diagnosticAssessmentItem.update({
      where: { id: item.id },
      data: {
        studentAnswer: submittedAnswer !== null ? (submittedAnswer as any) : undefined,
        isCorrect,
      },
    });

    gradedItems.push({
      questionId: item.question.id,
      promptText: item.question.questionContent,
      unitNumber: item.question.exercise.unit.unitNumber,
      unitTitle: item.question.exercise.unit.title,
      studentAnswer: submittedAnswer,
      isCorrect,
      correctAnswers: evaluation.correctAnswers,
      explanation: evaluation.explanation || item.question.explanation?.aiExplanation || null,
      conceptName: item.concept?.name ?? item.question.exercise.unit.title,
    });
  }

  const totalQuestions = assessment.items.length;
  const scorePercentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;

  // Determine estimated level & recommended starting point
  let estimatedLevel = "foundation";
  let recommendedStartingUnit = 1;

  if (scorePercentage >= 85) {
    estimatedLevel = "intermediate";
    recommendedStartingUnit = 53; // Unit 53 Passive
  } else if (scorePercentage >= 50) {
    estimatedLevel = "developing";
    recommendedStartingUnit = 25; // Unit 25 Future / Modals
  } else {
    estimatedLevel = "foundation";
    recommendedStartingUnit = 1; // Unit 1 Present Continuous
  }

  const recUnit = await prisma.unit.findFirst({
    where: { unitNumber: recommendedStartingUnit },
    select: { id: true, unitNumber: true, title: true },
  });

  const strengths = Object.values(conceptScores)
    .filter((c) => c.correct === c.total)
    .map((c) => c.name);

  const weaknesses = Object.values(conceptScores)
    .filter((c) => c.correct < c.total)
    .map((c) => c.name);

  // Update assessment
  await prisma.diagnosticAssessment.update({
    where: { id: assessmentId },
    data: {
      status: "completed",
      completedAt: new Date(),
      totalQuestions,
      correctCount,
      scorePercentage,
      estimatedLevel,
      recommendedUnitId: recUnit?.id ?? null,
      summaryNotes: `Đánh giá sơ bộ: Đúng ${correctCount}/${totalQuestions} câu (${scorePercentage}%). Trình độ khởi điểm khuyến nghị: ${estimatedLevel}.`,
    },
  });

  return {
    assessmentId,
    status: "completed",
    totalQuestions,
    correctCount,
    scorePercentage,
    estimatedLevel,
    recommendedUnit: recUnit
      ? { unitNumber: recUnit.unitNumber, title: recUnit.title }
      : { unitNumber: 1, title: "Present continuous (I am doing)" },
    strengths,
    weaknesses,
    summaryVi: `Bạn đã trả lời đúng ${correctCount}/${totalQuestions} câu (${scorePercentage}%). Dựa trên kết quả này, bạn nên bắt đầu từ ${
      recUnit ? `Unit ${recUnit.unitNumber}: ${recUnit.title}` : "Unit 1"
    }.`,
    disclaimerVi:
      "Kết quả đánh giá ban đầu này chỉ mang tính chất định hướng lộ trình học tập, không tự động đánh dấu hoàn thành hoặc thành thạo ngữ pháp khi chưa có đủ bằng chứng luyện tập.",
    items: gradedItems,
  };
}
