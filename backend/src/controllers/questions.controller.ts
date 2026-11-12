import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatQuestionDetail, formatQuestionSolution } from "../utils/formatters";
import { evaluateQuestion, isEmptyStudentAnswer } from "../utils/grader";
import { runDeduplicatedSubmission, stableSerialize } from "../utils/idempotency";
import { assertNoSpoilerQueryParams } from "./exercises.controller";

export const questionIdParamSchema = z.object({
  questionId: z
    .string()
    .trim()
    .min(1, "questionId cannot be empty")
    .max(50, "questionId must be 50 characters or less"),
});

export const checkQuestionBodySchema = z.object({
  submissionId: z.string().trim().min(1).max(120).optional(),
  answer: z.union([
    z.string().max(1000, "Answer text exceeds maximum length"),
    z.array(z.string().max(1000)).max(20),
    z.record(z.string().max(50), z.string().max(1000)),
  ]),
});

export async function getQuestionById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId } = questionIdParamSchema.parse(req.params);
    assertNoSpoilerQueryParams(req.query as Record<string, unknown>);

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
        },
        parts: {
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

    const formatted = formatQuestionDetail(question, false);

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
    const userId = req.user!.id;

    const question = await prisma.question.findFirst({
      where: { questionId },
      include: {
        exercise: {
          select: {
            id: true,
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

    // Attempt-state gate: interactive test items require at least one non-empty submitted attempt
    if (!question.isExample) {
      const priorAttempts = await prisma.questionAttemptItem.findMany({
        where: {
          userId,
          questionId: question.id,
        },
        select: { studentAnswer: true },
        take: 25,
      });

      const hasSubmittedAttempt = priorAttempts.some(
        (item) => !isEmptyStudentAnswer(item.studentAnswer)
      );

      if (!hasSubmittedAttempt) {
        throw new AppError(
          403,
          "SOLUTION_LOCKED",
          "Submit an answer attempt for this question before viewing its solution."
        );
      }
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
    const { answer, submissionId } = checkQuestionBodySchema.parse(req.body);

    if (isEmptyStudentAnswer(answer)) {
      throw AppError.badRequest(
        "Please provide a non-empty answer before checking.",
        "VALIDATION_ERROR"
      );
    }

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
      const dedupeKey = submissionId
        ? `question:${userId}:${question.id}:sub:${submissionId}`
        : `question:${userId}:${question.id}:${stableSerialize(answer)}`;

      const txResult = await runDeduplicatedSubmission(dedupeKey, () =>
        prisma.$transaction(async (tx) => {
          const item = await tx.questionAttemptItem.create({
            data: {
              attemptId: null,
              userId,
              questionId: question.id,
              studentAnswer: (result.studentAnswer !== undefined
                ? result.studentAnswer
                : null) as any,
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

          const targetStatus =
            currentProgress?.status === "completed" ? "completed" : "in_progress";
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
        })
      );

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
