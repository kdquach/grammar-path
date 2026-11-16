import crypto from "node:crypto";
import prisma from "../src/lib/prisma";
import { CURATED_TOEIC_UNIT_QUESTIONS, DifficultyLevel } from "../src/services/toeic-generator.service";

export function computeToeicItemContentHash(prompt: string, options: Array<{ key: string; text: string }>): string {
  const normPrompt = prompt.trim().toLowerCase().replace(/\s+/g, " ");
  const sortedOptions = [...options]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((o) => `${o.key}:${o.text.trim().toLowerCase()}`)
    .join("|");
  return crypto.createHash("sha256").update(`${normPrompt}::${sortedOptions}`).digest("hex");
}

export async function importLegacyToeicQuestions(options: { dryRun?: boolean; allowAnyDb?: boolean; approve?: boolean } = {}) {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!options.allowAnyDb && (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging"))) {
    throw new Error("[Staging Isolation Guard] BLOCKED: Host is not staging ep-small-dream-a1lqsn1r");
  }

  console.log(`[Import Legacy TOEIC] Starting import (dryRun: ${Boolean(options.dryRun)})...`);

  // Pre-fetch concept IDs for Units 1-4
  const conceptMap = new Map<number, string>();
  for (const unitNumber of [1, 2, 3, 4]) {
    const meta = await prisma.unitToeicMetadata.findFirst({
      where: { unit: { unitNumber } },
      select: { conceptId: true },
    });
    if (meta?.conceptId) {
      conceptMap.set(unitNumber, meta.conceptId);
    } else {
      const concept = await prisma.grammarConcept.findFirst({
        where: { code: `unit.${String(unitNumber).padStart(3, "0")}` },
        select: { id: true },
      });
      if (concept) conceptMap.set(unitNumber, concept.id);
    }
  }

  let totalScanned = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  let optionsCount = 0;

  for (const [unitStr, byDifficulty] of Object.entries(CURATED_TOEIC_UNIT_QUESTIONS)) {
    const unitNumber = Number(unitStr);
    const conceptId = conceptMap.get(unitNumber) || null;

    for (const [difficultyStr, questions] of Object.entries(byDifficulty)) {
      const difficulty = difficultyStr as DifficultyLevel;

      for (const q of questions) {
        totalScanned++;
        const contentHash = computeToeicItemContentHash(q.prompt, q.options);

        // Check idempotency
        const existing = await prisma.toeicQuestionBankItem.findUnique({
          where: { contentHash },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        if (!options.dryRun) {
          const created = await prisma.toeicQuestionBankItem.create({
            data: {
              part: "PART_5",
              format: "PART5_INCOMPLETE_SENTENCE",
              prompt: q.prompt,
              explanation: q.explanation,
              difficulty,
              primarySkill: "direct_grammar",
              unitNumber,
              ruleReference: q.ruleReference,
              conceptId,
              conceptMappingConfidence: 1.0,
              conceptMappingSource: "curated_metadata",
              reviewStatus: options.approve ? "approved" : "validated",
              isLatestApproved: Boolean(options.approve),
              source: "legacy_seed",
              sourceReference: `toeic-generator.service.ts:CURATED_TOEIC_UNIT_QUESTIONS[${unitNumber}][${difficulty}]`,
              contentHash,
              qualityScore: 9.0, // Legacy curated items passed baseline manual quality review
              validationScores: {
                linguisticAccuracy: 9.5,
                businessRealism: 9.0,
                distractorValidity: 9.0,
                pedagogicalExplanation: 8.5,
                legacyCurated: true,
              },
              options: {
                create: q.options.map((opt, idx) => ({
                  optionKey: opt.key,
                  optionText: opt.text,
                  isCorrect: opt.key.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase(),
                  displayOrder: idx,
                })),
              },
            },
            include: { options: true },
          });

          optionsCount += created.options.length;
        }
        insertedCount++;
      }
    }
  }

  const result = {
    totalScanned,
    insertedCount,
    skippedCount,
    optionsCount: options.dryRun ? insertedCount * 4 : optionsCount,
    dryRun: Boolean(options.dryRun),
  };

  console.log(`[Import Legacy TOEIC] Finished:`, result);
  return result;
}

if (require.main === module) {
  const allowAnyDb = process.argv.includes("--allow-any-db");
  const approve = process.argv.includes("--approve");
  const dryRun = process.argv.includes("--dry-run");
  importLegacyToeicQuestions({ allowAnyDb, approve, dryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

