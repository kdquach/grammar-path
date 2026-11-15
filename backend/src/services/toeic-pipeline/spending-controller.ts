import { GeminiUsageMetadata } from "../../lib/gemini";

export interface ModelRateCard {
  inputPricePerM: number;
  outputPricePerM: number;
  thinkingPricePerM: number;
}

export const DEFAULT_MODEL_RATES: Record<string, ModelRateCard> = {
  "gemini-2.5-pro": {
    inputPricePerM: 1.25,
    outputPricePerM: 5.0,
    thinkingPricePerM: 5.0,
  },
  "gemini-2.5-flash": {
    inputPricePerM: 0.075,
    outputPricePerM: 0.3,
    thinkingPricePerM: 0.3,
  },
  "gemini-2.5-flash-lite": {
    inputPricePerM: 0.0375,
    outputPricePerM: 0.15,
    thinkingPricePerM: 0.15,
  },
  "gemini-3.1-pro-preview": {
    inputPricePerM: 1.25,
    outputPricePerM: 5.0,
    thinkingPricePerM: 5.0,
  },
  "gemini-3.8-flash": {
    inputPricePerM: 0.075,
    outputPricePerM: 0.3,
    thinkingPricePerM: 0.3,
  },
  "gemini-3-flash-preview": {
    inputPricePerM: 0.075,
    outputPricePerM: 0.3,
    thinkingPricePerM: 0.3,
  },
  "gemini-3-flash": {
    inputPricePerM: 0.075,
    outputPricePerM: 0.3,
    thinkingPricePerM: 0.3,
  },
};

export type PipelineJobType = "unit3_pilot" | "units2_25_expansion" | "custom";

export interface SpendingControllerConfig {
  jobType: PipelineJobType;
  hardBudgetCapUsd?: number;
  modelRates?: Record<string, ModelRateCard>;
}

export interface SpendingSummary {
  jobType: PipelineJobType;
  hardBudgetCapUsd: number;
  cumulativeCostUsd: number;
  remainingBudgetUsd: number;
  budgetExhausted: boolean;
  totalCalls: number;
  generationCalls: number;
  criticCalls: number;
  retryCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
}

export class SpendingController {
  private readonly jobType: PipelineJobType;
  private readonly hardBudgetCapUsd: number;
  private readonly modelRates: Record<string, ModelRateCard>;

  private cumulativeCostUsd = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalThinkingTokens = 0;

  private generationCalls = 0;
  private criticCalls = 0;
  private retryCalls = 0;

  // Tracks active reservations to prevent concurrent overspend
  private reservedCostUsd = 0;

  constructor(config: SpendingControllerConfig) {
    this.jobType = config.jobType;
    this.modelRates = { ...DEFAULT_MODEL_RATES, ...(config.modelRates || {}) };

    if (typeof config.hardBudgetCapUsd === "number") {
      this.hardBudgetCapUsd = config.hardBudgetCapUsd;
    } else if (config.jobType === "unit3_pilot") {
      this.hardBudgetCapUsd = 0.25; // USD 0.25 strictly enforced
    } else if (config.jobType === "units2_25_expansion") {
      this.hardBudgetCapUsd = 5.0; // USD 5.00 strictly enforced
    } else {
      this.hardBudgetCapUsd = 0.25;
    }
  }

  public getHardBudgetCap(): number {
    return this.hardBudgetCapUsd;
  }

  public getCumulativeCost(): number {
    return this.cumulativeCostUsd;
  }

  public getRemainingBudget(): number {
    return Math.max(0, this.hardBudgetCapUsd - this.cumulativeCostUsd - this.reservedCostUsd);
  }

  public isBudgetExhausted(): boolean {
    return this.cumulativeCostUsd >= this.hardBudgetCapUsd;
  }

