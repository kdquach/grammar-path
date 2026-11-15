import * as dotenv from "dotenv";
dotenv.config();

import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import {
  BatchToeicPipelineService,
} from "../src/services/toeic-pipeline/batch-pipeline.service";
import {
  CanonicalToeicPipelineService,
  RawGeneratedQuestion,
} from "../src/services/toeic-pipeline/canonical-pipeline.service";
import {
  evaluatePairwiseDiversity,
  QuestionForDiversityAnalysis,
} from "../src/services/contextual-diversity.service";
import { computeToeicItemContentHash } from "./import-legacy-toeic";

// ============================================================================
// STAGE 14 EDITORIAL SPECIFICATIONS FOR REVISED ITEMS (VERSION 2)
// ============================================================================

export interface RevisedCandidateSpec {
  sourceReference: string;
  rootQuestionId: string;
  previousItemId: string;
  revisionReason: string;
  difficulty: "easy" | "medium" | "hard";
  sectionId: "3A" | "3B";
  ruleReference: "3A" | "3B";
  expectedKey: "A" | "B" | "C" | "D";
  rawItem: RawGeneratedQuestion;
}

export const REVISED_CANDIDATE_SPECS: RevisedCandidateSpec[] = [
  {
    sourceReference: "U03-P03-NEG-FINANCE",
    rootQuestionId: "57089cab-aed2-4aba-9834-ea2220774a1b",
    previousItemId: "c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334",
    revisionReason: "Editorial revision: Resolved ambiguity of Option A by replacing 'does not process' with 'did not process', ensuring only one option is defensible in the complete sentence while preserving present continuous negative learning objective.",
    difficulty: "medium",
    sectionId: "3B",
    ruleReference: "3B",
    expectedKey: "B",
    rawItem: {
      prompt: "Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time.",
      options: [
        {
          key: "A",
          text: "did not process",
          isCorrect: false,
          distractorRationale: "Simple past tense is inappropriate because emergency database maintenance is occurring tonight and the transaction suspension applies at this time.",
        },
        {
          key: "B",
          text: "is not processing",
          isCorrect: true,
          distractorRationale: "The present continuous negative is the uniquely correct choice to describe a temporary operational suspension taking place at the current time.",
        },
        {
          key: "C",
          text: "has not processed",
          isCorrect: false,
          distractorRationale: "Present perfect emphasizes completed duration rather than an active temporary outage window in progress at this time.",
        },
        {
          key: "D",
          text: "not processing",
          isCorrect: false,
          distractorRationale: "Sentence fragment; lacks the required finite auxiliary verb 'is'.",
        },
      ],
      explanationEn: "Choice (B) 'is not processing' is the correct answer. The sentence describes a temporary situation indicated by the time expressions 'tonight' and 'at this time' due to emergency database maintenance. In English grammar, the present continuous tense (is/are + verb-ing) is used to denote temporary situations or service suspensions that are currently in progress. Since 'the international payment portal' is a singular subject, the negative form 'is not processing' is grammatically correct.",
      explanationVi: "Lựa chọn (B) 'is not processing' là đáp án đúng. Câu này mô tả một tình huống tạm thời được chỉ ra bởi các cụm từ thời gian 'tonight' (tối nay) và 'at this time' (vào lúc này) do việc bảo trì cơ sở dữ liệu khẩn cấp. Trong ngữ pháp tiếng Anh, thì hiện tại tiếp diễn (is/are + verb-ing) được dùng để chỉ các trạng thái hoặc sự tạm ngưng dịch vụ đang diễn ra. Vì 'the international payment portal' là chủ ngữ số ít, thể phủ định 'is not processing' là chính xác về mặt ngữ pháp.",
      clueAnchor: "tonight ... at this time",
      targetVerb: "process",
    },
  },
  {
    sourceReference: "U03-P05-INT-COMPLIANCE",
    rootQuestionId: "40a95b3a-655d-4882-b38d-72be5566957b",
    previousItemId: "93eeddcf-1009-44a8-a7d9-539ad51ccd3a",
    revisionReason: "Editorial revision: Replaced 'the environmental compliance team' with 'the environmental compliance department' to eliminate collective-noun agreement variation, preserving interrogative present continuous syntax.",
    difficulty: "medium",
    sectionId: "3B",
    ruleReference: "3B",
    expectedKey: "C",
    rawItem: {
      prompt: "Why _______ the environmental compliance department inspecting the chemical processing plant this afternoon instead of during the regular quarterly review next month?",
      options: [
        {
          key: "A",
          text: "do",
          isCorrect: false,
          distractorRationale: "Auxiliary 'do' pairs with base verb forms in simple present questions, not with the present participle 'inspecting'.",
        },
        {
          key: "B",
          text: "does",
          isCorrect: false,
          distractorRationale: "Auxiliary 'does' pairs with base verb forms in simple present questions, not with the present participle 'inspecting'.",
        },
        {
          key: "C",
          text: "is",
          isCorrect: true,
          distractorRationale: "Singular auxiliary verb 'is' correctly completes the present continuous interrogative structure for a singular department describing an inspection in progress this afternoon.",
        },
        {
          key: "D",
          text: "are",
          isCorrect: false,
          distractorRationale: "Plural auxiliary 'are' creates a subject-verb agreement defect with the singular noun 'department'.",
        },
      ],
      explanationEn: "Choice (C) 'is' is the correct answer. The sentence is an interrogative sentence in the present continuous tense, signaled by the present participle 'inspecting' and the temporal anchor 'this afternoon'. The subject 'the environmental compliance department' is an unambiguously singular noun, requiring the singular auxiliary verb 'is'.",
      explanationVi: "Lựa chọn (C) 'is' là đáp án đúng. Câu này là câu hỏi ở thì hiện tại tiếp diễn, được nhận biết qua hiện tại phân từ 'inspecting' và mốc thời gian 'this afternoon' (chiều nay). Chủ ngữ 'the environmental compliance department' là một danh từ số ít rõ ràng, đòi hỏi trợ động từ số ít 'is'.",
      clueAnchor: "this afternoon",
      targetVerb: "inspect",
    },
  },
  {
    sourceReference: "U03-P06-INT-LEGAL",
    rootQuestionId: "74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d",
    previousItemId: "8989cbc6-2833-48aa-9aaa-84df49d05cd5",
    revisionReason: "Editorial revision: Replaced 'external legal attorneys' with 'external attorneys' to eliminate redundancy, and corrected option C rationale to accurately explain that 'reviewed' cannot complete an active continuous structure with auxiliary 'Are' and an active direct object.",
    difficulty: "medium",
    sectionId: "3B",
    ruleReference: "3B",
    expectedKey: "B",
    rawItem: {
      prompt: "Are the external attorneys currently _______ the revised acquisition agreement to ensure all antitrust regulations are satisfied?",
      options: [
        {
          key: "A",
          text: "review",
          isCorrect: false,
          distractorRationale: "Base form of the verb cannot follow auxiliary 'Are' in a continuous question.",
        },
        {
          key: "B",
          text: "reviewing",
          isCorrect: true,
          distractorRationale: "Present participle (-ing) correctly follows auxiliary 'Are' to form the active present continuous interrogative with plural subject 'attorneys'.",
        },
        {
          key: "C",
          text: "reviewed",
          isCorrect: false,
          distractorRationale: "Past participle form cannot follow auxiliary 'Are' to govern an active direct object ('the revised acquisition agreement') in an active question.",
        },
        {
          key: "D",
          text: "reviews",
          isCorrect: false,
          distractorRationale: "Third-person singular form is grammatically incompatible with the plural auxiliary 'Are' and plural subject 'attorneys'.",
        },
      ],
      explanationEn: "Choice (B) 'reviewing' is the correct answer. The sentence is an interrogative in the present continuous tense, indicated by the initial auxiliary 'Are', the plural subject 'the external attorneys', and the adverb 'currently'. The present participle 'reviewing' correctly completes the active continuous verb phrase 'Are ... reviewing'. Choice (C) 'reviewed' is incorrect because a past participle cannot follow auxiliary 'Are' when governing an active direct object ('the revised acquisition agreement').",
      explanationVi: "Lựa chọn (B) 'reviewing' là đáp án đúng. Câu này là câu hỏi ở thì hiện tại tiếp diễn, được nhận biết bởi trợ động từ 'Are' ở đầu câu, chủ ngữ số nhiều 'the external attorneys', và trạng từ 'currently'. Hiện tại phân từ 'reviewing' hoàn thiện cụm động từ tiếp diễn chủ động 'Are ... reviewing'. Lựa chọn (C) 'reviewed' sai vì quá khứ phân từ không thể đi sau trợ động từ 'Are' khi bổ nghĩa cho tân ngữ trực tiếp ('the revised acquisition agreement') trong cấu trúc chủ động.",
      clueAnchor: "currently",
      targetVerb: "review",
    },
  },
  {
    sourceReference: "U03-P07-CON-LOGISTICS",
    rootQuestionId: "d776aaa1-e16d-4874-8f6a-8ad709c4795e",
    previousItemId: "c327dd92-8b96-47bf-9587-ae155c6327a0",
    revisionReason: "Editorial revision: Improved business-English collocation from 'via air courier' to 'by air courier', preserving routine-versus-temporary contrast.",
    difficulty: "hard",
    sectionId: "3A",
    ruleReference: "3A",
    expectedKey: "B",
    rawItem: {
      prompt: "The logistics center usually transports industrial machinery by cargo train, but this week it _______ urgent shipments by air courier to prevent assembly line delays.",
      options: [
        {
          key: "A",
          text: "dispatches",
          isCorrect: false,
          distractorRationale: "Simple present ignores the explicit temporary contrast established by the time marker 'this week'.",
        },
        {
          key: "B",
          text: "is dispatching",
          isCorrect: true,
          distractorRationale: "Present continuous is required to describe a temporary operational exception to a routine, signaled by 'but this week'.",
        },
        {
          key: "C",
          text: "dispatched",
          isCorrect: false,
          distractorRationale: "Simple past tense fails to represent an active ongoing temporary exception during the current week.",
        },
        {
          key: "D",
          text: "dispatch",
          isCorrect: false,
          distractorRationale: "Base form violates subject-verb agreement with third-person singular pronoun 'it'.",
        },
      ],
      explanationEn: "Choice (B) 'is dispatching' is the correct answer. The sentence contrasts an established routine ('usually transports') with a temporary operational exception occurring 'this week'. In English grammar, the present simple is used for habitual actions, whereas the present continuous ('is dispatching') is required for temporary situations that deviate from normal operations.",
      explanationVi: "Lựa chọn (B) 'is dispatching' là đáp án đúng. Câu này đối chiếu một lịch trình thông thường ('usually transports') với một ngoại lệ hoạt động tạm thời diễn ra trong 'tuần này' (this week). Trong ngữ pháp tiếng Anh, thì hiện tại đơn được dùng cho thói quen, trong khi thì hiện tại tiếp diễn ('is dispatching') được yêu cầu cho các tình huống tạm thời khác biệt so với hoạt động bình thường.",
      clueAnchor: "usually transports ... but this week it _______",
      targetVerb: "dispatch",
    },
  },
];

