import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RemapSpec {
  id: string;
  targetUnit: number;
  targetRule: string;
  targetConceptCode: string;
  targetConceptId: string;
  rationale: string;
}

const CONFIRMED_REMAPPINGS: RemapSpec[] = [
  {
    id: "43753724-dcb3-4681-adb5-5d0c71d34b7c",
    targetUnit: 5,
    targetRule: "5A",
    targetConceptCode: "unit.005",
    targetConceptId: "9f16b6e4-d5fd-48f2-ae12-ed721c924df9",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.003 to unit.005: Past Simple with completed time adjunct 'Last Friday'.",
  },
  {
    id: "6948841f-9dc6-487c-83ed-04c6ebfbc9fe",
    targetUnit: 6,
    targetRule: "6B",
    targetConceptCode: "unit.006",
    targetConceptId: "54010bbc-eb52-45ea-af6f-daba266f8fe0",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.003 to unit.006: Past Continuous interrupted by sudden past event (fire alarm sounded).",
  },
  {
    id: "77299aeb-93d6-483e-9f77-4d5a8c67496a",
    targetUnit: 40,
    targetRule: "40B",
    targetConceptCode: "unit.040",
    targetConceptId: "63aff2d7-8f78-4551-a81c-87e5ae43db0d",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.003 to unit.040: Inverted Third Conditional counterfactual (Had + S + V3/ed).",
  },
  {
    id: "c10918d0-496f-4766-a6c5-923445203650",
    targetUnit: 6,
    targetRule: "6C",
    targetConceptCode: "unit.006",
    targetConceptId: "54010bbc-eb52-45ea-af6f-daba266f8fe0",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.003 to unit.006: While + Past Continuous action interrupted by past simple (asked).",
  },
  {
    id: "6e803d45-15fe-4fb7-8f35-5f7636947888",
    targetUnit: 1,
    targetRule: "1A",
    targetConceptCode: "unit.001",
    targetConceptId: "201b07e6-1731-4105-ac7e-e1d763f54049",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.004 to unit.001: Present Continuous at moment of speaking with imperative cue 'Listen'.",
  },
  {
    id: "7addbaf6-e0f1-47c4-a31d-f0196200c087",
    targetUnit: 1,
    targetRule: "1A",
    targetConceptCode: "unit.001",
    targetConceptId: "201b07e6-1731-4105-ac7e-e1d763f54049",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.004 to unit.001: Present Continuous at moment of speaking with imperative cue 'Listen'. Template duplicate of 6e803d45.",
  },
  {
    id: "ac0c643a-f264-4991-b5ae-08c0e8eb2848",
    targetUnit: 2,
    targetRule: "2B",
    targetConceptCode: "unit.002",
    targetConceptId: "89591d03-85a9-4992-a951-f5d06f767d89",
    rationale: "Remapped in Phase 3.4C.4B.3 from unit.004 to unit.002: Present Simple habitual frequency (publishes ... every year).",
  },
];

const AUDIT_METADATA_UPDATES = [
  {
    id: "fe61381a-7e1b-495f-a388-804cb27ea8f5",
    rationale: "Audited in Phase 3.4C.4B.3: Confirmed valid mapping to unit.004 (Stative mental attitude verb 'doubt'). KEEP_CURRENT_MAPPING.",
  },
  {
    id: "fe5dcc57-9a64-48a6-9ae3-2f4a5ebcecea",
    rationale: "Audited in Phase 3.4C.4B.3: Confirmed valid mapping to unit.001 (Temporary period around present 'this week'). KEEP_CURRENT_MAPPING.",
  },
  {
    id: "fa201c0b-4173-453b-8fd8-4df4019e6ca9",
    rationale: "Audited in Phase 3.4C.4B.3: MULTI_CONCEPT_REVIEW. Genuinely bridges Unit 4 stative preference ('prefers') and Unit 3 contrast ('usually prefers vs currently considering'). Not forced into single unit in this milestone.",
  },
];

async function testRollback() {
  console.log("\n--- TESTING TRANSACTION ROLLBACK BEHAVIOR ---");
  const testId = CONFIRMED_REMAPPINGS[0].id;
  const beforeItem = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: testId },
    select: { unitNumber: true, conceptId: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.toeicQuestionBankItem.update({
        where: { id: testId },
        data: { unitNumber: 999 },
      });
      // Deliberately throw an error to trigger rollback
      throw new Error("INTENTIONAL_ROLLBACK_TEST_ERROR");
    });
  } catch (err: any) {
    if (err.message === "INTENTIONAL_ROLLBACK_TEST_ERROR") {
      console.log("[Rollback Test] Caught intentional abort signal.");
    } else {
      throw err;
    }
  }

  const afterItem = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: testId },
    select: { unitNumber: true, conceptId: true },
  });

  if (afterItem?.unitNumber !== beforeItem?.unitNumber) {
    throw new Error(`CRITICAL: Rollback failed! Expected unit ${beforeItem?.unitNumber}, got ${afterItem?.unitNumber}`);
  }
  console.log("[Rollback Test] Invariant verified: State rolled back cleanly without mutation.");
}

