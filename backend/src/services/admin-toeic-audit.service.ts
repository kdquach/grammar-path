import prisma from "../lib/prisma";
import {
  evaluatePairwiseDiversity,
  clusterQuestionsIntoIndependentContexts,
  QuestionForDiversityAnalysis,
  ContextClusterResult,
} from "./contextual-diversity.service";

export interface AuditWarning {
  warningCode:
    | "WARN_TEMPLATE_DUPLICATE"
    | "WARN_LOW_DIVERSITY"
    | "WARN_DEFECTIVE_KEY"
    | "WARN_LOW_CONFIDENCE_MAPPING"
    | "WARN_WITHDRAWN_ATTEMPTS";
  severity: "CRITICAL" | "WARNING" | "INFO";
  itemAId?: string;
  itemBId?: string;
  unitNumber?: number;
  conceptId?: string;
  conceptCode?: string;
  messageVi: string;
  messageEn: string;
  metrics?: {
    sNorm?: number;
    sSlot?: number;
    sSem?: number;
    dCtx?: number;
    relationship?: string;
  };
}

export interface ConceptContextInventoryReport {
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  unitNumber: number;
  approvedQuestionCount: number;
  independentContextCount: number; // K_ctx
  isEvidenceSufficient: boolean;    // K_ctx >= 3
  status: "insufficient_contexts" | "sufficient" | "no_approved_items";
  clusters: Array<{
    clusterId: string;
    domain: string;
    itemCount: number;
    samplePrompt: string;
    itemIds: string[];
  }>;
}

export interface CompleteDiversityAuditReport {
  timestamp: string;
  summary: {
    totalItemsAudited: number;
    approvedLatestItemsCount: number;
    validatedItemsCount: number;
    withdrawnItemsCount: number;
    archivedItemsCount: number;
    templateDuplicatePairsCount: number;
    conceptsWithSufficientEvidenceCount: number;
    totalConceptsAudited: number;
  };
  warnings: AuditWarning[];
  conceptInventories: ConceptContextInventoryReport[];
}

