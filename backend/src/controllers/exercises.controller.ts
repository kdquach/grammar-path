import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatExercise, formatQuestionSolution } from "../utils/formatters";
import { evaluateQuestion, isEmptyStudentAnswer } from "../utils/grader";
import { runDeduplicatedSubmission, stableSerialize } from "../utils/idempotency";
import { unitNumberParamSchema } from "./units.controller";

const SPOILER_QUERY_KEYS = [
  "includeAnswers",
  "includeSolutions",
  "showAnswers",
  "revealAnswers",
  "withAnswers",
];

/**
 * Rejects spoiler bypass attempts via query parameters (e.g. ?includeAnswers=true).
 * Answer disclosure on read endpoints is strictly disabled in Phase 2.1.
 */
export function assertNoSpoilerQueryParams(query: Record<string, unknown>): void {
  for (const key of SPOILER_QUERY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const raw = query[key];
      const normalized =
        typeof raw === "string" ? raw.trim().toLowerCase() : String(raw ?? "").toLowerCase();
      if (
        normalized === "" ||
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on"
      ) {
        throw new AppError(
          403,
          "SPOILER_FORBIDDEN",
          "Retrieving answers via query parameters is disabled. Submit your answers first."
        );
      }
    }
  }
}

export const exerciseIdParamSchema = z.object({
  exerciseId: z
    .string()
    .trim()
    .min(1, "exerciseId cannot be empty")
    .max(50, "exerciseId must be 50 characters or less"),
});

export const checkExerciseBodySchema = z.object({
  submissionId: z.string().trim().min(1).max(120).optional(),
  answers: z
    .record(
      z.string().max(50),
      z.union([
        z.string().max(1000, "Answer text exceeds maximum length"),
        z.array(z.string().max(1000)).max(20),
        z.record(z.string().max(50), z.string().max(1000)),
      ])
    )
    .refine((obj) => Object.keys(obj).length <= 100, {
      message: "Too many answers in submission",
    }),
});

export async function getUnitExercises(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);
    assertNoSpoilerQueryParams(req.query as Record<string, unknown>);

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
            },
            parts: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    const exercises = rawExercises.map((ex) => formatExercise(ex, false));

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
    assertNoSpoilerQueryParams(req.query as Record<string, unknown>);

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
            },
            parts: {
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

    const formatted = formatExercise(exercise, false);

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
    const userId = req.user!.id;

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

    // Attempt-state gate: authenticated learner must have submitted at least one attempt for this exercise
    const existingAttempt = await prisma.exerciseAttempt.findFirst({
      where: {
        userId,
        exerciseId: exercise.id,
      },
      select: { id: true },
    });

    if (!existingAttempt) {
      throw new AppError(
        403,
        "SOLUTION_LOCKED",
        "Submit this exercise before viewing the official solutions."
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
    const { answers, submissionId } = checkExerciseBodySchema.parse(req.body);

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

    // Scope validation: reject any foreign or unknown questionIds / partIds not belonging to this exercise
    const validAnswerKeys = new Set<string>();
    for (const q of exercise.questions) {
      validAnswerKeys.add(q.questionId);
      for (const p of q.parts || []) {
        validAnswerKeys.add(p.partId);
      }
    }

    const submittedKeys = Object.keys(answers);
    const foreignKeys = submittedKeys.filter((k) => !validAnswerKeys.has(k));
    if (foreignKeys.length > 0) {
      throw AppError.badRequest(
        `Submitted answers contain invalid or foreign question IDs for exercise '${exercise.exerciseId}': ${foreignKeys.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    // Option B: Worked examples (isExample: true) are excluded from interactive grading
    const testQuestions = exercise.questions.filter((q) => !q.isExample);
    const questionsToGrade = testQuestions.length > 0 ? testQuestions : exercise.questions;

    // Resolve each question's studentAnswer before checking non-empty count
    const resolvedEntries = questionsToGrade.map((q) => {
      let studentAnswer: unknown = answers[q.questionId];

      if (studentAnswer === undefined && q.parts && q.parts.length > 0) {
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

      return {
        question: q,
        studentAnswer,
        hasAttempted: !isEmptyStudentAnswer(studentAnswer),
      };
    });

    const attemptedCount = resolvedEntries.filter((e) => e.hasAttempted).length;
    if (attemptedCount === 0) {
      throw AppError.badRequest(
        "Please answer at least one question before checking the exercise.",
        "VALIDATION_ERROR"
      );
    }

    const results = resolvedEntries.map(({ question, studentAnswer, hasAttempted }) => {
      if (!hasAttempted) {
        // Anti-spoiler: do NOT expose expectedAnswers or explanation for unanswered items
        return {
          questionId: question.questionId,
          status: "unanswered" as const,
          isCorrect: false,
          studentAnswer: null,
          correctAnswers: [] as string[],
          expectedAnswers: [] as string[],
          explanation: null,
          ruleReference: null,
        };
      }
      return evaluateQuestion(question, studentAnswer);
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
      const dedupeKey = submissionId
        ? `exercise:${userId}:${exercise.id}:sub:${submissionId}`
        : `exercise:${userId}:${exercise.id}:${stableSerialize(answers)}`;

      const txResult = await runDeduplicatedSubmission(dedupeKey, () =>
        prisma.$transaction(async (tx) => {
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

          // 2. Create QuestionAttemptItems (keep one per graded question for structural attempt integrity;
          //    unattempted items store null so mistakes & individual solution locks ignore them)
          const questionIdToUuid = new Map(exercise.questions.map((q) => [q.questionId, q.id]));
          const attemptItemsData = resolvedEntries.map(({ question, hasAttempted }, idx) => {
            const r = results[idx];
            return {
              attemptId: attempt.id,
              userId,
              questionId: questionIdToUuid.get(r.questionId) || question.id,
              studentAnswer: (hasAttempted && r.studentAnswer !== undefined
                ? r.studentAnswer
                : null) as any,
              isCorrect: r.isCorrect,
              createdAt: new Date(),
            };
          });

          if (attemptItemsData.length > 0) {
            await tx.questionAttemptItem.createMany({
              data: attemptItemsData,
            });
          }

          // 3. Determine Unit completion status using each exercise's LATEST attempt (>= 80%),
          //    not stale historical MAX scores, and never silently reverting manual 'completed'
          const unitExercises = await tx.exercise.findMany({
            where: { unitId },
            select: { id: true },
          });

          const latestAttempts = await tx.exerciseAttempt.findMany({
            where: {
              userId,
              exerciseId: { in: unitExercises.map((e) => e.id) },
            },
            orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
            select: { exerciseId: true, scorePercentage: true },
          });

          const latestScoreByExercise = new Map<string, number>();
          for (const a of latestAttempts) {
            if (!latestScoreByExercise.has(a.exerciseId)) {
              latestScoreByExercise.set(a.exerciseId, a.scorePercentage);
            }
          }

          const allExercisesPassed =
            unitExercises.length > 0 &&
            unitExercises.every((ue) => (latestScoreByExercise.get(ue.id) ?? -1) >= 80);

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
              ...(targetStatus === "completed" && !currentProgress?.completedAt
                ? { completedAt: now }
                : {}),
            },
          });

          return {
            attemptId: attempt.id,
            unitProgressStatus: progress.status,
          };
        })
      );

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
