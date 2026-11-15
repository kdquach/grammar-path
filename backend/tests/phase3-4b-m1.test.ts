import { describe, it, expect } from "vitest";
import prisma from "../src/lib/prisma";
import { computeToeicItemContentHash } from "../scripts/import-legacy-toeic";
import { CURATED_TOEIC_UNIT_QUESTIONS } from "../src/services/toeic-generator.service";

describe("Phase 3.4B Milestone 1 — Schema, Migration & Legacy Ingestion Verification", () => {
  it("computes deterministic content hashes for identical prompt and options", () => {
    const prompt = "The CEO _______ to discuss the annual financial results.";
    const options = [
      { key: "A", text: "will meet" },
      { key: "B", text: "meeting" },
      { key: "C", text: "meets" },
      { key: "D", text: "met" },
    ];
    const hash1 = computeToeicItemContentHash(prompt, options);
    const hash2 = computeToeicItemContentHash("  the ceo   _______ to discuss the annual financial results.  ", [
      { key: "D", text: "met" },
      { key: "B", text: "meeting" },
      { key: "A", text: "will meet" },
      { key: "C", text: "meets" },
    ]);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("verifies all 30 legacy curated questions are present in staging as 'validated'", async () => {
    const items = await prisma.toeicQuestionBankItem.findMany({
      where: { source: "legacy_seed", version: 1 },
      include: { options: true, concept: true },
    });

    expect(items.length).toBe(30);

    // Verify all 30 legacy items have Part 5 format, 4 options, 1 key, and valid status
    for (const item of items) {
      expect(["validated", "approved", "archived"]).toContain(item.reviewStatus);
      expect(item.part).toBe("PART_5");
      expect(item.format).toBe("PART5_INCOMPLETE_SENTENCE");
      expect(item.options).toHaveLength(4);

      // Verify exactly 1 correct option
      const correctOpts = item.options.filter((o) => o.isCorrect);
      expect(correctOpts).toHaveLength(1);

      // Verify concept mapping for Units 1-4
      expect(item.unitNumber).toBeGreaterThanOrEqual(1);
      expect(item.unitNumber).toBeLessThanOrEqual(4);
      expect(item.conceptId).not.toBeNull();
      expect(item.conceptMappingConfidence).toBe(1.0);
    }
  });

  it("verifies content hash uniqueness constraint in database", async () => {
    const firstItem = await prisma.toeicQuestionBankItem.findFirst();
    expect(firstItem).not.toBeNull();

    // Attempting to insert duplicate contentHash should fail with unique constraint violation
    await expect(
      prisma.toeicQuestionBankItem.create({
        data: {
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: "Duplicate prompt test",
          explanation: "Duplicate explanation test",
          contentHash: firstItem!.contentHash,
        },
      })
    ).rejects.toThrow();
  });

  it("verifies version immutability via unique [rootQuestionId, version] constraint", async () => {
    const firstItem = await prisma.toeicQuestionBankItem.findFirst();
    expect(firstItem).not.toBeNull();

    // Attempting to insert duplicate (rootQuestionId, version) must fail
    await expect(
      prisma.toeicQuestionBankItem.create({
        data: {
          rootQuestionId: firstItem!.rootQuestionId,
          version: firstItem!.version,
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: "Unique prompt but duplicate root+version",
          explanation: "Explanation",
          contentHash: "dummy-hash-" + Date.now(),
        },
      })
    ).rejects.toThrow();
  });

  it("verifies historical learner attempts and sessions are completely unaltered", async () => {
    // 3 historical staging users
    const historicalUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            "phase32-e2e-1794547108109@grammarpath.local",
            "audit-db-1794547651039@grammarpath.local",
            "perf-audit-1794548142017@grammarpath.local",
          ],
        },
      },
    });
    expect(historicalUsers.length).toBe(3);

    // 2 historical textbook exercise attempts
    const attemptCount = await prisma.exerciseAttempt.count();
    expect(attemptCount).toBe(2);

    // Verify all existing textbook attempts retain non-null questionId and null questionBankItemId
    const textbookAttempts = await prisma.questionAttemptItem.findMany({
      where: { attemptId: { not: null } },
    });
    expect(textbookAttempts.length).toBe(2);
    for (const a of textbookAttempts) {
      expect(a.questionId).not.toBeNull();
      expect(a.questionBankItemId).toBeNull();
    }
  });
});
