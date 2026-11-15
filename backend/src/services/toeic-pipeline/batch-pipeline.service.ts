import { z } from "zod";
import { generateGeminiTextDetailed, GeminiUsageMetadata } from "../../lib/gemini";
import { SpendingController } from "./spending-controller";
import {
  QuestionBlueprint,
  RawGeneratedQuestion,
  RawGeneratedQuestionSchema,
  CANONICAL_UNIT3_RULES,
  UNIT_4_STATIVE_VERB_BLACKLIST,
} from "./canonical-pipeline.service";

// ============================================================================
// BATCH SCHEMAS & TYPES
// ============================================================================

export const BatchGeneratedItemSchema = RawGeneratedQuestionSchema.extend({
  blueprintId: z.string().min(1),
});

export type BatchGeneratedItem = z.infer<typeof BatchGeneratedItemSchema>;

export const BatchGeneratedResponseSchema = z.object({
  items: z.array(BatchGeneratedItemSchema).min(1),
});

export type BatchGeneratedResponse = z.infer<typeof BatchGeneratedResponseSchema>;

export const BatchCriticItemEvaluationSchema = z.object({
  blueprintId: z.string().min(1),
  solvedKey: z.enum(["A", "B", "C", "D"]),
  confidence: z.number().min(0).max(1),
  singleDefensibleKey: z.boolean(),
  naturalnessScore: z.number().min(1).max(5),
  grammarCorrectness: z.boolean(),
  distractorQuality: z.enum(["high", "medium", "low"]),
  curriculumAlignment: z.boolean(),
  explanationConsistency: z.boolean(),
  rejectionReasons: z.array(z.string()),
});

export type BatchCriticItemEvaluation = z.infer<typeof BatchCriticItemEvaluationSchema>;

export const BatchCriticResponseSchema = z.object({
  evaluations: z.array(BatchCriticItemEvaluationSchema).min(1),
});

export type BatchCriticResponse = z.infer<typeof BatchCriticResponseSchema>;

export interface BatchGenerationResult {
  success: boolean;
  successfulItems: Map<string, RawGeneratedQuestion>;
  failedItems: Map<string, string>;
  rawResponseText?: string;
  usageMetadata?: GeminiUsageMetadata;
  tokensSpent?: number;
  costUsd?: number;
  error?: string;
}

export interface BatchCriticResult {
  success: boolean;
  passedItems: Map<string, BatchCriticItemEvaluation>;
  rejectedItems: Map<string, { reason: string; evaluation?: BatchCriticItemEvaluation }>;
  rawResponseText?: string;
  usageMetadata?: GeminiUsageMetadata;
  tokensSpent?: number;
  costUsd?: number;
  error?: string;
}

export class BatchToeicPipelineService {
  private readonly spendingController: SpendingController;
  private readonly generationModel: string;
  private readonly criticModel: string;

  constructor(options: {
    spendingController: SpendingController;
    generationModel?: string;
    criticModel?: string;
  }) {
    this.spendingController = options.spendingController;
    this.generationModel = options.generationModel || "gemini-3-flash-preview";
    this.criticModel = options.criticModel || "gemini-3-flash-preview";
  }

  // ============================================================================
  // BATCH 1 & BATCH 2 GENERATION
  // ============================================================================

