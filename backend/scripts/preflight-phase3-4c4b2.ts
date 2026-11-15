import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  console.log("=== PHASE 3.4C.4B.2 PREFLIGHT & SNAPSHOT ===");

  // 1. Database identity
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT current_database() as db_name, current_user as db_user, inet_server_addr() as server_ip, version() as pg_version
  `);
  console.log("PostgreSQL Identity:", sysInfo[0]);

  if (sysInfo[0].db_name !== "grammarpath-staging") {
    throw new Error(`CRITICAL ABORT: Connected to '${sysInfo[0].db_name}', expected 'grammarpath-staging'!`);
  }

  // 2. Total bank items
  const total = await prisma.toeicQuestionBankItem.count();
  console.log(`Total bank items: ${total} (expected: 41)`);
  if (total !== 41) throw new Error(`Unexpected bank item count: ${total}`);

  // 3. Status breakdown
  const counts = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: { id: true }
  });
  const countMap: Record<string, number> = {};
  counts.forEach(c => { countMap[c.reviewStatus] = c._count.id; });
  console.log("Status Breakdown:", countMap);

  if (
    countMap["approved"] !== 1 ||
    countMap["validated"] !== 31 ||
    countMap["archived"] !== 5 ||
    countMap["withdrawn"] !== 4
  ) {
    throw new Error(`Status count mismatch: ${JSON.stringify(countMap)}`);
  }

  // 4. Verify 1 approved item is 45e751fd
  const approvedItems = await prisma.toeicQuestionBankItem.findMany({
    where: { isLatestApproved: true }
  });
  console.log(`Approved items count: ${approvedItems.length} (expected: 1)`);
  if (approvedItems.length !== 1 || approvedItems[0].id !== "45e751fd-4915-4bac-a386-c7bae5295911") {
    throw new Error(`Unexpected approved items: ${JSON.stringify(approvedItems)}`);
  }

  // 5. Verify 4 Version 3 items exist and are validated
  const v3Items = await prisma.toeicQuestionBankItem.findMany({
    where: { version: 3 },
    include: { options: true }
  });
  console.log(`Version 3 items count: ${v3Items.length} (expected: 4)`);
  if (v3Items.length !== 4) throw new Error(`Unexpected V3 items count: ${v3Items.length}`);
  for (const v of v3Items) {
    if (v.reviewStatus !== "validated" || v.isLatestApproved !== false) {
      throw new Error(`V3 item ${v.id} has invalid status: status=${v.reviewStatus}, isLatestApproved=${v.isLatestApproved}`);
    }
  }

  // 6. Verify 5 attempts
  const attempts = await prisma.questionAttemptItem.findMany();
  console.log(`Attempt items count: ${attempts.length} (expected: 5)`);
  if (attempts.length !== 5) throw new Error(`Unexpected attempt count: ${attempts.length}`);

  // 7. Verify the 12 candidate records
  const targetIds = [
    "45e751fd-4915-4bac-a386-c7bae5295911", // Retained approved
    // 7 existing candidates:
    "b7c4793c-ba61-4ae6-92e2-74096f6a8557",
    "c46da3b7-ec0c-4fa3-b22f-4eb88fe4815c",
    "0f51d836-b360-4423-b19e-71ea358be557",
    "2afc939e-9d24-40d8-98c3-75a198006930",
    "2997562b-8ae1-4e19-8dd2-f110d41865e0",
    "7a3359ae-c5a5-4b99-b2db-1fed3c1fbf83",
    "322c0e5c-d12b-4617-b88d-cace81c8e545",
    // 4 V3 items:
    "048df761-7f70-4249-b4f1-f075a87c9432",
    "add7a35b-e014-4747-82af-ef0d1239ee51",
    "a4229728-763b-4b22-8bb9-6436a0ffba76",
    "8a41b01a-1c9b-4072-a584-86387d7e6f97",
  ];

  const pool12 = await prisma.toeicQuestionBankItem.findMany({
    where: { id: { in: targetIds } },
    include: {
      options: { orderBy: { optionKey: "asc" } },
      concept: true,
      practiceItems: true,
      attemptItems: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Verified pool12 count: ${pool12.length} (expected: 12)`);
  if (pool12.length !== 12) throw new Error(`Pool12 count mismatch: ${pool12.length}`);

  // 8. Capture snapshot to disk
  const backupDir = path.resolve(__dirname, "../recovery/phase3-4c4b2-pre-backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  fs.writeFileSync(path.join(backupDir, "sys_info.json"), JSON.stringify(sysInfo, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "pool12_items.json"), JSON.stringify(pool12, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "status_breakdown.json"), JSON.stringify({ countMap, total }, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "attempts.json"), JSON.stringify(attempts, null, 2), "utf8");

  console.log(`[Preflight Success] Full recoverable backup written to ${backupDir}`);
}

main()
  .catch((e) => {
    console.error("Preflight failure:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

