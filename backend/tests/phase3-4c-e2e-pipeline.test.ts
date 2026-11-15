import { describe, it, expect, vi } from "vitest";
import {
  CanonicalToeicPipelineService,
  QuestionBlueprint,
  BlindCriticResult,
  RawGeneratedQuestion,
} from "../src/services/toeic-pipeline/canonical-pipeline.service";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { generateGeminiTextDetailed } from "../src/lib/gemini";

vi.mock("../src/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/gemini")>("../src/lib/gemini");
  return {
    ...actual,
    generateGeminiTextDetailed: vi.fn(),
  };
});

describe("Phase 3.4C.4B.4.2.1: End-to-End Pipeline & Resilience Test Suite", () => {
  const blueprint3A: QuestionBlueprint = {
    blueprintId: "U3-PILOT-01",
    unitNumber: 3,
    sectionId: "3A",
    objective: "Distinguish routine habit from ongoing action using explicit present-time anchor.",
    difficulty: "easy",
    workplaceDomain: "corporate_operations",
    targetVerb: "conduct",
    carrierTemplate: "Because the primary conference room is being renovated, Ms. Gable _______ all client meetings in the second-floor executive suite today.",
    clueAnchor: "today",
    correctOptionKey: "B",
    distractorArchetypes: [
      { key: "A", archetype: "Simple present", rationale: "Contradicts temporary anchor today" },
      { key: "C", archetype: "Simple past", rationale: "Clashes with ongoing context" },
      { key: "D", archetype: "Infinitive", rationale: "Non-finite form cannot serve as predicate" },
    ],
  };

  const validAiResponseText = JSON.stringify({
    prompt: "Because the primary conference room is being renovated, Ms. Gable _______ all client meetings in the second-floor executive suite today.",
    options: [
      { key: "A", text: "conducts", isCorrect: false, distractorRationale: "Simple present clashes with temporary anchor 'today'" },
      { key: "B", text: "is conducting", isCorrect: true, distractorRationale: "Correct present continuous for action in progress today" },
      { key: "C", text: "conducted", isCorrect: false, distractorRationale: "Simple past clashes with present ongoing situation" },
      { key: "D", text: "to conduct", isCorrect: false, distractorRationale: "Infinitive cannot serve as finite verb" },
    ],
    explanationEn: "Choice (B) 'is conducting' is correct because 'today' indicates a temporary action in progress.",
    explanationVi: "Đáp án đúng là (B) 'is conducting' vì 'today' chỉ hành động tạm thời đang diễn ra hôm nay.",
    clueAnchor: "today",
    targetVerb: "conduct",
  });

  const validCriticResult: BlindCriticResult = {
    solvedKey: "B",
    confidence: 0.98,
    naturalnessScore: 4.8,
    singleDefensibleKey: true,
    notes: "Flawless corporate ETS Part 5 item.",
  };

  it("should execute all stages in exact sequential order with auditable stage results", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const result = await pipeline.executePipelineItem(blueprint3A, [], {
      generationMock: validAiResponseText,
      criticMock: validCriticResult,
    });

    expect(result.status).toBe("validated");
    expect(result.stageResults.length).toBe(14);

    // Verify stage numbers follow exact 1..14 sequence
    const stageNumbers = result.stageResults.map((s) => s.stageNumber);
    expect(stageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

    // Verify each stage category
    expect(result.stageResults[0].category).toBe("A"); // Stage 1
    expect(result.stageResults[4].category).toBe("B"); // Stage 5 (AI Generation)
    expect(result.stageResults[12].category).toBe("B"); // Stage 13 (AI Critic)
    expect(result.stageResults[13].category).toBe("C"); // Stage 14 (Human Gate)
  });

  it("should verify blind critic isolation: critic NEVER receives the generator's answer key", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const mockedDetailed = vi.mocked(generateGeminiTextDetailed);
    mockedDetailed.mockResolvedValueOnce({
      ok: true,
      text: JSON.stringify(validCriticResult),
      model: "gemini-3.8-flash",
      usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, totalTokenCount: 1200 },
      latencyMs: 150,
    });

    const parsedItem: RawGeneratedQuestion = JSON.parse(validAiResponseText);
    const criticStageResult = await pipeline.stage13BlindCritic(parsedItem);

    expect(criticStageResult.success).toBe(true);
    expect(mockedDetailed).toHaveBeenCalledTimes(1);

    // Inspect the prompt sent to the critic: it must NOT contain isCorrect or distractorRationale
    const criticPromptSent = mockedDetailed.mock.calls[0][0].prompt;
    expect(criticPromptSent).toContain("(A) conducts");
    expect(criticPromptSent).toContain("(B) is conducting");
    expect(criticPromptSent).not.toContain("isCorrect");
    expect(criticPromptSent).not.toContain("distractorRationale");
    expect(criticPromptSent).not.toContain("The correct choice is (B)");
  });

  it("should fail-closed if AI generation returns malformed JSON", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const malformedResponse = "{ this is not valid json <xml> prompt: ... ";

    const result = await pipeline.executePipelineItem(blueprint3A, [], {
      generationMock: malformedResponse,
      criticMock: validCriticResult,
    });

    expect(result.status).toBe("rejected");
    const s6 = result.stageResults.find((s) => s.stageNumber === 6);
    expect(s6?.success).toBe(false);
    expect(s6?.error).toContain("JSON / Zod Validation Failed");

    // Invariant: Stages after Stage 6 were NOT executed (early exit, 0 tokens wasted on critic)
    const stageNumbers = result.stageResults.map((s) => s.stageNumber);
    expect(stageNumbers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("should fail-closed and not confuse failed jobs with completed jobs when Gemini returns 429 quota error", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const mockedDetailed = vi.mocked(generateGeminiTextDetailed);
    mockedDetailed.mockResolvedValueOnce({
      ok: false,
      reason: "upstream_error",
      status: 429,
      errorMessage: "RESOURCE_EXHAUSTED: Generate content input tokens per minute limit exceeded on Free Tier",
    });

    const s4 = pipeline.stage4PromptAssembly(blueprint3A, {
      unitNumber: 3,
      sectionId: "3A",
      ruleTitle: "Present Continuous",
      rules: ["Rule 1"],
    });

    const s5 = await pipeline.stage5AiGeneration(s4.data!);

    expect(s5.success).toBe(false);
    expect(s5.error).toContain("Gemini Upstream Failure: [429]");
    expect(s5.error).toContain("RESOURCE_EXHAUSTED");
  });

  it("should fail-closed when Gemini returns 503 service unavailable", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const mockedDetailed = vi.mocked(generateGeminiTextDetailed);
    mockedDetailed.mockResolvedValueOnce({
      ok: false,
      reason: "upstream_error",
      status: 503,
      errorMessage: "UNAVAILABLE: This model is currently experiencing high demand. Spikes in demand are usually temporary.",
    });

    const s4 = pipeline.stage4PromptAssembly(blueprint3A, {
      unitNumber: 3,
      sectionId: "3A",
      ruleTitle: "Present Continuous",
      rules: ["Rule 1"],
    });

    const s5 = await pipeline.stage5AiGeneration(s4.data!);

    expect(s5.success).toBe(false);
    expect(s5.error).toContain("Gemini Upstream Failure: [503]");
    expect(s5.error).toContain("high demand");
  });

  it("should fail-closed on timeout error", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const mockedDetailed = vi.mocked(generateGeminiTextDetailed);
    mockedDetailed.mockResolvedValueOnce({
      ok: false,
      reason: "upstream_error",
      errorMessage: "The operation was aborted due to timeout",
    });

    const s4 = pipeline.stage4PromptAssembly(blueprint3A, {
      unitNumber: 3,
      sectionId: "3A",
      ruleTitle: "Present Continuous",
      rules: ["Rule 1"],
    });

    const s5 = await pipeline.stage5AiGeneration(s4.data!);

    expect(s5.success).toBe(false);
    expect(s5.error).toContain("The operation was aborted due to timeout");
  });

  it("should enforce mandatory human gate: automated pipeline CAN NEVER publish question", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const result = await pipeline.executePipelineItem(blueprint3A, [], {
      generationMock: validAiResponseText,
      criticMock: validCriticResult,
    });

    expect(result.status).toBe("validated"); // NOT approved!

    // Attempting publication without Stage 14 certified human credentials fails:
    const pubResult = pipeline.stage15Publication(result.status as any);
    expect(pubResult.success).toBe(false);
    expect(pubResult.error).toContain("lacks Stage 14 human approval");
  });
});