  public async generateBatchQuestions(
    blueprints: QuestionBlueprint[],
    mockedRawResponse?: string
  ): Promise<BatchGenerationResult> {
    if (blueprints.length === 0) {
      return {
        success: true,
        successfulItems: new Map(),
        failedItems: new Map(),
      };
    }

    // 1. Spending Guard Pre-Call Reservation
    const estimatedInputTokens = blueprints.length * 500;
    const maxOutputTokens = Math.min(6000, blueprints.length * 1500);
    const reservation = this.spendingController.reservePreCallBudget(
      this.generationModel,
      estimatedInputTokens,
      maxOutputTokens
    );

    if (!reservation.allowed) {
      return {
        success: false,
        successfulItems: new Map(),
        failedItems: new Map(),
        error: `Budget Circuit Breaker Aborted Batch Generation: ${reservation.reason}`,
      };
    }

    // 2. Handle Mock Mode (deterministic tests)
    if (mockedRawResponse) {
      const mockUsage: GeminiUsageMetadata = {
        promptTokenCount: estimatedInputTokens,
        candidatesTokenCount: blueprints.length * 400,
        totalTokenCount: estimatedInputTokens + blueprints.length * 400,
        thinkingTokenCount: 0,
      };
      const record = this.spendingController.recordActualUsage(
        this.generationModel,
        mockUsage,
        "generation",
        reservation.projectedCost
      );
      return this.parseAndValidateBatchResponse(blueprints, mockedRawResponse, mockUsage, record.callCost);
    }

    // 3. Live Batch Prompt Construction
    const blueprintDescriptions = blueprints.map((bp, idx) => {
      const rule = CANONICAL_UNIT3_RULES[bp.sectionId];
      return `ITEM ${idx + 1}:
- blueprintId: "${bp.blueprintId}"
- Unit Number: ${bp.unitNumber} (Section ${bp.sectionId}: ${rule.ruleTitle})
- Objective: ${bp.objective}
- Difficulty: ${bp.difficulty}
- Workplace Domain: ${bp.workplaceDomain}
- Target Verb: "${bp.targetVerb}"
- Carrier Template Skeleton: "${bp.carrierTemplate}"
- Clue Anchor: "${bp.clueAnchor}"
- Correct Option Key: "${bp.correctOptionKey}"
- Distractor Archetypes:
${bp.distractorArchetypes.map((d) => `  * (${d.key}) ${d.archetype}: ${d.rationale}`).join("\n")}`;
    }).join("\n\n");

    const batchPrompt = `You are a certified ETS TOEIC Part 5 Item Writer.
Generate exactly ${blueprints.length} distinct, professional corporate TOEIC Part 5 incomplete sentence items corresponding to the blueprints specified below.

BLUEPRINTS TO GENERATE:
${blueprintDescriptions}

MANDATORY CONSTRAINTS:
1. Each item must correspond to its specified blueprintId.
2. The carrier sentence must contain exactly one blank: '_______' (7 underscores).
3. The correct answer must strictly match the designated Correct Option Key for that blueprint.
4. Target testing verb must be strictly respected.
5. Absolutely ZERO stative verbs from Unit 4 (${Array.from(UNIT_4_STATIVE_VERB_BLACKLIST).slice(0, 10).join(", ")}, etc.).
6. Absolutely ZERO informal complaint idioms ('always complaining', 'always losing').
7. Provide exactly 4 distinct options (A, B, C, D) with full rationales for every item.
8. Provide thorough English and Vietnamese pedagogical explanations for every item.
9. Return strictly valid JSON with an "items" array conforming to the JSON schema below.

JSON SCHEMA:
{
  "items": [
    {
      "blueprintId": "string",
      "prompt": "string with _______",
      "options": [
        {"key": "A", "text": "...", "isCorrect": boolean, "distractorRationale": "..."},
        {"key": "B", "text": "...", "isCorrect": boolean, "distractorRationale": "..."},
        {"key": "C", "text": "...", "isCorrect": boolean, "distractorRationale": "..."},
        {"key": "D", "text": "...", "isCorrect": boolean, "distractorRationale": "..."}
      ],
      "explanationEn": "string",
      "explanationVi": "string",
      "clueAnchor": "string",
      "targetVerb": "string"
    }
  ]
}`;

    // Pacing safety delay to respect 5 RPM Free Tier limit in non-test mode
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      await new Promise((resolve) => setTimeout(resolve, 14000));
    }

    const result = await generateGeminiTextDetailed({
      prompt: batchPrompt,
      model: this.generationModel,
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens,
      timeoutMs: 45000,
    });

    if (!result.ok) {
      this.spendingController.releaseReservation(reservation.projectedCost);
      const fail = result as { ok: false; status?: number; errorMessage?: string; reason?: string };
      return {
        success: false,
        successfulItems: new Map(),
        failedItems: new Map(),
        error: `Batch Generation Upstream Failure: [${fail.status || 500}] ${fail.errorMessage || fail.reason}`,
      };
    }

    const record = this.spendingController.recordActualUsage(
      this.generationModel,
      result.usageMetadata,
      "generation",
      reservation.projectedCost
    );