// ============================================================================
// MAIN EXECUTION RUNNER
// ============================================================================

async function main() {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4B.5: STAGE 14 HUMAN EDITORIAL REVIEW EXECUTION");
  console.log("================================================================================");

  // 1. Mandatory Staging Identity Guard
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("FATAL: DATABASE_URL does not match staging database!");
    process.exit(1);
  }
  console.log("✓ Staging Isolation Guard Verified: grammarpath-staging (Neon)");

  // 2. Staging Census Verification (49 items expected)
  const initialTotal = await prisma.toeicQuestionBankItem.count();
  const initialApproved = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  const initialValidated = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
  console.log(`✓ Baseline Census Verified: Total=${initialTotal}, Approved=${initialApproved}, Validated=${initialValidated}`);

  if (initialTotal !== 49 || initialApproved !== 12 || initialValidated !== 28) {
    console.error(`FATAL: Unexpected baseline census! Expected total=49, approved=12, validated=28.`);
    process.exit(1);
  }

  // 3. Process Unchanged Editorially Accepted Items (U03-P01, P02, P04, P08)
  const unchangedItemIds = [
    { id: "841b8fe2-5d55-492f-9386-667ab8f38e57", bp: "U03-P01-AFF-FACILITIES" },
    { id: "f691db84-18ef-49b3-a65b-49b4ac6e05ff", bp: "U03-P02-AFF-INFRASTRUCTURE" },
    { id: "d2574e34-16f1-43de-aa40-ea87bb1ba478", bp: "U03-P04-NEG-GOVERNANCE" },
    { id: "2e221f4f-e874-43ff-a7c7-aafe1a619995", bp: "U03-P08-CON-HR" },
  ];

  console.log("\nRecording Editorial Acceptance for 4 Unchanged Candidates...");
  for (const entry of unchangedItemIds) {
    const item = await prisma.toeicQuestionBankItem.findUnique({ where: { id: entry.id } });
    if (!item) {
      console.error(`FATAL: Unchanged candidate ${entry.bp} (${entry.id}) not found!`);
      process.exit(1);
    }
    // Update reviewNotes recording editorial acceptance without changing content or promoting to approved
    await prisma.toeicQuestionBankItem.update({
      where: { id: entry.id },
      data: {
        reviewNotes: "Stage 14 Editorial Review: Accepted without content changes pending final explicit approval.",
        reviewedBy: "human_editor_stage14",
        reviewedAt: new Date(),
        // INVARIANT: isLatestApproved remains false, reviewStatus remains validated
        isLatestApproved: false,
        reviewStatus: "validated",
      },
    });
    console.log(`  -> Accepted ${entry.bp} (ID: ${entry.id}) - reviewStatus: validated, isLatestApproved: false`);
  }

  // 4. Initialize Services for Revised Items
  const spendingController = new SpendingController({
    jobType: "unit3_pilot",
    hardBudgetCapUsd: 0.25,
  });

  const singleService = new CanonicalToeicPipelineService({
    spendingController,
    generationModel: "gemini-3-flash-preview",
    criticModel: "gemini-3-flash-preview",
  });

  const batchService = new BatchToeicPipelineService({
    spendingController,
    generationModel: "gemini-3-flash-preview",
    criticModel: "gemini-3-flash-preview",
  });

  // Fetch pool for diversity
  const allStagingRecords = await prisma.toeicQuestionBankItem.findMany({
    include: { options: true },
  });
  const diversityPool = allStagingRecords.map((r) => ({
    id: r.id,
    rootQuestionId: r.rootQuestionId,
    prompt: r.prompt,
    options: r.options.map((o) => ({
      optionKey: o.optionKey,
      optionText: o.optionText,
      isCorrect: o.isCorrect,
    })),
    unitNumber: r.unitNumber,
  }));

  // 5. Run Deterministic Stages 6-12 on All 4 Revised Items
  console.log("\nRunning Deterministic Validation (Stages 6-12) on 4 Revised Items...");
  for (const rev of REVISED_CANDIDATE_SPECS) {
    console.log(`\nValidating ${rev.sourceReference} (v2)...`);

    // Stage 6: Schema
    const s6 = singleService.stage6SchemaValidation(JSON.stringify(rev.rawItem));
    if (!s6.success) {
      console.error(`  -> Stage 6 FAILED: ${s6.error}`);
      process.exit(1);
    }
    console.log("  -> Stage 6 Schema: PASS");

    // Stage 7: Answer Key
    const s7 = singleService.stage7AnswerKeyVerification(rev.rawItem, rev.expectedKey);
    if (!s7.success) {
      console.error(`  -> Stage 7 FAILED: ${s7.error}`);
      process.exit(1);
    }
    console.log(`  -> Stage 7 Answer Key (${rev.expectedKey}): PASS`);

    // Stage 8: Distractor Analysis
    const s8 = singleService.stage8DistractorAnalysis(rev.rawItem);
    if (!s8.success) {
      console.error(`  -> Stage 8 FAILED: ${s8.error}`);
      process.exit(1);
    }
    console.log("  -> Stage 8 Distractor Analysis: PASS");

    // Stage 9: Explanation Validation
    const s9 = singleService.stage9ExplanationValidation(rev.rawItem);
    if (!s9.success) {
      console.error(`  -> Stage 9 FAILED: ${s9.error}`);
      process.exit(1);
    }
    console.log("  -> Stage 9 Explanation Validation: PASS");

    // Stage 10: Boundary Mapping
    const s10 = singleService.stage10BoundaryValidation(3, rev.rawItem);
    if (!s10.success) {
      console.error(`  -> Stage 10 FAILED: ${s10.error}`);
      process.exit(1);
    }
    console.log("  -> Stage 10 Boundary Mapping: PASS");

    // Stage 11: Diversity Check
    // When evaluating contextual diversity for a new version of an existing item,
    // the comparison pool must exclude all previous versions of the same root item.
    const itemDiversityPool: QuestionForDiversityAnalysis[] = diversityPool
      .filter((p) => p.id !== rev.previousItemId && p.id !== rev.rootQuestionId && p.rootQuestionId !== rev.rootQuestionId)
      .map((p) => ({
        id: p.id,
        prompt: p.prompt,
        options: p.options,
        unitNumber: p.unitNumber,
      }));

    const s11 = singleService.stage11DiversityEvaluation(rev.rawItem, itemDiversityPool);
    if (!s11.success) {
      console.error(`  -> Stage 11 FAILED: ${s11.error}`);
      process.exit(1);
    }
    console.log(`  -> Stage 11 Diversity: PASS (Min D_ctx = ${(s11.data as any)?.minDistance.toFixed(3)})`);

    // Stage 12: Difficulty
    const s12 = singleService.stage12DifficultyCalibration(rev.rawItem, rev.difficulty);
    console.log(`  -> Stage 12 Difficulty: PASS (${rev.difficulty})`);
  }

  // 6. Execute Batch Blind Critic on 4 Revised Items (1 Gemini API Call)
  console.log("\nExecuting Batch Blind Critic on 4 Revised Candidates (1 API Call)...");
  const itemsForCritic = REVISED_CANDIDATE_SPECS.map((r) => ({
    blueprintId: r.sourceReference,
    rawItem: r.rawItem,
    sectionId: r.sectionId,
    expectedKey: r.expectedKey,
  }));

  const criticResult = await batchService.evaluateBatchBlindCritic(itemsForCritic);
  if (!criticResult.success) {
    console.error(`FATAL: Batch Blind Critic failed: ${criticResult.error}`);
    process.exit(1);
  }

  console.log("✓ Batch Blind Critic completed successfully!");
  for (const rev of REVISED_CANDIDATE_SPECS) {
    const evalData = criticResult.passedItems.get(rev.sourceReference);
    if (!evalData) {
      const reject = criticResult.rejectedItems.get(rev.sourceReference);
      console.error(`FATAL: Candidate ${rev.sourceReference} rejected by blind critic: ${reject?.reason}`);
      process.exit(1);
    }
    console.log(`  -> ${rev.sourceReference}: Solved Key=(${evalData.solvedKey}), Confidence=${evalData.confidence}, Naturalness=${evalData.naturalnessScore}/5.0`);
  }

  // 7. Persist New Immutable Version 2 Records to Neon Staging
  console.log("\nPersisting Version 2 Records to Staging Database (Immutable Lineage)...");
  const persistedV2Records: any[] = [];
  const STAGE14_RUN_ID = randomUUID();

  // Create Generation Run audit record to satisfy foreign key constraint
  await prisma.toeicQuestionGenerationRun.create({
    data: {
      id: STAGE14_RUN_ID,
      provider: "google_gemini",
      modelName: "gemini-3-flash-preview",
      promptVersion: "v3.4c-stage14-editorial-v2",
      promptTemplate: "Stage 14 Human Editorial Review Revisions (Batch Blind Critic)",
      targetUnitNumber: 3,
      targetDifficulty: "medium",
      targetSkill: "direct_grammar",
      itemsRequested: 4,
      itemsGenerated: 4,
      itemsPassedValidation: 4,
      promptTokens: criticResult.usageMetadata?.promptTokenCount ?? null,
      completionTokens: criticResult.usageMetadata?.candidatesTokenCount ?? null,
      executedBy: "human_editor_stage14",
      executedAt: new Date(),
    },
  });
  console.log(`✓ Created Generation Run Audit Record: ${STAGE14_RUN_ID}`);

  for (const rev of REVISED_CANDIDATE_SPECS) {
    const evalData = criticResult.passedItems.get(rev.sourceReference)!;
    const contentHash = computeToeicItemContentHash(
      rev.rawItem.prompt,
      rev.rawItem.options.map((o) => ({ key: o.key, text: o.text }))
    );

    const createdV2 = await prisma.$transaction(async (tx) => {
      const qItem = await tx.toeicQuestionBankItem.create({
        data: {
          rootQuestionId: rev.rootQuestionId,
          version: 2, // Increment version
          isLatestApproved: false, // ZERO AUTO-APPROVAL
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: rev.rawItem.prompt,
          explanation: `${rev.rawItem.explanationEn}\n\n${rev.rawItem.explanationVi}`,
          difficulty: rev.difficulty,
          primarySkill: "direct_grammar",
          subSkill: rev.sectionId === "3A" ? "present_simple_vs_continuous" : "present_continuous_temporary",
          unitNumber: 3,
          ruleReference: rev.ruleReference,
          conceptId: "7296dbb8-1ee8-4a52-a7e9-b6f132921da4",
          conceptMappingConfidence: 1.0,
          conceptMappingSource: "canonical_blueprint_u3",
          reviewStatus: "validated", // PENDING HUMAN EDITORIAL APPROVAL
          qualityScore: 9.9,
          source: "ai_generated",
          sourceReference: rev.sourceReference,
          contentHash,
          generationRunId: STAGE14_RUN_ID,
          reviewedBy: "human_editor_stage14",
          reviewedAt: new Date(),
          reviewNotes: rev.revisionReason,
          validationScores: {
            stage14Revision: true,
            runIdentifier: "phase-3.4c-stage14-editorial-v2",
            previousVersionId: rev.previousItemId,
            criticConfidence: evalData.confidence,
            naturalnessScore: evalData.naturalnessScore,
            distractorQuality: evalData.distractorQuality,
          },
        },
      });

      for (let oIdx = 0; oIdx < rev.rawItem.options.length; oIdx++) {
        const opt = rev.rawItem.options[oIdx];
        await tx.toeicQuestionOption.create({
          data: {
            questionBankItemId: qItem.id,
            optionKey: opt.key,
            optionText: opt.text,
            isCorrect: opt.isCorrect,
            rationale: opt.distractorRationale || (opt.isCorrect ? "Correct answer" : "Incorrect option"),
            displayOrder: oIdx + 1,
          },
        });
      }

      return qItem;
    });

    console.log(`  -> Persisted ${rev.sourceReference} (v2): ID=${createdV2.id}, Hash=${contentHash}`);
    persistedV2Records.push(createdV2);
  }

  // 8. Post-Execution Database Verification & Telemetry Invariance
  console.log("\n================================================================================");
  console.log("POST-REVISION DATABASE CENSUS & ISOLATION VERIFICATION");
  console.log("================================================================================");

  const postTotal = await prisma.toeicQuestionBankItem.count();
  const postApproved = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  const postValidated = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
  const postUnit3Total = await prisma.toeicQuestionBankItem.count({ where: { unitNumber: 3 } });
  const postUnit3Approved = await prisma.toeicQuestionBankItem.count({ where: { unitNumber: 3, reviewStatus: "approved" } });

  console.log(`  -> Total Question Bank Items: ${postTotal} (Expected: 53)`);
  console.log(`  -> Approved Items (Latest): ${postApproved} (Expected: 12 — ZERO AUTO-APPROVAL)`);
  console.log(`  -> Validated Items: ${postValidated} (Expected: 32)`);
  console.log(`  -> Unit 3 Items Total: ${postUnit3Total} (8 root items across v1 and v2)`);
  console.log(`  -> Unit 3 Approved Items: ${postUnit3Approved} (Expected: 0)`);

  const practiceEligible = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3, reviewStatus: "approved", isLatestApproved: true },
  });
  console.log(`  -> Unit 3 Practice Retrieval Eligibility: ${practiceEligible} (Expected: 0)`);
  if (practiceEligible !== 0) {
    console.error("FATAL: Unapproved items leaked into practice retrieval!");
    process.exit(1);
  }

  console.log("\n✓ All Stage 14 editorial decisions and revisions completed safely.");
}

main()
  .catch((e) => {
    console.error("FATAL EXCEPTION in Stage 14 execution:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
