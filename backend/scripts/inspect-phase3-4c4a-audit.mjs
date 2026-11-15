import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  console.log("=== PHASE 3.4C.4A QUESTION BANK AUDIT SCRIPT ===");
  
  // 1. Fetch all 37 items with relations
  const items = await prisma.toeicQuestionBankItem.findMany({
    include: {
      options: {
        orderBy: { optionKey: "asc" }
      },
      concept: true,
      generationRun: true,
      practiceItems: true,
      attemptItems: true,
    },
    orderBy: [
      { unitNumber: "asc" },
      { rootQuestionId: "asc" },
      { version: "asc" }
    ]
  });

  console.log(`Fetched ${items.length} question bank items.`);

  // 2. Fetch concepts
  const concepts = await prisma.grammarConcept.findMany({
    include: {
      theoryLinks: true,
      toeicUnits: true,
    },
    orderBy: { code: "asc" }
  });
  console.log(`Fetched ${concepts.length} grammar concepts.`);

  // 3. Output basic census breakdown
  const statusCounts = {};
  const approvedLatestCounts = { true: 0, false: 0 };
  const unitCounts = {};
  const conceptCounts = {};

  for (const item of items) {
    statusCounts[item.reviewStatus] = (statusCounts[item.reviewStatus] || 0) + 1;
    approvedLatestCounts[item.isLatestApproved ? "true" : "false"]++;
    unitCounts[item.unitNumber] = (unitCounts[item.unitNumber] || 0) + 1;
    const cKey = item.concept ? `${item.concept.code} (${item.concept.name})` : "NO_CONCEPT";
    conceptCounts[cKey] = (conceptCounts[cKey] || 0) + 1;
  }

  console.log("Review Statuses:", statusCounts);
  console.log("Is Latest Approved:", approvedLatestCounts);
  console.log("Units:", unitCounts);
  console.log("Concepts:", conceptCounts);

  // 4. Save raw census data to JSON for comprehensive analysis
  const outputDir = path.resolve(__dirname, "../recovery");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, "phase3-4c4a-census-raw.json");
  fs.writeFileSync(outputPath, JSON.stringify({ items, concepts }, null, 2), "utf8");
  console.log(`Saved raw census data to ${outputPath}`);
}

main()
  .catch((err) => {
    console.error("Audit error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
