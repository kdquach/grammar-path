import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import {
  evaluatePairwiseDiversity,
  clusterQuestionsIntoIndependentContexts,
  classifyWorkplaceDomain,
  QuestionForDiversityAnalysis,
} from "../src/services/contextual-diversity.service";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CALCULATING COMPLETE 66-PAIR DIVERSITY MATRIX FOR 12 UNIT 1 ITEMS ===");

  const targetIds = [
    "45e751fd-4915-4bac-a386-c7bae5295911", // Retained approved (IT server repair)
    // 7 existing candidates:
    "b7c4793c-ba61-4ae6-92e2-74096f6a8557", // Marketing market share
    "c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c", // Corporate leave policy debate
    "0f51d836-b360-4423-b19e-71ea358be557", // Marketing client phone call
    "2afc939e-9d24-40d8-98c3-75a198006930", // Finance Patterson quarterly review
    "2997562b-8ae1-4e19-8dd2-f110d41865e0", // Manufacturing automotive robotics
    "7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83", // Corporate merger negotiation
    "322c0e5c-d12b-4617-b88d-cace81c8e545", // Logistics maritime customs delays
    // 4 V3 items:
    "048df761-7f70-4249-b4f1-f075a87c9432", // Finance CFO audit review
    "add7a35b-e014-4747-82af-ef0d1239ee51", // Logistics container terminal customs
    "a4229728-763b-4b22-8bb9-6436a0ffba76", // Facility supervisor executive suite
    "8a41b01a-1c9b-4072-a584-86387d7e6f97", // HR training safety guidelines
  ];

  const rawItems = await prisma.toeicQuestionBankItem.findMany({
    where: { id: { in: targetIds } },
    include: { options: { orderBy: { optionKey: "asc" } }, concept: true },
  });

  // Preserve order of targetIds
  const items = targetIds.map((id) => rawItems.find((r) => r.id === id)!);

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

  const n = diversityItems.length;
  console.log(`Analyzing pool of ${n} items. Expected pairs: ${(n * (n - 1)) / 2}`);

  const pairs: any[] = [];
  let minDistance = 1.0;
  let maxDistance = 0.0;
  let sumDistance = 0;
  let minPair = "";
  let maxPair = "";

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const itemA = diversityItems[i];
      const itemB = diversityItems[j];
      const metrics = evaluatePairwiseDiversity(itemA, itemB);

      sumDistance += metrics.dCtx;
      if (metrics.dCtx < minDistance) {
        minDistance = metrics.dCtx;
        minPair = `${itemA.id.slice(0, 8)} vs ${itemB.id.slice(0, 8)}`;
      }
      if (metrics.dCtx > maxDistance) {
        maxDistance = metrics.dCtx;
        maxPair = `${itemA.id.slice(0, 8)} vs ${itemB.id.slice(0, 8)}`;
      }

      pairs.push({
        pairIndex: pairs.length + 1,
        idA: itemA.id,
        idB: itemB.id,
        shortA: itemA.id.slice(0, 8),
        shortB: itemB.id.slice(0, 8),
        promptA: itemA.prompt,
        promptB: itemB.prompt,
        domainA: metrics.workplaceDomainA,
        domainB: metrics.workplaceDomainB,
        sNorm: metrics.sNorm,
        sSlot: metrics.sSlot,
        sSem: metrics.sSem,
        sDist: metrics.sDist,
        sRule: metrics.sRule,
        sCarrier: metrics.sCarrier,
        dCtx: metrics.dCtx,
        relationship: metrics.relationship,
        isIndependent: metrics.dCtx >= 0.50,
      });
    }
  }

  const meanDistance = sumDistance / pairs.length;
  const variance = pairs.reduce((acc, p) => acc + Math.pow(p.dCtx - meanDistance, 2), 0) / pairs.length;
  const stdDev = Math.sqrt(variance);

  console.log(`\n--- DIVERSITY SUMMARY METRICS ---`);
  console.log(`Total Pairs Evaluated: ${pairs.length}`);
  console.log(`Min Distance: ${minDistance.toFixed(3)} (${minPair})`);
  console.log(`Max Distance: ${maxDistance.toFixed(3)} (${maxPair})`);
  console.log(`Mean Distance: ${meanDistance.toFixed(3)}`);
  console.log(`Std Deviation: ${stdDev.toFixed(3)}`);

  const borderlinePairs = pairs.filter((p) => p.dCtx < 0.60);
  console.log(`Pairs with D_ctx < 0.60 (borderline/close): ${borderlinePairs.length}`);
  borderlinePairs.forEach((p) => {
    console.log(` - [${p.shortA} vs ${p.shortB}] D_ctx=${p.dCtx} (${p.domainA} vs ${p.domainB}) | sCarrier=${p.sCarrier}`);
  });

  const belowThreshold = pairs.filter((p) => p.dCtx < 0.50);
  console.log(`Pairs with D_ctx < 0.50 (violating independence): ${belowThreshold.length}`);

  // Run Clustering
  const clusters = clusterQuestionsIntoIndependentContexts(diversityItems);
  console.log(`\nConnected Components Cluster Count (K_ctx): ${clusters.length}`);
  clusters.forEach((c) => {
    console.log(` - ${c.clusterId} (${c.domain}): [${c.items.map((i) => i.id.slice(0, 8)).join(", ")}]`);
  });

  // Save complete data
  const outDir = path.resolve(__dirname, "../recovery/phase3-4c4b2-pre-backup");
  fs.writeFileSync(path.join(outDir, "pool12_pairwise_matrix.json"), JSON.stringify({
    totalItems: n,
    totalPairs: pairs.length,
    minDistance,
    maxDistance,
    meanDistance,
    stdDev,
    minPair,
    maxPair,
    borderlineCount: borderlinePairs.length,
    belowThresholdCount: belowThreshold.length,
    clusterCount: clusters.length,
    clusters: clusters.map((c) => ({
      clusterId: c.clusterId,
      domain: c.domain,
      itemCount: c.items.length,
      itemIds: c.items.map((i) => i.id),
    })),
    pairs,
  }, null, 2), "utf8");

  console.log(`Saved complete 66-pair matrix to ${path.join(outDir, "pool12_pairwise_matrix.json")}`);
}

main()
  .catch((e) => {
    console.error("Matrix error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

