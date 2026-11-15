import crypto from "node:crypto";
import prisma from "../lib/prisma";
import { computeToeicItemContentHash } from "../../scripts/import-legacy-toeic";

export type QualityBlockingCode =
  | "BLK_FORMAT"
  | "BLK_WRONG_KEY"
  | "BLK_DISTRACTOR"
  | "BLK_EXPLANATION"
  | "BLK_AMBIGUITY"
  | "BLK_REGISTER"
  | "BLK_DUPLICATE"
  | "BLK_MAPPING";

export interface CandidateToeicOptionInput {
  optionKey: "A" | "B" | "C" | "D" | string;
  optionText: string;
  isCorrect?: boolean;
  rationale?: string;
}

export interface CandidateToeicItemInput {
  prompt: string;
  options: CandidateToeicOptionInput[];
  correctAnswer?: "A" | "B" | "C" | "D" | string;
  explanation: string;
  unitNumber?: number;
  difficulty?: "easy" | "medium" | "hard";
  ruleReference?: string;
  conceptId?: string | null;
  primarySkill?: string;
}

export interface QualityValidationReport {
  isValid: boolean;
  canQualifyForValidatedStatus: boolean;
  overallScore: number; // 0.00 to 10.00
  blockingDefects: Array<{
    code: QualityBlockingCode;
    message: string;
  }>;
  warnings: string[];
  rubricScores: {
    linguisticAccuracy: number; // 0..3.0
    businessRealism: number; // 0..2.5
    distractorValidity: number; // 0..2.5
    pedagogicalExplanation: number; // 0..2.0
  };
  contentHash: string;
}

/**
 * Normalizes text for similarity comparison
 */
function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Calculates Levenshtein-based similarity between two strings (0.0 to 1.0)
 */
