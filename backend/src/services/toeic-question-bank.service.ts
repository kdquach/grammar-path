import prisma from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import {
  validateToeicQuestionQuality,
  CandidateToeicItemInput,
  QualityValidationReport,
} from "./toeic-quality-engine.service";
import { computeToeicItemContentHash } from "../../scripts/import-legacy-toeic";
import { DifficultyLevel } from "./toeic-generator.service";

export interface ReviewQueueFilters {
  status?: "draft" | "validated" | "approved" | "rejected" | "archived" | "withdrawn";
  unitNumber?: number;
  difficulty?: DifficultyLevel;
  primarySkill?: string;
  limit?: number;
  offset?: number;
}

export class ToeicQuestionBankService {
  /**
   * Retrieves items in the editorial review queue with filtering and pagination.
   */
  static async getReviewQueue(filters: ReviewQueueFilters = {}) {
    const {
      status = "validated",
      unitNumber,
      difficulty,
      primarySkill,
      limit = 20,
      offset = 0,
    } = filters;

    const where: any = {
      reviewStatus: status,
    };

    if (unitNumber !== undefined) where.unitNumber = unitNumber;
    if (difficulty !== undefined) where.difficulty = difficulty;
    if (primarySkill !== undefined) where.primarySkill = primarySkill;

    const [total, items] = await Promise.all([
      prisma.toeicQuestionBankItem.count({ where }),
      prisma.toeicQuestionBankItem.findMany({
        where,
        orderBy: [{ unitNumber: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
        include: {
          options: { orderBy: { displayOrder: "asc" } },
          concept: { select: { id: true, code: true, name: true } },
          generationRun: {
            select: { id: true, provider: true, modelName: true, promptVersion: true },
          },
        },
      }),
    ]);

    return {
      total,
      limit,
      offset,
      status,
      items: items.map((item) => ({
        id: item.id,
        rootQuestionId: item.rootQuestionId,
        version: item.version,
        isLatestApproved: item.isLatestApproved,
        unitNumber: item.unitNumber,
        difficulty: item.difficulty,
        primarySkill: item.primarySkill,
        prompt: item.prompt,
        explanation: item.explanation,
        ruleReference: item.ruleReference,
        reviewStatus: item.reviewStatus,
        qualityScore: item.qualityScore,
        validationScores: item.validationScores,
        source: item.source,
        concept: item.concept,
        generationRun: item.generationRun,
        options: item.options.map((o) => ({
          id: o.id,
          optionKey: o.optionKey,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          rationale: o.rationale,
        })),
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        reviewedBy: item.reviewedBy,
        reviewNotes: item.reviewNotes,
        withdrawnReason: item.withdrawnReason,
      })),
    };
  }

  /**
   * Retrieves a single question bank item by ID with full details.
   */
  static async getQuestionById(id: string) {
    const item = await prisma.toeicQuestionBankItem.findUnique({
      where: { id },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
        concept: { select: { id: true, code: true, name: true, category: true } },
        generationRun: true,
      },
    });

    if (!item) {
      throw AppError.notFound(`TOEIC question bank item '${id}' not found`);
    }

    return item;
  }

  /**
   * Approves a validated question, making it the latest approved version for learner practice.
   * Atomic: archives any older version with the same rootQuestionId.
   */
  static async approveQuestion(params: {
    adminUserId: string;
    itemId: string;
    notes?: string;
  }) {
    const { adminUserId, itemId, notes } = params;

    const item = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: itemId },
      include: { options: true },
    });

    if (!item) {
      throw AppError.notFound(`TOEIC question bank item '${itemId}' not found`);
    }

    if (item.reviewStatus === "approved" && item.isLatestApproved) {
      throw AppError.badRequest("Question is already approved and active");
    }

    if (item.reviewStatus === "withdrawn") {
      throw AppError.badRequest(
        "A withdrawn question cannot be directly approved. Create a new version first."
      );
    }

    // Quality sanity check: verify single correct key
    const correctOptions = item.options.filter((o) => o.isCorrect);
    if (correctOptions.length !== 1) {
      throw AppError.badRequest(
        `Cannot approve question: exactly 1 correct option required (found ${correctOptions.length}).`
      );
    }

    // Atomic promotion transaction
    return prisma.$transaction(async (tx) => {
      // 1. Archive previously approved versions for this root question
      await tx.toeicQuestionBankItem.updateMany({
        where: {
          rootQuestionId: item.rootQuestionId,
          isLatestApproved: true,
          id: { not: item.id },
        },
        data: {
          isLatestApproved: false,
          reviewStatus: "archived",
          updatedAt: new Date(),
        },
      });

      // 2. Set this item as approved and latest
      const updated = await tx.toeicQuestionBankItem.update({
        where: { id: item.id },
        data: {
          reviewStatus: "approved",
          isLatestApproved: true,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          reviewNotes: notes || item.reviewNotes || "Approved by editorial reviewer",
          updatedAt: new Date(),
        },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
        },
      });

      return updated;
    });
  }

  /**
   * Rejects a question that failed editorial review.
   */
  static async rejectQuestion(params: {
    adminUserId: string;
    itemId: string;
    defectCode?: string;
    notes: string;
  }) {
    const { adminUserId, itemId, defectCode, notes } = params;

    const item = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw AppError.notFound(`TOEIC question bank item '${itemId}' not found`);
    }

    if (item.reviewStatus === "approved") {
      throw AppError.badRequest(
        "Cannot reject an already-approved question directly. Use emergency withdrawal or versioning."
      );
    }

    const reviewNotes = defectCode ? `[${defectCode}] ${notes}` : notes;

    const updated = await prisma.toeicQuestionBankItem.update({
      where: { id: itemId },
      data: {
        reviewStatus: "rejected",
        isLatestApproved: false,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
    });

    return updated;
  }

  /**
   * Emergency withdrawal protocol: immediately quarantines a defective question from learner practice.
   */
  static async emergencyWithdrawQuestion(params: {
    adminUserId: string;
    itemId: string;
    reason: string;
  }) {
    const { adminUserId, itemId, reason } = params;

    const item = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw AppError.notFound(`TOEIC question bank item '${itemId}' not found`);
    }

    const updated = await prisma.toeicQuestionBankItem.update({
      where: { id: itemId },
      data: {
        reviewStatus: "withdrawn",
        isLatestApproved: false,
        withdrawnReason: reason,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
    });

    return updated;
  }

  /**
   * Creates an updated version (version N+1) of a question, preserving the original.
   */
  static async createNewVersion(params: {
    adminUserId: string;
    sourceItemId: string;
    updates: {
      prompt?: string;
      options?: Array<{ optionKey: string; optionText: string; isCorrect: boolean; rationale?: string }>;
      explanation?: string;
      difficulty?: DifficultyLevel;
      ruleReference?: string;
    };
  }) {
    const { adminUserId, sourceItemId, updates } = params;

    const source = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: sourceItemId },
      include: { options: { orderBy: { displayOrder: "asc" } } },
    });

    if (!source) {
      throw AppError.notFound(`Source question '${sourceItemId}' not found`);
    }

    // Determine highest existing version for this root question
    const maxVersionItem = await prisma.toeicQuestionBankItem.findFirst({
      where: { rootQuestionId: source.rootQuestionId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (maxVersionItem?.version ?? source.version) + 1;

    const newPrompt = updates.prompt ?? source.prompt;
    const newExplanation = updates.explanation ?? source.explanation;
    const newDifficulty = updates.difficulty ?? source.difficulty;
    const newRuleRef = updates.ruleReference ?? source.ruleReference;

    const newOptions =
      updates.options ??
      source.options.map((o) => ({
        optionKey: o.optionKey,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        rationale: o.rationale ?? undefined,
      }));

    const contentHash = computeToeicItemContentHash(
      newPrompt,
      newOptions.map((o) => ({ key: o.optionKey, text: o.optionText }))
    );

    // Validate quality of updated version
    const validation = await validateToeicQuestionQuality({
      prompt: newPrompt,
      options: newOptions,
      explanation: newExplanation,
      unitNumber: source.unitNumber ?? undefined,
      difficulty: newDifficulty as any,
    });

    const created = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: source.rootQuestionId,
        version: nextVersion,
        isLatestApproved: false, // Invariant: new versions start unapproved
        part: source.part,
        format: source.format,
        prompt: newPrompt,
        explanation: newExplanation,
        difficulty: newDifficulty,
        primarySkill: source.primarySkill,
        subSkill: source.subSkill,
        unitNumber: source.unitNumber,
        ruleReference: newRuleRef,
        conceptId: source.conceptId,
        conceptMappingConfidence: source.conceptMappingConfidence,
        conceptMappingSource: source.conceptMappingSource,
        reviewStatus: validation.canQualifyForValidatedStatus ? "validated" : "draft",
        qualityScore: validation.overallScore,
        validationScores: validation.rubricScores as any,
        source: source.source,
        sourceReference: `Revision of v${source.version} (root: ${source.rootQuestionId})`,
        contentHash,
        reviewedBy: adminUserId,
        reviewNotes: `Version ${nextVersion} authored by ${adminUserId}`,
        options: {
          create: newOptions.map((o, idx) => ({
            optionKey: o.optionKey,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            rationale: o.rationale,
            displayOrder: idx,
          })),
        },
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
    });

    return created;
  }

  /**
   * Retrieves active, approved questions for a unit and difficulty tier.
   * INVARIANT: Only items with reviewStatus = 'approved' AND isLatestApproved = true are returned.
   */
  static async getApprovedQuestionsForPractice(params: {
    unitNumber: number;
    difficulty: DifficultyLevel;
    count?: number;
  }) {
    const { unitNumber, difficulty, count = 5 } = params;

    const items = await prisma.toeicQuestionBankItem.findMany({
      where: {
        unitNumber,
        difficulty,
        reviewStatus: "approved",
        isLatestApproved: true,
      },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
      take: count,
    });

    return items;
  }
}