async function main() {
  const isExecute = process.argv.includes("--execute");
  console.log(`=== PHASE 3.4C.4B.3 CONCEPT REMAPPING EXECUTION (Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}) ===`);

  // 1. Guard check
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT current_database() as db_name, inet_server_addr() as server_ip
  `);
  if (sysInfo[0].db_name !== "grammarpath-staging") {
    throw new Error(`CRITICAL ABORT: Connected to '${sysInfo[0].db_name}', expected 'grammarpath-staging'!`);
  }
  console.log(`[Safety Guard] Target database verified: ${sysInfo[0].db_name} (${sysInfo[0].server_ip})`);

  // 2. Pre-execution verification of target concepts
  for (const remap of CONFIRMED_REMAPPINGS) {
    const concept = await prisma.grammarConcept.findUnique({
      where: { id: remap.targetConceptId },
    });
    if (!concept || concept.code !== remap.targetConceptCode) {
      throw new Error(`Concept validation failed for ${remap.targetConceptCode} (ID: ${remap.targetConceptId})`);
    }
  }
  console.log("All target GrammarConcept records verified in staging database.");

  // 3. Test rollback
  await testRollback();

  if (!isExecute) {
    console.log("\n[DRY-RUN COMPLETE] All pre-conditions verified. Zero writes performed.");
    return;
  }

  // 4. EXECUTE ATOMIC REMAPPING TRANSACTION
  console.log("\nExecuting atomic remapping transaction on staging...");
  const now = new Date();
  const reviewer = "owner-editorial-board";

  await prisma.$transaction(async (tx) => {
    // A. Remap 7 confirmed items
    for (const remap of CONFIRMED_REMAPPINGS) {
      await tx.toeicQuestionBankItem.update({
        where: { id: remap.id },
        data: {
          unitNumber: remap.targetUnit,
          ruleReference: remap.targetRule,
          conceptId: remap.targetConceptId,
          conceptMappingConfidence: 1.0,
          conceptMappingSource: "editorial_remapping_phase3_4c4b3",
          reviewedBy: reviewer,
          reviewedAt: now,
          reviewNotes: remap.rationale,
          // Explicitly ensure status remains validated and unapproved
          reviewStatus: "validated",
          isLatestApproved: false,
        },
      });
    }

    // B. Update review notes on 3 audited candidates (KEEP / MULTI_CONCEPT)
    for (const meta of AUDIT_METADATA_UPDATES) {
      await tx.toeicQuestionBankItem.update({
        where: { id: meta.id },
        data: {
          reviewedBy: reviewer,
          reviewedAt: now,
          reviewNotes: meta.rationale,
        },
      });
    }
  });

  console.log("[TRANSACTION COMMITTED] Remappings successfully written to database.");

  // 5. Post-Execution Verifications
  const totalBank = await prisma.toeicQuestionBankItem.count();
  console.log(`\nPost-Execution Total bank items: ${totalBank} (expected: 41)`);

  const statusCounts = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: { id: true },
  });
  console.log("Status Breakdown:", statusCounts);

  const approvedLatestCount = await prisma.toeicQuestionBankItem.count({
    where: { isLatestApproved: true },
  });
  console.log(`Approved Latest items: ${approvedLatestCount} (expected: 12)`);

  const attemptsCount = await prisma.questionAttemptItem.count();
  console.log(`Learner attempts count: ${attemptsCount} (expected: 5)`);

  if (totalBank !== 41 || approvedLatestCount !== 12 || attemptsCount !== 5) {
    throw new Error("POST-EXECUTION INVARIANT VIOLATION!");
  }

  // Unit breakdown
  const unitBreakdown = await prisma.toeicQuestionBankItem.groupBy({
    by: ["unitNumber", "reviewStatus"],
    _count: { id: true },
    orderBy: [{ unitNumber: "asc" }, { reviewStatus: "asc" }],
  });
  console.log("\nUnit & Status Breakdown:");
  unitBreakdown.forEach((ub) => {
    console.log(` - Unit ${ub.unitNumber} (${ub.reviewStatus}): ${ub._count.id} items`);
  });

  console.log("\n[SUCCESS] Phase 3.4C.4B.3 remappings executed and invariants verified.");
}

main()
  .catch((e) => {
    console.error("Remapping execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

