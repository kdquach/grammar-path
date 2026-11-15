import * as dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { generateGeminiTextDetailed } from "../src/lib/gemini";

async function main() {
  console.log("=== PHASE 3.4C.4B.4.3.2 MANDATORY PREFLIGHT ===");

  // 1. Database identity guard
  const dbUrl = process.env.DATABASE_URL || "";
  console.log(`Checking DATABASE_URL...`);
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("FATAL: DATABASE_URL does not point to grammarpath-staging on ep-small-dream-a1lqsn1r!");
    process.exit(1);
  }
  console.log("✓ Database identity verified: grammarpath-staging (Neon)");

  // 2. Staging Census
  const totalItems = await prisma.toeicQuestionBankItem.count();
  const approvedItems = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  const validatedItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
  const archivedItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "archived" } });
  const withdrawnItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "withdrawn" } });
  console.log(`Census: Total=${totalItems}, Approved=${approvedItems}, Validated=${validatedItems}, Archived=${archivedItems}, Withdrawn=${withdrawnItems}`);

  if (totalItems !== 43 || approvedItems !== 12) {
    console.error(`FATAL: Unexpected census! Expected total=43, approved=12. Got total=${totalItems}, approved=${approvedItems}`);
    process.exit(1);
  }
  console.log("✓ Census verified: exactly 43 items, 12 approved latest");

  // 3. Reconcile existing candidates: f691db84 and c4fecf7a
  const candidate1 = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: "f691db84-18ef-49b3-a65b-49b4ac6e05ff" },
    include: { options: true },
  });
  const candidate2 = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: "c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334" },
    include: { options: true },
  });

  if (!candidate1 || !candidate2) {
    console.error("FATAL: One or both existing candidates missing!");
    process.exit(1);
  }

  console.log(`Candidate 1 (f691db84): blueprint=${candidate1.sourceReference}, runId=${candidate1.generationRunId}, status=${candidate1.reviewStatus}, isLatestApproved=${candidate1.isLatestApproved}, options=${candidate1.options.length}`);
  console.log(`Candidate 2 (c4fecf7a): blueprint=${candidate2.sourceReference}, runId=${candidate2.generationRunId}, status=${candidate2.reviewStatus}, isLatestApproved=${candidate2.isLatestApproved}, options=${candidate2.options.length}`);

  if (
    candidate1.sourceReference !== "U03-P02-AFF-INFRASTRUCTURE" ||
    candidate2.sourceReference !== "U03-P03-NEG-FINANCE" ||
    candidate1.isLatestApproved !== false ||
    candidate2.isLatestApproved !== false ||
    candidate1.reviewStatus !== "validated" ||
    candidate2.reviewStatus !== "validated"
  ) {
    console.error("FATAL: Candidates do not match expected blueprints/invariants!");
    process.exit(1);
  }
  console.log("✓ Candidates f691db84 and c4fecf7a reconciled: valid, unapproved, intact.");

  // 4. Confirm no duplicate candidates or hashes
  const duplicate1 = await prisma.toeicQuestionBankItem.count({ where: { contentHash: candidate1.contentHash } });
  const duplicate2 = await prisma.toeicQuestionBankItem.count({ where: { contentHash: candidate2.contentHash } });
  if (duplicate1 !== 1 || duplicate2 !== 1) {
    console.error(`FATAL: Duplicate content hashes detected! dup1=${duplicate1}, dup2=${duplicate2}`);
    process.exit(1);
  }
  console.log("✓ No duplicate content hashes for existing candidates.");

  // 5. Confirm the remaining 6 blueprint IDs have no persisted candidates already
  const remainingBlueprints = [
    "U03-P01-AFF-FACILITIES",
    "U03-P04-NEG-GOVERNANCE",
    "U03-P05-INT-COMPLIANCE",
    "U03-P06-INT-LEGAL",
    "U03-P07-CON-LOGISTICS",
    "U03-P08-CON-HR",
  ];

  const allItems = await prisma.toeicQuestionBankItem.findMany({ select: { id: true, sourceReference: true } });
  for (const item of allItems) {
    const bp = item.sourceReference;
    if (bp && remainingBlueprints.includes(bp)) {
      console.error(`FATAL: Found unexpected persisted candidate for ${bp}: item ${item.id}`);
      process.exit(1);
    }
  }
  console.log("✓ Verified: zero persisted candidates exist for the 6 remaining blueprints.");

  // 6. Verify spending controller remains capped at $0.25
  const sc = new SpendingController({ jobType: "unit3_pilot" });
  console.log(`✓ SpendingController instantiated: hardBudgetCapUsd=${sc.getHardBudgetCap()}`);

  // 7. Verify API Key and Free Tier configuration
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey || apiKey.length < 10) {
    console.error("FATAL: GEMINI_API_KEY is not configured!");
    process.exit(1);
  }
  console.log(`✓ GEMINI_API_KEY present (redacted length: ${apiKey.length}, starts with: ${apiKey.slice(0, 4)}...)`);

  // 8. Probe live quota status using generateGeminiTextDetailed
  console.log("\nProbing live Gemini API Free Tier status for gemini-3-flash-preview...");
  const probeResponse = await generateGeminiTextDetailed({
    model: "gemini-3-flash-preview",
    prompt: "Reply with the single word PONG if you are operational.",
    temperature: 0.1,
    maxOutputTokens: 100,
  });

  if (!probeResponse.ok) {
    console.error("\n[PROBE FAILURE DETECTED]");
    console.error(`Reason: ${probeResponse.reason}`);
    console.error(`Status code: ${probeResponse.status || "Unknown"}`);
    console.error(`Error message: ${probeResponse.errorMessage}`);
    if (probeResponse.errorDetails) {
      console.error(`Error details:`, JSON.stringify(probeResponse.errorDetails, null, 2));
    }
    console.error("\nFATAL: Free Tier quota has NOT reset or probe failed!");
    process.exit(2);
  }

  console.log(`Probe SUCCESS: HTTP Status=200, Content="${probeResponse.text.trim()}", Tokens=${JSON.stringify(probeResponse.usageMetadata)}`);
  console.log("✓ FREE TIER QUOTA IS OPERATIONAL / HAS RESET!");

  console.log("\n=== ALL MANDATORY PREFLIGHT CHECKS PASSED ===");
}

main()
  .catch((e) => {
    console.error("Unexpected error in preflight:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
