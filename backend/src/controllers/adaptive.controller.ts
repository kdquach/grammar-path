import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
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

/**
 * GET /api/v1/adaptive/analytics
 * Analyzes question_attempt_items for the authenticated user to determine weakest units, question types,
 * and granular rule-level (explanations.rule_reference) error analytics joined with theory_sections.
 */
export async function getAdaptiveAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    // Fetch all question attempts submitted by this user including ruleReference
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

    // Aggregate by Unit
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

    // Aggregate by Question Type
    const typeMap = new Map<
      string,
      {
        questionType: string;
        totalAttempts: number;
        errorCount: number;
      }
    >();

    // Aggregate by Rule Reference (Granular Sub-section Error Analytics)
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

      // Group by Unit
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

      // Group by Question Type
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

      // Group by Granular Rule Reference
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

    // Build weakestUnits list: only units with at least 1 error
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

    // Build errorDistribution list
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

    // Build weakRules list (Top 10 weakest theory sub-sections resolved against theory_sections)
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
 * Produces prioritized review suggestions for the user based on error frequency, low accuracy,
 * and identifies targetRules (e.g. ["1B", "1C"]) for each unit.
 */
export async function getAdaptiveRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    // 1. Fetch user attempt items with ruleReference
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

    // 2. Fetch user's learningProgress
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

    // Group attempts by unit
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

    // Prioritize units with mistakes
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

    // If fewer than 3 recommendations, add in-progress units
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

    // If still empty (new user with no attempts), recommend Unit 1
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

// ─── Phase 9.2: TOEIC-Style Practice Generator ────────────────────────────────

export const toeicPracticeSchema = z.object({
  unitNumber: z.coerce
    .number()
    .int()
    .min(1, "unitNumber must be between 1 and 145")
    .max(145, "unitNumber must be between 1 and 145"),
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
});

/**
 * POST /api/v1/adaptive/toeic-practice
 * Generates TOEIC Part 5 multiple choice questions tailored to the requested unit's grammar point
 * and requested difficulty tier ('easy' | 'medium' | 'hard').
 */
export async function generateToeicPracticeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber, count, difficulty } = toeicPracticeSchema.parse(req.body);

    // Fetch the unit along with theory sections and examples
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
          take: 8,
        },
      },
    });

    if (!unit) {
      throw new AppError(404, "NOT_FOUND", `Unit ${unitNumber} not found`);
    }

    // Generate questions using AI or structured difficulty-specific fallback
    const questions = await generateToeicQuestionsForUnit({
      unitNumber: unit.unitNumber,
      title: unit.title,
      theorySections: unit.theorySections,
      textbookExamples: unit.textbookExamples,
      count,
      difficulty: difficulty as DifficultyLevel,
    });

    sendSuccess(res, {
      unitNumber: unit.unitNumber,
      title: unit.title,
      difficulty,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Phase 9.2: Adaptive Quiz Generation Engine ───────────────────────────────

export const generateQuizSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  targetUnitNumbers: z.array(z.coerce.number().int().min(1).max(145)).optional(),
});

/**
 * POST /api/v1/adaptive/quiz/generate
 * Analyzes user mistakes from question_attempt_items and generates a targeted remedial quiz session
 * at the requested difficulty tier ('easy' | 'medium' | 'hard'), with ruleReference on each question.
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

    // Fetch all incorrect question attempts by this user
    const mistakeItems = await prisma.questionAttemptItem.findMany({
      where: {
        userId,
        isCorrect: false,
        ...(targetUnitNumbers && targetUnitNumbers.length > 0
          ? { question: { exercise: { unit: { unitNumber: { in: targetUnitNumbers } } } } }
          : {}),
      },
      include: {
        question: {
          include: {
            options: { orderBy: { displayOrder: "asc" } },
            blanks: { orderBy: { blankIndex: "asc" } },
            explanation: true,
            exercise: {
              include: {
                unit: {
                  select: { id: true, unitNumber: true, title: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group errors by unit to identify weak spots
    const unitMistakeMap = new Map<
      number,
      { unitId: string; unitNumber: number; title: string; count: number }
    >();

    for (const item of mistakeItems) {
      const u = item.question.exercise.unit;
      const existing = unitMistakeMap.get(u.unitNumber) || {
        unitId: u.id,
        unitNumber: u.unitNumber,
        title: u.title,
        count: 0,
      };
      existing.count += 1;
      unitMistakeMap.set(u.unitNumber, existing);
    }

    const weakUnits = Array.from(unitMistakeMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const seenQuestionIds = new Set<string>();
    const questions: any[] = [];

    const formatAdaptiveQuestion = (q: any) => ({
      id: q.id,
      questionId: q.questionId,
      unitNumber: q.exercise.unit.unitNumber,
      unitTitle: q.exercise.unit.title,
      exerciseId: q.exercise.id,
      exerciseNumber: q.exercise.exerciseNumber,
      questionType: q.exercise.questionType,
      instruction: q.exercise.instruction,
      prompt: q.questionContent,
      options:
        q.options?.map((opt: any) => ({
          key: opt.optionKey,
          text: opt.optionText,
        })) || [],
      correctAnswer:
        q.correctAnswerText || (q.blanks?.[0]?.correctAnswerText ?? ""),
      explanation: q.explanation?.aiExplanation || null,
      ruleReference: q.explanation?.ruleReference || `${q.exercise.unit.unitNumber}A`,
      difficulty,
      contextClue: q.contextClue || null,
    });

    // 1. Add questions that the user previously missed
    for (const item of mistakeItems) {
      if (questions.length >= questionCount) break;
      if (!seenQuestionIds.has(item.question.id)) {
        seenQuestionIds.add(item.question.id);
        questions.push(formatAdaptiveQuestion(item.question));
      }
    }

    // 2. If needed, query additional questions from the user's weak units (or requested units)
    if (questions.length < questionCount) {
      const queryUnitFilter =
        targetUnitNumbers && targetUnitNumbers.length > 0
          ? { unitNumber: { in: targetUnitNumbers } }
          : weakUnits.length > 0
          ? { id: { in: weakUnits.map((u) => u.unitId) } }
          : null;

      if (queryUnitFilter) {
        const additional = await prisma.question.findMany({
          where: {
            exercise: { unit: queryUnitFilter },
            id: { notIn: Array.from(seenQuestionIds) },
            isExample: false,
          },
          include: {
            options: { orderBy: { displayOrder: "asc" } },
            blanks: { orderBy: { blankIndex: "asc" } },
            explanation: true,
            exercise: {
              include: {
                unit: { select: { id: true, unitNumber: true, title: true } },
              },
            },
          },
          take: questionCount - questions.length,
        });

        for (const q of additional) {
          if (!seenQuestionIds.has(q.id)) {
            seenQuestionIds.add(q.id);
            questions.push(formatAdaptiveQuestion(q));
          }
        }
      }
    }

    // 3. If still needed (e.g. new user or insufficient questions), add foundational diagnostic questions
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
          id: { notIn: Array.from(seenQuestionIds) },
          isExample: false,
        },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
          blanks: { orderBy: { blankIndex: "asc" } },
          explanation: true,
          exercise: {
            include: {
              unit: { select: { id: true, unitNumber: true, title: true } },
            },
          },
        },
        take: needed,
      });

      for (const q of diagQuestions) {
        if (!seenQuestionIds.has(q.id)) {
          seenQuestionIds.add(q.id);
          questions.push(formatAdaptiveQuestion(q));
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

    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
