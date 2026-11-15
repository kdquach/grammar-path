import { z } from "zod";
import { generateGeminiTextDetailed, GeminiUsageMetadata } from "../../lib/gemini";
import { SpendingController } from "./spending-controller";
import {
  evaluatePairwiseDiversity,
  QuestionForDiversityAnalysis,
} from "../contextual-diversity.service";

// ============================================================================
// CANONICAL CURRICULUM CATALOG (UNIT 3 RULES & STATIVE BLACKLIST)
// ============================================================================

export const UNIT_4_STATIVE_VERB_BLACKLIST = new Set([
  // Mental / Perception
  "know", "believe", "understand", "recognize", "remember", "suppose", "mean", "realize",
  // Preference / Emotion
  "want", "need", "prefer", "like", "love", "hate",
  // Possession / Relation
  "belong", "contain", "consist", "depend", "fit", "suit", "matter", "seem", "resemble",
]);

export interface CurriculumRule {
  unitNumber: number;
  sectionId: string;
  ruleTitle: string;
  rules: string[];
}

export const CANONICAL_UNIT3_RULES: Record<string, CurriculumRule> = {
  "3A": {
    unitNumber: 3,
    sectionId: "3A",
    ruleTitle: "Present continuous vs. Present simple (General vs. Now)",
    rules: [
      "We use the continuous for things happening at or around the time of speaking.",
      "We use the simple for things in general or all the time.",
    ],
  },
  "3B": {
    unitNumber: 3,
    sectionId: "3B",
    ruleTitle: "Permanent vs. Temporary situations",
    rules: [
      "We use the continuous for temporary situations (things that continue for a short time).",
      "We use the simple for permanent situations (things that continue for a long time).",
    ],
  },
};

// ============================================================================
// STAGE CONTRACTS & SCHEMAS
// ============================================================================

export type DifficultyTier = "easy" | "medium" | "hard";

export interface QuestionBlueprint {
  blueprintId: string;
  unitNumber: number;
  sectionId: "3A" | "3B";
  objective: string;
  difficulty: DifficultyTier;
  workplaceDomain: string;
  targetVerb: string;
  carrierTemplate: string;
  clueAnchor: string;
  correctOptionKey: "A" | "B" | "C" | "D";
  distractorArchetypes: Array<{
    key: "A" | "B" | "C" | "D";
    archetype: string;
    rationale: string;
  }>;
}

export const RawGeneratedQuestionSchema = z.object({
  prompt: z.string().min(10),
  options: z.array(
    z.object({
      key: z.enum(["A", "B", "C", "D"]),
      text: z.string().min(1),
      isCorrect: z.boolean(),
      distractorRationale: z.string().optional(),
    })
  ).length(4),
  explanationEn: z.string().min(30),
  explanationVi: z.string().min(30),
  clueAnchor: z.string().min(2),
  targetVerb: z.string().min(2),
});

export type RawGeneratedQuestion = z.infer<typeof RawGeneratedQuestionSchema>;

export interface StageExecutionResult<T> {
  stageNumber: number;
  stageName: string;
  category: "A" | "B" | "C";
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  tokensSpent?: number;
  costUsd?: number;
}

export interface BlindCriticInput {
  prompt: string;
  options: Array<{ key: "A" | "B" | "C" | "D"; text: string }>;
}

export interface BlindCriticResult {
  solvedKey: "A" | "B" | "C" | "D";
  confidence: number;
  naturalnessScore: number; // 1 to 5
  singleDefensibleKey: boolean;
  notes: string;
}

export interface PipelineItemResult {
  blueprintId: string;
  unitNumber: number;
  status: "draft" | "validated" | "rejected";
  itemData?: RawGeneratedQuestion;
  stageResults: Array<StageExecutionResult<unknown>>;
  spending: {
    promptTokens: number;
    candidateTokens: number;
    thinkingTokens: number;
    totalCostUsd: number;
  };
}

// ============================================================================
// CANONICAL 15-STAGE PIPELINE SERVICE
// ============================================================================

export class CanonicalToeicPipelineService {
  private readonly spendingController: SpendingController;
  private readonly generationModel: string;
  private readonly criticModel: string;

