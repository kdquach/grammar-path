import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatExercise, formatQuestionSolution } from "../utils/formatters";
import { evaluateQuestion } from "../utils/grader";
import { unitNumberParamSchema } from "./units.controller";

export const includeAnswersQuerySchema = z.object({
  includeAnswers: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1") return true;
      if (val === "false" || val === false || val === "0") return false;
      return false;
    }, z.boolean())
    .default(false),
});

export const exerciseIdParamSchema = z.object({
  exerciseId: z.string().trim().min(1, "exerciseId cannot be empty"),
});

export const checkExerciseBodySchema = z.object({
  answers: z.record(
    z.union([z.string(), z.array(z.string()), z.record(z.string())])
  ),
});

export async function getUnitExercises(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);
    const { includeAnswers } = includeAnswersQuerySchema.parse(req.query);

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      select: { id: true, unitNumber: true },
    });

    if (!unit) {
      throw AppError.notFound(`Unit ${unitNumber} not found`, "NOT_FOUND");
    }

    const rawExercises = await prisma.exercise.findMany({
      where: { unitId: unit.id },
      orderBy: { displayOrder: "asc" },
      include: {
        wordBankItems: {
          orderBy: { displayOrder: "asc" },
        },
        questions: {
          orderBy: { displayOrder: "asc" },
          include: {
            options: {
              orderBy: { displayOrder: "asc" },
            },
            blanks: {
              orderBy: { blankIndex: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            parts: {
              orderBy: { displayOrder: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            acceptedAnswers: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    const exercises = rawExercises.map((ex) =>
      formatExercise(ex, includeAnswers)
    );

    sendSuccess(res, exercises, {
      unitNumber,
      totalExercises: exercises.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExerciseById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { exerciseId } = exerciseIdParamSchema.parse(req.params);
    const { includeAnswers } = includeAnswersQuerySchema.parse(req.query);

    const exercise = await prisma.exercise.findFirst({
      where: { exerciseId },
      include: {
        unit: {
          select: { unitNumber: true, title: true },
        },
        wordBankItems: {
          orderBy: { displayOrder: "asc" },
        },
        questions: {
          orderBy: { displayOrder: "asc" },
          include: {
            options: {
              orderBy: { displayOrder: "asc" },
            },
            blanks: {
              orderBy: { blankIndex: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            parts: {
              orderBy: { displayOrder: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            acceptedAnswers: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw AppError.notFound(
        `Exercise '${exerciseId}' not found`,
        "NOT_FOUND"
      );
    }

    const formatted = formatExercise(exercise, includeAnswers);

    sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
}

export async function getExerciseSolutions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { exerciseId } = exerciseIdParamSchema.parse(req.params);

    const exercise = await prisma.exercise.findFirst({
      where: { exerciseId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          include: {
            blanks: {
              orderBy: { blankIndex: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            parts: {
              orderBy: { displayOrder: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            acceptedAnswers: {
              orderBy: { displayOrder: "asc" },
            },
            answerKey: {
              include: {
                sourcePages: {
                  orderBy: { pageNumber: "asc" },
                },
              },
            },
            explanation: true,
          },
        },
      },
    });

    if (!exercise) {
      throw AppError.notFound(
        `Exercise '${exerciseId}' not found`,
        "NOT_FOUND"
      );
    }

    // Collect distinct ruleReferences to query TheorySections in one batch
    const ruleRefs = exercise.questions
      .map((q) => q.explanation?.ruleReference)
      .filter((ref): ref is string => Boolean(ref));

    const theorySections =
      ruleRefs.length > 0
        ? await prisma.theorySection.findMany({
            where: {
              sectionId: { in: ruleRefs, mode: "insensitive" },
            },
            select: {
              sectionId: true,
              heading: true,
            },
          })
        : [];

    const sectionMap = new Map<string, { sectionId: string; heading: string }>();
    for (const s of theorySections) {
      sectionMap.set(s.sectionId.toUpperCase(), s);
    }

    const solutions = exercise.questions.map((q) => {
      const ref = q.explanation?.ruleReference?.toUpperCase();
      const linkedSection = ref ? sectionMap.get(ref) || null : null;
      return formatQuestionSolution(q, linkedSection);
    });

    sendSuccess(res, solutions, {
      exerciseId: exercise.exerciseId,
      exerciseNumber: exercise.exerciseNumber,
      totalSolutions: solutions.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function checkExerciseAnswers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { exerciseId } = exerciseIdParamSchema.parse(req.params);
    const { answers } = checkExerciseBodySchema.parse(req.body);

    const exercise = await prisma.exercise.findFirst({
      where: { exerciseId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          include: {
            blanks: {
              orderBy: { blankIndex: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            parts: {
              orderBy: { displayOrder: "asc" },
              include: {
                acceptedAnswers: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            acceptedAnswers: {
              orderBy: { displayOrder: "asc" },
            },
            options: {
              orderBy: { displayOrder: "asc" },
            },
            explanation: true,
          },
        },
      },
    });

    if (!exercise) {
      throw AppError.notFound(
        `Exercise '${exerciseId}' not found`,
        "NOT_FOUND"
      );
    }

    const results = exercise.questions.map((q) => {
      let studentAnswer = answers[q.questionId];

      // If studentAnswer was not provided under questionId, check if answers were keyed by partId
      if (
        studentAnswer === undefined &&
        q.parts &&
        q.parts.length > 0
      ) {
        const partAnswers: Record<string, string> = {};
        let hasAnyPart = false;
        for (const p of q.parts) {
          if (answers[p.partId] !== undefined) {
            partAnswers[p.partId] = String(answers[p.partId]);
            hasAnyPart = true;
          }
        }
        if (hasAnyPart) {
          studentAnswer = partAnswers;
        }
      }

      return evaluateQuestion(q, studentAnswer);
    });

    const totalQuestions = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const scorePercentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 1000) / 10
        : 0;

    let attemptId: string | undefined = undefined;
    let unitProgressStatus: string | undefined = undefined;

    if (req.user) {
      const userId = req.user.id;
      const unitId = exercise.unitId;

      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Create ExerciseAttempt
        const attempt = await tx.exerciseAttempt.create({
          data: {
            userId,
            exerciseId: exercise.id,
            totalQuestions,
            correctCount,
            scorePercentage,
            submittedAt: new Date(),
          },
        });

        // 2. Create QuestionAttemptItems
        const questionIdToUuid = new Map(exercise.questions.map((q) => [q.questionId, q.id]));
        const attemptItemsData = results.map((r) => ({
          attemptId: attempt.id,
          userId,
          questionId: questionIdToUuid.get(r.questionId) || r.questionId,
          studentAnswer: (r.studentAnswer !== undefined ? r.studentAnswer : null) as any,
          isCorrect: r.isCorrect,
          createdAt: new Date(),
        }));

        if (attemptItemsData.length > 0) {
          await tx.questionAttemptItem.createMany({
            data: attemptItemsData,
          });
        }

        // 3. Determine Unit completion status
        const unitExercises = await tx.exercise.findMany({
          where: { unitId },
          select: { id: true },
        });

        const userAttempts = await tx.exerciseAttempt.findMany({
          where: {
            userId,
            exerciseId: { in: unitExercises.map((e) => e.id) },
          },
          select: { exerciseId: true, scorePercentage: true },
        });

        const allExercisesPassed = unitExercises.every((ue) =>
          userAttempts.some((ua) => ua.exerciseId === ue.id && ua.scorePercentage >= 80)
        );

        const currentProgress = await tx.learningProgress.findUnique({
          where: {
            userId_unitId: {
              userId,
              unitId,
            },
          },
        });

        let targetStatus: "not_started" | "in_progress" | "completed" = "in_progress";
        if (allExercisesPassed) {
          targetStatus = "completed";
        } else if (currentProgress?.status === "completed") {
          targetStatus = "completed";
        }

        const now = new Date();
        const progress = await tx.learningProgress.upsert({
          where: {
            userId_unitId: {
              userId,
              unitId,
            },
          },
          create: {
            userId,
            unitId,
            status: targetStatus,
            lastAccessedAt: now,
            completedAt: targetStatus === "completed" ? now : null,
          },
          update: {
            status: targetStatus,
            lastAccessedAt: now,
            ...(targetStatus === "completed" && !currentProgress?.completedAt ? { completedAt: now } : {}),
          },
        });

        return {
          attemptId: attempt.id,
          unitProgressStatus: progress.status,
        };
      });

      attemptId = txResult.attemptId;
      unitProgressStatus = txResult.unitProgressStatus;
    }

    sendSuccess(res, {
      exerciseId: exercise.exerciseId,
      exerciseNumber: exercise.exerciseNumber,
      totalQuestions,
      correctCount,
      scorePercentage,
      results,
      ...(attemptId ? { attemptId, unitProgressStatus } : {}),
    });
  } catch (error) {
    next(error);
  }
}
