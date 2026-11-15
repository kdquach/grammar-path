import * as crypto from "crypto";
import { QuestionBlueprint, RawGeneratedQuestion, StageExecutionResult } from "./canonical-pipeline.service";

export interface CachedBlueprintValidation {
  version: string;
  blueprintHash: string;
  stage1: StageExecutionResult<any>;
  stage2: StageExecutionResult<any>;
  stage3: StageExecutionResult<any>;
  stage4: StageExecutionResult<any>;
  cachedAt: string;
}

export interface CachedStructuralValidation {
  version: string;
  contentHash: string;
  stage6: StageExecutionResult<any>;
  stage7: StageExecutionResult<any>;
  stage8: StageExecutionResult<any>;
  stage9: StageExecutionResult<any>;
  stage10: StageExecutionResult<any>;
  stage12: StageExecutionResult<any>;
  cachedAt: string;
}

export class DeterministicPipelineCache {
  public static readonly CACHE_VERSION = "v1.0-deterministic";

  private blueprintCache = new Map<string, CachedBlueprintValidation>();
  private structuralCache = new Map<string, CachedStructuralValidation>();

  public computeBlueprintHash(bp: QuestionBlueprint): string {
    const payload = `${bp.blueprintId}:${bp.unitNumber}:${bp.sectionId}:${bp.difficulty}:${bp.targetVerb}:${bp.carrierTemplate}:${bp.clueAnchor}:${bp.correctOptionKey}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  public computeContentHash(item: RawGeneratedQuestion): string {
    const opts = item.options.map((o) => `${o.key}:${o.text}:${o.isCorrect}`).sort().join("|");
    const payload = `${item.prompt}|${opts}|${item.targetVerb}|${item.clueAnchor}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  public getBlueprintStages(bp: QuestionBlueprint): CachedBlueprintValidation | null {
    const hash = this.computeBlueprintHash(bp);
    const cached = this.blueprintCache.get(hash);
    if (!cached || cached.version !== DeterministicPipelineCache.CACHE_VERSION) {
      return null;
    }
    return cached;
  }

  public setBlueprintStages(bp: QuestionBlueprint, stages: {
    stage1: StageExecutionResult<any>;
    stage2: StageExecutionResult<any>;
    stage3: StageExecutionResult<any>;
    stage4: StageExecutionResult<any>;
  }): void {
    const hash = this.computeBlueprintHash(bp);
    this.blueprintCache.set(hash, {
      version: DeterministicPipelineCache.CACHE_VERSION,
      blueprintHash: hash,
      ...stages,
      cachedAt: new Date().toISOString(),
    });
  }

  public getStructuralStages(item: RawGeneratedQuestion): CachedStructuralValidation | null {
    const hash = this.computeContentHash(item);
    const cached = this.structuralCache.get(hash);
    if (!cached || cached.version !== DeterministicPipelineCache.CACHE_VERSION) {
      return null;
    }
    return cached;
  }

  public setStructuralStages(item: RawGeneratedQuestion, stages: {
    stage6: StageExecutionResult<any>;
    stage7: StageExecutionResult<any>;
    stage8: StageExecutionResult<any>;
    stage9: StageExecutionResult<any>;
    stage10: StageExecutionResult<any>;
    stage12: StageExecutionResult<any>;
  }): void {
    const hash = this.computeContentHash(item);
    this.structuralCache.set(hash, {
      version: DeterministicPipelineCache.CACHE_VERSION,
      contentHash: hash,
      ...stages,
      cachedAt: new Date().toISOString(),
    });
  }

  public invalidate(blueprintHash?: string, contentHash?: string): void {
    if (blueprintHash) {
      this.blueprintCache.delete(blueprintHash);
    }
    if (contentHash) {
      this.structuralCache.delete(contentHash);
    }
  }

  public clearAll(): void {
    this.blueprintCache.clear();
    this.structuralCache.clear();
  }

  public getStats(): { blueprintCacheSize: number; structuralCacheSize: number; version: string } {
    return {
      blueprintCacheSize: this.blueprintCache.size,
      structuralCacheSize: this.structuralCache.size,
      version: DeterministicPipelineCache.CACHE_VERSION,
    };
  }
}

