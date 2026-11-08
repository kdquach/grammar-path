import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import { sendSuccess } from "../utils/response";

const unitNumberParamSchema = z.object({
  unitNumber: z.coerce.number().int().min(1).max(200),
});

const updateProgressBodySchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed"]),
});

interface MistakeRow {
  questionId: string;
  questionContent: string;
  questionType: string;
  exerciseId: string;
  exerciseNumber: string;
  unitNumber: number;
  unitTitle: string;
  lastStudentAnswer: unknown;
  lastAttemptedAt: Date;
}

export async function getProgressOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const [
      totalUnits,
      completedCount,
      inProgressCount,
      totalExercises,
      totalAttempts,
      uniqueExercisesAttempted,
      avgScoreResult,
      totalAnswered,
      uniqueQuestionsAttempted,
      correctUniqueQuestionsAttempted,
      totalCorrectAnswered,
      recentAttemptsRaw,
      touchedUnitsRaw,
    ] = await Promise.all([
      prisma.unit.count(),
      prisma.learningProgress.count({
        where: { userId, status: "completed" },
      }),
      prisma.learningProgress.count({
        where: { userId, status: "in_progress" },
      }),
      prisma.exercise.count(),
      prisma.exerciseAttempt.count({
        where: { userId },
      }),
      prisma.exerciseAttempt.groupBy({
        by: ["exerciseId"],
        where: { userId },
      }),
      prisma.exerciseAttempt.aggregate({
        where: { userId },
        _avg: { scorePercentage: true },
      }),
      prisma.questionAttemptItem.count({
        where: { userId },
      }),
      prisma.questionAttemptItem.groupBy({
        by: ["questionId"],
        where: { userId },
      }),
      prisma.questionAttemptItem.groupBy({
        by: ["questionId"],
        where: { userId, isCorrect: true },
      }),
      prisma.questionAttemptItem.count({
        where: { userId, isCorrect: true },
      }),
      prisma.exerciseAttempt.findMany({
        where: { userId },
        orderBy: { submittedAt: "desc" },
        take: 10,
        include: {
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
      prisma.learningProgress.findMany({
        where: { userId },
        include: {
          unit: {
            select: {
              unitNumber: true,
              title: true,
            },
          },
        },
        orderBy: {
          unit: {
            unitNumber: "asc",
          },
        },
      }),
    ]);

    const notStartedCount = Math.max(0, totalUnits - completedCount - inProgressCount);
    const completionPercentage =
      totalUnits > 0 ? Math.round((completedCount / totalUnits) * 1000) / 10 : 0;

    const averageScorePercentage =
      avgScoreResult._avg.scorePercentage !== null
        ? Math.round(avgScoreResult._avg.scorePercentage * 10) / 10
        : 0;

    const accuracyPercentage =
      totalAnswered > 0
        ? Math.round((totalCorrectAnswered / totalAnswered) * 1000) / 10
        : 0;

    const recentAttempts = recentAttemptsRaw.map((a) => ({
      id: a.id,
      exerciseId: a.exercise.exerciseId,
      exerciseNumber: a.exercise.exerciseNumber,
      unitNumber: a.exercise.unit.unitNumber,
      unitTitle: a.exercise.unit.title,
      scorePercentage: a.scorePercentage,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      submittedAt: a.submittedAt,
    }));

    const unitProgressMap = touchedUnitsRaw.map((p) => ({
      unitNumber: p.unit.unitNumber,
      status: p.status,
      lastAccessedAt: p.lastAccessedAt,
      completedAt: p.completedAt,
    }));

    sendSuccess(res, {
      units: {
        completedCount,
        inProgressCount,
        notStartedCount,
        totalUnits,
        completionPercentage,
      },
      exercises: {
        totalAttempts,
        uniqueExercisesAttempted: uniqueExercisesAttempted.length,
        totalExercises,
        averageScorePercentage,
      },
      questions: {
        totalAnswered,
        uniqueQuestionsAnswered: uniqueQuestionsAttempted.length,
        correctUniqueQuestions: correctUniqueQuestionsAttempted.length,
        accuracyPercentage,
      },
      recentAttempts,
      unitProgressMap,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUnitProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);
    const { status } = updateProgressBodySchema.parse(req.body);
    const userId = req.user!.id;

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      select: { id: true, unitNumber: true, title: true },
    });

    if (!unit) {
      throw AppError.notFound(`Unit ${unitNumber} not found`, "NOT_FOUND");
    }

    const now = new Date();
    const progress = await prisma.learningProgress.upsert({
      where: {
        userId_unitId: {
          userId,
          unitId: unit.id,
        },
      },
      create: {
        userId,
        unitId: unit.id,
        status,
        lastAccessedAt: now,
        completedAt: status === "completed" ? now : null,
      },
      update: {
        status,
        lastAccessedAt: now,
        completedAt: status === "completed" ? now : null,
      },
    });

    sendSuccess(res, {
      unitNumber: unit.unitNumber,
      title: unit.title,
      status: progress.status,
      completedAt: progress.completedAt,
      lastAccessedAt: progress.lastAccessedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnitProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);
    const userId = req.user!.id;

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      include: {
        exercises: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            exerciseId: true,
            exerciseNumber: true,
          },
        },
      },
    });

    if (!unit) {
      throw AppError.notFound(`Unit ${unitNumber} not found`, "NOT_FOUND");
    }

    const progress = await prisma.learningProgress.findUnique({
      where: {
        userId_unitId: {
          userId,
          unitId: unit.id,
        },
      },
    });

    const exerciseIds = unit.exercises.map((e) => e.id);
    const attempts = await prisma.exerciseAttempt.findMany({
      where: {
        userId,
        exerciseId: { in: exerciseIds },
      },
      orderBy: { submittedAt: "desc" },
      include: {
        exercise: {
          select: {
            exerciseId: true,
            exerciseNumber: true,
          },
        },
        items: {
          include: {
            question: {
              select: {
                questionId: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(res, {
      unitNumber: unit.unitNumber,
      title: unit.title,
      status: progress?.status || "not_started",
      lastAccessedAt: progress?.lastAccessedAt || null,
      completedAt: progress?.completedAt || null,
      attempts: attempts.map((a) => ({
        id: a.id,
        exerciseId: a.exercise.exerciseId,
        exerciseNumber: a.exercise.exerciseNumber,
        totalQuestions: a.totalQuestions,
        correctCount: a.correctCount,
        scorePercentage: a.scorePercentage,
        submittedAt: a.submittedAt,
        items: a.items.map((it) => ({
          questionId: it.question.questionId,
          studentAnswer: it.studentAnswer,
          isCorrect: it.isCorrect,
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMistakes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const mistakes = await prisma.$queryRaw<MistakeRow[]>`
      WITH latest_attempts AS (
        SELECT DISTINCT ON (qai.question_id)
          q.question_id AS "questionId",
          q.question_content AS "questionContent",
          e.question_type::text AS "questionType",
          e.exercise_id AS "exerciseId",
          e.exercise_number AS "exerciseNumber",
          u.unit_number AS "unitNumber",
          u.title AS "unitTitle",
          qai.student_answer AS "lastStudentAnswer",
          qai.created_at AS "lastAttemptedAt",
          qai.is_correct AS "isCorrect"
        FROM question_attempt_items qai
        JOIN questions q ON q.id = qai.question_id
        JOIN exercises e ON e.id = q.exercise_id
        JOIN units u ON u.id = e.unit_id
        WHERE qai.user_id = ${userId}::uuid
        ORDER BY qai.question_id, qai.created_at DESC
      )
      SELECT 
        "questionId",
        "questionContent",
        "questionType",
        "exerciseId",
        "exerciseNumber",
        "unitNumber",
        "unitTitle",
        "lastStudentAnswer",
        "lastAttemptedAt"
      FROM latest_attempts
      WHERE "isCorrect" = false
      ORDER BY "lastAttemptedAt" DESC;
    `;

    sendSuccess(res, mistakes, {
      totalMistakes: mistakes.length,
    });
  } catch (error) {
    next(error);
  }
}
