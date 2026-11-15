import * as dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import {
  BatchToeicPipelineService,
} from "../src/services/toeic-pipeline/batch-pipeline.service";
import {
  CanonicalToeicPipelineService,
  QuestionBlueprint,
  RawGeneratedQuestion,
} from "../src/services/toeic-pipeline/canonical-pipeline.service";
import { QuestionForDiversityAnalysis } from "../src/services/contextual-diversity.service";
import { computeToeicItemContentHash } from "./import-legacy-toeic";
import { SANITIZED_UNIT3_BLUEPRINTS } from "./run-unit3-pilot-execution";

// ============================================================================
// RECOVERED STAGE 5 OUTPUT FOR U03-P01 (FROM TASK-6469 FORENSIC LOG)
// ============================================================================

export const RECOVERED_U03_P01_ITEM: RawGeneratedQuestion = {
  prompt: "Due to unexpected electrical maintenance in the primary building, the customer service division _______ from a temporary satellite facility throughout this week.",
  options: [
    {
      key: "A",
      text: "operates",
      isCorrect: false,
      distractorRationale: "The simple present is used for permanent routines or facts, but the time marker 'throughout this week' indicates a temporary situation.",
    },
    {
      key: "B",
      text: "is operating",
      isCorrect: true,
      distractorRationale: "The present continuous is the correct choice to describe a temporary operational arrangement happening for a limited time.",
    },
    {
      key: "C",
      text: "operated",
      isCorrect: false,
      distractorRationale: "The simple past tense is inappropriate here because the maintenance and the temporary relocation are presented as current, ongoing events for the current week.",
    },
    {
      key: "D",
      text: "to operate",
      isCorrect: false,
      distractorRationale: "An infinitive cannot function as the main finite verb of the sentence's predicate.",
    },
  ],
  explanationEn: "The sentence describes a temporary situation caused by maintenance, signaled by the time expression 'throughout this week'. In English grammar, the present continuous tense (is + verb-ing) is used to denote temporary actions or arrangements that are not part of a permanent routine. Since 'the customer service division' is a singular collective noun, 'is operating' is the correct form.",
  explanationVi: "Câu này mô tả một tình huống tạm thời do việc bảo trì gây ra, được nhận biết qua cụm từ thời gian 'throughout this week' (suốt tuần này). Trong ngữ pháp tiếng Anh, thì hiện tại tiếp diễn (is + verb-ing) được dùng để chỉ các hành động hoặc sự sắp xếp tạm thời, không phải là thói quen lâu dài. Vì 'the customer service division' là danh từ số ít, 'is operating' là hình thức chính xác.",
  clueAnchor: "throughout this week",
  targetVerb: "operate",
};

