import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatExercise, formatQuestionSolution } from "../utils/formatters";
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