    return this.parseAndValidateBatchResponse(blueprints, result.text, result.usageMetadata, record.callCost);
  }

  // ============================================================================
  // BATCH PARSING & PARTIAL RESILIENCE
  // ============================================================================

  public parseAndValidateBatchResponse(
    blueprints: QuestionBlueprint[],
    rawJsonText: string,
    usageMetadata?: GeminiUsageMetadata,
    costUsd?: number
  ): BatchGenerationResult {
    const successfulItems = new Map<string, RawGeneratedQuestion>();
    const failedItems = new Map<string, string>();

    // 1. Clean markdown code fences
    const cleaned = rawJsonText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr: any) {
      return {
        success: false,
        successfulItems,
        failedItems: new Map(blueprints.map((b) => [b.blueprintId, `JSON Parse Error: ${parseErr.message}`])),
        rawResponseText: rawJsonText,
        usageMetadata,
        costUsd,
        error: `Malformed JSON in batch response: ${parseErr.message}`,
      };
    }

    if (!parsed || !Array.isArray(parsed.items)) {
      return {
        success: false,
        successfulItems,
        failedItems: new Map(blueprints.map((b) => [b.blueprintId, "Response missing 'items' array"])),
        rawResponseText: rawJsonText,
        usageMetadata,
        costUsd,
        error: "Batch response missing required 'items' array",
      };
    }

    // 2. Validate each blueprint independently (partial batch resilience)
    for (const bp of blueprints) {
      const itemCandidate = parsed.items.find((i: any) => i.blueprintId === bp.blueprintId);
      if (!itemCandidate) {
        failedItems.set(bp.blueprintId, `Missing blueprint item in generated array`);
        continue;
      }

      // Validate against RawGeneratedQuestionSchema
      const zodValidation = RawGeneratedQuestionSchema.safeParse(itemCandidate);
      if (!zodValidation.success) {
        failedItems.set(bp.blueprintId, `Schema error: ${zodValidation.error.errors.map((e) => e.message).join(", ")}`);
        continue;
      }

      const item = zodValidation.data;

      // Verify blank formatting: exactly 1 blank with _______
      const blanks = item.prompt.match(/_______/g);
      if (!blanks || blanks.length !== 1) {
        failedItems.set(bp.blueprintId, `Blank formatting error: expected exactly 1 '_______', found ${blanks ? blanks.length : 0}`);
        continue;
      }

      // Verify answer key: exactly 1 correct option matching blueprint.correctOptionKey
      const correctOpts = item.options.filter((o) => o.isCorrect);
      if (correctOpts.length !== 1) {
        failedItems.set(bp.blueprintId, `Answer key error: expected 1 correct option, found ${correctOpts.length}`);
        continue;
      }

      if (correctOpts[0].key !== bp.correctOptionKey) {
        failedItems.set(bp.blueprintId, `Key mismatch: expected (${bp.correctOptionKey}), generated (${correctOpts[0].key})`);
        continue;
      }

      // Verify target verb
      if (item.targetVerb.toLowerCase() !== bp.targetVerb.toLowerCase()) {
        failedItems.set(bp.blueprintId, `Target verb mismatch: expected '${bp.targetVerb}', got '${item.targetVerb}'`);
        continue;
      }

      // Verify no stative verbs in options
      let hasStative = false;
      for (const opt of item.options) {
        const words = opt.text.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (UNIT_4_STATIVE_VERB_BLACKLIST.has(w)) {
            hasStative = true;
            break;
          }
        }
      }
      if (hasStative) {
        failedItems.set(bp.blueprintId, `Stative verb contamination from Unit 4 blacklist`);
        continue;
      }

      successfulItems.set(bp.blueprintId, item);
    }

    return {
      success: successfulItems.size > 0,
      successfulItems,
      failedItems,
      rawResponseText: rawJsonText,
      usageMetadata,
      tokensSpent: usageMetadata?.totalTokenCount,
      costUsd,
    };
  }

  // ============================================================================
  // BATCH BLIND CRITIC EVALUATION
  // ============================================================================

  public async evaluateBatchBlindCritic(
    items: Array<{
      blueprintId: string;
      rawItem: RawGeneratedQuestion;
      sectionId: "3A" | "3B";
      expectedKey: "A" | "B" | "C" | "D";
    }>,
    mockedCriticResponse?: string
  ): Promise<BatchCriticResult> {
    if (items.length === 0) {
      return {
        success: true,
        passedItems: new Map(),
        rejectedItems: new Map(),
      };
    }

    // Spending Guard
    const estimatedInputTokens = items.length * 600;
    const maxOutputTokens = Math.min(6000, items.length * 800);
    const reservation = this.spendingController.reservePreCallBudget(
      this.criticModel,
      estimatedInputTokens,
      maxOutputTokens
    );

    if (!reservation.allowed) {
      return {
        success: false,
        passedItems: new Map(),
        rejectedItems: new Map(),
        error: `Budget Circuit Breaker Aborted Batch Critic: ${reservation.reason}`,
      };
    }

    if (mockedCriticResponse) {
      const mockUsage: GeminiUsageMetadata = {
        promptTokenCount: estimatedInputTokens,
        candidatesTokenCount: items.length * 300,
        totalTokenCount: estimatedInputTokens + items.length * 300,
        thinkingTokenCount: 0,
      };
      const record = this.spendingController.recordActualUsage(
        this.criticModel,
        mockUsage,
        "critic",
        reservation.projectedCost
      );
      return this.parseAndEvaluateBatchCritic(items, mockedCriticResponse, mockUsage, record.callCost);
    }

    // Format Blind Critic Items (STRICTLY UNLABELED, NO EXPLANATIONS, NO ISCORRECT)
    const blindItemsText = items.map((i, idx) => {
      const abstractObjective = i.sectionId === "3A"
        ? "Assess contrast between routine habit (simple present) vs. action in progress around now (present continuous)."
        : "Assess contrast between permanent situation vs. temporary situation in progress for a limited time.";

      const unlabeledOptions = i.rawItem.options.map((o) => `(${o.key}) ${o.text}`).join("\n");

      return `QUESTION ${idx + 1} [ID: ${i.blueprintId}]:
Abstract Pedagogical Objective: ${abstractObjective}
Stem: ${i.rawItem.prompt}
Options:
${unlabeledOptions}`;
    }).join("\n\n");

    const batchCriticPrompt = `You are an independent assessment psychometrician evaluating TOEIC Part 5 incomplete sentence items.
You will evaluate exactly ${items.length} items blindly.

STANDARDS OF EVALUATION:
1. Standard English grammar rules: Present continuous (be + -ing) is used for temporary situations or actions happening at/around now. Simple present is used for permanent facts, general truths, and regular routines. Non-finite verbs cannot serve as finite predicates.
2. Determine the single correct answer letter (A, B, C, or D).
3. Evaluate whether ANY distractor is also grammatically or pragmatically defensible in context.
4. Score naturalness in ETS corporate communications (1.0 to 5.0).
5. Verify grammar correctness and curriculum alignment.

QUESTIONS TO EVALUATE:
${blindItemsText}

Return strictly valid JSON with an "evaluations" array conforming to the schema below.

JSON SCHEMA:
{
  "evaluations": [
    {
      "blueprintId": "string",
      "solvedKey": "A" | "B" | "C" | "D",
      "confidence": number,
      "singleDefensibleKey": boolean,
      "naturalnessScore": number,
      "grammarCorrectness": boolean,
      "distractorQuality": "high" | "medium" | "low",
      "curriculumAlignment": boolean,
      "explanationConsistency": boolean,
      "rejectionReasons": ["string"]
    }
  ]
}`;

    // Pacing safety delay to respect 5 RPM Free Tier limit in non-test mode
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      await new Promise((resolve) => setTimeout(resolve, 14000));
    }

    const result = await generateGeminiTextDetailed({
      prompt: batchCriticPrompt,
      model: this.criticModel,
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens,
      timeoutMs: 45000,
    });

    if (!result.ok) {
      this.spendingController.releaseReservation(reservation.projectedCost);
      const fail = result as { ok: false; status?: number; errorMessage?: string; reason?: string };
      return {
        success: false,
        passedItems: new Map(),
        rejectedItems: new Map(),
        error: `Batch Critic Upstream Failure: [${fail.status || 500}] ${fail.errorMessage || fail.reason}`,
      };
    }

    const record = this.spendingController.recordActualUsage(
      this.criticModel,
      result.usageMetadata,
      "critic",
      reservation.projectedCost
    );

    return this.parseAndEvaluateBatchCritic(items, result.text, result.usageMetadata, record.callCost);
  }

  // ============================================================================
  // BATCH CRITIC PARSING & EVALUATION
  // ============================================================================

  public parseAndEvaluateBatchCritic(
    items: Array<{
      blueprintId: string;
      rawItem: RawGeneratedQuestion;
      expectedKey: "A" | "B" | "C" | "D";
    }>,
    rawJsonText: string,
    usageMetadata?: GeminiUsageMetadata,
    costUsd?: number
  ): BatchCriticResult {
    const passedItems = new Map<string, BatchCriticItemEvaluation>();
    const rejectedItems = new Map<string, { reason: string; evaluation?: BatchCriticItemEvaluation }>();

    const cleaned = rawJsonText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr: any) {
      return {
        success: false,
        passedItems,
        rejectedItems: new Map(items.map((i) => [i.blueprintId, { reason: `Critic JSON Parse Error: ${parseErr.message}` }])),
        rawResponseText: rawJsonText,
        usageMetadata,
        costUsd,
        error: `Malformed JSON in critic response: ${parseErr.message}`,
      };
    }

    if (!parsed || !Array.isArray(parsed.evaluations)) {
      return {
        success: false,
        passedItems,
        rejectedItems: new Map(items.map((i) => [i.blueprintId, { reason: "Critic response missing 'evaluations' array" }])),
        rawResponseText: rawJsonText,
        usageMetadata,
        costUsd,
        error: "Batch critic response missing required 'evaluations' array",
      };
    }

    for (const item of items) {
      const evalCandidate = parsed.evaluations.find((e: any) => e.blueprintId === item.blueprintId);
      if (!evalCandidate) {
        rejectedItems.set(item.blueprintId, { reason: "Missing evaluation in critic array" });
        continue;
      }

      const zodValidation = BatchCriticItemEvaluationSchema.safeParse(evalCandidate);
      if (!zodValidation.success) {
        rejectedItems.set(item.blueprintId, {
          reason: `Critic schema error: ${zodValidation.error.errors.map((e) => e.message).join(", ")}`,
        });
        continue;
      }

      const evaluation = zodValidation.data;

      // Deterministic Quality Gates:
      // 1. Answer Key Agreement
      if (evaluation.solvedKey !== item.expectedKey) {
        rejectedItems.set(item.blueprintId, {
          reason: `Answer-key disagreement: Generator designated (${item.expectedKey}), but blind critic solved as (${evaluation.solvedKey})`,
          evaluation,
        });
        continue;
      }

      // 2. Single Defensible Key
      if (!evaluation.singleDefensibleKey) {
        rejectedItems.set(item.blueprintId, {
          reason: `Dual defensible keys detected: Critic flagged multiple valid answers in context`,
          evaluation,
        });
        continue;
      }

      // 3. Naturalness Score >= 4.0
      if (evaluation.naturalnessScore < 4.0) {
        rejectedItems.set(item.blueprintId, {
          reason: `Unnatural ETS register: Naturalness score ${evaluation.naturalnessScore}/5.0 is below 4.0 threshold`,
          evaluation,
        });
        continue;
      }

      // 4. Grammar Correctness
      if (!evaluation.grammarCorrectness) {
        rejectedItems.set(item.blueprintId, {
          reason: `Grammar flaw detected by critic`,
          evaluation,
        });
        continue;
      }

      // 5. Curriculum Alignment
      if (!evaluation.curriculumAlignment) {
        rejectedItems.set(item.blueprintId, {
          reason: `Curriculum misalignment detected by critic`,
          evaluation,
        });
        continue;
      }

      passedItems.set(item.blueprintId, evaluation);
    }

    return {
      success: passedItems.size > 0,
      passedItems,
      rejectedItems,
      rawResponseText: rawJsonText,
      usageMetadata,
      tokensSpent: usageMetadata?.totalTokenCount,
      costUsd,
    };
  }
}

