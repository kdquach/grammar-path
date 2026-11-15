import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  console.log("=== PHASE 3.4C.4B.1 PREFLIGHT SNAPSHOT & VERIFICATION ===");

  // 1. Verify database system identity
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      current_database() as db_name,
      current_user as db_user,
      inet_server_addr() as server_ip,
      inet_server_port() as server_port,
      version() as pg_version
  `);
  console.log("PostgreSQL Identity:", sysInfo[0]);

  const targetHost = "ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech";
  const targetDb = "grammarpath-staging";
  if (sysInfo[0].db_name !== targetDb) {
    throw new Error(`CRITICAL ABORT: Connected to '${sysInfo[0].db_name}', expected '${targetDb}'!`);
  }

  // 2. Fetch all 37 bank items
  const items = await prisma.toeicQuestionBankItem.findMany({
    include: {
      options: { orderBy: { optionKey: "asc" } },
      concept: true,
      practiceItems: true,
      attemptItems: true,
    },
    orderBy: [
      { unitNumber: "asc" },
      { rootQuestionId: "asc" },
      { version: "asc" },
    ],
  });
  console.log(`Verified question bank item count: ${items.length} (expected: 37)`);
  if (items.length !== 37) {
    throw new Error(`CRITICAL ABORT: Bank item count is ${items.length}, expected 37!`);
  }

  // Verify status breakdown
  const statusCounts: Record<string, number> = {};
  for (const it of items) {
    statusCounts[it.reviewStatus] = (statusCounts[it.reviewStatus] || 0) + 1;
  }
  console.log("Review Statuses:", statusCounts);
  if (
    statusCounts["validated"] !== 27 ||
    statusCounts["archived"] !== 5 ||
    statusCounts["approved"] !== 3 ||
    statusCounts["withdrawn"] !== 2
  ) {
    throw new Error(`CRITICAL ABORT: Status counts mismatch: ${JSON.stringify(statusCounts)}`);
  }

  // 3. Fetch all attempt items
  const attemptItems = await prisma.questionAttemptItem.findMany({
    include: {
      user: true,
      question: true,
      questionBankItem: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Verified attempt item count: ${attemptItems.length} (expected: 5)`);
  if (attemptItems.length !== 5) {
    throw new Error(`CRITICAL ABORT: Attempt item count is ${attemptItems.length}, expected 5!`);
  }

  // 4. Fetch practice items and sessions
  const practiceItems = await prisma.toeicPracticeItem.findMany();
  const practiceSessions = await prisma.toeicPracticeSession.findMany();

  // 5. Verify the two specific target items to withdraw
  const target1 = items.find((it) => it.id === "7d9abd94-df89-4762-8a86-a3217f0217b0");
  const target2 = items.find((it) => it.id === "44931eb1-344b-4ec8-aceb-5524a952ed59");
  const retainApproved = items.find((it) => it.id === "45e751fd-4915-4bac-a386-c7bae5295911");

  if (!target1 || target1.reviewStatus !== "approved" || !target1.isLatestApproved) {
    throw new Error("Target 7d9abd94 is not currently approved latest!");
  }
  if (!target2 || target2.reviewStatus !== "approved" || !target2.isLatestApproved) {
    throw new Error("Target 44931eb1 is not currently approved latest!");
  }
  if (!retainApproved || retainApproved.reviewStatus !== "approved" || !retainApproved.isLatestApproved) {
    throw new Error("Item 45e751fd is not currently approved latest!");
  }

  console.log(`Target 1 verified: ${target1.id} (Root: ${target1.rootQuestionId}, v${target1.version})`);
  console.log(`Target 2 verified: ${target2.id} (Root: ${target2.rootQuestionId}, v${target2.version})`);
  console.log(`Retained approved verified: ${retainApproved.id} (Root: ${retainApproved.rootQuestionId}, v${retainApproved.version})`);

  // 6. Verify Root Questions to receive Version 3
  const rootIds = [
    "3d71c0d1-6a2d-498a-b6f2-c5abad85657e",
    "6a54a874-9b57-4148-be8d-71b9e2898c64",
    "0fda8409-0926-49c0-8b86-1564d83497ac",
    "634add4d-5982-4de8-99de-6c4561c6ee44",
  ];
  for (const rId of rootIds) {
    const versions = items.filter((it) => it.rootQuestionId === rId);
    console.log(`Root ${rId.slice(0, 8)} has ${versions.length} existing version(s): [${versions.map((v) => `v${v.version}(${v.reviewStatus})`).join(", ")}]`);
    if (versions.some((v) => v.version === 3)) {
      throw new Error(`CRITICAL ABORT: Version 3 already exists for root ${rId}!`);
    }
  }

  // 7. Find conceptId for unit.001
  const conceptUnit1 = await prisma.grammarConcept.findFirst({
    where: { code: "unit.001" },
  });
  if (!conceptUnit1) {
    throw new Error("CRITICAL ABORT: Concept 'unit.001' not found!");
  }
  console.log(`Found Concept unit.001 ID: ${conceptUnit1.id} (${conceptUnit1.name})`);

  // 8. Write backup snapshot to disk
  const backupDir = path.resolve(__dirname, "../recovery/phase3-4c4b1-pre-backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  fs.writeFileSync(path.join(backupDir, "sys_info.json"), JSON.stringify(sysInfo, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "bank_items.json"), JSON.stringify(items, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "attempt_items.json"), JSON.stringify(attemptItems, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "practice_items.json"), JSON.stringify(practiceItems, null, 2), "utf8");
  fs.writeFileSync(path.join(backupDir, "practice_sessions.json"), JSON.stringify(practiceSessions, null, 2), "utf8");

  console.log(`[Preflight Success] Full recoverable snapshot saved to ${backupDir}`);
}

main()
  .catch((err) => {
    console.error("Preflight failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