export function calculateStringSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeForComparison(s1);
  const norm2 = normalizeForComparison(s2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const track = Array(norm2.length + 1)
    .fill(null)
    .map(() => Array(norm1.length + 1).fill(null));

  for (let i = 0; i <= norm1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= norm2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= norm2.length; j += 1) {
    for (let i = 1; i <= norm1.length; i += 1) {
      const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[norm2.length][norm1.length];
  const maxLen = Math.max(norm1.length, norm2.length);
  return 1 - distance / maxLen;
}

/**
 * Validates a candidate TOEIC question against rigorous ETS Part 5 quality standards.
 */
export async function validateToeicQuestionQuality(
  candidate: CandidateToeicItemInput,
  options: { checkDbDuplicates?: boolean; excludeItemId?: string } = { checkDbDuplicates: true }
): Promise<QualityValidationReport> {
  const blockingDefects: Array<{ code: QualityBlockingCode; message: string }> = [];
  const warnings: string[] = [];

  let linguisticAccuracy = 3.0;
  let businessRealism = 2.5;
  let distractorValidity = 2.5;
  let pedagogicalExplanation = 2.0;

  // 1. Format & Structure Checks (BLK_FORMAT)
  const blankMatches = candidate.prompt.match(/_______+/g) || [];
  if (blankMatches.length === 0) {
    blockingDefects.push({
      code: "BLK_FORMAT",
      message: "Sentence must contain exactly one blank indicated by '_______'.",
    });
    linguisticAccuracy -= 1.0;
  } else if (blankMatches.length > 1) {
    blockingDefects.push({
      code: "BLK_FORMAT",
      message: `Sentence contains multiple blanks (${blankMatches.length}); Part 5 strictly requires exactly 1 blank.`,
    });
    linguisticAccuracy -= 1.0;
  }

  const wordCount = candidate.prompt.trim().split(/\s+/).length;
  if (wordCount < 8 || wordCount > 45) {
    blockingDefects.push({
      code: "BLK_FORMAT",
      message: `Sentence length (${wordCount} words) is outside standard TOEIC Part 5 bounds (8-45 words).`,
    });
  }

  if (!Array.isArray(candidate.options) || candidate.options.length !== 4) {
    blockingDefects.push({
      code: "BLK_FORMAT",
      message: `Question must provide exactly 4 options; provided ${candidate.options?.length ?? 0}.`,
    });
    distractorValidity = 0.0;
  }

  // 2. Answer-Key Integrity (BLK_WRONG_KEY)
  const declaredKey = candidate.correctAnswer?.trim().toUpperCase();
  const correctOptions = candidate.options.filter(
    (o) => o.isCorrect === true || (declaredKey && o.optionKey.trim().toUpperCase() === declaredKey)
  );

  if (correctOptions.length === 0) {
    blockingDefects.push({
      code: "BLK_WRONG_KEY",
      message: "No option is marked as the correct answer.",
    });
    linguisticAccuracy = 0.0;
  } else if (correctOptions.length > 1) {
    blockingDefects.push({
      code: "BLK_AMBIGUITY",
      message: `Multiple options (${correctOptions.map((o) => o.optionKey).join(", ")}) are designated as correct; Part 5 allows exactly one key.`,
    });
    linguisticAccuracy = 0.5;
  }

  // 3. Distractor Quality & Deduplication (BLK_DISTRACTOR)
  const optionTexts = new Set<string>();
  for (const opt of candidate.options) {
    const text = opt.optionText.trim().toLowerCase();
    if (!text) {
      blockingDefects.push({
        code: "BLK_DISTRACTOR",
        message: `Option ${opt.optionKey} contains empty text.`,
      });
      distractorValidity -= 1.0;
      continue;
    }
    if (optionTexts.has(text)) {
      blockingDefects.push({
        code: "BLK_DISTRACTOR",
        message: `Duplicate option text found: '${opt.optionText}'. All 4 options must be distinct.`,
      });
      distractorValidity = 0.5;
    }
    optionTexts.add(text);
  }

  // 4. Vietnamese Explanation Quality (BLK_EXPLANATION)
  if (!candidate.explanation || candidate.explanation.trim().length < 15) {
    blockingDefects.push({
      code: "BLK_EXPLANATION",
      message: "Explanation is missing or too brief (< 15 characters). Must provide pedagogical Vietnamese guidance.",
    });
    pedagogicalExplanation = 0.0;
  } else {
    // Check if explanation references key or rule
    const exp = candidate.explanation.toLowerCase();
    const hasGrammarTerms = [
      "thì",
      "động từ",
      "danh từ",
      "tính từ",
      "trạng từ",
      "chủ ngữ",
      "mệnh đề",
      "tiếp diễn",
      "đơn",
      "hoàn thành",
      "bị động",
      "quy tắc",
      "ngữ pháp",
      "chọn",
      "dấu hiệu",
    ].some((term) => exp.includes(term));
    if (!hasGrammarTerms) {
      warnings.push("Explanation does not explicitly mention standard grammatical terms or clue indicators.");
      pedagogicalExplanation -= 0.5;
    }
  }

  // 5. Business Register Check (BLK_REGISTER)
  const promptLower = candidate.prompt.toLowerCase();
  const businessKeywords = [
    "report",
    "meeting",
    "conference",
    "manager",
    "director",
    "client",
    "contract",
    "department",
    "office",
    "company",
    "quarterly",
    "annual",
    "budget",
    "schedule",
    "project",
    "deliver",
    "customer",
    "service",
    "product",
    "employee",
    "staff",
    "supervisor",
    "board",
    "sales",
    "market",
    "financial",
    "facility",
    "system",
    "hardware",
    "software",
    "proposal",
    "review",
  ];
  const containsBusinessTerm = businessKeywords.some((w) => promptLower.includes(w));
  if (!containsBusinessTerm) {
    warnings.push("Sentence does not contain standard corporate/business vocabulary.");
    businessRealism -= 0.5;
  }

  // 6. Curriculum Mapping Check (BLK_MAPPING)
  if (candidate.unitNumber !== undefined && (candidate.unitNumber < 1 || candidate.unitNumber > 145)) {
    blockingDefects.push({
      code: "BLK_MAPPING",
      message: `Unit number ${candidate.unitNumber} is invalid (must be 1..145).`,
    });
  }

  // 7. Duplicate Content Check (BLK_DUPLICATE)
  const normalizedOptions = candidate.options.map((o) => ({ key: o.optionKey, text: o.optionText }));
  const contentHash = computeToeicItemContentHash(candidate.prompt, normalizedOptions);

  if (options.checkDbDuplicates) {
    const exactMatch = await prisma.toeicQuestionBankItem.findFirst({
      where: {
        contentHash,
        ...(options.excludeItemId ? { id: { not: options.excludeItemId } } : {}),
      },
      select: { id: true, prompt: true, unitNumber: true },
    });

    if (exactMatch) {
      blockingDefects.push({
        code: "BLK_DUPLICATE",
        message: `Exact duplicate content hash exists in Question Bank (Unit ${exactMatch.unitNumber}, ID: ${exactMatch.id}).`,
      });
      linguisticAccuracy = 0.0;
    } else {
      // Soft duplicate check: prompt similarity check within same unit
      if (candidate.unitNumber) {
        const sameUnitItems = await prisma.toeicQuestionBankItem.findMany({
          where: {
            unitNumber: candidate.unitNumber,
            ...(options.excludeItemId ? { id: { not: options.excludeItemId } } : {}),
          },
          select: { id: true, prompt: true },
          take: 50,
        });

        for (const item of sameUnitItems) {
          const sim = calculateStringSimilarity(candidate.prompt, item.prompt);
          if (sim > 0.85) {
            blockingDefects.push({
              code: "BLK_DUPLICATE",
              message: `Near-duplicate prompt detected (${(sim * 100).toFixed(1)}% similarity to item ${item.id}).`,
            });
            break;
          }
        }
      }
    }
  }

  // Calculate overall score (bounded 0.00 to 10.00)
  linguisticAccuracy = Math.max(0, linguisticAccuracy);
  businessRealism = Math.max(0, businessRealism);
  distractorValidity = Math.max(0, distractorValidity);
  pedagogicalExplanation = Math.max(0, pedagogicalExplanation);

  let overallScore = linguisticAccuracy + businessRealism + distractorValidity + pedagogicalExplanation;
  if (blockingDefects.length > 0) {
    overallScore = Math.min(overallScore, 6.0); // Capped if blocking defect present
  }
  overallScore = Math.round(overallScore * 100) / 100;

  const isValid = blockingDefects.length === 0;
  const canQualifyForValidatedStatus = isValid && overallScore >= 8.5;

  return {
    isValid,
    canQualifyForValidatedStatus,
    overallScore,
    blockingDefects,
    warnings,
    rubricScores: {
      linguisticAccuracy,
      businessRealism,
      distractorValidity,
      pedagogicalExplanation,
    },
    contentHash,
  };
}

