import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXISTING_CANDIDATE_IDS = [
  "b7c4793c-ba61-4ae6-92e2-74096f6a8557", // Marketing market share (1E, med)
  "c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c", // Corporate leave policy (1C, med)
  "0f51d836-b360-4423-b19e-71ea358be557", // Marketing client call (1B, easy)
  "2afc939e-9d24-40d8-98c3-75a198006930", // Finance Patterson review (1A, med)
  "2997562b-8ae1-4e19-8dd2-f110d41865e0", // Manufacturing robotics (1E, hard)
  "7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83", // Corporate merger (1C, med)
  "322c0e5c-d12b-4617-b88d-cace81c8e545", // Logistics customs delays (1B, hard)
];

const VERSION3_IDS = [
  "048df761-7f70-4249-b4f1-f075a87c9432", // Root 3d71c0d1 v3 (Finance CFO audit, med)
  "add7a35b-e014-4747-82af-ef0d1239ee51", // Root 6a54a874 v3 (Logistics customs, med)
  "a4229728-763b-4b22-8bb9-6436a0ffba76", // Root 0fda8409 v3 (Facility executive suite, easy)
  "8a41b01a-1c9b-4072-a584-86387d7e6f97", // Root 634add4d v3 (HR safety training, easy)
];

const RETAINED_APPROVED_ID = "45e751fd-4915-4bac-a386-c7bae5295911";

async function main() {
  const isExecute = process.argv.includes("--execute");
  console.log(`=== PHASE 3.4C.4B.2 CONTROLLED EDITORIAL APPROVAL (Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}) ===`);

  // 1. Guard check
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT current_database() as db_name, inet_server_addr() as server_ip
  `);
  if (sysInfo[0].db_name !== "grammarpath-staging") {
    throw new Error(`CRITICAL ABORT: Connected to '${sysInfo[0].db_name}', expected 'grammarpath-staging'!`);
  }
  console.log(`[Safety Guard] Verified target database: ${sysInfo[0].db_name} (${sysInfo[0].server_ip})`);

  // 2. Pre-execution checks on items
  const candidates = await prisma.toeicQuestionBankItem.findMany({
    where: { id: { in: EXISTING_CANDIDATE_IDS } },
  });
  if (candidates.length !== 7) throw new Error(`Expected 7 candidate items, found ${candidates.length}`);
  for (const c of candidates) {
    if (c.reviewStatus !== "validated" || c.isLatestApproved !== false) {
      throw new Error(`Candidate ${c.id} not in validated unapproved state`);
    }
  }

  const v3Items = await prisma.toeicQuestionBankItem.findMany({
    where: { id: { in: VERSION3_IDS } },
  });
  if (v3Items.length !== 4) throw new Error(`Expected 4 Version 3 items, found ${v3Items.length}`);
  for (const v of v3Items) {
    if (v.reviewStatus !== "validated" || v.isLatestApproved !== false) {
      throw new Error(`V3 item ${v.id} not in validated unapproved state`);
    }
  }

  const retained = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: RETAINED_APPROVED_ID },
  });
  if (!retained || retained.reviewStatus !== "approved" || !retained.isLatestApproved) {
    throw new Error(`Retained item ${RETAINED_APPROVED_ID} not in approved latest state`);
  }

  console.log("Pre-checks passed: 7 candidates validated, 4 V3 items validated, 1 retained approved item verified.");

  if (!isExecute) {
    console.log("\n[DRY-RUN COMPLETE] All pre-conditions verified. Zero writes performed.");
    return;
  }

  // 3. EXECUTE ATOMIC APPROVAL TRANSACTION
  console.log("\nExecuting atomic approval transaction...");
  const now = new Date();
  const reviewer = "owner-editorial-board";

  await prisma.$transaction(async (tx) => {
    // A. Approve the 7 existing candidates
    for (const cId of EXISTING_CANDIDATE_IDS) {
      await tx.toeicQuestionBankItem.update({
        where: { id: cId },
        data: {
          reviewStatus: "approved",
          isLatestApproved: true,
          reviewedBy: reviewer,
          reviewedAt: now,
          reviewNotes: "Approved in Phase 3.4C.4B.2: Verified authentic workplace context, distractor validity, and concept alignment.",
        },
      });
    }

    // B. Approve the 4 Version 3 items
    for (const vId of VERSION3_IDS) {
      await tx.toeicQuestionBankItem.update({
        where: { id: vId },
        data: {
          reviewStatus: "approved",
          isLatestApproved: true,
          reviewedBy: reviewer,
          reviewedAt: now,
          reviewNotes: "Approved in Phase 3.4C.4B.2: Version 3 replacement verified for authentic syntax, collocation, and domain diversity.",
        },
      });
    }

    // C. Enrich retained item 45e751fd explanation
    await tx.toeicQuestionBankItem.update({
      where: { id: RETAINED_APPROVED_ID },
      data: {
        explanation: "The immediate time indicator 'right now' signals that the action is taking place at the moment of speaking (Unit 1.A). The third-person singular subject 'he' requires the auxiliary 'is' followed by the present participle 'repairing'. Simple present 'repairs' expresses habitual routine, while past tense 'repaired' contradicts 'right now'.",
        reviewNotes: "Editorial review confirmed valid. Explanation updated to standard pedagogical rationale in Phase 3.4C.4B.2.",
        reviewedBy: reviewer,
        reviewedAt: now,
      },
    });
  });

  console.log("[TRANSACTION COMMITTED] Approvals successfully written to database.");

  // 4. Post-Execution Verifications
  const postCounts = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: { id: true },
  });
  console.log("\nPost-Execution Status Counts:", postCounts);

  const approvedItems = await prisma.toeicQuestionBankItem.findMany({
    where: { isLatestApproved: true },
    orderBy: { id: "asc" },
  });
  console.log(`\nTotal approved latest items in bank: ${approvedItems.length} (expected: 12)`);
  approvedItems.forEach((a, idx) => {
    console.log(` [${idx + 1}] ID: ${a.id} | Root: ${a.rootQuestionId.slice(0, 8)} v${a.version} | Diff: ${a.difficulty} | Prompt: "${a.prompt.slice(0, 45)}..."`);
  });

  // Verify each root question has at most 1 isLatestApproved = true
  const rootGroup = await prisma.toeicQuestionBankItem.groupBy({
    by: ["rootQuestionId"],
    where: { isLatestApproved: true },
    _count: { id: true },
  });
  const duplicateRoots = rootGroup.filter((g) => g._count.id > 1);
  if (duplicateRoots.length > 0) {
    throw new Error(`CRITICAL ERROR: Duplicate latest approved items found for roots: ${JSON.stringify(duplicateRoots)}`);
  }
  console.log(`Verified unique latest-approved item per root: ${rootGroup.length} distinct roots.`);

  const totalBank = await prisma.toeicQuestionBankItem.count();
  console.log(`Total bank items: ${totalBank} (expected: 41)`);

  const totalAttempts = await prisma.questionAttemptItem.count();
  console.log(`Total attempts: ${totalAttempts} (expected: 5)`);

  if (approvedItems.length !== 12 || totalBank !== 41 || totalAttempts !== 5) {
    throw new Error("POST-EXECUTION INVARIANT VIOLATION!");
  }

  console.log("\n[SUCCESS] Phase 3.4C.4B.2 approvals executed and invariants verified.");
}

main()
  .catch((e) => {
    console.error("Approval execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

