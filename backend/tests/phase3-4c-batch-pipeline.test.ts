import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BatchToeicPipelineService,
  BatchGeneratedResponse,
  BatchCriticResponse,
} from "../src/services/toeic-pipeline/batch-pipeline.service";
import { DeterministicPipelineCache } from "../src/services/toeic-pipeline/deterministic-cache.service";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { QuestionBlueprint, RawGeneratedQuestion } from "../src/services/toeic-pipeline/canonical-pipeline.service";
import * as geminiLib from "../src/lib/gemini";

describe("Phase 3.4C.4B.4.3.3: Batch Pipeline & Deterministic Cache Offline Unit Test Suite", () => {
  let spendingController: SpendingController;
  let batchService: BatchToeicPipelineService;
  let cache: DeterministicPipelineCache;

  const mockBlueprints: QuestionBlueprint[] = [
    {
      blueprintId: "U03-P04-NEG-GOVERNANCE",
      unitNumber: 3,
      sectionId: "3B",
      objective: "Test negative present continuous for temporary absence.",
      difficulty: "medium",
      workplaceDomain: "Corporate Executive Governance",
      targetVerb: "attend",
      carrierTemplate: "Mr. Vance _______ this morning's board meeting because he is traveling.",
      clueAnchor: "this morning",
      correctOptionKey: "B",
      distractorArchetypes: [
        { key: "A", archetype: "Simple present", rationale: "Habitual clash" },
        { key: "C", archetype: "Past", rationale: "Past clash" },
        { key: "D", archetype: "Base", rationale: "Concord clash" },
      ],
    },
    {
      blueprintId: "U03-P05-INT-COMPLIANCE",
      unitNumber: 3,
      sectionId: "3B",
      objective: "Test affirmative present continuous for temporary inspection.",
      difficulty: "medium",
      workplaceDomain: "Environmental QA",
      targetVerb: "inspect",
      carrierTemplate: "Auditors _______ the secondary facility this afternoon.",
      clueAnchor: "this afternoon",
      correctOptionKey: "C",
      distractorArchetypes: [
        { key: "A", archetype: "Simple present", rationale: "Habitual clash" },
        { key: "B", archetype: "Past", rationale: "Past clash" },
        { key: "D", archetype: "Base", rationale: "Concord clash" },
      ],
    },
  ];

  const validBatchJson = JSON.stringify({
    items: [
      {
        blueprintId: "U03-P04-NEG-GOVERNANCE",
        prompt: "Due to emergency travel, Mr. Vance _______ this morning's executive board meeting.",
        options: [
          { key: "A", text: "does not attend", isCorrect: false, distractorRationale: "Habitual simple present" },
          { key: "B", text: "is not attending", isCorrect: true, distractorRationale: "Correct present continuous negative" },
          { key: "C", text: "did not attend", isCorrect: false, distractorRationale: "Past simple contradicts active time" },
          { key: "D", text: "not attending", isCorrect: false, distractorRationale: "Fragment missing auxiliary" },
        ],
        explanationEn: "Choice (B) is not attending is correct for a temporary situation this morning.",
        explanationVi: "Lựa chọn (B) is not attending là chính xác cho tình huống tạm thời sáng nay.",
        clueAnchor: "this morning",
        targetVerb: "attend",
      },
      {
        blueprintId: "U03-P05-INT-COMPLIANCE",
        prompt: "Federal inspectors _______ the manufacturing facility throughout this week to assess compliance.",
        options: [
          { key: "A", text: "inspects", isCorrect: false, distractorRationale: "Subject verb agreement error" },
          { key: "B", text: "inspected", isCorrect: false, distractorRationale: "Past simple contradicts ongoing week" },
          { key: "C", text: "are inspecting", isCorrect: true, distractorRationale: "Correct plural present continuous" },
          { key: "D", text: "to inspect", isCorrect: false, distractorRationale: "Non-finite infinitive" },
        ],
        explanationEn: "Choice (C) are inspecting is correct for a temporary plural action throughout this week.",
        explanationVi: "Lựa chọn (C) are inspecting là chính xác cho hành động tạm thời suốt tuần này.",
        clueAnchor: "throughout this week",
        targetVerb: "inspect",
      },
    ],
  });

  beforeEach(() => {
    spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    batchService = new BatchToeicPipelineService({
      spendingController,
      generationModel: "gemini-3-flash-preview",
      criticModel: "gemini-3-flash-preview",
    });
    cache = new DeterministicPipelineCache();
    vi.restoreAllMocks();
  });

  // 1. BATCH PARSING TESTS
  it("should successfully parse and validate a complete batch response", () => {
    const result = batchService.parseAndValidateBatchResponse(mockBlueprints, validBatchJson);
    expect(result.success).toBe(true);
    expect(result.successfulItems.size).toBe(2);
    expect(result.failedItems.size).toBe(0);

    const p04 = result.successfulItems.get("U03-P04-NEG-GOVERNANCE");
    expect(p04).toBeDefined();
    expect(p04?.targetVerb).toBe("attend");
    expect(p04?.options.find((o) => o.isCorrect)?.key).toBe("B");

    const p05 = result.successfulItems.get("U03-P05-INT-COMPLIANCE");
    expect(p05).toBeDefined();
    expect(p05?.targetVerb).toBe("inspect");
    expect(p05?.options.find((o) => o.isCorrect)?.key).toBe("C");
  });

  // 2. PARTIAL BATCH FAILURE TESTS
  it("should handle partial batch failure by preserving valid items and isolating failures", () => {
    const partialBatchJson = JSON.stringify({
      items: [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          prompt: "Due to emergency travel, Mr. Vance _______ this morning's executive board meeting.",
          options: [
            { key: "A", text: "does not attend", isCorrect: false, distractorRationale: "Habitual simple present" },
            { key: "B", text: "is not attending", isCorrect: true, distractorRationale: "Correct present continuous negative" },
            { key: "C", text: "did not attend", isCorrect: false, distractorRationale: "Past simple contradicts active time" },
            { key: "D", text: "not attending", isCorrect: false, distractorRationale: "Fragment missing auxiliary" },
          ],
          explanationEn: "Choice (B) is not attending is correct for a temporary situation this morning.",
          explanationVi: "Lựa chọn (B) is not attending là chính xác cho tình huống tạm thời sáng nay.",
          clueAnchor: "this morning",
          targetVerb: "attend",
        },
        {
          blueprintId: "U03-P05-INT-COMPLIANCE",
          // Invalid prompt missing the blank _______
          prompt: "Federal inspectors are at the manufacturing facility this week.",
          options: [
            { key: "A", text: "inspects", isCorrect: false },
            { key: "B", text: "inspected", isCorrect: false },
            { key: "C", text: "are inspecting", isCorrect: true },
            { key: "D", text: "to inspect", isCorrect: false },
          ],
          explanationEn: "Too short",
          explanationVi: "Quá ngắn",
          clueAnchor: "this week",
          targetVerb: "inspect",
        },
      ],
    });

    const result = batchService.parseAndValidateBatchResponse(mockBlueprints, partialBatchJson);
    expect(result.success).toBe(true);
    expect(result.successfulItems.size).toBe(1);
    expect(result.successfulItems.has("U03-P04-NEG-GOVERNANCE")).toBe(true);
    expect(result.failedItems.size).toBe(1);
    expect(result.failedItems.has("U03-P05-INT-COMPLIANCE")).toBe(true);
  });

  // 3. RESPONSE TRUNCATION TESTS
  it("should fail gracefully when batch response JSON is truncated", () => {
    const truncatedJson = '{"items": [{"blueprintId": "U03-P04-NEG-GOVERNANCE", "prompt": "Due to emergency tra';
    const result = batchService.parseAndValidateBatchResponse(mockBlueprints, truncatedJson);
    expect(result.success).toBe(false);
    expect(result.successfulItems.size).toBe(0);
    expect(result.error).toContain("Malformed JSON");
  });

  // 4. MALFORMED JSON TESTS
  it("should fail gracefully when batch response contains invalid JSON syntax", () => {
    const malformedJson = "{ not json at all }";
    const result = batchService.parseAndValidateBatchResponse(mockBlueprints, malformedJson);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Malformed JSON");
  });

  // 5. CRITIC BLIND-INPUT TESTS (NO ANSWER KEYS LEAKED)
  it("should construct blind critic prompt without revealing correct answer keys or explanations", async () => {
    const spyGenerate = vi.spyOn(geminiLib, "generateGeminiTextDetailed").mockResolvedValue({
      ok: true,
      text: JSON.stringify({
        evaluations: [
          {
            blueprintId: "U03-P04-NEG-GOVERNANCE",
            solvedKey: "B",
            confidence: 1.0,
            singleDefensibleKey: true,
            naturalnessScore: 5.0,
            grammarCorrectness: true,
            distractorQuality: "high",
            curriculumAlignment: true,
            explanationConsistency: true,
            rejectionReasons: [],
          },
        ],
      }),
      model: "gemini-3-flash-preview",
      latencyMs: 100,
    });

    const item: RawGeneratedQuestion = {
      prompt: "Mr. Vance _______ this morning's executive board meeting.",
      options: [
        { key: "A", text: "does not attend", isCorrect: false },
        { key: "B", text: "is not attending", isCorrect: true },
        { key: "C", text: "did not attend", isCorrect: false },
        { key: "D", text: "not attending", isCorrect: false },
      ],
      explanationEn: "Detailed secret explanation revealing choice B.",
      explanationVi: "Giải thích chi tiết tiết lộ đáp án B.",
      clueAnchor: "this morning",
      targetVerb: "attend",
    };

    await batchService.evaluateBatchBlindCritic([
      {
        blueprintId: "U03-P04-NEG-GOVERNANCE",
        rawItem: item,
        sectionId: "3B",
        expectedKey: "B",
      },
    ]);

    expect(spyGenerate).toHaveBeenCalledTimes(1);
    const callArgs = spyGenerate.mock.calls[0][0];
    const promptText = callArgs.prompt;

    // Verify BLIND INVARIANTS:
    expect(promptText).not.toContain("isCorrect");
    expect(promptText).not.toContain("Detailed secret explanation revealing choice B");
    expect(promptText).not.toContain("Giải thích chi tiết tiết lộ đáp án B");
    expect(promptText).not.toContain("Expected Key");
    expect(promptText).not.toContain("Correct Option Key");
  });

  // 6. ANSWER-KEY MISMATCH TESTS
  it("should reject candidate when critic independently solves a different key", () => {
    const mockCriticJson = JSON.stringify({
      evaluations: [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          solvedKey: "A", // Generator designated B, Critic solved A!
          confidence: 0.95,
          singleDefensibleKey: true,
          naturalnessScore: 5.0,
          grammarCorrectness: true,
          distractorQuality: "high",
          curriculumAlignment: true,
          explanationConsistency: true,
          rejectionReasons: [],
        },
      ],
    });

    const item: RawGeneratedQuestion = {
      prompt: "Mr. Vance _______ this morning's executive board meeting.",
      options: [
        { key: "A", text: "does not attend", isCorrect: false },
        { key: "B", text: "is not attending", isCorrect: true },
        { key: "C", text: "did not attend", isCorrect: false },
        { key: "D", text: "not attending", isCorrect: false },
      ],
      explanationEn: "Choice (B) is not attending is correct.",
      explanationVi: "Lựa chọn (B) là chính xác.",
      clueAnchor: "this morning",
      targetVerb: "attend",
    };

    const result = batchService.parseAndEvaluateBatchCritic(
      [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          rawItem: item,
          expectedKey: "B",
        },
      ],
      mockCriticJson
    );

    expect(result.passedItems.size).toBe(0);
    expect(result.rejectedItems.has("U03-P04-NEG-GOVERNANCE")).toBe(true);
    const rejection = result.rejectedItems.get("U03-P04-NEG-GOVERNANCE");
    expect(rejection?.reason).toContain("Answer-key disagreement");
  });

  // 7. CRITIC DUAL DEFENSIBLE KEYS REJECTION
  it("should reject candidate when critic flags multiple defensible keys", () => {
    const mockCriticJson = JSON.stringify({
      evaluations: [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          solvedKey: "B",
          confidence: 0.7,
          singleDefensibleKey: false, // Flagged multiple defensible keys!
          naturalnessScore: 5.0,
          grammarCorrectness: true,
          distractorQuality: "high",
          curriculumAlignment: true,
          explanationConsistency: true,
          rejectionReasons: ["Option A is also acceptable in certain business contexts"],
        },
      ],
    });

    const item: RawGeneratedQuestion = {
      prompt: "Mr. Vance _______ this morning's executive board meeting.",
      options: [
        { key: "A", text: "does not attend", isCorrect: false },
        { key: "B", text: "is not attending", isCorrect: true },
        { key: "C", text: "did not attend", isCorrect: false },
        { key: "D", text: "not attending", isCorrect: false },
      ],
      explanationEn: "Choice (B) is correct.",
      explanationVi: "Lựa chọn (B) là chính xác.",
      clueAnchor: "this morning",
      targetVerb: "attend",
    };

    const result = batchService.parseAndEvaluateBatchCritic(
      [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          rawItem: item,
          expectedKey: "B",
        },
      ],
      mockCriticJson
    );

    expect(result.passedItems.size).toBe(0);
    expect(result.rejectedItems.get("U03-P04-NEG-GOVERNANCE")?.reason).toContain("Dual defensible keys");
  });

  // 8. CRITIC NATURALNESS REJECTION (< 4.0)
  it("should reject candidate when naturalness score is below 4.0", () => {
    const mockCriticJson = JSON.stringify({
      evaluations: [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          solvedKey: "B",
          confidence: 1.0,
          singleDefensibleKey: true,
          naturalnessScore: 3.5, // Below 4.0 threshold!
          grammarCorrectness: true,
          distractorQuality: "medium",
          curriculumAlignment: true,
          explanationConsistency: true,
          rejectionReasons: ["Awkward non-standard phrasing for corporate TOEIC"],
        },
      ],
    });

    const item: RawGeneratedQuestion = {
      prompt: "Mr. Vance _______ this morning's executive board meeting.",
      options: [
        { key: "A", text: "does not attend", isCorrect: false },
        { key: "B", text: "is not attending", isCorrect: true },
        { key: "C", text: "did not attend", isCorrect: false },
        { key: "D", text: "not attending", isCorrect: false },
      ],
      explanationEn: "Choice (B) is correct.",
      explanationVi: "Lựa chọn (B) là chính xác.",
      clueAnchor: "this morning",
      targetVerb: "attend",
    };

    const result = batchService.parseAndEvaluateBatchCritic(
      [
        {
          blueprintId: "U03-P04-NEG-GOVERNANCE",
          rawItem: item,
          expectedKey: "B",
        },
      ],
      mockCriticJson
    );

    expect(result.passedItems.size).toBe(0);
    expect(result.rejectedItems.get("U03-P04-NEG-GOVERNANCE")?.reason).toContain("Unnatural ETS register");
  });

  // 9. IDEMPOTENCY AND DUPLICATE PERSISTENCE
  it("should prevent duplicate entries by computing identical content hashes for identical items", () => {
    const item1: RawGeneratedQuestion = {
      prompt: "Auditors _______ the facility today.",
      options: [
        { key: "A", text: "inspects", isCorrect: false },
        { key: "B", text: "are inspecting", isCorrect: true },
        { key: "C", text: "inspected", isCorrect: false },
        { key: "D", text: "to inspect", isCorrect: false },
      ],
      explanationEn: "Present continuous required.",
      explanationVi: "Yêu cầu thì hiện tại tiếp diễn.",
      clueAnchor: "today",
      targetVerb: "inspect",
    };

    const hash1 = cache.computeContentHash(item1);
    const hash2 = cache.computeContentHash({ ...item1 });
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256
  });

  // 10. CACHE INVALIDATION AND VERSIONING
  it("should cache deterministic results and invalidate cleanly when blueprint or content changes", () => {
    const bp = mockBlueprints[0];
    const initialStages = {
      stage1: { stageNumber: 1, stageName: "Rule", category: "A" as const, success: true },
      stage2: { stageNumber: 2, stageName: "Objective", category: "A" as const, success: true },
      stage3: { stageNumber: 3, stageName: "Blueprint", category: "A" as const, success: true },
      stage4: { stageNumber: 4, stageName: "Prompt", category: "A" as const, success: true },
    };

    // Cache initial
    cache.setBlueprintStages(bp, initialStages);
    expect(cache.getBlueprintStages(bp)).not.toBeNull();
    expect(cache.getBlueprintStages(bp)?.stage1.success).toBe(true);

    // Modified blueprint should produce a different hash and result in a cache miss
    const modifiedBp: QuestionBlueprint = {
      ...bp,
      targetVerb: "organize", // changed verb
    };
    expect(cache.getBlueprintStages(modifiedBp)).toBeNull();

    // Explicit invalidation
    const originalHash = cache.computeBlueprintHash(bp);
    cache.invalidate(originalHash);
    expect(cache.getBlueprintStages(bp)).toBeNull();
  });

  // 11. FREE TIER PROVIDER ENFORCEMENT
  it("should strictly enforce gemini-3-flash-preview model pinning without silent fallback", async () => {
    const spyGenerate = vi.spyOn(geminiLib, "generateGeminiTextDetailed").mockResolvedValue({
      ok: false,
      reason: "upstream_error",
      status: 429,
      errorMessage: "Resource exhausted",
    });

    const result = await batchService.generateBatchQuestions(mockBlueprints);
    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
    expect(spyGenerate).toHaveBeenCalledTimes(1);
    expect(spyGenerate.mock.calls[0][0].model).toBe("gemini-3-flash-preview");
  });
});

