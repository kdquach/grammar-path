import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatQuestionDetail, formatQuestionSolution } from "../utils/formatters";
import { evaluateQuestion } from "../utils/grader";
import { includeAnswersQuerySchema } from "./exercises.controller";

export const questionIdParamSchema = z.object({
  questionId: z.string().trim().min(1, "questionId cannot be empty"),
});

export const checkQuestionBodySchema = z.object({
  answer: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.string()),
  ]),
});

export async function getQuestionById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId } = questionIdParamSchema.parse(req.params);
    const { includeAnswers } = includeAnswersQuerySchema.parse(req.query);

    const question = await prisma.question.findFirst({
      where: { questionId },
      include: {
        sourcePages: {
          orderBy: { pageNumber: "asc" },
        },
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
        exercise: {
          include: {
            unit: {
              select: {
                unitNumber: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw AppError.notFound(
        `Question '${questionId}' not found`,
        "NOT_FOUND"
      );
    }

    const formatted = formatQuestionDetail(question, includeAnswers);

    sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
}

export async function getQuestionSolution(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId } = questionIdParamSchema.parse(req.params);

    const question = await prisma.question.findFirst({
      where: { questionId },
      include: {
        exercise: {
          select: {
            unitId: true,
          },
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
        answerKey: {
          include: {
            sourcePages: {
              orderBy: { pageNumber: "asc" },
            },
          },
        },
        explanation: true,
      },
    });

    if (!question) {
      throw AppError.notFound(
        `Question '${questionId}' not found`,
        "NOT_FOUND"
      );
    }

    let linkedSection: { sectionId: string; heading: string } | null = null;
    if (question.explanation?.ruleReference) {
      const section = await prisma.theorySection.findFirst({
        where: {
          sectionId: {
            equals: question.explanation.ruleReference.trim(),
            mode: "insensitive",
          },
        },
        select: {
          sectionId: true,
          heading: true,
        },
      });
      if (section) {
        linkedSection = section;
      }
    }

    const solution = formatQuestionSolution(question, linkedSection);

    sendSuccess(res, solution);
  } catch (error) {
    next(error);
  }
}

export async function checkQuestionAnswer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId } = questionIdParamSchema.parse(req.params);
    const { answer } = checkQuestionBodySchema.parse(req.body);

    const question = await prisma.question.findFirst({
      where: { questionId },
      include: {
        exercise: {
          select: {
            unitId: true,
          },
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
        options: {
          orderBy: { displayOrder: "asc" },
        },
        explanation: true,
      },
    });

    if (!question) {
      throw AppError.notFound(
        `Question '${questionId}' not found`,
        "NOT_FOUND"
      );
    }

    const result = evaluateQuestion(question, answer);

    let questionAttemptId: string | undefined = undefined;

    if (req.user) {
      const userId = req.user.id;
      const unitId = question.exercise.unitId;

      const txResult = await prisma.$transaction(async (tx) => {
        const item = await tx.questionAttemptItem.create({
          data: {
            attemptId: null,
            userId,
            questionId: question.id,
            studentAnswer: (result.studentAnswer !== undefined ? result.studentAnswer : null) as any,
            isCorrect: result.isCorrect,
            createdAt: new Date(),
          },
        });

        const currentProgress = await tx.learningProgress.findUnique({
          where: {
            userId_unitId: {
              userId,
              unitId,
            },
          },
        });

        const targetStatus = currentProgress?.status === "completed" ? "completed" : "in_progress";
        const now = new Date();

        await tx.learningProgress.upsert({
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
          },
        });

        return item.id;
      });

      questionAttemptId = txResult;
    }

    sendSuccess(res, {
      questionId: question.questionId,
      isCorrect: result.isCorrect,
      studentAnswer: result.studentAnswer,
      correctAnswers: result.correctAnswers,
      expectedAnswers: result.expectedAnswers,
      explanation: result.explanation,
      ruleReference: result.ruleReference,
      ...(questionAttemptId ? { questionAttemptId } : {}),
    });
  } catch (error) {
    next(error);
  }
}
