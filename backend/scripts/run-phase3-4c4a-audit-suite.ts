import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import {
  evaluatePairwiseDiversity,
  clusterQuestionsIntoIndependentContexts,
  classifyWorkplaceDomain,
  computeTemplateSimilarity,
  computeSlotAlignment,
  computeSemanticSimilarity,
  computeDistractorMorphologicalOverlap,
  computeRuleOverlap,
  QuestionForDiversityAnalysis,
} from "../src/services/contextual-diversity.service";

const prisma = new PrismaClient();

async function runAudit() {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4A: QUESTION BANK COMPREHENSIVE CURATION & EDITORIAL AUDIT");
  console.log("================================================================================");

  // 1. Fetch all items
  const items = await prisma.toeicQuestionBankItem.findMany({
    include: {
      options: { orderBy: { optionKey: "asc" } },
      concept: true,
      practiceItems: true,
      attemptItems: true,
      generationRun: true,
    },
    orderBy: [
      { unitNumber: "asc" },
      { rootQuestionId: "asc" },
      { version: "asc" },
    ],
  });

  console.log(`[Database Audit] Total items in toeic_question_bank_items: ${items.length}`);

  // 2. Map items to diversity format
  const diversityItems: QuestionForDiversityAnalysis[] = items.map((it) => ({
    id: it.id,
    prompt: it.prompt,
    options: it.options.map((o) => ({
      optionKey: o.optionKey,
      optionText: o.optionText,
      isCorrect: o.isCorrect,
    })),
    unitNumber: it.unitNumber,
    conceptId: it.conceptId,
    primarySkill: it.primarySkill,
    ruleReference: it.ruleReference,
  }));

  // 3. Cluster items per concept & per unit
  const clustersPerConcept = new Map<string, ReturnType<typeof clusterQuestionsIntoIndependentContexts>>();
  const clustersPerUnit = new Map<number, ReturnType<typeof clusterQuestionsIntoIndependentContexts>>();

  // Group by concept
  const itemsByConcept = new Map<string, QuestionForDiversityAnalysis[]>();
  for (const it of diversityItems) {
    const cId = it.conceptId || "NO_CONCEPT";
    if (!itemsByConcept.has(cId)) itemsByConcept.set(cId, []);
    itemsByConcept.get(cId)!.push(it);
  }

  for (const [cId, cItems] of itemsByConcept.entries()) {
    clustersPerConcept.set(cId, clusterQuestionsIntoIndependentContexts(cItems));
  }

  // Also group by unit
  const itemsByUnit = new Map<number, QuestionForDiversityAnalysis[]>();
  for (const it of diversityItems) {
    const uNum = it.unitNumber || 0;
    if (!itemsByUnit.has(uNum)) itemsByUnit.set(uNum, []);
    itemsByUnit.get(uNum)!.push(it);
  }

  for (const [uNum, uItems] of itemsByUnit.entries()) {
    clustersPerUnit.set(uNum, clusterQuestionsIntoIndependentContexts(uItems));
  }

  // 4. Audit each of the 37 items in detail
  const detailedItemAudits = items.map((item) => {
    const correctOptions = item.options.filter((o) => o.isCorrect);
    const hasSingleCorrect = correctOptions.length === 1;
    const hasFourOptions = item.options.length === 4;
    const hasBlankInPrompt = item.prompt.includes("_____") || item.prompt.includes("[BLANK]");
    
    // Evaluate answer-key correctness / sanity
    const correctOption = correctOptions[0];
    const answerKeyValid = hasSingleCorrect && hasFourOptions && hasBlankInPrompt;

    // Distractor analysis
    const distractors = item.options.filter((o) => !o.isCorrect);
    const distractorTexts = distractors.map((d) => d.optionText.trim().toLowerCase());
    const allDistractorsUnique = new Set(distractorTexts).size === distractors.length;
    const allDistractorsHaveRationale = distractors.every((d) => (d.rationale || "").trim().length > 10);

    // Concept cluster membership within its concept
    const cId = item.conceptId || "NO_CONCEPT";
    const conceptClusters = clustersPerConcept.get(cId) || [];
    let assignedClusterId = "unassigned";
    let clusterDomain = "unknown";
    for (const cl of conceptClusters) {
      if (cl.items.some((i) => i.id === item.id)) {
        assignedClusterId = cl.clusterId;
        clusterDomain = cl.domain;
        break;
      }
    }

    // Eligibility for future tau evidence
    // Eligibility rules from Phase 3.4C.1 / 3.4C.2:
    // 1. reviewStatus === "approved"
    // 2. isLatestApproved === true
    // 3. answerKeyValid === true
    // 4. conceptMappingConfidence >= 0.85
    // 5. not withdrawn / not archived
    const isTauEligible =
      item.reviewStatus === "approved" &&
      item.isLatestApproved === true &&
      answerKeyValid &&
      (item.conceptMappingConfidence ?? 0) >= 0.85;

    // Content Domain
    const domain = classifyWorkplaceDomain(item.prompt);

    return {
      id: item.id,
      rootQuestionId: item.rootQuestionId,
      version: item.version,
      reviewStatus: item.reviewStatus,
      isLatestApproved: item.isLatestApproved,
      unitNumber: item.unitNumber,
      conceptId: item.conceptId,
      conceptCode: item.concept?.code ?? null,
      conceptName: item.concept?.name ?? null,
      primarySkill: item.primarySkill,
      subSkill: item.subSkill,
      ruleReference: item.ruleReference,
      difficulty: item.difficulty,
      prompt: item.prompt,
      correctAnswerKey: correctOption?.optionKey ?? "NONE",
      correctAnswerText: correctOption?.optionText ?? "NONE",
      hasSingleCorrect,
      hasFourOptions,
      hasBlankInPrompt,
      answerKeyValid,
      allDistractorsUnique,
      allDistractorsHaveRationale,
      explanationLength: (item.explanation || "").trim().length,
      explanationQuality: (item.explanation || "").trim().length >= 40 ? "adequate" : "minimal_or_lacking",
      conceptMappingConfidence: item.conceptMappingConfidence,
      conceptMappingSource: item.conceptMappingSource,
      source: item.source,
      sourceReference: item.sourceReference,
      contentHash: item.contentHash,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt,
      withdrawnReason: item.withdrawnReason,
      reviewNotes: item.reviewNotes,
      attemptCount: item.attemptItems.length,
      practiceItemCount: item.practiceItems.length,
      domain,
      assignedClusterId,
      clusterDomain,
      isTauEligible,
      options: item.options.map((o) => ({
        key: o.optionKey,
        text: o.optionText,
        isCorrect: o.isCorrect,
        rationale: o.rationale,
      })),
    };
  });

  // 5. Test Connected-Components Chaining Problem
  console.log("\n================================================================================");
  console.log("TESTING CONNECTED-COMPONENTS CHAINING PROBLEM");
  console.log("================================================================================");

  // Construct synthetic chaining items:
  // Item A: IT domain server maintenance
  const itemA: QuestionForDiversityAnalysis = {
    id: "synthetic-A",
    prompt: "The IT technician is not at his desk because he _____ the server hardware in Room 3 right now.",
    options: [
      { optionKey: "A", optionText: "is repairing", isCorrect: true },
      { optionKey: "B", optionText: "repairs", isCorrect: false },
      { optionKey: "C", optionText: "repaired", isCorrect: false },
      { optionKey: "D", optionText: "has repaired", isCorrect: false },
    ],
    unitNumber: 1,
    conceptId: "unit.001",
    primarySkill: "direct_grammar",
    ruleReference: "Unit 1.A",
  };

  // Item B: Hybrid bridging item (similar syntax to A and C, but shares vocabulary with both)
  // Contains IT server keywords AND logistics warehouse delivery keywords
  const itemB: QuestionForDiversityAnalysis = {
    id: "synthetic-B",
    prompt: "The technician is not at his desk because he _____ server hardware delivery packages right now.",
    options: [
      { optionKey: "A", optionText: "is inspecting", isCorrect: true },
      { optionKey: "B", optionText: "inspects", isCorrect: false },
      { optionKey: "C", optionText: "inspected", isCorrect: false },
      { optionKey: "D", optionText: "has inspected", isCorrect: false },
    ],
    unitNumber: 1,
    conceptId: "unit.001",
    primarySkill: "direct_grammar",
    ruleReference: "Unit 1.A",
  };

  // Item C: Pure logistics warehouse shipping context
  const itemC: QuestionForDiversityAnalysis = {
    id: "synthetic-C",
    prompt: "The logistics manager is not at the warehouse because she _____ the international shipping manifests today.",
    options: [
      { optionKey: "A", optionText: "is verifying", isCorrect: true },
      { optionKey: "B", optionText: "verifies", isCorrect: false },
      { optionKey: "C", optionText: "verified", isCorrect: false },
      { optionKey: "D", optionText: "has verified", isCorrect: false },
    ],
    unitNumber: 1,
    conceptId: "unit.001",
    primarySkill: "direct_grammar",
    ruleReference: "Unit 1.A",
  };

  const metricsAB = evaluatePairwiseDiversity(itemA, itemB);
  const metricsBC = evaluatePairwiseDiversity(itemB, itemC);
  const metricsAC = evaluatePairwiseDiversity(itemA, itemC);

  console.log(`Pair (A, B): D_ctx = ${metricsAB.dCtx}, sCarrier = ${metricsAB.sCarrier}, sNorm = ${metricsAB.sNorm}, sSlot = ${metricsAB.sSlot}, sSem = ${metricsAB.sSem}`);
  console.log(`Pair (B, C): D_ctx = ${metricsBC.dCtx}, sCarrier = ${metricsBC.sCarrier}, sNorm = ${metricsBC.sNorm}, sSlot = ${metricsBC.sSlot}, sSem = ${metricsBC.sSem}`);
  console.log(`Pair (A, C): D_ctx = ${metricsAC.dCtx}, sCarrier = ${metricsAC.sCarrier}, sNorm = ${metricsAC.sNorm}, sSlot = ${metricsAC.sSlot}, sSem = ${metricsAC.sSem}`);

  const chainClustering = clusterQuestionsIntoIndependentContexts([itemA, itemB, itemC]);
  console.log(`Clustering result for [A, B, C]: ${chainClustering.length} clusters.`);
  for (const cl of chainClustering) {
    console.log(` - Cluster ${cl.clusterId} (${cl.domain}): [${cl.items.map((i) => i.id).join(", ")}]`);
  }

  // 6. Defective and Withdrawn Items Investigation
  console.log("\n================================================================================");
  console.log("DEFECTIVE AND WITHDRAWN ITEMS AUDIT");
  console.log("================================================================================");

  // Root 3d71c0d1
  const root3dItems = items.filter((it) => it.rootQuestionId.startsWith("3d71c0d1"));
  console.log(`Root 3d71c0d1 has ${root3dItems.length} version(s):`);
  for (const it of root3dItems) {
    console.log(` - Version ${it.version} (id: ${it.id}): status=${it.reviewStatus}, isLatestApproved=${it.isLatestApproved}, prompt="${it.prompt}"`);
  }

  // Root 6a54a874
  const root6aItems = items.filter((it) => it.rootQuestionId.startsWith("6a54a874"));
  console.log(`Root 6a54a874 has ${root6aItems.length} version(s):`);
  for (const it of root6aItems) {
    console.log(` - Version ${it.version} (id: ${it.id}): status=${it.reviewStatus}, isLatestApproved=${it.isLatestApproved}, prompt="${it.prompt}"`);
  }

  // 7. Context Coverage Matrix per Concept
  console.log("\n================================================================================");
  console.log("CONCEPT COVERAGE MATRIX");
  console.log("================================================================================");

  const conceptCoverageList = [];
  for (const [cId, cItems] of itemsByConcept.entries()) {
    const rawItems = items.filter((it) => (it.conceptId || "NO_CONCEPT") === cId);
    const conceptObj = rawItems[0]?.concept;
    const totalCount = rawItems.length;
    const approvedCount = rawItems.filter((it) => it.reviewStatus === "approved" && it.isLatestApproved).length;
    const validatedCount = rawItems.filter((it) => it.reviewStatus === "validated").length;
    const withdrawnCount = rawItems.filter((it) => it.reviewStatus === "withdrawn").length;
    const archivedCount = rawItems.filter((it) => it.reviewStatus === "archived").length;

    // Distinct context count (K_ctx) computed on ALL valid/candidate items vs approved items
    const allClusters = clustersPerConcept.get(cId) || [];
    const kCtxAll = allClusters.length;

    // K_ctx on approved only
    const approvedItems = cItems.filter((ci) => {
      const raw = rawItems.find((r) => r.id === ci.id);
      return raw?.reviewStatus === "approved" && raw?.isLatestApproved;
    });
    const approvedClusters = clusterQuestionsIntoIndependentContexts(approvedItems);
    const kCtxApproved = approvedClusters.length;

    // Invalid or uncertain items
    const uncertainItems = rawItems.filter((it) => {
      const tokens = it.prompt.split(/\s+/).length;
      return tokens < 6 || !it.prompt.includes("_____");
    });

    const isEvidenceSufficient = kCtxApproved >= 3 && approvedCount >= 3;

    conceptCoverageList.push({
      conceptId: cId,
      conceptCode: conceptObj?.code ?? "NONE",
      conceptName: conceptObj?.name ?? "NONE",
      unitNumber: rawItems[0]?.unitNumber ?? 0,
      totalCount,
      approvedCount,
      validatedCount,
      withdrawnCount,
      archivedCount,
      kCtxAll,
      kCtxApproved,
      uncertainCount: uncertainItems.length,
      isEvidenceSufficient,
      allClusters: allClusters.map((c) => ({
        id: c.clusterId,
        domain: c.domain,
        itemCount: c.items.length,
        itemIds: c.items.map((i) => i.id),
      })),
      approvedClusters: approvedClusters.map((c) => ({
        id: c.clusterId,
        domain: c.domain,
        itemCount: c.items.length,
        itemIds: c.items.map((i) => i.id),
      })),
    });

    console.log(
      `Concept: ${conceptObj?.code || cId} | Total: ${totalCount} | Appr: ${approvedCount} | Val: ${validatedCount} | K_ctx(All): ${kCtxAll} | K_ctx(Appr): ${kCtxApproved} | Sufficient: ${isEvidenceSufficient}`
    );
  }

  // 8. Save full audit data to JSON
  const auditReportData = {
    generatedAt: new Date().toISOString(),
    totalBankItems: items.length,
    detailedItemAudits,
    chainingTest: {
      metricsAB,
      metricsBC,
      metricsAC,
      chainClustering: chainClustering.map((c) => ({
        id: c.clusterId,
        domain: c.domain,
        items: c.items.map((i) => i.id),
      })),
    },
    root3dItems: root3dItems.map((it) => ({
      id: it.id,
      version: it.version,
      reviewStatus: it.reviewStatus,
      isLatestApproved: it.isLatestApproved,
      prompt: it.prompt,
      withdrawnReason: it.withdrawnReason,
    })),
    root6aItems: root6aItems.map((it) => ({
      id: it.id,
      version: it.version,
      reviewStatus: it.reviewStatus,
      isLatestApproved: it.isLatestApproved,
      prompt: it.prompt,
      withdrawnReason: it.withdrawnReason,
    })),
    conceptCoverageList,
  };

  const outPath = path.resolve(__dirname, "../recovery/phase3-4c4a-complete-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(auditReportData, null, 2), "utf8");
  console.log(`\n[Audit Complete] Comprehensive audit output written to: ${outPath}`);
}

runAudit()
  .catch((e) => {
    console.error("Audit suite error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