  constructor(options: {
    spendingController: SpendingController;
    generationModel?: string;
    criticModel?: string;
  }) {
    this.spendingController = options.spendingController;
    this.generationModel = options.generationModel || "gemini-2.5-pro";
    this.criticModel = options.criticModel || "gemini-2.5-flash";
  }

  // --------------------------------------------------------------------------
  // STAGE 1 (Category A): Curriculum Rule Extraction
  // --------------------------------------------------------------------------
  public stage1RuleExtraction(unitNumber: number, sectionId: string): StageExecutionResult<CurriculumRule> {
    if (unitNumber === 3 && CANONICAL_UNIT3_RULES[sectionId]) {
      return {
        stageNumber: 1,
        stageName: "Curriculum Rule Extraction",
        category: "A",
        success: true,
        data: CANONICAL_UNIT3_RULES[sectionId],
      };
    }
    return {
      stageNumber: 1,
      stageName: "Curriculum Rule Extraction",
      category: "A",
      success: false,
      error: `Rule not found for Unit ${unitNumber} Section ${sectionId}`,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 2 (Category A): Learning Objective Definition
  // --------------------------------------------------------------------------
  public stage2LearningObjective(rule: CurriculumRule): StageExecutionResult<string> {
    const objective =
      rule.sectionId === "3A"
        ? "Distinguish routine habitual actions (simple present) from actions happening at or around the present moment (present continuous) using explicit temporal anchors."
        : "Distinguish permanent workplace operations (simple present) from temporary situations/assignments (present continuous).";

    return {
      stageNumber: 2,
      stageName: "Learning Objective Definition",
      category: "A",
      success: true,
      data: objective,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 3 (Category A): Question Blueprint Creation
  // --------------------------------------------------------------------------
  public stage3BlueprintCreation(blueprint: QuestionBlueprint): StageExecutionResult<QuestionBlueprint> {
    // Validate that target verb is not in the stative verb blacklist
    const normalizedVerb = blueprint.targetVerb.toLowerCase().trim();
    if (UNIT_4_STATIVE_VERB_BLACKLIST.has(normalizedVerb)) {
      return {
        stageNumber: 3,
        stageName: "Question Blueprint Creation",
        category: "A",
        success: false,
        error: `Target verb '${blueprint.targetVerb}' violates Unit 4 stative verb boundary!`,
      };
    }

    return {
      stageNumber: 3,
      stageName: "Question Blueprint Creation",
      category: "A",
      success: true,
      data: blueprint,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 4 (Category A): Prompt Construction & Negative Constraints
  // --------------------------------------------------------------------------
  public stage4PromptAssembly(blueprint: QuestionBlueprint, rule: CurriculumRule): StageExecutionResult<string> {
    const prompt = `You are a certified ETS TOEIC Part 5 Item Writer.
Generate one professional corporate TOEIC Part 5 sentence completion item testing:
Unit ${rule.unitNumber} (${rule.ruleTitle})
Pedagogical Objective: ${blueprint.objective}
Target Workplace Domain: ${blueprint.workplaceDomain}
Target Verb: ${blueprint.targetVerb}
Difficulty Tier: ${blueprint.difficulty}

CARRIER SENTENCE SKELETON:
${blueprint.carrierTemplate}

REQUIRED MANDATORY CONSTRAINTS:
1. The carrier sentence must contain exactly one blank: '_______' (7 underscores).
2. The correct option must be key '${blueprint.correctOptionKey}'.
3. Target testing verb must be '${blueprint.targetVerb}'.
4. Absolutely ZERO stative verbs from Unit 4 (know, understand, believe, want, need, belong, etc.).
5. Absolutely ZERO informal complaint idioms ('always complaining', 'always losing').
6. Provide exactly 4 options (A, B, C, D) with distinct text.
7. Return strictly valid JSON conforming to the schema below.

JSON SCHEMA:
{
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
  "targetVerb": "${blueprint.targetVerb}"
}`;

    return {
      stageNumber: 4,
      stageName: "Prompt Construction & Constraints",
      category: "A",
      success: true,
      data: prompt,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 5 (Category B): Primary AI Generation
  // --------------------------------------------------------------------------
  public async stage5AiGeneration(
    assembledPrompt: string,
    mockedResponse?: string
  ): Promise<StageExecutionResult<{ rawJsonText: string; usage?: GeminiUsageMetadata }>> {
    // 1. Spending Guard: Pre-Call Reservation
    const estimatedInputTokens = 1500;
    const maxOutputTokens = 3000;
    const reservation = this.spendingController.reservePreCallBudget(
      this.generationModel,
      estimatedInputTokens,
      maxOutputTokens
    );

    if (!reservation.allowed) {
      return {
        stageNumber: 5,
        stageName: "Primary AI Generation",
        category: "B",
        success: false,
        error: `Budget Circuit Breaker Aborted: ${reservation.reason}`,
      };
    }

    // 2. Mock mode for deterministic testing without external API calls
    if (mockedResponse) {
      const mockUsage: GeminiUsageMetadata = {
        promptTokenCount: 1450,
        candidatesTokenCount: 420,
        totalTokenCount: 1870,
        thinkingTokenCount: 0,
      };
      const record = this.spendingController.recordActualUsage(
        this.generationModel,
        mockUsage,
        "generation",
        reservation.projectedCost
      );
      return {
        stageNumber: 5,
        stageName: "Primary AI Generation",
        category: "B",
        success: true,
        data: { rawJsonText: mockedResponse, usage: mockUsage },
        tokensSpent: mockUsage.totalTokenCount,
        costUsd: record.callCost,
      };
    }

    // 3. Live API Execution
    // Pacing safety delay to respect 5 RPM Free Tier limit (>= 14s between Stage 5 and Stage 13)
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      await new Promise((resolve) => setTimeout(resolve, 14000));
    }

    const result = await generateGeminiTextDetailed({
      prompt: assembledPrompt,
      model: this.generationModel,
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens,
    });

    if (!result.ok) {
      this.spendingController.releaseReservation(reservation.projectedCost);
      const fail = result as { ok: false; status?: number; errorMessage?: string; reason?: string };
      return {
        stageNumber: 5,
        stageName: "Primary AI Generation",
        category: "B",
        success: false,
        error: `Gemini Upstream Failure: [${fail.status || 500}] ${fail.errorMessage || fail.reason}`,
      };
    }

    const record = this.spendingController.recordActualUsage(
      this.generationModel,
      result.usageMetadata,
      "generation",
      reservation.projectedCost
    );

    return {
      stageNumber: 5,
      stageName: "Primary AI Generation",
      category: "B",
      success: true,
      data: { rawJsonText: result.text, usage: result.usageMetadata },
      tokensSpent: result.usageMetadata?.totalTokenCount || 0,
      costUsd: record.callCost,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 6 (Category A): Schema & JSON Validation
  // --------------------------------------------------------------------------
  public stage6SchemaValidation(rawJsonText: string): StageExecutionResult<RawGeneratedQuestion> {
    try {
      const cleaned = rawJsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const validated = RawGeneratedQuestionSchema.parse(parsed);

      // Blank check: exactly one _______
      const blankMatches = validated.prompt.match(/_______/g);
      if (!blankMatches || blankMatches.length !== 1) {
        return {
          stageNumber: 6,
          stageName: "Schema & JSON Validation",
          category: "A",
          success: false,
          error: "Prompt must contain exactly one blank consisting of 7 underscores ('_______').",
        };
      }

      return {
        stageNumber: 6,
        stageName: "Schema & JSON Validation",
        category: "A",
        success: true,
        data: validated,
      };
    } catch (err: any) {
      return {
        stageNumber: 6,
        stageName: "Schema & JSON Validation",
        category: "A",
        success: false,
        error: `JSON / Zod Validation Failed: ${err.message}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // STAGE 7 (Category A): Answer-Key Verification
  // --------------------------------------------------------------------------
  public stage7AnswerKeyVerification(item: RawGeneratedQuestion): StageExecutionResult<void> {
    const correctOptions = item.options.filter((o) => o.isCorrect);
    if (correctOptions.length !== 1) {
      return {
        stageNumber: 7,
        stageName: "Answer-Key Verification",
        category: "A",
        success: false,
        error: `Expected exactly 1 correct option, but found ${correctOptions.length}.`,
      };
    }

    // Uniqueness of option text
    const texts = item.options.map((o) => o.text.trim().toLowerCase());
    const uniqueTexts = new Set(texts);
    if (uniqueTexts.size !== 4) {
      return {
        stageNumber: 7,
        stageName: "Answer-Key Verification",
        category: "A",
        success: false,
        error: "Option texts must be mutually distinct (duplicates detected).",
      };
    }

    return {
      stageNumber: 7,
      stageName: "Answer-Key Verification",
      category: "A",
      success: true,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 8 (Category A): Distractor Diagnostic Analysis
  // --------------------------------------------------------------------------
  public stage8DistractorAnalysis(item: RawGeneratedQuestion): StageExecutionResult<void> {
    const distractors = item.options.filter((o) => !o.isCorrect);
    for (const d of distractors) {
      if (!d.text || d.text.trim().length === 0) {
        return {
          stageNumber: 8,
          stageName: "Distractor Diagnostic Analysis",
          category: "A",
          success: false,
          error: `Distractor option ${d.key} is empty.`,
        };
      }
    }
    return {
      stageNumber: 8,
      stageName: "Distractor Diagnostic Analysis",
      category: "A",
      success: true,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 9 (Category A): Dual-Language Explanation Validation
  // --------------------------------------------------------------------------
  public stage9ExplanationValidation(item: RawGeneratedQuestion): StageExecutionResult<void> {
    const warnings: string[] = [];
    const correctOpt = item.options.find((o) => o.isCorrect)!;

    if (!item.explanationEn.includes(correctOpt.key)) {
      warnings.push(`English explanation does not explicitly cite option (${correctOpt.key}).`);
    }
    if (!item.explanationVi.includes(correctOpt.key)) {
      warnings.push(`Vietnamese explanation does not explicitly cite option (${correctOpt.key}).`);
    }

    if (item.explanationVi.length < 40) {
      warnings.push("Vietnamese explanation is unusually brief (< 40 chars).");
    }

    return {
      stageNumber: 9,
      stageName: "Dual-Language Explanation Validation",
      category: "A",
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 10 (Category A): Concept & Boundary Mapping
  // --------------------------------------------------------------------------
  public stage10BoundaryValidation(
    unitNumber: number,
    item: RawGeneratedQuestion
  ): StageExecutionResult<void> {
    if (unitNumber === 3) {
      const combinedText = `${item.prompt} ${item.options.map((o) => o.text).join(" ")}`.toLowerCase();
      for (const stativeVerb of UNIT_4_STATIVE_VERB_BLACKLIST) {
        const regex = new RegExp(`\\b${stativeVerb}\\b`, "i");
        if (regex.test(combinedText)) {
          return {
            stageNumber: 10,
            stageName: "Concept & Boundary Mapping",
            category: "A",
            success: false,
            error: `Unit 4 stative verb '${stativeVerb}' detected in Unit 3 question! Cross-unit contamination violation.`,
          };
        }
      }
    }

    return {
      stageNumber: 10,
      stageName: "Concept & Boundary Mapping",
      category: "A",
      success: true,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 11 (Category A): Contextual Diversity Evaluation
  // --------------------------------------------------------------------------
  public stage11DiversityEvaluation(
    candidate: RawGeneratedQuestion,
    existingPool: QuestionForDiversityAnalysis[]
  ): StageExecutionResult<{ minDistance: number }> {
    if (existingPool.length === 0) {
      return {
        stageNumber: 11,
        stageName: "Contextual Diversity Evaluation",
        category: "A",
        success: true,
        data: { minDistance: 1.0 },
      };
    }

    const candidateFormatted: QuestionForDiversityAnalysis = {
      id: "candidate-eval",
      prompt: candidate.prompt,
      options: candidate.options.map((o) => ({
        optionKey: o.key,
        optionText: o.text,
        isCorrect: o.isCorrect,
      })),
      unitNumber: 3,
    };

    let minDistance = 1.0;
    for (const existing of existingPool) {
      const evalResult = evaluatePairwiseDiversity(candidateFormatted, existing);
      if (evalResult.dCtx < minDistance) {
        minDistance = evalResult.dCtx;
      }
    }

    if (minDistance < 0.5) {
      return {
        stageNumber: 11,
        stageName: "Contextual Diversity Evaluation",
        category: "A",
        success: false,
        error: `Contextual diversity violation: min distance ${minDistance.toFixed(3)} is below mandatory threshold 0.50.`,
      };
    }

    return {
      stageNumber: 11,
      stageName: "Contextual Diversity Evaluation",
      category: "A",
      success: true,
      data: { minDistance },
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 12 (Category A): Difficulty Calibration & Tagging
  // --------------------------------------------------------------------------
  public stage12DifficultyCalibration(
    item: RawGeneratedQuestion,
    targetTier: DifficultyTier
  ): StageExecutionResult<{ wordCount: number; assignedTier: DifficultyTier }> {
    const words = item.prompt.trim().split(/\s+/).length;
    let computedTier: DifficultyTier = "medium";
    if (words <= 16) {
      computedTier = "easy";
    } else if (words >= 24) {
      computedTier = "hard";
    }

    const warnings: string[] = [];
    if (computedTier !== targetTier) {
      warnings.push(
        `Calculated lexical length (${words} words, tier: ${computedTier}) drifts from blueprint target (${targetTier}).`
      );
    }

    return {
      stageNumber: 12,
      stageName: "Difficulty Calibration & Tagging",
      category: "A",
      success: true,
      data: { wordCount: words, assignedTier: targetTier },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 13 (Category B): Independent Linguistic Critic Review (BLIND SOLVE)
  // --------------------------------------------------------------------------
  public async stage13BlindCritic(
    item: RawGeneratedQuestion,
    mockCriticResponse?: BlindCriticResult
  ): Promise<StageExecutionResult<BlindCriticResult>> {
    const correctOption = item.options.find((o) => o.isCorrect)!;

    // Spending Guard for Critic Call
    const reservation = this.spendingController.reservePreCallBudget(
      this.criticModel,
      1200,
      3000
    );

    if (!reservation.allowed) {
      return {
        stageNumber: 13,
        stageName: "Independent Linguistic Critic Review",
        category: "B",
        success: false,
        error: `Budget Circuit Breaker Aborted Critic Call: ${reservation.reason}`,
      };
    }

    if (mockCriticResponse) {
      const mockUsage: GeminiUsageMetadata = {
        promptTokenCount: 1100,
        candidatesTokenCount: 220,
        totalTokenCount: 1320,
        thinkingTokenCount: 0,
      };
      const record = this.spendingController.recordActualUsage(
        this.criticModel,
        mockUsage,
        "critic",
        reservation.projectedCost
      );

      // Verify blind solve agreement
      if (mockCriticResponse.solvedKey !== correctOption.key) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: `Answer Key Disagreement: Generator designated (${correctOption.key}), but blind critic solved as (${mockCriticResponse.solvedKey}). Item rejected.`,
          data: mockCriticResponse,
          costUsd: record.callCost,
        };
      }

      if (!mockCriticResponse.singleDefensibleKey) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: "Dual Defensible Keys Detected: Critic identified multiple valid options in context. Item rejected.",
          data: mockCriticResponse,
          costUsd: record.callCost,
        };
      }

      if (mockCriticResponse.naturalnessScore < 4.0) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: `Unnatural Register / Collocation: Critic naturalness score ${mockCriticResponse.naturalnessScore}/5.0 is below 4.0 threshold.`,
          data: mockCriticResponse,
          costUsd: record.callCost,
        };
      }

      return {
        stageNumber: 13,
        stageName: "Independent Linguistic Critic Review",
        category: "B",
        success: true,
        data: mockCriticResponse,
        tokensSpent: mockUsage.totalTokenCount,
        costUsd: record.callCost,
      };
    }

    // Live Critic Execution: Send prompt and UNLABELED options
    const unlabeledOptions = item.options.map((o) => ({ key: o.key, text: o.text }));
    const criticPrompt = `You are an independent assessment psychometrician evaluating a TOEIC Part 5 question.
Prompt: ${item.prompt}
Options:
${unlabeledOptions.map((o) => `(${o.key}) ${o.text}`).join("\n")}

TASKS:
1. Independently determine the single correct answer letter (A, B, C, or D).
2. Evaluate whether ANY distractor is also grammatically or pragmatically defensible in context.
3. Score naturalness in ETS corporate communications (1.0 to 5.0).
Return JSON:
{
  "solvedKey": "A" | "B" | "C" | "D",
  "confidence": number,
  "naturalnessScore": number,
  "singleDefensibleKey": boolean,
  "notes": "string"
}`;

    // Pacing safety delay to respect 5 RPM Free Tier limit (>= 14s between Stage 5 and Stage 13)
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      await new Promise((resolve) => setTimeout(resolve, 14000));
    }

    const result = await generateGeminiTextDetailed({
      prompt: criticPrompt,
      model: this.criticModel,
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 3000,
    });

    if (!result.ok) {
      this.spendingController.releaseReservation(reservation.projectedCost);
      const fail = result as { ok: false; status?: number; errorMessage?: string; reason?: string };
      return {
        stageNumber: 13,
        stageName: "Independent Linguistic Critic Review",
        category: "B",
        success: false,
        error: `Critic API Failure: [${fail.status || 500}] ${fail.errorMessage || fail.reason}`,
      };
    }

    const record = this.spendingController.recordActualUsage(
      this.criticModel,
      result.usageMetadata,
      "critic",
      reservation.projectedCost
    );

    try {
      const cleanedCritic = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsedCritic: BlindCriticResult = JSON.parse(cleanedCritic);
      if (parsedCritic.solvedKey !== correctOption.key) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: `Answer Key Disagreement: Generator designated (${correctOption.key}), but blind critic solved as (${parsedCritic.solvedKey}). Item rejected.`,
          data: parsedCritic,
          costUsd: record.callCost,
        };
      }

      if (!parsedCritic.singleDefensibleKey) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: "Dual Defensible Keys Detected: Critic identified multiple valid options in context. Item rejected.",
          data: parsedCritic,
          costUsd: record.callCost,
        };
      }

      if (parsedCritic.naturalnessScore < 4.0) {
        return {
          stageNumber: 13,
          stageName: "Independent Linguistic Critic Review",
          category: "B",
          success: false,
          error: `Unnatural Register / Collocation: Critic naturalness score ${parsedCritic.naturalnessScore}/5.0 is below 4.0 threshold.`,
          data: parsedCritic,
          costUsd: record.callCost,
        };
      }

      return {
        stageNumber: 13,
        stageName: "Independent Linguistic Critic Review",
        category: "B",
        success: true,
        data: parsedCritic,
        tokensSpent: result.usageMetadata?.totalTokenCount || 0,
        costUsd: record.callCost,
      };
    } catch (err: any) {
      return {
        stageNumber: 13,
        stageName: "Independent Linguistic Critic Review",
        category: "B",
        success: false,
        error: `Failed to parse critic JSON: ${err.message}`,
        costUsd: record.callCost,
      };
    }
  }

  // --------------------------------------------------------------------------
  // STAGE 14 (Category C): Human Editorial Approval Gate
  // --------------------------------------------------------------------------
  public stage14EditorialApproval(
    itemStatus: "validated" | "draft" | "rejected",
    reviewerCredentials?: { userId: string; role: "CONTENT_EDITOR" | "SUPER_ADMIN"; decision: "APPROVED" | "REJECTED"; notes: string }
  ): StageExecutionResult<{ status: "approved" | "archived" | "validated" }> {
    if (!reviewerCredentials) {
      // Invariant: Automated pipeline CANNOT approve questions!
      return {
        stageNumber: 14,
        stageName: "Human Editorial Approval Gate",
        category: "C",
        success: true,
        data: { status: itemStatus === "rejected" ? "archived" : "validated" },
        warnings: ["Automated processing halted at Stage 14. Awaiting certified human editorial sign-off."],
      };
    }

    if (reviewerCredentials.decision === "APPROVED") {
      return {
        stageNumber: 14,
        stageName: "Human Editorial Approval Gate",
        category: "C",
        success: true,
        data: { status: "approved" },
      };
    }

    return {
      stageNumber: 14,
      stageName: "Human Editorial Approval Gate",
      category: "C",
      success: false,
      data: { status: "archived" },
      error: `Human Editor Rejected Item: ${reviewerCredentials.notes}`,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 15 (Category A): Immutable Version Publication
  // --------------------------------------------------------------------------
  public stage15Publication(
    stage14Status: "approved" | "archived" | "validated"
  ): StageExecutionResult<{ isPublished: boolean; isLatestApproved: boolean }> {
    if (stage14Status !== "approved") {
      return {
        stageNumber: 15,
        stageName: "Immutable Version Publication",
        category: "A",
        success: false,
        error: "Item cannot be published as latest approved because it lacks Stage 14 human approval.",
      };
    }

    return {
      stageNumber: 15,
      stageName: "Immutable Version Publication",
      category: "A",
      success: true,
      data: { isPublished: true, isLatestApproved: true },
    };
  }

  // --------------------------------------------------------------------------
  // FULL 15-STAGE ORCHESTRATION PIPELINE
  // --------------------------------------------------------------------------
  public async executePipelineItem(
    blueprint: QuestionBlueprint,
    existingPool: QuestionForDiversityAnalysis[],
    mockResponses?: {
      generationMock?: string;
      criticMock?: BlindCriticResult;
    }
  ): Promise<PipelineItemResult> {
    const stageResults: Array<StageExecutionResult<unknown>> = [];

    // Stage 1: Rule Extraction
    const s1 = this.stage1RuleExtraction(blueprint.unitNumber, blueprint.sectionId);
    stageResults.push(s1);
    if (!s1.success || !s1.data) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 2: Objective
    const s2 = this.stage2LearningObjective(s1.data);
    stageResults.push(s2);
    if (!s2.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 3: Blueprint Creation
    const s3 = this.stage3BlueprintCreation(blueprint);
    stageResults.push(s3);
    if (!s3.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 4: Prompt Assembly
    const s4 = this.stage4PromptAssembly(blueprint, s1.data);
    stageResults.push(s4);
    if (!s4.success || !s4.data) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 5: AI Generation
    const s5 = await this.stage5AiGeneration(s4.data, mockResponses?.generationMock);
    stageResults.push(s5);
    if (!s5.success || !s5.data) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 6: Schema Validation
    const s6 = this.stage6SchemaValidation(s5.data.rawJsonText);
    stageResults.push(s6);
    if (!s6.success || !s6.data) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", stageResults, spending: this.getSpendingSnapshot() };
    }
    const itemData = s6.data;

    // Stage 7: Answer-Key Verification
    const s7 = this.stage7AnswerKeyVerification(itemData);
    stageResults.push(s7);
    if (!s7.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", itemData, stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 8: Distractor Diagnostic
    const s8 = this.stage8DistractorAnalysis(itemData);
    stageResults.push(s8);
    if (!s8.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", itemData, stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 9: Explanation Validation
    const s9 = this.stage9ExplanationValidation(itemData);
    stageResults.push(s9);

    // Stage 10: Boundary Validation
    const s10 = this.stage10BoundaryValidation(blueprint.unitNumber, itemData);
    stageResults.push(s10);
    if (!s10.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", itemData, stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 11: Contextual Diversity
    const s11 = this.stage11DiversityEvaluation(itemData, existingPool);
    stageResults.push(s11);
    if (!s11.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", itemData, stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 12: Difficulty Calibration
    const s12 = this.stage12DifficultyCalibration(itemData, blueprint.difficulty);
    stageResults.push(s12);

    // Rate-limit safety: space live calls by 14s to stay under Free Tier 5 RPM limit
    if (!mockResponses?.criticMock && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      await new Promise((resolve) => setTimeout(resolve, 14000));
    }

    // Stage 13: Independent Blind Critic
    const s13 = await this.stage13BlindCritic(itemData, mockResponses?.criticMock);
    stageResults.push(s13);
    if (!s13.success) {
      return { blueprintId: blueprint.blueprintId, unitNumber: blueprint.unitNumber, status: "rejected", itemData, stageResults, spending: this.getSpendingSnapshot() };
    }

    // Stage 14: Human Editorial Gate (Automated flow halts here with 'validated' status)
    const s14 = this.stage14EditorialApproval("validated");
    stageResults.push(s14);

    return {
      blueprintId: blueprint.blueprintId,
      unitNumber: blueprint.unitNumber,
      status: "validated",
      itemData,
      stageResults,
      spending: this.getSpendingSnapshot(),
    };
  }

  private getSpendingSnapshot() {
    const summary = this.spendingController.getSummary();
    return {
      promptTokens: summary.totalInputTokens,
      candidateTokens: summary.totalOutputTokens,
      thinkingTokens: summary.totalThinkingTokens,
      totalCostUsd: summary.cumulativeCostUsd,
    };
  }
}
