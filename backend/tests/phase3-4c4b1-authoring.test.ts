import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";

describe("Phase 3.4C.4B.1: Remediation and Version 3 Authoring Verification (Read-Only)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. Verifies that exactly two target Version 2 items are withdrawn with reasons", async () => {
    const item1 = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: "7d9abd94-df89-4762-8a86-a3217f0217b0" },
    });
    const item2 = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: "44931eb1-344b-4ec8-aceb-5524a952ed59" },
    });

    expect(item1).not.toBeNull();
    expect(item1?.reviewStatus).toBe("withdrawn");
    expect(item1?.isLatestApproved).toBe(false);
    expect(item1?.withdrawnReason).toContain("collocation defect");

    expect(item2).not.toBeNull();
    expect(item2?.reviewStatus).toBe("withdrawn");
    expect(item2?.isLatestApproved).toBe(false);
    expect(item2?.withdrawnReason).toContain("collocation defect");
  });

  it("2. Verifies that item 45e751fd remains approved and active", async () => {
    const item = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: "45e751fd-4915-4bac-a386-c7bae5295911" },
    });

    expect(item).not.toBeNull();
    expect(item?.reviewStatus).toBe("approved");
    expect(item?.isLatestApproved).toBe(true);
  });

  it("3. Verifies that exactly four Version 3 records exist with correct metadata", async () => {
    const v3Items = await prisma.toeicQuestionBankItem.findMany({
      where: { version: 3 },
      include: { options: { orderBy: { optionKey: "asc" } }, concept: true },
      orderBy: { rootQuestionId: "asc" },
    });

    expect(v3Items.length).toBe(4);

    const expectedRoots = [
      "0fda8409-0926-49c0-8b86-1564d83497ac",
      "3d71c0d1-6a2d-498a-b6f2-c5abad85657e",
      "634add4d-5982-4de8-99de-6c4561c6ee44",
      "6a54a874-c48b-4651-a3f5-b686dd51fb6b",
    ].sort();

    const actualRoots = v3Items.map((v) => v.rootQuestionId).sort();
    expect(actualRoots).toEqual(expectedRoots);

    for (const item of v3Items) {
      expect(item.reviewStatus).toBe("validated");
      expect(item.isLatestApproved).toBe(false);
      expect(item.unitNumber).toBe(1);
      expect(item.concept?.code).toBe("unit.001");
      expect(item.options.length).toBe(4);

      const correct = item.options.filter((o) => o.isCorrect);
      expect(correct.length).toBe(1);

      // Verify all options have non-empty rationales
      for (const opt of item.options) {
        expect(opt.rationale).toBeTruthy();
        expect(opt.rationale!.length).toBeGreaterThan(15);
      }
    }
  });

  it("4. Verifies total bank inventory invariant (41 items: 31 val, 5 arc, 4 wdr, 1 app)", async () => {
    const total = await prisma.toeicQuestionBankItem.count();
    expect(total).toBe(41);

    const counts = await prisma.toeicQuestionBankItem.groupBy({
      by: ["reviewStatus"],
      _count: { id: true },
    });

    const countMap: Record<string, number> = {};
    counts.forEach((c) => {
      countMap[c.reviewStatus] = c._count.id;
    });

    expect(countMap["validated"]).toBe(31);
    expect(countMap["archived"]).toBe(5);
    expect(countMap["withdrawn"]).toBe(4);
    expect(countMap["approved"]).toBe(1);
  });

  it("5. Verifies attempt count invariant (exactly 5 attempts, zero modified or created)", async () => {
    const attempts = await prisma.questionAttemptItem.findMany();
    expect(attempts.length).toBe(5);

    const attemptsOnWithdrawn = await prisma.questionAttemptItem.findMany({
      where: {
        questionBankItemId: {
          in: [
            "7d9abd94-df89-4762-8a86-a3217f0217b0",
            "7d24582b-ca20-4c7a-a828-530f4852e80a",
            "4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2",
          ],
        },
      },
    });
    expect(attemptsOnWithdrawn.length).toBe(0);

    // Item 44931eb1 retains its 3 historical attempts
    const attemptsOn4493 = await prisma.questionAttemptItem.findMany({
      where: { questionBankItemId: "44931eb1-344b-4ec8-aceb-5524a952ed59" },
    });
    expect(attemptsOn4493.length).toBe(3);
  });

  it("6. Verifies practice question retrieval strictly isolates unapproved and withdrawn versions", async () => {
    const easyItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "easy",
    });
    expect(easyItems.length).toBe(1);
    expect(easyItems[0].id).toBe("45e751fd-4915-4bac-a386-c7bae5295911");

    const medItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "medium",
    });
    expect(medItems.length).toBe(0);
  });
});

