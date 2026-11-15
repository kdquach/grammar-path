import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const CANDIDATE_10_IDS = [
  // Unit 3 (4 items)
  "43753724-dcb3-4681-adb5-5d0c71d34b7c",
  "6948841f-9dc6-487c-83ed-04c6ebfbc9fe",
  "77299aeb-93d6-483e-9f77-4d5a8c67496a",
  "c10918d0-496f-4766-a6c5-923445203650",
  // Unit 4 (4 items)
  "6e803d45-15fe-4fb7-8f35-5f7636947888",
  "7addbaf6-e0f1-47c4-a31d-f0196200c087",
  "ac0c643a-f264-4991-b5ae-08c0e8eb2848",
  "fe61381a-7e1b-495f-a388-804cb27ea8f5",
  // Unit 1 peripheral / contrast candidates (2 items)
  "fa201c0b-4173-453b-8fd8-4df4019e6ca9",
  "fe5dcc57-9a64-48a6-9ae3-2f4a5ebcecea",
];

async function main() {
  console.log("=== PHASE 3.4C.4B.3 PREFLIGHT SNAPSHOT & BACKUP ===");

  // 1. Guard check
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      current_database() as db_name,
      inet_server_addr() as server_ip,
      inet_server_port() as server_port,
      version() as pg_version
  `);

  const dbName = sysInfo[0].db_name;
  console.log(`[Safety Guard] Target DB: ${dbName} at ${sysInfo[0].server_ip}:${sysInfo[0].server_port}`);

  if (dbName !== "grammarpath-staging") {
    throw new Error(`CRITICAL ABORT: Connected to '${dbName}', expected 'grammarpath-staging'!`);
  }

  // 2. Snapshot target 10 items
  const items = await prisma.toeicQuestionBankItem.findMany({
    where: { id: { in: CANDIDATE_10_IDS } },
    include: {
      concept: true,
      options: { orderBy: { optionKey: "asc" } },
    },
    orderBy: [{ unitNumber: "asc" }, { id: "asc" }],
  });

  if (items.length !== 10) {
    throw new Error(`Expected exactly 10 candidate items, found ${items.length}!`);
  }

  console.log(`Retrieved all 10 candidate items.`);

  // 3. Status breakdown
  const statusCounts = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: { id: true },
  });

  const totalBankItems = await prisma.toeicQuestionBankItem.count();
  console.log(`Total bank items: ${totalBankItems}`);
  console.log("Status breakdown:", statusCounts);

  // 4. Attempts snapshot
  const attempts = await prisma.questionAttemptItem.findMany();
  console.log(`Total learner attempts: ${attempts.length}`);

  // 5. Target concepts mapping directory
  const targetConcepts = await prisma.grammarConcept.findMany({
    where: {
      code: { in: ["unit.001", "unit.002", "unit.003", "unit.004", "unit.005", "unit.006", "unit.040"] },
    },
    orderBy: { code: "asc" },
  });

  // 6. Write backup
  const backupDir = path.resolve(__dirname, "../recovery/phase3-4c4b3-pre-backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.writeFileSync(path.join(backupDir, "sys_info.json"), JSON.stringify(sysInfo[0], null, 2));
  fs.writeFileSync(path.join(backupDir, "candidate10_items.json"), JSON.stringify(items, null, 2));
  fs.writeFileSync(path.join(backupDir, "status_breakdown.json"), JSON.stringify(statusCounts, null, 2));
  fs.writeFileSync(path.join(backupDir, "attempts.json"), JSON.stringify(attempts, null, 2));
  fs.writeFileSync(path.join(backupDir, "target_concepts.json"), JSON.stringify(targetConcepts, null, 2));

  console.log(`Saved preflight snapshot and backup to: ${backupDir}`);
  console.log("=== PREFLIGHT SNAPSHOT VERIFIED ===");
}

main()
  .catch((e) => {
    console.error("Preflight error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

