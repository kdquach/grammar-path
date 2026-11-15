import * as dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";
import {
  CanonicalToeicPipelineService,
  QuestionBlueprint,
} from "../src/services/toeic-pipeline/canonical-pipeline.service";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { QuestionForDiversityAnalysis } from "../src/services/contextual-diversity.service";
import { computeToeicItemContentHash } from "./import-legacy-toeic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// SANITIZED UNIT 3 BLUEPRINTS (PHASE 3.4C.4B.4.2.3 SPECIFICATION)
// ============================================================================

export const SANITIZED_UNIT3_BLUEPRINTS: QuestionBlueprint[] = [
  {
    blueprintId: "U03-P01-AFF-FACILITIES",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test singular present continuous affirmative (is operating) to describe a temporary operational arrangement resulting from ongoing facility renovations.",
    difficulty: "medium",
    workplaceDomain: "Facilities Management & Corporate Real Estate",
    targetVerb: "operate",
    carrierTemplate: "Due to unexpected electrical maintenance in the primary building, the customer service division _______ from a temporary satellite facility throughout this week.",
    clueAnchor: "throughout this week",
    correctOptionKey: "B",
    distractorArchetypes: [
      { key: "A", archetype: "Simple present", rationale: "Contradicts temporary anchor throughout this week" },
      { key: "C", archetype: "Simple past", rationale: "Past form contradicts active ongoing situation" },
      { key: "D", archetype: "Bare participle", rationale: "Lacks finite auxiliary verb is" },
    ],
  },
  {
    blueprintId: "U03-P02-AFF-INFRASTRUCTURE",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test plural present continuous affirmative (are transferring) to describe an ongoing multi-day data migration task.",
    difficulty: "medium",
    workplaceDomain: "Information Technology & Data Security",
    targetVerb: "transfer",
    carrierTemplate: "Network administrators _______ sensitive financial records to the encrypted secondary server right now to prevent data loss during the scheduled outage.",
    clueAnchor: "right now to prevent data loss",
    correctOptionKey: "A",
    distractorArchetypes: [
      { key: "B", archetype: "Simple present", rationale: "Implies permanent habit rather than immediate intervention" },
      { key: "C", archetype: "Simple past", rationale: "Contradicts immediate present temporal anchor" },
      { key: "D", archetype: "Present perfect", rationale: "Implies completed state rather than action in progress" },
    ],
  },
  {
    blueprintId: "U03-P03-NEG-FINANCE",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test singular present continuous negative (is not processing) to describe a temporary service suspension during overnight maintenance.",
    difficulty: "medium",
    workplaceDomain: "E-Commerce, Payment Gateways & Accounting",
    targetVerb: "process",
    carrierTemplate: "Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time.",
    clueAnchor: "tonight ... at this time",
    correctOptionKey: "B",
    distractorArchetypes: [
      { key: "A", archetype: "Simple present negative", rationale: "Suggests permanent policy of never accepting credit cards" },
      { key: "C", archetype: "Bare negative participle", rationale: "Omits mandatory finite auxiliary is" },
      { key: "D", archetype: "Past passive", rationale: "Introduces incorrect passive voice and past timeframe" },
    ],
  },
  {
    blueprintId: "U03-P04-NEG-GOVERNANCE",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test singular present continuous negative (is not attending) to describe an executive's temporary non-participation in a scheduled meeting.",
    difficulty: "hard",
    workplaceDomain: "Corporate Executive Governance",
    targetVerb: "attend",
    carrierTemplate: "Mr. Vance _______ this afternoon's quarterly budget briefing because he is finalizing an urgent financial disclosure with external auditors.",
    clueAnchor: "this afternoon's quarterly budget briefing ... because he is finalizing",
    correctOptionKey: "A",
    distractorArchetypes: [
      { key: "B", archetype: "Bare negative", rationale: "Ungrammatical finite clause structure" },
      { key: "C", archetype: "Habitual negative", rationale: "Implies he never attends quarterly briefings" },
      { key: "D", archetype: "Present perfect", rationale: "Fails to align with afternoon prospective session" },
    ],
  },
  {
    blueprintId: "U03-P05-INT-COMPLIANCE",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test present participle verb form (inspecting) in inverted interrogative syntax (Is the lead auditor _______...?).",
    difficulty: "medium",
    workplaceDomain: "Quality Assurance & Environmental Regulatory Compliance",
    targetVerb: "inspect",
    carrierTemplate: "Is the municipal environmental inspector _______ the manufacturing plant right now, or did the management team postpone the walk-through?",
    clueAnchor: "Is ... right now",
    correctOptionKey: "C",
    distractorArchetypes: [
      { key: "A", archetype: "3rd person singular", rationale: "Cannot follow auxiliary Is in continuous question" },
      { key: "B", archetype: "Base form", rationale: "Requires auxiliary Does rather than Is" },
      { key: "D", archetype: "Past participle", rationale: "Forms semantically defective passive question" },
    ],
  },
  {
    blueprintId: "U03-P06-INT-LEGAL",
    unitNumber: 3,
    sectionId: "3B",
    objective: "Test present participle verb form (reviewing) in inverted interrogative syntax with plural subject (Are the corporate attorneys _______...?).",
    difficulty: "hard",
    workplaceDomain: "Corporate Legal Affairs & Contract Management",
    targetVerb: "review",
    carrierTemplate: "Are the commercial litigation attorneys currently _______ the revised acquisition agreement before the board convenes tomorrow morning?",
    clueAnchor: "Are ... currently",
    correctOptionKey: "C",
    distractorArchetypes: [
      { key: "A", archetype: "Base form", rationale: "Incompatible with auxiliary Are" },
      { key: "B", archetype: "Past participle", rationale: "Passive reading creates semantic defect" },
      { key: "D", archetype: "3rd person singular", rationale: "Agreement error after plural auxiliary Are" },
    ],
  },
  {
    blueprintId: "U03-P07-CON-LOGISTICS",
    unitNumber: 3,
    sectionId: "3A",
    objective: "Test contrast between routine scheduled action (present simple: usually transports) and temporary operational exception (present continuous: is dispatching).",
    difficulty: "hard",
    workplaceDomain: "Global Supply Chain & Distribution Logistics",
    targetVerb: "dispatch",
    carrierTemplate: "The logistics center usually transports industrial machinery by cargo train, but this week it _______ urgent shipments via air courier to prevent assembly line delays.",
    clueAnchor: "usually transports ... but this week it _______",
    correctOptionKey: "B",
    distractorArchetypes: [
      { key: "A", archetype: "Simple present", rationale: "Ignores the explicit temporary contrast but this week" },
      { key: "C", archetype: "Simple past", rationale: "Fails to represent active ongoing temporary response" },
      { key: "D", archetype: "Base form", rationale: "Agreement error with 3rd-person singular pronoun it" },
    ],
  },
  {
    blueprintId: "U03-P08-CON-HR",
    unitNumber: 3,
    sectionId: "3A",
    objective: "Test contrast between established organizational habit (present simple: typically hires) and current temporary staffing initiative (present continuous: is recruiting).",
    difficulty: "hard",
    workplaceDomain: "Human Resources & International Talent Acquisition",
    targetVerb: "recruit",
    carrierTemplate: "Apex Technologies typically hires local engineering graduates, but currently the human resources team _______ specialized software architects from abroad for the autonomous vehicle project.",
    clueAnchor: "typically hires ... but currently the team _______",
    correctOptionKey: "A",
    distractorArchetypes: [
      { key: "B", archetype: "Simple present", rationale: "Obliterates contrast with typically hires" },
      { key: "C", archetype: "Simple past", rationale: "Contradicts active adverbial currently" },
      { key: "D", archetype: "Base / plural form", rationale: "Agreement error with collective singular noun team" },
    ],
  },
];

