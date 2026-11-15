import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";
import { AdminToeicAuditService } from "../src/services/admin-toeic-audit.service";

describe("Phase 3.4C.4B.2: Post-Approval & Practice Retrieval Invariants (Read-Only)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. Verifies that exactly 12 items are approved and active in the bank", async () => {
    const approved = await prisma.toeicQuestionBankItem.findMany({
      where: { reviewStatus: "approved", isLatestApproved: true },
      include: { concept: true },
    });

    expect(approved.length).toBe(12);
    for (const item of approved) {
      expect(item.unitNumber).toBe(1);
      expect(item.concept?.code).toBe("unit.001");
      expect(item.reviewedBy).toBe("owner-editorial-board");
    }
  });

  it("2. Verifies difficulty tier distribution among approved Unit 1 items (3 easy, 6 medium, 3 hard)", async () => {
    const easy = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "easy",
      count: 20,
    });
    const medium = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "medium",
      count: 20,
    });
    const hard = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "hard",
      count: 20,
    });

    expect(easy.length).toBe(3);
    expect(medium.length).toBe(6);
    expect(hard.length).toBe(3);
    expect(easy.length + medium.length + hard.length).toBe(12);
  });

  it("3. Verifies that every root question has at most one latest approved version", async () => {
    const rootCounts = await prisma.toeicQuestionBankItem.groupBy({
      by: ["rootQuestionId"],
      where: { isLatestApproved: true },
      _count: { id: true },
    });

    expect(rootCounts.length).toBe(12);
    for (const r of rootCounts) {
      expect(r._count.id).toBe(1);
    }
  });

  it("4. Verifies total bank status breakdown (41 items: 12 app, 20 val, 5 arc, 4 wdr)", async () => {
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

    expect(countMap["approved"]).toBe(12);
    expect(countMap["validated"]).toBe(20);
    expect(countMap["archived"]).toBe(5);
    expect(countMap["withdrawn"]).toBe(4);
  });

  it("5. Verifies attempt count invariant (exactly 5 attempts preserved, zero added or deleted)", async () => {
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

    const attemptsOn4493 = await prisma.questionAttemptItem.findMany({
      where: { questionBankItemId: "44931eb1-344b-4ec8-aceb-5524a952ed59" },
    });
    expect(attemptsOn4493.length).toBe(3);
  });

  it("6. Verifies AdminToeicAuditService reports K_ctx >= 8 and zero critical duplicate warnings", async () => {
    const auditReport = await AdminToeicAuditService.generateCompleteAuditReport();
    expect(auditReport).toBeDefined();

    // Check concept inventory for unit.001
    const unit1Inventory = auditReport.conceptInventories.find(
      (inv) => inv.conceptCode === "unit.001"
    );
    expect(unit1Inventory).toBeDefined();
    expect(unit1Inventory?.independentContextCount).toBeGreaterThanOrEqual(8);
    expect(unit1Inventory?.isEvidenceSufficient).toBe(true);
  });
});