export class AdminToeicAuditService {
  /**
   * Generates a comprehensive contextual diversity, answer key, and evidence sufficiency audit.
   */
  static async generateCompleteAuditReport(): Promise<CompleteDiversityAuditReport> {
    // 1. Fetch all items with options and concept links
    const [allItems, allConcepts] = await Promise.all([
      prisma.toeicQuestionBankItem.findMany({
        include: {
          options: { orderBy: { displayOrder: "asc" } },
          concept: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ unitNumber: "asc" }, { createdAt: "asc" }],
      }),
      prisma.grammarConcept.findMany({
        where: { code: { startsWith: "unit." } },
        select: { id: true, code: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const warnings: AuditWarning[] = [];
    const approvedLatestItems = allItems.filter((i) => i.reviewStatus === "approved" && i.isLatestApproved);
    const validatedItems = allItems.filter((i) => i.reviewStatus === "validated");
    const withdrawnItems = allItems.filter((i) => i.reviewStatus === "withdrawn");
    const archivedItems = allItems.filter((i) => i.reviewStatus === "archived");

    // 2. Check for defective answer keys across all non-withdrawn items
    for (const item of allItems) {
      if (item.reviewStatus === "withdrawn") continue;
      const correctOpts = item.options.filter((o) => o.isCorrect);
      if (correctOpts.length !== 1) {
        warnings.push({
          warningCode: "WARN_DEFECTIVE_KEY",
          severity: "CRITICAL",
          itemAId: item.id,
          unitNumber: item.unitNumber ?? undefined,
          conceptId: item.conceptId ?? undefined,
          messageVi: `Câu hỏi ${item.id} có ${correctOpts.length} đáp án đúng (yêu cầu đúng 1).`,
          messageEn: `Question ${item.id} has ${correctOpts.length} correct options (expected exactly 1).`,
        });
      }

      // Check for low confidence mapping on approved items
      if (item.reviewStatus === "approved" && (item.conceptMappingConfidence === null || item.conceptMappingConfidence < 0.85)) {
        warnings.push({
          warningCode: "WARN_LOW_CONFIDENCE_MAPPING",
          severity: "WARNING",
          itemAId: item.id,
          unitNumber: item.unitNumber ?? undefined,
          conceptId: item.conceptId ?? undefined,
          messageVi: `Câu hỏi ${item.id} đã duyệt nhưng độ tin cậy mapping thấp (${item.conceptMappingConfidence ?? 0} < 0.85).`,
          messageEn: `Approved question ${item.id} has low mapping confidence (${item.conceptMappingConfidence ?? 0} < 0.85).`,
        });
      }
    }

    // 3. Pairwise diversity & template duplication check among approved items
    let templateDuplicatePairsCount = 0;
    for (let i = 0; i < approvedLatestItems.length; i++) {
      for (let j = i + 1; j < approvedLatestItems.length; j++) {
        const itemA = approvedLatestItems[i];
        const itemB = approvedLatestItems[j];

        const metrics = evaluatePairwiseDiversity(
          {
            id: itemA.id,
            prompt: itemA.prompt,
            options: itemA.options,
            unitNumber: itemA.unitNumber,
            conceptId: itemA.conceptId,
            primarySkill: itemA.primarySkill,
            ruleReference: itemA.ruleReference,
          },
          {
            id: itemB.id,
            prompt: itemB.prompt,
            options: itemB.options,
            unitNumber: itemB.unitNumber,
            conceptId: itemB.conceptId,
            primarySkill: itemB.primarySkill,
            ruleReference: itemB.ruleReference,
          }
        );

        if (metrics.sNorm >= 0.85) {
          templateDuplicatePairsCount++;
          warnings.push({
            warningCode: "WARN_TEMPLATE_DUPLICATE",
            severity: "CRITICAL",
            itemAId: itemA.id,
            itemBId: itemB.id,
            unitNumber: itemA.unitNumber ?? undefined,
            conceptId: itemA.conceptId ?? undefined,
            messageVi: `Hai câu hỏi ${itemA.id} và ${itemB.id} dùng chung mẫu câu (độ tương đồng template: ${(metrics.sNorm * 100).toFixed(1)}%).`,
            messageEn: `Questions ${itemA.id} and ${itemB.id} share identical/near-identical sentence template (${(metrics.sNorm * 100).toFixed(1)}% template similarity).`,
            metrics: {
              sNorm: metrics.sNorm,
              sSlot: metrics.sSlot,
              sSem: metrics.sSem,
              dCtx: metrics.dCtx,
              relationship: metrics.relationship,
            },
          });
        }
      }
    }

    // 4. Build concept-level contextual inventory
    const conceptInventories: ConceptContextInventoryReport[] = [];
    let conceptsWithSufficientEvidenceCount = 0;

    for (const concept of allConcepts) {
      const unitNum = parseInt(concept.code.replace("unit.", ""), 10);
      const conceptApprovedItems = approvedLatestItems.filter(
        (i) => i.conceptId === concept.id || (!i.conceptId && i.unitNumber === unitNum)
      );

      const itemsForClustering: QuestionForDiversityAnalysis[] = conceptApprovedItems.map((i) => ({
        id: i.id,
        prompt: i.prompt,
        options: i.options,
        unitNumber: i.unitNumber,
        conceptId: i.conceptId,
        primarySkill: i.primarySkill,
        ruleReference: i.ruleReference,
      }));

      const clusters = clusterQuestionsIntoIndependentContexts(itemsForClustering);
      const kCtx = clusters.length;
      const isSufficient = kCtx >= 3 && conceptApprovedItems.length >= 3;

      if (isSufficient) {
        conceptsWithSufficientEvidenceCount++;
      } else if (conceptApprovedItems.length > 0) {
        warnings.push({
          warningCode: "WARN_LOW_DIVERSITY",
          severity: "WARNING",
          unitNumber: unitNum,
          conceptId: concept.id,
          conceptCode: concept.code,
          messageVi: `Chủ điểm ${concept.code} có ${conceptApprovedItems.length} câu đã duyệt nhưng chỉ có ${kCtx} ngữ cảnh độc lập (cần tối thiểu 3).`,
          messageEn: `Concept ${concept.code} has ${conceptApprovedItems.length} approved items but only ${kCtx} independent contexts (minimum 3 required).`,
        });
      }

      conceptInventories.push({
        conceptId: concept.id,
        conceptCode: concept.code,
        conceptName: concept.name,
        unitNumber: unitNum,
        approvedQuestionCount: conceptApprovedItems.length,
        independentContextCount: kCtx,
        isEvidenceSufficient: isSufficient,
        status:
          conceptApprovedItems.length === 0
            ? "no_approved_items"
            : isSufficient
            ? "sufficient"
            : "insufficient_contexts",
        clusters: clusters.map((c) => ({
          clusterId: c.clusterId,
          domain: c.domain,
          itemCount: c.items.length,
          samplePrompt: c.items[0]?.prompt ?? "",
          itemIds: c.items.map((it) => it.id),
        })),
      });
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalItemsAudited: allItems.length,
        approvedLatestItemsCount: approvedLatestItems.length,
        validatedItemsCount: validatedItems.length,
        withdrawnItemsCount: withdrawnItems.length,
        archivedItemsCount: archivedItems.length,
        templateDuplicatePairsCount,
        conceptsWithSufficientEvidenceCount,
        totalConceptsAudited: allConcepts.length,
      },
      warnings,
      conceptInventories,
    };
  }
}
