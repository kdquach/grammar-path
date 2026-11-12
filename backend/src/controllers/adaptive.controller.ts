import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { formatQuestion } from "../utils/formatters";
import { evaluateQuestion, isEmptyStudentAnswer } from "../utils/grader";
import { runDeduplicatedSubmission, stableSerialize } from "../utils/idempotency";
import { getLatestUnresolvedMistakes } from "../services/mistakes.service";
import {
  DifficultyLevel,
  generateToeicQuestionsForUnit,
} from "../services/toeic-generator.service";

export interface WeakestUnitSummary {
  unitNumber: number;
  unitTitle: string;
  totalAttempts: number;
  errorCount: number;
  accuracyPercentage: number;
  weakestQuestionTypes: string[];
}

export interface QuestionTypeErrorDistribution {
  questionType: string;
  errorCount: number;
  totalAttempts: number;
  errorRatePercentage: number;
}

export interface WeakRuleMetric {
  ruleReference: string;
  heading: string;
  unitNumber: number;
  unitTitle: string;
  errorCount: number;
  totalAttempts: number;
  accuracyPercentage: number;
}

export interface ReviewRecommendation {
  unitNumber: number;
  unitTitle: string;
  priority: "high" | "medium" | "low";
  reason: string;
  errorCount: number;
  accuracyPercentage: number;
  weakestQuestionTypes: string[];
  targetRules: string[];
  suggestedActions: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/adaptive/analytics
 */
export async function getAdaptiveAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const attemptItems = await prisma.questionAttemptItem.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            questionId: true,
            explanation: {
              select: {
                ruleReference: true,
              },
            },
            exercise: {
              select: {
                id: true,
                exerciseId: true,
                exerciseNumber: true,
                questionType: true,
                unit: {
                  select: {
                    id: true,
                    unitNumber: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalEvaluated = attemptItems.length;
    const totalCorrect = attemptItems.filter((i) => i.isCorrect).length;
    const totalErrors = attemptItems.filter((i) => !i.isCorrect).length;
    const accuracyPercentage =
      totalEvaluated > 0
        ? Math.round((totalCorrect / totalEvaluated) * 1000) / 10
        : 0;

    const unitMap = new Map<
      number,
      {
        unitNumber: number;
        unitTitle: string;
        totalAttempts: number;
        correctCount: number;
        errorCount: number;
        errorsByType: Record<string, number>;
      }
    >();

    const typeMap = new Map<
      string,
      {
        questionType: string;
        totalAttempts: number;
        errorCount: number;
      }
    >();

    const ruleMap = new Map<
      string,
      {
        ruleReference: string;
        unitNumber: number;
        unitTitle: string;
        totalAttempts: number;
        errorCount: number;
      }
    >();

    for (const item of attemptItems) {
      const exercise = item.question.exercise;
      const unit = exercise.unit;
      const qType = exercise.questionType;
      const ruleRef = item.question.explanation?.ruleReference?.trim();

      if (!unitMap.has(unit.unitNumber)) {
        unitMap.set(unit.unitNumber, {
          unitNumber: unit.unitNumber,
          unitTitle: unit.title,
          totalAttempts: 0,
          correctCount: 0,
          errorCount: 0,
          errorsByType: {},
        });
      }
      const u = unitMap.get(unit.unitNumber)!;
      u.totalAttempts += 1;
      if (item.isCorrect) {
        u.correctCount += 1;
      } else {
        u.errorCount += 1;
        u.errorsByType[qType] = (u.errorsByType[qType] || 0) + 1;
      }

      if (!typeMap.has(qType)) {
        typeMap.set(qType, {
          questionType: qType,
          totalAttempts: 0,
          errorCount: 0,
        });
      }
      const t = typeMap.get(qType)!;
      t.totalAttempts += 1;
      if (!item.isCorrect) {
        t.errorCount += 1;
      }

      if (ruleRef) {
        if (!ruleMap.has(ruleRef)) {
          ruleMap.set(ruleRef, {
            ruleReference: ruleRef,
            unitNumber: unit.unitNumber,
            unitTitle: unit.title,
            totalAttempts: 0,
            errorCount: 0,
          });
        }
        const r = ruleMap.get(ruleRef)!;
        r.totalAttempts += 1;
        if (!item.isCorrect) {
          r.errorCount += 1;
        }
      }
    }

    const weakestUnits: WeakestUnitSummary[] = Array.from(unitMap.values())
      .filter((u) => u.errorCount > 0)
      .map((u) => {
        const unitAccuracy =
          u.totalAttempts > 0
            ? Math.round((u.correctCount / u.totalAttempts) * 1000) / 10
            : 0;

        const weakestTypes = Object.entries(u.errorsByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type]) => type);

        return {
          unitNumber: u.unitNumber,
          unitTitle: u.unitTitle,
          totalAttempts: u.totalAttempts,
          errorCount: u.errorCount,
          accuracyPercentage: unitAccuracy,
          weakestQuestionTypes: weakestTypes,
        };
      })
      .sort((a, b) => {
        if (b.errorCount !== a.errorCount) {
          return b.errorCount - a.errorCount;
        }
        return a.accuracyPercentage - b.accuracyPercentage;
      });

    const errorDistribution: QuestionTypeErrorDistribution[] = Array.from(
      typeMap.values()
    )
      .map((t) => {
        const errorRatePercentage =
          t.totalAttempts > 0
            ? Math.round((t.errorCount / t.totalAttempts) * 1000) / 10
            : 0;

        return {
          questionType: t.questionType,
          errorCount: t.errorCount,
          totalAttempts: t.totalAttempts,
          errorRatePercentage,
        };
      })
      .sort((a, b) => b.errorCount - a.errorCount);

    const weakestQuestionType =
      errorDistribution.length > 0 && errorDistribution[0].errorCount > 0
        ? errorDistribution[0].questionType
        : null;

    const errorRules = Array.from(ruleMap.values())
      .filter((r) => r.errorCount > 0)
      .sort((a, b) => {
        if (b.errorCount !== a.errorCount) {
          return b.errorCount - a.errorCount;
        }
        return a.totalAttempts - b.totalAttempts;
      })
      .slice(0, 10);

    const targetRuleRefs = errorRules.map((r) => r.ruleReference);
    const theorySections =
      targetRuleRefs.length > 0
        ? await prisma.theorySection.findMany({
            where: { sectionId: { in: targetRuleRefs } },
            include: {
              unit: {
                select: { unitNumber: true, title: true },
              },
            },
          })
        : [];

    const sectionMap = new Map(
      theorySections.map((ts) => [ts.sectionId.toUpperCase(), ts])
    );

    const weakRules: WeakRuleMetric[] = errorRules.map((r) => {
      const ts = sectionMap.get(r.ruleReference.toUpperCase());
      const heading = ts?.heading || `Quy tắc ${r.ruleReference}`;
      const unitNumber = ts?.unit?.unitNumber ?? r.unitNumber;
      const unitTitle = ts?.unit?.title ?? r.unitTitle;
      const ruleAccuracy =
        r.totalAttempts > 0
          ? Math.round(((r.totalAttempts - r.errorCount) / r.totalAttempts) * 1000) / 10
          : 0;

      return {
        ruleReference: r.ruleReference,
        heading,
        unitNumber,
        unitTitle,
        errorCount: r.errorCount,
        totalAttempts: r.totalAttempts,
        accuracyPercentage: ruleAccuracy,
      };
    });

    sendSuccess(res, {
      totalEvaluated,
      totalCorrect,
      totalErrors,
      accuracyPercentage,
      weakestUnits,
      errorDistribution,
      weakestQuestionType,
      weakRules,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/adaptive/recommendations
 */
export async function getAdaptiveRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const attemptItems = await prisma.questionAttemptItem.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            explanation: {
              select: {
                ruleReference: true,
              },
            },
            exercise: {
              select: {
                questionType: true,
                unit: {
                  select: {
                    id: true,
                    unitNumber: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userProgress = await prisma.learningProgress.findMany({
      where: { userId },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            title: true,
            theorySections: {
              select: { sectionId: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    const unitStats = new Map<
      number,
      {
        unitNumber: number;
        unitTitle: string;
        totalAttempts: number;
        errorCount: number;
        errorsByType: Record<string, number>;
        errorsByRule: Record<string, number>;
      }
    >();

    for (const item of attemptItems) {
      const unit = item.question.exercise.unit;
      const qType = item.question.exercise.questionType;
      const ruleRef = item.question.explanation?.ruleReference?.trim();

      if (!unitStats.has(unit.unitNumber)) {
        unitStats.set(unit.unitNumber, {
          unitNumber: unit.unitNumber,
          unitTitle: unit.title,
          totalAttempts: 0,
          errorCount: 0,
          errorsByType: {},
          errorsByRule: {},
        });
      }

      const stat = unitStats.get(unit.unitNumber)!;
      stat.totalAttempts += 1;
      if (!item.isCorrect) {
        stat.errorCount += 1;
        stat.errorsByType[qType] = (stat.errorsByType[qType] || 0) + 1;
        if (ruleRef) {
          stat.errorsByRule[ruleRef] = (stat.errorsByRule[ruleRef] || 0) + 1;
        }
      }
    }

    const recommendations: ReviewRecommendation[] = [];

    const errorUnits = Array.from(unitStats.values())
      .filter((u) => u.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount);

    for (const u of errorUnits) {
      const accuracy =
        u.totalAttempts > 0
          ? Math.round(
              ((u.totalAttempts - u.errorCount) / u.totalAttempts) * 1000
            ) / 10
          : 0;

      const priority: "high" | "medium" | "low" =
        u.errorCount >= 3 || accuracy < 60 ? "high" : "medium";

      const topWeakestTypes = Object.entries(u.errorsByType)
        .sort(([, a], [, b]) => b - a)
        .map(([type]) => type);

      const targetRules = Object.entries(u.errorsByRule)
        .sort(([, a], [, b]) => b - a)
        .map(([rule]) => rule)
        .slice(0, 3);

      const typeDesc =
        topWeakestTypes.length > 0 ? ` (${topWeakestTypes.join(", ")})` : "";
      const ruleDesc =
        targetRules.length > 0 ? ` (Mục lý thuyết: ${targetRules.join(", ")})` : "";

      const reason =
        priority === "high"
          ? `Tỷ lệ sai đáng kể với ${u.errorCount} lỗi sai ở Unit này (độ chính xác ${accuracy}%). Bạn hay gặp nhầm lẫn ở dạng bài${typeDesc}${ruleDesc}.`
          : `Ghi nhận ${u.errorCount} lỗi sai cần củng cố để hoàn thiện chủ điểm này${ruleDesc}.`;

      recommendations.push({
        unitNumber: u.unitNumber,
        unitTitle: u.unitTitle,
        priority,
        reason,
        errorCount: u.errorCount,
        accuracyPercentage: accuracy,
        weakestQuestionTypes: topWeakestTypes,
        targetRules,
        suggestedActions: [
          `Đọc lại lý thuyết Unit ${u.unitNumber}: ${u.unitTitle}${targetRules.length > 0 ? ` (Trọng tâm: Mục ${targetRules.join(", ")})` : ""}`,
          `Nhấn '🤖 AI giảng lại bằng tiếng Việt' trong mục lý thuyết nếu cần giải thích sâu hơn`,
          `Luyện tập lại các câu hỏi bị sai trong trang Review Mistakes`,
        ],
      });
    }

    if (recommendations.length < 3) {
      const inProgressUnits = userProgress
        .filter((p) => p.status === "in_progress")
        .filter(
          (p) => !recommendations.some((r) => r.unitNumber === p.unit.unitNumber)
        );

      for (const ip of inProgressUnits) {
        if (recommendations.length >= 3) break;
        const defaultRules = ip.unit.theorySections?.slice(0, 2).map((s) => s.sectionId) || [];
        recommendations.push({
          unitNumber: ip.unit.unitNumber,
          unitTitle: ip.unit.title,
          priority: "medium",
          reason: "Bài học đang học dở dang, cần hoàn thành các bài tập còn lại.",
          errorCount: 0,
          accuracyPercentage: 100,
          weakestQuestionTypes: [],
          targetRules: defaultRules,
          suggestedActions: [
            `Luyện tập tiếp các bài tập của Unit ${ip.unit.unitNumber}`,
            `Hoàn thiện bài học để chuyển trạng thái sang đã hoàn thành`,
          ],
        });
      }
    }

    if (recommendations.length === 0) {
      const unit1 = await prisma.unit.findFirst({
        where: { unitNumber: 1 },
        select: {
          unitNumber: true,
          title: true,
          theorySections: {
            select: { sectionId: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      });

      if (unit1) {
        const defaultRules = unit1.theorySections?.slice(0, 2).map((s) => s.sectionId) || ["1A", "1B"];
        recommendations.push({
          unitNumber: unit1.unitNumber,
          unitTitle: unit1.title,
          priority: "medium",
          reason:
            "Khởi đầu lộ trình học với thì Hiện tại tiếp diễn (Present continuous) — nền tảng thiết yếu trong ngữ pháp tiếng Anh.",
          errorCount: 0,
          accuracyPercentage: 0,
          weakestQuestionTypes: [],
          targetRules: defaultRules,
          suggestedActions: [
            "Đọc phần lý thuyết Unit 1",
            "Làm bài tập Exercise 1.1 để kiểm tra phản xạ ban đầu",
          ],
        });
      }
    }

    sendSuccess(res, {
      recommendations,
      totalRecommendations: recommendations.length,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Workstream E: TOEIC-Style Practice Generator (Anti-Spoiler + Persisted) ──

export const toeicPracticeSchema = z.object({
  unitNumber: z.coerce
    .number()
    .int()
    .min(1, "unitNumber must be between 1 and 145")
    .max(145, "unitNumber must be between 1 and 145"),
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
});

export const checkToeicPracticeSchema = z.object({
  sessionId: z.string().uuid("Invalid TOEIC practice sessionId"),
  itemId: z.string().uuid("Invalid TOEIC practice itemId"),
  submissionId: z.string().trim().min(1).max(120).optional(),
  studentAnswer: z.string().trim().min(1).max(10).optional(),
  answer: z.string().trim().min(1).max(10).optional(),
});

/**
 * POST /api/v1/adaptive/toeic-practice
 * Generates unit-grounded TOEIC Part 5 style drills, persists the session & items
 * securely in PostgreSQL, and returns questions WITHOUT pre-submission answers.
 */
export async function generateToeicPracticeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { unitNumber, count, difficulty } = toeicPracticeSchema.parse(req.body);

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      include: {
        theorySections: {
          select: {
            sectionId: true,
            heading: true,
            sourceContent: true,
          },
          orderBy: { displayOrder: "asc" },
        },
        textbookExamples: {
          select: {
            originalText: true,
            translationVi: true,
          },
          orderBy: { displayOrder: "asc" },
        },
        exercises: {
          orderBy: { displayOrder: "asc" },
          include: {
            questions: {
              orderBy: { displayOrder: "asc" },
              include: {
                options: { orderBy: { displayOrder: "asc" } },
                blanks: { orderBy: { blankIndex: "asc" } },
                parts: { select: { partId: true }, orderBy: { displayOrder: "asc" } },
                acceptedAnswers: { orderBy: { displayOrder: "asc" } },
                explanation: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new AppError(404, "NOT_FOUND", `Unit ${unitNumber} not found`);
    }

    const flattenedQuestions = unit.exercises.flatMap((ex) =>
      ex.questions.map((q) => ({
        questionId: q.questionId,
        questionContent: q.questionContent,
        isExample: q.isExample,
        correctAnswerText: q.correctAnswerText,
        acceptedAnswers: q.acceptedAnswers,
        options: q.options,
        blanks: q.blanks,
        parts: q.parts,
        explanation: q.explanation,
        exercise: {
          exerciseId: ex.exerciseId,
          questionType: ex.questionType,
          instruction: ex.instruction,
        },
      }))
    );

    const generated = await generateToeicQuestionsForUnit({
      unitNumber: unit.unitNumber,
      title: unit.title,
      theorySections: unit.theorySections,
      textbookExamples: unit.textbookExamples,
      unitQuestions: flattenedQuestions,
      count,
      difficulty: difficulty as DifficultyLevel,
    });

    const createdSession = await prisma.toeicPracticeSession.create({
      data: {
        userId,
        unitNumber: unit.unitNumber,
        difficulty,
        source: generated.source,
        requestedCount: count,
        actualCount: generated.questions.length,
        items: {
          create: generated.questions.map((q, idx) => ({
            itemOrder: idx + 1,
            source: q.source,
            prompt: q.prompt,
            options: q.options as any,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            ruleReference: q.ruleReference,
          })),
        },
      },
      include: {
        items: {
          orderBy: { itemOrder: "asc" },
        },
      },
    });

    // Anti-spoiler: NEVER expose correctAnswer or explanation before user submission
    sendSuccess(res, {
      sessionId: createdSession.id,
      unitNumber: unit.unitNumber,
      title: unit.title,
      difficulty,
      source: createdSession.source,
      isOfficialToeic: generated.isOfficialToeic,
      sourceNotice: generated.sourceNotice,
      requestedCount: count,
      actualCount: createdSession.items.length,
      questions: createdSession.items.map((item, idx) => ({
        itemId: item.id,
        itemOrder: item.itemOrder,
        source: item.source,
        difficulty,
        prompt: item.prompt,
        options: item.options,
        ruleReference: generated.questions[idx]?.ruleReference || item.ruleReference,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/adaptive/toeic-practice/check
 * Grades a single persisted TOEIC practice item server-side and updates DB state.
 */
export async function checkToeicPracticeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const parsed = checkToeicPracticeSchema.parse(req.body);
    const rawAnswer = (parsed.studentAnswer ?? parsed.answer ?? "").trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(rawAnswer)) {
      throw AppError.badRequest(
        "studentAnswer must be one of 'A', 'B', 'C', or 'D'.",
        "VALIDATION_ERROR"
      );
    }

    const session = await prisma.toeicPracticeSession.findUnique({
      where: { id: parsed.sessionId },
      include: {
        items: {
          where: { id: parsed.itemId },
          take: 1,
        },
      },
    });

    if (!session) {
      throw AppError.notFound(
        `TOEIC practice session '${parsed.sessionId}' not found`,
        "NOT_FOUND"
      );
    }

    if (session.userId !== userId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have permission to submit answers to this practice session."
      );
    }

    const item = session.items[0];
    if (!item) {
      throw AppError.notFound(
        `TOEIC practice item '${parsed.itemId}' not found in session`,
        "NOT_FOUND"
      );
    }

    const dedupeKey = parsed.submissionId
      ? `toeic-check:${userId}:${item.id}:sub:${parsed.submissionId}`
      : `toeic-check:${userId}:${item.id}:${rawAnswer}`;

    const graded = await runDeduplicatedSubmission(dedupeKey, async () => {
      const isCorrect = rawAnswer === item.correctAnswer.trim().toUpperCase();
      const updated = await prisma.toeicPracticeItem.update({
        where: { id: item.id },
        data: {
          studentAnswer: rawAnswer,
          isCorrect,
          answeredAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

      return {
        sessionId: session.id,
        itemId: item.id,
        isCorrect: updated.isCorrect ?? isCorrect,
        studentAnswer: rawAnswer,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        ruleReference: item.ruleReference,
        attemptCount: updated.attemptCount,
      };
    });

    sendSuccess(res, graded);
  } catch (error) {
    next(error);
  }
}

// ─── Workstream B: Adaptive Quiz Generation & Server-Graded Check ─────────────

export const generateQuizSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  targetUnitNumbers: z
    .array(z.coerce.number().int().min(1).max(145))
    .max(145, "targetUnitNumbers cannot exceed 145 units")
    .optional(),
});

export const checkAdaptiveQuizSchema = z.object({
  sessionId: z.string().trim().min(1).max(120).optional(),
  questionId: z.string().trim().min(1).max(50),
  submissionId: z.string().trim().min(1).max(120).optional(),
  studentAnswer: z
    .union([
      z.string().max(1000),
      z.array(z.string().max(1000)).max(20),
      z.record(z.string().max(50), z.string().max(1000)),
    ])
    .optional(),
  answer: z
    .union([
      z.string().max(1000),
      z.array(z.string().max(1000)).max(20),
      z.record(z.string().max(50), z.string().max(1000)),
    ])
    .optional(),
});

function formatAdaptiveQuestionPayload(q: any, difficulty: DifficultyLevel) {
  const safeBase = formatQuestion(q, false);
  return {
    ...safeBase,
    unitNumber: q.exercise.unit.unitNumber,
    unitTitle: q.exercise.unit.title,
    exerciseId: q.exercise.id,
    canonicalExerciseId: q.exercise.exerciseId,
    exerciseNumber: q.exercise.exerciseNumber,
    questionType: q.exercise.questionType,
    instruction: q.exercise.instruction,
    prompt: safeBase.questionContent,
    wordBankItems: (q.exercise.wordBankItems || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      displayOrder: w.displayOrder,
    })),
    ruleReference: q.explanation?.ruleReference || `${q.exercise.unit.unitNumber}A`,
    difficulty,
  };
}

/**
 * POST /api/v1/adaptive/quiz/generate
 * Uses latest-attempt unresolved mistakes (resolved mistakes are excluded),
 * returns complete structural question payloads WITHOUT answers/explanations,
 * and persists the adaptive session in PostgreSQL.
 */
export async function generateAdaptiveQuizHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { questionCount, difficulty, targetUnitNumbers } = generateQuizSchema.parse(
      req.body
    );

    // 1. Query ONLY latest unresolved mistakes for this user
    const unresolvedMistakes = await getLatestUnresolvedMistakes(
      userId,
      targetUnitNumbers
    );

    // Aggregate unresolved mistakes by unit
    const unitMistakeMap = new Map<
      number,
      { unitNumber: number; title: string; count: number }
    >();

    for (const m of unresolvedMistakes) {
      const existing = unitMistakeMap.get(m.unitNumber) || {
        unitNumber: m.unitNumber,
        title: m.unitTitle,
        count: 0,
      };
      existing.count += 1;
      unitMistakeMap.set(m.unitNumber, existing);
    }

    const weakUnits = Array.from(unitMistakeMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const seenUuids = new Set<string>();
    const questions: any[] = [];

    // Format unresolved mistake records directly (already non-spoiler)
    for (const m of unresolvedMistakes) {
      if (questions.length >= questionCount) break;
      if (!seenUuids.has(m.questionUuid)) {
        seenUuids.add(m.questionUuid);
        questions.push({
          id: m.questionUuid,
          questionId: m.questionId,
          questionContent: m.questionContent,
          isExample: m.isExample,
          hasVisualContext: m.hasVisualContext,
          visualContextDescription: m.visualContextDescription,
          contextClue: m.contextClue,
          displayOrder: m.displayOrder,
          options: m.options,
          blanks: m.blanks,
          parts: m.parts,
          unitNumber: m.unitNumber,
          unitTitle: m.unitTitle,
          exerciseId: m.exerciseId,
          canonicalExerciseId: m.exerciseId,
          exerciseNumber: m.exerciseNumber,
          questionType: m.questionType,
          instruction: m.instruction,
          prompt: m.questionContent,
          wordBankItems: m.wordBankItems,
          ruleReference: m.ruleReference || `${m.unitNumber}A`,
          difficulty,
        });
      }
    }

    // 2. Top up from weak units (or requested units) using canonical interactive questions
    if (questions.length < questionCount) {
      const queryUnitFilter =
        targetUnitNumbers && targetUnitNumbers.length > 0
          ? { unitNumber: { in: targetUnitNumbers } }
          : weakUnits.length > 0
          ? { unitNumber: { in: weakUnits.map((u) => u.unitNumber) } }
          : null;

      if (queryUnitFilter) {
        const additional = await prisma.question.findMany({
          where: {
            exercise: { unit: queryUnitFilter },
            id: { notIn: Array.from(seenUuids) },
            isExample: false,
          },
          include: {
            options: { orderBy: { displayOrder: "asc" } },
            blanks: { orderBy: { blankIndex: "asc" } },
            parts: { orderBy: { displayOrder: "asc" } },
            explanation: { select: { ruleReference: true } },
            exercise: {
              include: {
                unit: { select: { id: true, unitNumber: true, title: true } },
                wordBankItems: { orderBy: { displayOrder: "asc" } },
              },
            },
          },
          take: questionCount - questions.length,
        });

        for (const q of additional) {
          if (!seenUuids.has(q.id)) {
            seenUuids.add(q.id);
            questions.push(formatAdaptiveQuestionPayload(q, difficulty));
          }
        }
      }
    }

    // 3. Foundational diagnostic fallback when user has no unresolved mistakes yet
    let targetUnits = weakUnits.map((u) => ({
      unitNumber: u.unitNumber,
      title: u.title,
      errorCount: u.count,
    }));

    if (questions.length < questionCount) {
      const fallbackTargetUnitNumbers =
        targetUnitNumbers && targetUnitNumbers.length > 0
          ? targetUnitNumbers
          : [1, 2, 3];

      const foundationalUnits = await prisma.unit.findMany({
        where: { unitNumber: { in: fallbackTargetUnitNumbers } },
        select: { id: true, unitNumber: true, title: true },
        orderBy: { unitNumber: "asc" },
      });

      const needed = questionCount - questions.length;
      const diagQuestions = await prisma.question.findMany({
        where: {
          exercise: { unitId: { in: foundationalUnits.map((u) => u.id) } },
          id: { notIn: Array.from(seenUuids) },
          isExample: false,
        },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
          blanks: { orderBy: { blankIndex: "asc" } },
          parts: { orderBy: { displayOrder: "asc" } },
          explanation: { select: { ruleReference: true } },
          exercise: {
            include: {
              unit: { select: { id: true, unitNumber: true, title: true } },
              wordBankItems: { orderBy: { displayOrder: "asc" } },
            },
          },
        },
        take: needed,
      });

      for (const q of diagQuestions) {
        if (!seenUuids.has(q.id)) {
          seenUuids.add(q.id);
          questions.push(formatAdaptiveQuestionPayload(q, difficulty));
        }
      }

      if (targetUnits.length === 0) {
        targetUnits = foundationalUnits.map((u) => ({
          unitNumber: u.unitNumber,
          title: u.title,
          errorCount: 0,
        }));
      }
    }

    const dbSession = await prisma.adaptiveQuizSession.create({
      data: {
        userId,
        difficulty,
        questionIds: questions.map((q) => q.questionId),
        targetUnits: targetUnits as any,
      },
    });

    const sessionId = `quiz_${dbSession.id}`;

    sendSuccess(res, {
      sessionId,
      difficulty,
      targetUnits,
      totalQuestions: questions.length,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/adaptive/quiz/check
 * Grades an Adaptive Quiz question canonically on the server, verifies session ownership,
 * persists a QuestionAttemptItem row (resolving mistakes naturally without wiping history),
 * and guards against duplicate submissions.
 */
export async function checkAdaptiveQuizHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const parsed = checkAdaptiveQuizSchema.parse(req.body);
    const rawAnswer =
      parsed.studentAnswer !== undefined ? parsed.studentAnswer : parsed.answer;

    if (isEmptyStudentAnswer(rawAnswer)) {
      throw AppError.badRequest(
        "Please provide a non-empty answer before checking.",
        "VALIDATION_ERROR"
      );
    }

    if (parsed.sessionId) {
      const normalizedUuid = parsed.sessionId.startsWith("quiz_")
        ? parsed.sessionId.slice(5)
        : parsed.sessionId;

      if (!UUID_REGEX.test(normalizedUuid)) {
        throw AppError.badRequest("Invalid adaptive quiz sessionId", "VALIDATION_ERROR");
      }

      const session = await prisma.adaptiveQuizSession.findUnique({
        where: { id: normalizedUuid },
      });

      if (!session) {
        throw AppError.notFound(
          `Adaptive quiz session '${parsed.sessionId}' not found`,
          "NOT_FOUND"
        );
      }

      if (session.userId !== userId) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to submit answers to this adaptive quiz session."
        );
      }

      const allowedIds = Array.isArray(session.questionIds)
        ? (session.questionIds as string[])
        : [];
      if (!allowedIds.includes(parsed.questionId)) {
        throw AppError.badRequest(
          `Question '${parsed.questionId}' does not belong to adaptive quiz session '${parsed.sessionId}'.`,
          "VALIDATION_ERROR"
        );
      }
    }

    const question = await prisma.question.findFirst({
      where: { questionId: parsed.questionId },
      include: {
        exercise: {
          select: { unitId: true },
        },
        options: { orderBy: { displayOrder: "asc" } },
        blanks: {
          orderBy: { blankIndex: "asc" },
          include: {
            acceptedAnswers: { orderBy: { displayOrder: "asc" } },
          },
        },
        parts: {
          orderBy: { displayOrder: "asc" },
          include: {
            acceptedAnswers: { orderBy: { displayOrder: "asc" } },
          },
        },
        acceptedAnswers: { orderBy: { displayOrder: "asc" } },
        explanation: true,
      },
    });

    if (!question) {
      throw AppError.notFound(
        `Question '${parsed.questionId}' not found`,
        "NOT_FOUND"
      );
    }

    const evaluation = evaluateQuestion(question, rawAnswer);

    const dedupeKey = parsed.submissionId
      ? `adaptive-check:${userId}:${parsed.sessionId || "none"}:${question.id}:sub:${parsed.submissionId}`
      : `adaptive-check:${userId}:${parsed.sessionId || "none"}:${question.id}:${stableSerialize(rawAnswer)}`;

    const attemptItemId = await runDeduplicatedSubmission(dedupeKey, async () => {
      const created = await prisma.questionAttemptItem.create({
        data: {
          attemptId: null,
          userId,
          questionId: question.id,
          studentAnswer: (evaluation.studentAnswer !== undefined
            ? evaluation.studentAnswer
            : null) as any,
          isCorrect: evaluation.isCorrect,
          createdAt: new Date(),
        },
      });
      return created.id;
    });

    sendSuccess(res, {
      sessionId: parsed.sessionId || null,
      questionId: question.questionId,
      isCorrect: evaluation.isCorrect,
      studentAnswer: evaluation.studentAnswer,
      correctAnswers: evaluation.correctAnswers,
      expectedAnswers: evaluation.expectedAnswers,
      explanation: evaluation.explanation,
      ruleReference: evaluation.ruleReference,
      questionAttemptId: attemptItemId,
    });
  } catch (error) {
    next(error);
  }
}
