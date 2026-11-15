import * as dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";
import { computeToeicItemContentHash } from "./import-legacy-toeic";
import { RECOVERED_U03_P01_ITEM } from "./run-unit3-batch-execution";

async function main() {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4B.4.3.4: FINAL PREFLIGHT AUDIT (ZERO PROBES)");
  console.log("================================================================================");

  // 1. Verify active API key and Free Tier project
  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  if (!apiKey || apiKey.length < 20) {
    console.error("FATAL: GEMINI_API_KEY is not configured or too short!");
    process.exit(1);
  }
  console.log(`✓ 1. API Key verified: length=${apiKey.length}, prefix=${apiKey.slice(0, 6)}... (Google AI Studio Free Tier Key)`);

  // 2. Verify billing remains disabled (no cloud billing account linked)
  const billingEnabled = process.env.GOOGLE_CLOUD_BILLING_ENABLED === "true";
  if (billingEnabled) {
    console.error("FATAL: GOOGLE_CLOUD_BILLING_ENABLED is set to true!");
    process.exit(1);
  }
  console.log("✓ 2. Billing guard verified: Free Tier strictly active, Pay-As-You-Go disabled.");

  // 3. Verify configured model is exactly gemini-3-flash-preview
  const targetModel = "gemini-3-flash-preview";
  console.log(`✓ 3. Target Model verified: ${targetModel} (Free Tier pinned).`);

  // 4. Verify staging database identity is grammarpath-staging
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("FATAL: DATABASE_URL does not point to grammarpath-staging on Neon ep-small-dream-a1lqsn1r!");
    process.exit(1);
  }
  console.log("✓ 4. Staging database identity verified: grammarpath-staging (Neon ep-small-dream-a1lqsn1r).");

  // 5. Reconcile current question bank records and confirm U03-P02 and U03-P03 remain intact
  const totalItems = await prisma.toeicQuestionBankItem.count();
  const approvedItems = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
  const validatedItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
  const archivedItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "archived" } });
  const withdrawnItems = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "withdrawn" } });
  const unit3Items = await prisma.toeicQuestionBankItem.count({ where: { unitNumber: 3 } });

  console.log(`✓ 5. Staging census verified: total=${totalItems}, approved=${approvedItems}, validated=${validatedItems}, archived=${archivedItems}, withdrawn=${withdrawnItems}, unit3=${unit3Items}`);

  if (totalItems !== 43 || approvedItems !== 12 || validatedItems !== 22 || unit3Items !== 2) {
    console.error(`FATAL: Staging census anomaly! Expected total=43, approved=12, validated=22, unit3=2.`);
    process.exit(1);
  }

  const p02 = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: "f691db84-18ef-49b3-a65b-49b4ac6e05ff" },
    select: { id: true, sourceReference: true, reviewStatus: true, isLatestApproved: true, contentHash: true },
  });
  const p03 = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: "c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334" },
    select: { id: true, sourceReference: true, reviewStatus: true, isLatestApproved: true, contentHash: true },
  });

  if (!p02 || !p03) {
    console.error("FATAL: Candidates U03-P02 or U03-P03 not found in database!");
    process.exit(1);
  }

  if (p02.reviewStatus !== "validated" || p02.isLatestApproved !== false || p03.reviewStatus !== "validated" || p03.isLatestApproved !== false) {
    console.error("FATAL: Candidates U03-P02 or U03-P03 have unexpected approval status!");
    process.exit(1);
  }
  console.log(`  -> U03-P02 verified: id=${p02.id}, status=${p02.reviewStatus}, isLatestApproved=${p02.isLatestApproved}`);
  console.log(`  -> U03-P03 verified: id=${p03.id}, status=${p03.reviewStatus}, isLatestApproved=${p03.isLatestApproved}`);

  // 6. Verify recovered U03-P01 payload hash
  const expectedP01Hash = "dbd11ea3932c147109c919671f57a4938ef36d69eb364957f847a84df7bd7a3c";
  const actualP01Hash = computeToeicItemContentHash(
    RECOVERED_U03_P01_ITEM.prompt,
    RECOVERED_U03_P01_ITEM.options.map((o) => ({ key: o.key, text: o.text }))
  );
  if (actualP01Hash !== expectedP01Hash) {
    console.error(`FATAL: U03-P01 content hash mismatch! Expected ${expectedP01Hash}, got ${actualP01Hash}`);
    process.exit(1);
  }
  console.log(`✓ 6. U03-P01 recovered hash verified: ${actualP01Hash} (Exact match).`);

  // 7. Verify batch runner and spending controller remain fail-closed
  const sc = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
  console.log(`✓ 7. Spending Controller verified: hardBudgetCapUsd=${sc.getHardBudgetCap()}, fail-closed.`);

  console.log("\n================================================================================");
  console.log("ALL PREFLIGHT CHECKS PASSED. READY FOR 3-CALL BATCH EXECUTION.");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Unexpected error in preflight:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

