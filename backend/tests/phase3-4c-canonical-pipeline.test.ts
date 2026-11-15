import { describe, it, expect } from "vitest";
import {
  CanonicalToeicPipelineService,
  QuestionBlueprint,
  BlindCriticResult,
} from "../src/services/toeic-pipeline/canonical-pipeline.service";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { QuestionForDiversityAnalysis } from "../src/services/contextual-diversity.service";

describe("Phase 3.4C.4B.4.2: Canonical 15-Stage TOEIC Pipeline Service", () => {
  const mockValidBlueprint: QuestionBlueprint = {
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

  const mockValidAiGeneratedJson = JSON.stringify({
    prompt: "Because the primary conference room is being renovated, Ms. Gable _______ all client meetings in the second-floor executive suite today.",
    options: [
      { key: "A", text: "conducts", isCorrect: false, distractorRationale: "Simple present clashes with temporary anchor 'today'" },
      { key: "B", text: "is conducting", isCorrect: true, distractorRationale: "Correct present continuous for action in progress today" },
      { key: "C", text: "conducted", isCorrect: false, distractorRationale: "Simple past clashes with present ongoing situation" },
      { key: "D", text: "to conduct", isCorrect: false, distractorRationale: "Infinitive cannot serve as finite verb" },
    ],
    explanationEn: "The correct choice is (B) 'is conducting' because the sentence refers to a temporary action happening today.",
    explanationVi: "Đáp án đúng là (B) 'is conducting' vì câu diễn tả một hành động tạm thời đang diễn ra hôm nay ('today').",
    clueAnchor: "today",
    targetVerb: "conduct",
  });

  const mockValidCriticResult: BlindCriticResult = {
    solvedKey: "B",
    confidence: 0.98,
    naturalnessScore: 4.8,
    singleDefensibleKey: true,
    notes: "Clear and unambiguous Part 5 item with authentic business register.",
  };

  it("should successfully execute all 15 stages and halt at 'validated' status without auto-approving", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const result = await pipeline.executePipelineItem(
      mockValidBlueprint,
      [], // Empty pool
      {
        generationMock: mockValidAiGeneratedJson,
        criticMock: mockValidCriticResult,
      }
    );

    expect(result.status).toBe("validated");
    expect(result.blueprintId).toBe("U3-PILOT-01");
    expect(result.stageResults.length).toBe(14); // Automated execution covers Stages 1 to 14

    // Verify all automated stages succeeded
    const allSuccessful = result.stageResults.every((s) => s.success);
    expect(allSuccessful).toBe(true);

    // Verify Stage 14 warned that human sign-off is required
    const s14 = result.stageResults.find((s) => s.stageNumber === 14);
    expect(s14?.warnings?.[0]).toContain("Awaiting certified human editorial sign-off");

    // Verify Stage 15 publication rejects unapproved item
    const s15 = pipeline.stage15Publication((s14?.data as any)?.status);
    expect(s15.success).toBe(false);
    expect(s15.error).toContain("lacks Stage 14 human approval");
  });

  it("should fail Stage 10 (Boundary Validation) if generated item contains a Unit 4 stative verb", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const corruptedAiJson = JSON.stringify({
      prompt: "The regional manager _______ the technical details of the contract today.",
      options: [
        { key: "A", text: "understands", isCorrect: true }, // Stative verb 'understand'
        { key: "B", text: "is understanding", isCorrect: false },
        { key: "C", text: "understood", isCorrect: false },
        { key: "D", text: "understand", isCorrect: false },
      ],
      explanationEn: "Choice (A) 'understands' is correct because understand is stative.",
      explanationVi: "Đáp án (A) đúng vì understand là động từ chỉ trạng thái.",
      clueAnchor: "today",
      targetVerb: "understand",
    });

    const result = await pipeline.executePipelineItem(
      mockValidBlueprint,
      [],
      {
        generationMock: corruptedAiJson,
        criticMock: mockValidCriticResult,
      }
    );

    expect(result.status).toBe("rejected");
    const s10 = result.stageResults.find((s) => s.stageNumber === 10);
    expect(s10?.success).toBe(false);
    expect(s10?.error).toContain("Unit 4 stative verb 'understand' detected in Unit 3 question");
  });

  it("should fail Stage 13 (Blind Critic) if independent critic disagrees with generator's answer key", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const disagreeingCriticResult: BlindCriticResult = {
      solvedKey: "A", // Generator designated B, critic chose A!
      confidence: 0.95,
      naturalnessScore: 4.5,
      singleDefensibleKey: true,
      notes: "Critic selected A due to conflicting temporal cues.",
    };

    const result = await pipeline.executePipelineItem(
      mockValidBlueprint,
      [],
      {
        generationMock: mockValidAiGeneratedJson,
        criticMock: disagreeingCriticResult,
      }
    );

    expect(result.status).toBe("rejected");
    const s13 = result.stageResults.find((s) => s.stageNumber === 13);
    expect(s13?.success).toBe(false);
    expect(s13?.error).toContain("Answer Key Disagreement: Generator designated (B), but blind critic solved as (A)");
  });

  it("should fail Stage 13 (Blind Critic) if critic detects multiple defensible keys in context", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    const dualKeyCriticResult: BlindCriticResult = {
      solvedKey: "B",
      confidence: 0.70,
      naturalnessScore: 4.2,
      singleDefensibleKey: false, // Dual key ambiguity!
      notes: "Both options A and B could be argued in this sentence context.",
    };

    const result = await pipeline.executePipelineItem(
      mockValidBlueprint,
      [],
      {
        generationMock: mockValidAiGeneratedJson,
        criticMock: dualKeyCriticResult,
      }
    );

    expect(result.status).toBe("rejected");
    const s13 = result.stageResults.find((s) => s.stageNumber === 13);
    expect(s13?.success).toBe(false);
    expect(s13?.error).toContain("Dual Defensible Keys Detected");
  });

  it("should fail Stage 11 if contextual distance to an existing item is < 0.50", async () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    // Existing item with nearly identical prompt template
    const existingNearDuplicate: QuestionForDiversityAnalysis = {
      id: "existing-item-1",
      prompt: "Because the primary conference room is being renovated, Ms. Gable _______ all client meetings in the second-floor executive suite today.",
      options: [
        { optionKey: "A", optionText: "conducts", isCorrect: false },
        { optionKey: "B", optionText: "is conducting", isCorrect: true },
        { optionKey: "C", optionText: "conducted", isCorrect: false },
        { optionKey: "D", optionText: "to conduct", isCorrect: false },
      ],
      unitNumber: 3,
    };

    const result = await pipeline.executePipelineItem(
      mockValidBlueprint,
      [existingNearDuplicate], // Existing pool with collision
      {
        generationMock: mockValidAiGeneratedJson,
        criticMock: mockValidCriticResult,
      }
    );

    expect(result.status).toBe("rejected");
    const s11 = result.stageResults.find((s) => s.stageNumber === 11);
    expect(s11?.success).toBe(false);
    expect(s11?.error).toContain("Contextual diversity violation");
  });

  it("should allow Stage 14 human approval and Stage 15 publication only with certified human credentials", () => {
    const spendingController = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const pipeline = new CanonicalToeicPipelineService({ spendingController });

    // 1. Without credentials:
    const s14NoAuth = pipeline.stage14EditorialApproval("validated");
    expect(s14NoAuth.data?.status).toBe("validated");

    // 2. With certified human credentials:
    const s14Auth = pipeline.stage14EditorialApproval("validated", {
      userId: "editor-user-001",
      role: "CONTENT_EDITOR",
      decision: "APPROVED",
      notes: "Certified sound ETS Part 5 item.",
    });
    expect(s14Auth.data?.status).toBe("approved");

    // 3. Stage 15 Publication succeeds with approved status:
    const s15 = pipeline.stage15Publication(s14Auth.data!.status);
    expect(s15.success).toBe(true);
    expect(s15.data?.isPublished).toBe(true);
    expect(s15.data?.isLatestApproved).toBe(true);
  });
});