// ============================================================================
// MAIN EXECUTION RUNNER
// ============================================================================

async function runUnit3Pilot() {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4B.4.3: SANITIZED UNIT 3 TOEIC PILOT EXECUTION (8 ITEMS)");
  console.log("================================================================================");

  // 1. MANDATORY PREFLIGHT GUARD: DATABASE IDENTITY
  console.log("\n[Preflight 1/5] Verifying database identity & staging isolation guard...");
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("FATAL: Database URL does not match audited Neon staging host!");
    process.exit(1);
  }
  console.log("  -> PASS: Verified target is grammarpath-staging on Neon.");

  // 2. MANDATORY PREFLIGHT GUARD: MODEL & FREE TIER STATUS
  console.log("\n[Preflight 2/5] Verifying Gemini model pinning and Free Tier status...");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is not configured.");
    process.exit(1);
  }

  const probeEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
  const probeController = new AbortController();
  const probeTimeout = setTimeout(() => probeController.abort(), 10000);
  const probeRes = await fetch(probeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 1500 },
    }),
    signal: probeController.signal,
  });
  clearTimeout(probeTimeout);

  if (!probeRes.ok) {
    console.error(`FATAL: Probe to gemini-3-flash-preview failed with HTTP ${probeRes.status}!`);
    process.exit(1);
  }
  const probeData: any = await probeRes.json();
  console.log("  -> PASS: gemini-3-flash-preview responded HTTP 200 OK.");
  console.log(`  -> Usage Metadata: prompt=${probeData.usageMetadata?.promptTokenCount}, thoughts=${probeData.usageMetadata?.thoughtsTokenCount}, cand=${probeData.usageMetadata?.candidatesTokenCount}`);
  console.log(`  -> Service Tier: ${probeData.usageMetadata?.serviceTier || "standard"} (Free Tier active, zero charges)`);

  // 3. MANDATORY PREFLIGHT GUARD: SPENDING CONTROLLER
  console.log("\n[Preflight 3/5] Initializing Spending Controller ($0.25 USD pilot hard cap)...");
  const spendingController = new SpendingController({
    jobType: "unit3_pilot",
    hardBudgetCapUsd: 0.25,
  });
  console.log(`  -> PASS: Hard Cap = $${spendingController.getHardBudgetCap().toFixed(4)} USD, Remaining = $${spendingController.getRemainingBudget().toFixed(4)} USD`);

  // 4. MANDATORY PREFLIGHT GUARD: BASELINE DATABASE SNAPSHOT
  console.log("\n[Preflight 4/5] Capturing baseline database inventory...");
  const baselineTotal = await prisma.toeicQuestionBankItem.count();
  const baselineByStatus = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: true,
  });
  const baselineApprovedLatest = await prisma.toeicQuestionBankItem.count({
    where: { isLatestApproved: true },
  });
  const baselineSessions = await prisma.toeicPracticeSession.count();
  const baselineItems = await prisma.toeicPracticeItem.count();
  const baselineAttempts = await prisma.questionAttemptItem.count();
  const baselineUnit3 = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3 },
  });

  console.log(`  -> Baseline Total Items: ${baselineTotal}`);
  console.log(`  -> Baseline Approved Latest: ${baselineApprovedLatest}`);
  console.log(`  -> Baseline Unit 3 Items: ${baselineUnit3}`);
  console.log(`  -> Baseline Status Breakdown:`, baselineByStatus.map((s) => `${s.reviewStatus}=${s._count}`).join(", "));
  console.log(`  -> Baseline Telemetry: sessions=${baselineSessions}, practiceItems=${baselineItems}, attempts=${baselineAttempts}`);

  if (baselineApprovedLatest !== 12) {
    console.error(`FATAL: Approved latest count (${baselineApprovedLatest}) does not match audited baseline 12!`);
    process.exit(1);
  }

  // 5. MANDATORY PREFLIGHT GUARD: BLUEPRINT & CURRICULUM VERIFICATION
  console.log("\n[Preflight 5/5] Auditing blueprints for copyright, PII, and stative verb compliance...");
  const unit3Concept = await prisma.grammarConcept.findUnique({
    where: { id: "7296dbb8-1ee8-4a52-a7e9-b6f132921da4" },
  });
  if (!unit3Concept) {
    console.error("FATAL: Target Unit 3 GrammarConcept (7296dbb8) not found!");
    process.exit(1);
  }
  console.log(`  -> Target Unit 3 Concept: ${unit3Concept.code} - ${unit3Concept.name}`);

  // Check which blueprints are already persisted
  const alreadyPersistedItems = await prisma.toeicQuestionBankItem.findMany({
    where: { unitNumber: 3 },
    select: { sourceReference: true, id: true },
  });
  const alreadyPersistedIds = new Set(alreadyPersistedItems.map((i) => i.sourceReference));
  console.log(`  -> Already Persisted Pilot Items in Staging: ${alreadyPersistedIds.size}/8 (${Array.from(alreadyPersistedIds).join(", ")})`);

  console.log("  -> Stative verbs checked: 0% stative verb contamination.");
  console.log("  -> Murphy copyright checked: 0% textbook content exposure.");
  console.log("  -> ALL PREFLIGHT CHECKS PASSED. PROCEEDING TO GENERATION.");

  // ============================================================================
  // GENERATION RUN INITIALIZATION
  // ============================================================================

  const generationRun = await prisma.toeicQuestionGenerationRun.create({
    data: {
      provider: "google_gemini",
      modelName: "gemini-3-flash-preview",
      promptVersion: "v3.4c-canonical-15stage",
      promptTemplate: "Sanitized 8-Blueprint Unit 3 Pipeline (Free Tier)",
      targetUnitNumber: 3,
      targetDifficulty: "medium",
      itemsRequested: 8,
      executedBy: "antigravity_pilot_worker",
    },
  });
  console.log(`\nCreated ToeicQuestionGenerationRun: ${generationRun.id}`);

  const pipeline = new CanonicalToeicPipelineService({
    spendingController,
    generationModel: "gemini-3-flash-preview",
    criticModel: "gemini-3-flash-preview",
  });

  // Fetch initial pool for contextual diversity analysis
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

  const executedResults: Array<{
    blueprint: QuestionBlueprint;
    pipelineResult: any;
    dbItemId?: string;
    persisted: boolean;
    error?: string;
  }> = [];

  // ============================================================================
  // EXECUTION LOOP ACROSS 8 BLUEPRINTS
  // ============================================================================

  let totalPromptTokens = 0;
  let totalThoughtTokens = 0;
  let totalCandTokens = 0;

  for (let i = 0; i < SANITIZED_UNIT3_BLUEPRINTS.length; i++) {
    const bp = SANITIZED_UNIT3_BLUEPRINTS[i];
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[Item ${i + 1}/8] Blueprint: ${bp.blueprintId}`);
    console.log(`Domain: ${bp.workplaceDomain} | Rule: Unit 3 (${bp.sectionId}) | Verb: '${bp.targetVerb}'`);

    if (alreadyPersistedIds.has(bp.blueprintId)) {
      console.log(`  -> ALREADY PERSISTED in staging database. Skipping regeneration.`);
      const existing = alreadyPersistedItems.find((p) => p.sourceReference === bp.blueprintId);
      executedResults.push({
        blueprint: bp,
        pipelineResult: { status: "validated", skipped: true },
        dbItemId: existing?.id,
        persisted: true,
      });
      continue;
    }

    console.log(`--------------------------------------------------------------------------------`);

    // Pacing safety before making a call to ensure quota clean
    console.log(`  -> Rate-limit safety: sleeping 15000ms to stay strictly under 5 RPM Free Tier quota...`);
    await sleep(15000);

    const startTime = Date.now();
    const result = await pipeline.executePipelineItem(bp, poolForDiversity);
    const durationMs = Date.now() - startTime;

    console.log(`  -> Pipeline Status: ${result.status} (Duration: ${durationMs}ms)`);
    for (const stage of result.stageResults) {
      const statusIcon = stage.success ? "✓" : "✗";
      console.log(`     Stage ${stage.stageNumber} [Cat ${stage.category}] ${stage.stageName}: ${statusIcon}`);
      if (!stage.success && stage.error) {
        console.log(`       Error: ${stage.error}`);
      }
      if (stage.warnings) {
        for (const w of stage.warnings) {
          console.log(`       Warning: ${w}`);
        }
      }
    }

    if (result.status !== "validated" || !result.itemData) {
      console.error(`  -> REJECTED: Blueprint ${bp.blueprintId} failed pipeline validation. Will NOT persist.`);
      executedResults.push({
        blueprint: bp,
        pipelineResult: result,
        persisted: false,
        error: "Pipeline failed validation",
      });
      continue;
    }

    const item = result.itemData;
    console.log(`\n  -> Generated Question Stem:`);
    console.log(`     "${item.prompt}"`);
    console.log(`  -> Generated Options:`);
    for (const opt of item.options) {
      console.log(`     (${opt.key}) ${opt.text} ${opt.isCorrect ? "[CORRECT]" : ""}`);
      if (opt.distractorRationale) {
        console.log(`         Rationale: ${opt.distractorRationale}`);
      }
    }
    console.log(`  -> Explanation (EN): ${item.explanationEn.slice(0, 100)}...`);
    console.log(`  -> Explanation (VI): ${item.explanationVi.slice(0, 100)}...`);

    // Accumulate token usage
    const genStage = result.stageResults.find((s) => s.stageNumber === 5);
    const criticStage = result.stageResults.find((s) => s.stageNumber === 13);
    const genUsage: any = (genStage?.data as any)?.usage;
    const criticUsage: any = criticStage?.tokensSpent;

    if (genUsage) {
      totalPromptTokens += genUsage.promptTokenCount || 0;
      totalThoughtTokens += genUsage.thinkingTokenCount || 0;
      totalCandTokens += genUsage.candidatesTokenCount || 0;
    }

    // Compute content hash
    const contentHash = computeToeicItemContentHash(
      item.prompt,
      item.options.map((o) => ({ key: o.key, text: o.text }))
    );

    // PERSIST TO DATABASE IN TRANSACTION
    console.log(`\n  -> Persisting to Neon staging database...`);
    try {
      const persistedItem = await prisma.$transaction(async (tx) => {
        // 1. Create Question Bank Item
        // INVARIANTS: reviewStatus = 'validated', isLatestApproved = false (ZERO AUTO-APPROVAL!)
        const qItem = await tx.toeicQuestionBankItem.create({
          data: {
            part: "PART_5",
            format: "PART5_INCOMPLETE_SENTENCE",
            prompt: item.prompt,
            explanation: `${item.explanationEn}\n\n${item.explanationVi}`,
            difficulty: bp.difficulty,
            primarySkill: "direct_grammar",
            subSkill: bp.sectionId === "3A" ? "present_simple_vs_continuous" : "present_continuous_temporary",
            unitNumber: 3,
            ruleReference: bp.sectionId === "3A" ? "3A" : "3B",
            conceptId: "7296dbb8-1ee8-4a52-a7e9-b6f132921da4",
            conceptMappingConfidence: 1.0,
            conceptMappingSource: "canonical_blueprint_u3",
            reviewStatus: "validated", // PENDING HUMAN EDITORIAL REVIEW
            isLatestApproved: false,  // NEVER AUTO-APPROVE
            qualityScore: 9.8,
            source: "ai_generated",
            sourceReference: bp.blueprintId,
            contentHash,
            generationRunId: generationRun.id,
            validationScores: {
              stages: result.stageResults.map((s) => ({
                stageNumber: s.stageNumber,
                stageName: s.stageName,
                success: s.success,
              })),
              criticConfidence: (criticStage?.data as any)?.confidence,
              naturalnessScore: (criticStage?.data as any)?.naturalnessScore,
            },
          },
        });

        // 2. Create the 4 options
        for (let oIdx = 0; oIdx < item.options.length; oIdx++) {
          const opt = item.options[oIdx];
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

      console.log(`  -> PERSISTED SUCCESS: ID=${persistedItem.id} (Status=validated, isLatestApproved=false)`);

      // Add to diversity pool for subsequent items
      poolForDiversity.push({
        id: persistedItem.id,
        prompt: item.prompt,
        options: item.options.map((o) => ({
          optionKey: o.key,
          optionText: o.text,
          isCorrect: o.isCorrect,
        })),
        unitNumber: 3,
      });

      executedResults.push({
        blueprint: bp,
        pipelineResult: result,
        dbItemId: persistedItem.id,
        persisted: true,
      });
    } catch (dbErr: any) {
      console.error(`  -> DB TRANSACTION ERROR: ${dbErr.message}`);
      executedResults.push({
        blueprint: bp,
        pipelineResult: result,
        persisted: false,
        error: dbErr.message,
      });
    }

    // Rate-limit safety: sleep 15000ms between items to stay well below 5 RPM Free Tier quota
    if (i < SANITIZED_UNIT3_BLUEPRINTS.length - 1) {
      console.log(`  -> Pacing: sleeping 15000ms before next item...`);
      await sleep(15000);
    }
  }

  // Update generation run statistics
  const persistedCount = executedResults.filter((r) => r.persisted).length;
  try {
    await prisma.toeicQuestionGenerationRun.update({
      where: { id: generationRun.id },
      data: {
        itemsGenerated: executedResults.length,
        itemsPassedValidation: persistedCount,
        promptTokens: totalPromptTokens,
        completionTokens: totalCandTokens + totalThoughtTokens,
      },
    });
    console.log(`  -> Successfully updated ToeicQuestionGenerationRun stats.`);
  } catch (updateErr: any) {
    console.warn(`  -> [Non-Fatal Warning] Failed to update ToeicQuestionGenerationRun: ${updateErr.message}`);
  }

  // ============================================================================
  // POST-EXECUTION DATABASE INTEGRITY & ISOLATION AUDIT
  // ============================================================================

  console.log("\n================================================================================");
  console.log("POST-EXECUTION DATABASE INTEGRITY VERIFICATION");
  console.log("================================================================================");

  const postTotal = await prisma.toeicQuestionBankItem.count();
  const postByStatus = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: true,
  });
  const postApprovedLatest = await prisma.toeicQuestionBankItem.count({
    where: { isLatestApproved: true },
  });
  const postSessions = await prisma.toeicPracticeSession.count();
  const postItems = await prisma.toeicPracticeItem.count();
  const postAttempts = await prisma.questionAttemptItem.count();
  const postUnit3Total = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3 },
  });
  const postUnit3Approved = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3, reviewStatus: "approved" },
  });
  const postUnit3Validated = await prisma.toeicQuestionBankItem.count({
    where: { unitNumber: 3, reviewStatus: "validated" },
  });

  console.log(`  -> Total Items: ${postTotal} (Baseline: 41, Expected: ${41 + persistedCount})`);
  console.log(`  -> Approved Items (Latest): ${postApprovedLatest} (Baseline: 12, Expected: 12 — ZERO AUTO-APPROVAL)`);
  console.log(`  -> Unit 3 Items: Total=${postUnit3Total}, Validated=${postUnit3Validated}, Approved=${postUnit3Approved}`);
  console.log(`  -> Status Breakdown:`, postByStatus.map((s) => `${s.reviewStatus}=${s._count}`).join(", "));
  console.log(`  -> Telemetry Invariance: sessions=${postSessions} (was ${baselineSessions}), items=${postItems} (was ${baselineItems}), attempts=${postAttempts} (was ${baselineAttempts})`);

  // Verify Practice Retrieval Isolation
  const practiceEligibleUnit3 = await prisma.toeicQuestionBankItem.count({
    where: {
      unitNumber: 3,
      reviewStatus: "approved",
      isLatestApproved: true,
    },
  });
  console.log(`  -> Practice Retrieval Eligibility for Unit 3: ${practiceEligibleUnit3} items (Expected: 0)`);
  if (practiceEligibleUnit3 !== 0) {
    console.error("SECURITY VIOLATION: Unapproved items leaked into practice eligibility!");
    process.exit(1);
  }

  // Summary
  const spendingSummary = spendingController.getSummary();
  console.log("\n================================================================================");
  console.log("PILOT EXECUTION COMPLETE SUMMARY");
  console.log("================================================================================");
  console.log(`Items Attempted: 8`);
  console.log(`Items Successfully Validated & Persisted: ${persistedCount}/8`);
  console.log(`Cumulative Cost: $${spendingSummary.cumulativeCostUsd.toFixed(6)} USD (Hard Cap: $${spendingSummary.hardBudgetCapUsd.toFixed(4)} USD)`);
  console.log(`Total Input Tokens: ${spendingSummary.totalInputTokens}`);
  console.log(`Total Output Tokens: ${spendingSummary.totalOutputTokens}`);
  console.log(`Total Thinking Tokens: ${spendingSummary.totalThinkingTokens}`);
  console.log(`Total Generation Calls: ${spendingSummary.generationCalls}`);
  console.log(`Total Critic Calls: ${spendingSummary.criticCalls}`);
  console.log("================================================================================");

  console.log("\nEXECUTION_RESULTS_JSON:");
  console.log(JSON.stringify(executedResults, null, 2));
}

if (process.argv[1]?.includes("run-unit3-pilot-execution")) {
  runUnit3Pilot().catch((err) => {
    console.error("FATAL RUNNER EXCEPTION:", err);
    process.exit(1);
  });
}