  private getRatesForModel(modelName: string): ModelRateCard {
    const normalized = modelName.replace(/^models\//, "");
    if (this.modelRates[normalized]) {
      return this.modelRates[normalized];
    }
    // Conservative fallback for unknown model: assume Pro pricing
    return {
      inputPricePerM: 1.25,
      outputPricePerM: 5.0,
      thinkingPricePerM: 5.0,
    };
  }

  /**
   * Pre-call budget reservation. Calculates worst-case projected cost before network dispatch.
   * If projected cost would breach the hard cap, aborts immediately before call (0 extra tokens spent).
   */
  public reservePreCallBudget(
    modelName: string,
    estimatedInputTokens: number,
    maxOutputTokens: number
  ): { allowed: boolean; projectedCost: number; reason?: string } {
    if (this.isBudgetExhausted()) {
      return {
        allowed: false,
        projectedCost: 0,
        reason: `Budget cap of $${this.hardBudgetCapUsd.toFixed(4)} USD is already exhausted (spent: $${this.cumulativeCostUsd.toFixed(4)} USD). No further calls or retries permitted.`,
      };
    }

    const rates = this.getRatesForModel(modelName);
    const worstCaseOutputTokens = maxOutputTokens > 0 ? maxOutputTokens : 1024;
    const projectedInputCost = (estimatedInputTokens / 1_000_000) * rates.inputPricePerM;
    const projectedOutputCost = (worstCaseOutputTokens / 1_000_000) * rates.outputPricePerM;
    const projectedCost = projectedInputCost + projectedOutputCost;

    if (this.cumulativeCostUsd + this.reservedCostUsd + projectedCost > this.hardBudgetCapUsd) {
      return {
        allowed: false,
        projectedCost,
        reason: `Call projected cost of $${projectedCost.toFixed(6)} USD would exceed remaining budget of $${this.getRemainingBudget().toFixed(6)} USD (cap: $${this.hardBudgetCapUsd.toFixed(4)} USD). Call aborted.`,
      };
    }

    this.reservedCostUsd += projectedCost;
    return { allowed: true, projectedCost };
  }

  /**
   * Release reservation if call was cancelled or failed before network dispatch.
   */
  public releaseReservation(projectedCost: number): void {
    this.reservedCostUsd = Math.max(0, this.reservedCostUsd - projectedCost);
  }

  /**
   * Reconciles estimated reservation with actual response usage metadata.
   * Invariant: Missing provider usage is NEVER treated as zero cost; it falls back to worst-case reservation.
   */
  public recordActualUsage(
    modelName: string,
    usage: GeminiUsageMetadata | undefined,
    callType: "generation" | "critic" | "retry",
    reservedProjectedCost: number
  ): { callCost: number; cumulativeCost: number; budgetExhausted: boolean } {
    // Release the pre-call reservation first
    this.releaseReservation(reservedProjectedCost);

    const rates = this.getRatesForModel(modelName);

    let promptTokens: number;
    let candidateTokens: number;
    let thinkingTokens: number;
    let actualCallCost: number;

    if (!usage || (usage.promptTokenCount === 0 && usage.candidatesTokenCount === 0)) {
      // Missing or zeroed provider usage: treat as worst-case reservation to prevent zero-cost bypass
      console.warn(
        `[SpendingController] Usage metadata missing for ${modelName}. Applying conservative worst-case charge.`
      );
      actualCallCost = reservedProjectedCost;
      promptTokens = 1500;
      candidateTokens = 500;
      thinkingTokens = 0;
    } else {
      promptTokens = usage.promptTokenCount ?? 0;
      candidateTokens = usage.candidatesTokenCount ?? 0;
      thinkingTokens = usage.thinkingTokenCount ?? 0;

      const netCandidateTokens = Math.max(0, candidateTokens - thinkingTokens);
      const inputCost = (promptTokens / 1_000_000) * rates.inputPricePerM;
      const candidateCost = (netCandidateTokens / 1_000_000) * rates.outputPricePerM;
      const thinkingCost = (thinkingTokens / 1_000_000) * rates.thinkingPricePerM;

      actualCallCost = inputCost + candidateCost + thinkingCost;
    }

    this.cumulativeCostUsd += actualCallCost;
    this.totalInputTokens += promptTokens;
    this.totalOutputTokens += candidateTokens;
    this.totalThinkingTokens += thinkingTokens;

    if (callType === "generation") {
      this.generationCalls++;
    } else if (callType === "critic") {
      this.criticCalls++;
    } else if (callType === "retry") {
      this.retryCalls++;
    }

    return {
      callCost: actualCallCost,
      cumulativeCost: this.cumulativeCostUsd,
      budgetExhausted: this.isBudgetExhausted(),
    };
  }

  public getSummary(): SpendingSummary {
    return {
      jobType: this.jobType,
      hardBudgetCapUsd: this.hardBudgetCapUsd,
      cumulativeCostUsd: this.cumulativeCostUsd,
      remainingBudgetUsd: Math.max(0, this.hardBudgetCapUsd - this.cumulativeCostUsd),
      budgetExhausted: this.isBudgetExhausted(),
      totalCalls: this.generationCalls + this.criticCalls + this.retryCalls,
      generationCalls: this.generationCalls,
      criticCalls: this.criticCalls,
      retryCalls: this.retryCalls,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalThinkingTokens: this.totalThinkingTokens,
    };
  }
}