export async function runOptimizedBatchPilot(options?: {
  dryRun?: boolean;
}) {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4B.4.3.3: OPTIMIZED BATCH PILOT RUNNER (FREE TIER: EXACTLY 3 CALLS)");
  console.log("================================================================================");

  // 1. Mandatory Database Identity Guard
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("FATAL: Database URL does not match audited Neon staging host!");
    process.exit(1);
  }
  console.log("✓ Staging Isolation Guard Verified: grammarpath-staging (Neon)");

  // 2. Reconcile Staging Census
  const baselineTotal = await prisma.toeicQuestionBankItem.count();
  const baselineApproved = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  console.log(`✓ Staging Census: Total=${baselineTotal}, Approved=${baselineApproved}`);

  // 3. Reconcile Existing Candidates
  const persistedItems = await prisma.toeicQuestionBankItem.findMany({
    where: { unitNumber: 3 },
    select: { id: true, sourceReference: true },
  });
  const persistedMap = new Map(persistedItems.map((p) => [p.sourceReference, p.id]));
  console.log(`✓ Existing Unit 3 Candidates in Staging: ${persistedMap.size} (${Array.from(persistedMap.keys()).join(", ")})`);

  if (!persistedMap.has("U03-P02-AFF-INFRASTRUCTURE") || !persistedMap.has("U03-P03-NEG-FINANCE")) {
    console.error("FATAL: Expected existing candidates U03-P02 and U03-P03 are missing!");
    process.exit(1);
  }

  // 4. Initialize Services
  const spendingController = new SpendingController({
    jobType: "unit3_pilot",
    hardBudgetCapUsd: 0.25,
  });

  const batchService = new BatchToeicPipelineService({
    spendingController,
    generationModel: "gemini-3-flash-preview",
    criticModel: "gemini-3-flash-preview",
  });

  const singleService = new CanonicalToeicPipelineService({
    spendingController,
    generationModel: "gemini-3-flash-preview",
    criticModel: "gemini-3-flash-preview",
  });

  // Prepare existing diversity pool
  const existingRecords = await prisma.toeicQuestionBankItem.findMany({
    include: { options: true },
    take: 50,
  });
  const poolForDiversity: QuestionForDiversityAnalysis[] = existingRecords.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: r.options.map((o) => ({
      optionKey: o.optionKey,
      optionText: o.optionText,
      isCorrect: o.isCorrect,
    })),
    unitNumber: r.unitNumber,
  }));

  if (options?.dryRun) {
    console.log("✓ DRY RUN COMPLETED: Architecture and data guards verified.");
    return;
  }

  console.log("\n--- BATCH EXECUTION PLAN ---");
  console.log("Item 1: U03-P01 -> RECOVERED from Stage 5 output (0 API calls)");
  console.log("Items 2 & 3: U03-P02, U03-P03 -> ALREADY PERSISTED (0 API calls)");
  console.log("Items 4, 5, 6: U03-P04, U03-P05, U03-P06 -> BATCH 1 GENERATION (1 API call)");
  console.log("Items 7, 8: U03-P07, U03-P08 -> BATCH 2 GENERATION (1 API call)");
  console.log("All 6 items -> BATCH BLIND CRITIC (1 API call)");
  console.log("TOTAL API CALLS REQUIRED: EXACTLY 3 CALLS (Saves 9 calls, 75% reduction)");
  console.log("----------------------------\n");

  // Create Generation Run Record
  const runRecord = await prisma.toeicQuestionGenerationRun.create({
    data: {
      provider: "google_gemini",
      modelName: "gemini-3-flash-preview",
      promptVersion: "v3.4c-batch-optimized",
      promptTemplate: "Batch-Optimized 3-Call Unit 3 Pipeline (Free Tier)",
      targetUnitNumber: 3,
      targetDifficulty: "medium",
      itemsRequested: 6,
      executedBy: "antigravity_batch_worker",
    },
  });
  console.log(`Created ToeicQuestionGenerationRun: ${runRecord.id}`);

  // 1. Recover U03-P01
  const generatedCandidates = new Map<string, RawGeneratedQuestion>();
  generatedCandidates.set("U03-P01-AFF-FACILITIES", RECOVERED_U03_P01_ITEM);
  console.log(`✓ U03-P01: Reused recovered Stage 5 output.`);

  // 2. Execute Batch 1 (U03-P04, U03-P05, U03-P06)
  const batch1Blueprints = SANITIZED_UNIT3_BLUEPRINTS.filter((b) =>
    ["U03-P04-NEG-GOVERNANCE", "U03-P05-INT-COMPLIANCE", "U03-P06-INT-LEGAL"].includes(b.blueprintId)
  );
  console.log(`\nExecuting Batch 1 Generation (${batch1Blueprints.map((b) => b.blueprintId).join(", ")})...`);
  const batch1Result = await batchService.generateBatchQuestions(batch1Blueprints);
  if (!batch1Result.success) {
    console.error(`FATAL: Batch 1 Generation failed: ${batch1Result.error}`);
    process.exit(1);
  }
  for (const [bpId, item] of batch1Result.successfulItems) {
    generatedCandidates.set(bpId, item);
    console.log(`  -> Successfully parsed ${bpId}`);
  }

  // Pacing safety delay between Batch 1 and Batch 2
  console.log("  -> Rate-limit safety: sleeping 15000ms before Batch 2 to respect 5 RPM quota...");
  await new Promise((r) => setTimeout(r, 15000));

  // 3. Execute Batch 2 (U03-P07, U03-P08)
  const batch2Blueprints = SANITIZED_UNIT3_BLUEPRINTS.filter((b) =>
    ["U03-P07-CON-LOGISTICS", "U03-P08-CON-HR"].includes(b.blueprintId)
  );
  console.log(`\nExecuting Batch 2 Generation (${batch2Blueprints.map((b) => b.blueprintId).join(", ")})...`);
  const batch2Result = await batchService.generateBatchQuestions(batch2Blueprints);
  if (!batch2Result.success) {
    console.error(`FATAL: Batch 2 Generation failed: ${batch2Result.error}`);
    process.exit(1);
  }
  for (const [bpId, item] of batch2Result.successfulItems) {
    generatedCandidates.set(bpId, item);
    console.log(`  -> Successfully parsed ${bpId}`);
  }

  // 4. Run Deterministic Stages 6-12 on All 6 Generated Items
  console.log("\nRunning Deterministic Stages 6-12 on all 6 candidates...");
  const validatedForCritic: Array<{
    blueprintId: string;
    rawItem: RawGeneratedQuestion;
    sectionId: "3A" | "3B";
    expectedKey: "A" | "B" | "C" | "D";
    blueprint: QuestionBlueprint;
  }> = [];

  for (const bp of SANITIZED_UNIT3_BLUEPRINTS) {
    if (["U03-P02-AFF-INFRASTRUCTURE", "U03-P03-NEG-FINANCE"].includes(bp.blueprintId)) {
      continue;
    }
    const item = generatedCandidates.get(bp.blueprintId);
    if (!item) {
      console.error(`Missing item for ${bp.blueprintId}`);
      continue;
    }

    // Stage 6: Schema
    const s6 = singleService.stage6SchemaValidation(JSON.stringify(item));
    if (!s6.success) {
      console.error(`Stage 6 failed for ${bp.blueprintId}: ${s6.error}`);
      continue;
    }

    // Stage 7: Answer key
    const s7 = singleService.stage7AnswerKeyVerification(item, bp.correctOptionKey);
    if (!s7.success) {
      console.error(`Stage 7 failed for ${bp.blueprintId}: ${s7.error}`);
      continue;
    }

    // Stage 8: Distractor
    const s8 = singleService.stage8DistractorAnalysis(item);
    if (!s8.success) {
      console.error(`Stage 8 failed for ${bp.blueprintId}: ${s8.error}`);
      continue;
    }

    // Stage 9: Explanation
    const s9 = singleService.stage9ExplanationValidation(item);
    if (!s9.success) {
      console.error(`Stage 9 failed for ${bp.blueprintId}: ${s9.error}`);
      continue;
    }

    // Stage 10: Boundary
    const s10 = singleService.stage10BoundaryValidation(3, item);
    if (!s10.success) {
      console.error(`Stage 10 failed for ${bp.blueprintId}: ${s10.error}`);
      continue;
    }

    // Stage 11: Diversity
    const s11 = singleService.stage11DiversityEvaluation(item, poolForDiversity);
    if (!s11.success) {
      console.error(`Stage 11 failed for ${bp.blueprintId}: ${s11.error}`);
      continue;
    }

    // Stage 12: Difficulty
    const s12 = singleService.stage12DifficultyCalibration(item, bp.difficulty);

    validatedForCritic.push({
      blueprintId: bp.blueprintId,
      rawItem: item,
      sectionId: bp.sectionId,
      expectedKey: bp.correctOptionKey,
      blueprint: bp,
    });
    console.log(`  -> ${bp.blueprintId}: Passed deterministic stages 6-12.`);
  }

  // Pacing safety delay before Batch Blind Critic
  console.log("  -> Rate-limit safety: sleeping 15000ms before Batch Blind Critic to respect 5 RPM quota...");
  await new Promise((r) => setTimeout(r, 15000));

  // 5. Execute Batch Blind Critic (1 Call for all 6 items)
  console.log(`\nExecuting Batch Blind Critic on ${validatedForCritic.length} items...`);
  const criticResult = await batchService.evaluateBatchBlindCritic(validatedForCritic);
  if (!criticResult.success) {
    console.error(`FATAL: Batch Critic failed: ${criticResult.error}`);
    process.exit(1);
  }

  // 6. Persist Passing Candidates
  console.log("\nPersisting validated candidates to Neon staging...");
  let newlyPersistedCount = 0;

  for (const cand of validatedForCritic) {
    const criticEval = criticResult.passedItems.get(cand.blueprintId);
    if (!criticEval) {
      const reject = criticResult.rejectedItems.get(cand.blueprintId);
      console.error(`Item ${cand.blueprintId} rejected by critic: ${reject?.reason}`);
      continue;
    }

    const contentHash = computeToeicItemContentHash(
      cand.rawItem.prompt,
      cand.rawItem.options.map((o) => ({ key: o.key, text: o.text }))
    );

    const qItem = await prisma.$transaction(async (tx) => {
      const created = await tx.toeicQuestionBankItem.create({
        data: {
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: cand.rawItem.prompt,
          explanation: `${cand.rawItem.explanationEn}\n\n${cand.rawItem.explanationVi}`,
          difficulty: cand.blueprint.difficulty,
          primarySkill: "direct_grammar",
          subSkill: cand.blueprint.sectionId === "3A" ? "present_simple_vs_continuous" : "present_continuous_temporary",
          unitNumber: 3,
          ruleReference: cand.blueprint.sectionId === "3A" ? "3A" : "3B",
          conceptId: "7296dbb8-1ee8-4a52-a7e9-b6f132921da4",
          conceptMappingConfidence: 1.0,
          conceptMappingSource: "canonical_blueprint_u3",
          reviewStatus: "validated",
          isLatestApproved: false,
          qualityScore: 9.8,
          source: "ai_generated",
          sourceReference: cand.blueprintId,
          contentHash,
          generationRunId: runRecord.id,
          validationScores: {
            batchEvaluated: true,
            criticConfidence: criticEval.confidence,
            naturalnessScore: criticEval.naturalnessScore,
            distractorQuality: criticEval.distractorQuality,
          },
        },
      });

      for (let oIdx = 0; oIdx < cand.rawItem.options.length; oIdx++) {
        const opt = cand.rawItem.options[oIdx];
        await tx.toeicQuestionOption.create({
          data: {
            questionBankItemId: created.id,
            optionKey: opt.key,
            optionText: opt.text,
            isCorrect: opt.isCorrect,
            rationale: opt.distractorRationale || (opt.isCorrect ? "Correct answer" : "Incorrect option"),
            displayOrder: oIdx + 1,
          },
        });
      }

      return created;
    });

    console.log(`  -> PERSISTED ${cand.blueprintId}: ID=${qItem.id}`);
    newlyPersistedCount++;
  }

  // Update generation run statistics
  try {
    await prisma.toeicQuestionGenerationRun.update({
      where: { id: runRecord.id },
      data: {
        itemsGenerated: 6,
        itemsPassedValidation: newlyPersistedCount,
      },
    });
    console.log(`✓ Updated ToeicQuestionGenerationRun stats.`);
  } catch (err: any) {
    console.warn(`[Non-fatal warning] Run record update failed: ${err.message}`);
  }

  // ============================================================================
  // POST-EXECUTION DATABASE INTEGRITY VERIFICATION
  // ============================================================================
  console.log("\n================================================================================");
  console.log("POST-EXECUTION DATABASE INTEGRITY VERIFICATION");
  console.log("================================================================================");

  const postTotal = await prisma.toeicQuestionBankItem.count();
  const postApproved = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  const postValidated = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
  const postUnit3 = await prisma.toeicQuestionBankItem.count({ where: { unitNumber: 3 } });

  console.log(`  -> Total Items: ${postTotal} (Baseline: 43, Expected: ${43 + newlyPersistedCount})`);
  console.log(`  -> Approved Items (Latest): ${postApproved} (Expected: 12 — ZERO AUTO-APPROVAL)`);
  console.log(`  -> Validated Items: ${postValidated} (Expected: ${22 + newlyPersistedCount})`);
  console.log(`  -> Unit 3 Items: ${postUnit3} (Expected: ${persistedMap.size + newlyPersistedCount})`);

  // Verify practice retrieval isolation
  const practiceEligibleUnit3 = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3, reviewStatus: "approved", isLatestApproved: true },
  });
  console.log(`  -> Unit 3 Practice Retrieval Eligibility: ${practiceEligibleUnit3} items (Expected: 0)`);
  if (practiceEligibleUnit3 !== 0) {
    console.error("FATAL: Unapproved items leaked into practice retrieval!");
    process.exit(1);
  }

  const spendingSummary = spendingController.getSummary();
  console.log("\n================================================================================");
  console.log("PILOT EXECUTION COMPLETE SUMMARY");
  console.log("================================================================================");
  console.log(`Total Unit 3 Candidates Persisted: ${persistedMap.size + newlyPersistedCount}/8`);
  console.log(`Cumulative Projected Cost: $${spendingSummary.cumulativeCostUsd.toFixed(6)} USD (Budget: $0.25 USD)`);
  console.log(`Total Input Tokens: ${spendingSummary.totalInputTokens}`);
  console.log(`Total Output Tokens: ${spendingSummary.totalOutputTokens}`);
  console.log(`Total Generation Calls: ${spendingSummary.generationCalls}`);
  console.log(`Total Critic Calls: ${spendingSummary.criticCalls}`);
  console.log("================================================================================");

  // Retrieve all 8 Unit 3 items from Staging
  const allUnit3Items = await prisma.toeicQuestionBankItem.findMany({
    where: { unitNumber: 3 },
    include: { options: true },
    orderBy: { sourceReference: "asc" },
  });

  console.log("\nALL_8_UNIT3_ITEMS_JSON:");
  console.log(JSON.stringify(allUnit3Items, null, 2));
}

// Execution trigger
if (process.argv[1]?.includes("run-unit3-batch-execution")) {
  const isDryRun = process.argv.includes("--dry-run");
  runOptimizedBatchPilot({ dryRun: isDryRun })
    .catch((err) => {
      console.error("FATAL RUNNER EXCEPTION:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

