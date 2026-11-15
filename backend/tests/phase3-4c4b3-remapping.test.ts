import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";
import { AdminToeicAuditService } from "../src/services/admin-toeic-audit.service";

describe("Phase 3.4C.4B.3: Post-Remapping Verification & System Invariants (Read-Only)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. Verifies all 7 remapped questions resolve to exact valid GrammarConcept records without orphans", async () => {
    const remappedSpecs = [
      { id: "43753724-dcb3-4681-adb5-5d0c71d34b7c", expectedUnit: 5, expectedCode: "unit.005" },
      { id: "6948841f-9dc6-487c-83ed-04c6ebfbc9fe", expectedUnit: 6, expectedCode: "unit.006" },
      { id: "77299aeb-93d6-483e-9f77-4d5a8c67496a", expectedUnit: 40, expectedCode: "unit.040" },
      { id: "c10918d0-496f-4766-a6c5-923445203650", expectedUnit: 6, expectedCode: "unit.006" },
      { id: "6e803d45-15fe-4fb7-8f35-5f7636947888", expectedUnit: 1, expectedCode: "unit.001" },
      { id: "7addbaf6-e0f1-47c4-a31d-f0196200c087", expectedUnit: 1, expectedCode: "unit.001" },
      { id: "ac0c643a-f264-4991-b5ae-08c0e8eb2848", expectedUnit: 2, expectedCode: "unit.002" },
    ];

    for (const spec of remappedSpecs) {
      const item = await prisma.toeicQuestionBankItem.findUnique({
        where: { id: spec.id },
        include: { concept: true },
      });

      expect(item).toBeDefined();
      expect(item?.unitNumber).toBe(spec.expectedUnit);
      expect(item?.concept?.code).toBe(spec.expectedCode);
      expect(item?.conceptMappingConfidence).toBe(1.0);
      expect(item?.conceptMappingSource).toBe("editorial_remapping_phase3_4c4b3");
      expect(item?.reviewStatus).toBe("validated");
      expect(item?.isLatestApproved).toBe(false);
    }
  });

  it("2. Verifies that Unit 3 is completely cleansed of corrupting non-Unit-3 items (count = 0)", async () => {
    const unit3Items = await prisma.toeicQuestionBankItem.findMany({
      where: {
        OR: [
          { unitNumber: 3 },
          { concept: { code: "unit.003" } },
        ],
      },
    });

    expect(unit3Items.length).toBe(0);
  });

  it("3. Verifies that Unit 4 has exactly 1 valid candidate item (fe61381a) mapping to unit.004", async () => {
    const unit4Items = await prisma.toeicQuestionBankItem.findMany({
      where: {
        unitNumber: 4,
      },
      include: { concept: true },
    });

    expect(unit4Items.length).toBe(1);
    expect(unit4Items[0].id).toBe("fe61381a-7e1b-495f-a388-804cb27ea8f5");
    expect(unit4Items[0].concept?.code).toBe("unit.004");
  });

  it("4. Verifies question bank total count and reviewStatus invariants (41 items: 12 app, 20 val, 5 arc, 4 wdr)", async () => {
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

  it("5. Verifies historical learner attempts invariant (exactly 5 attempts preserved, zero contaminated)", async () => {
    const totalAttempts = await prisma.questionAttemptItem.count();
    expect(totalAttempts).toBe(5);

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
  });

  it("6. Verifies that approved items remain exclusively the 12 certified Unit 1 items", async () => {
    const approved = await prisma.toeicQuestionBankItem.findMany({
      where: { reviewStatus: "approved", isLatestApproved: true },
      include: { concept: true },
    });

    expect(approved.length).toBe(12);
    for (const item of approved) {
      expect(item.unitNumber).toBe(1);
      expect(item.concept?.code).toBe("unit.001");
    }
  });

  it("7. Verifies practice retrieval continues to return exactly 12 approved Unit 1 items and 0 remapped items", async () => {
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
    const practiceAll = [...easy, ...medium, ...hard];

    expect(practiceAll.length).toBe(12);

    // Verify none of the remapped items appear in practice retrieval
    const remappedIds = [
      "43753724-dcb3-4681-adb5-5d0c71d34b7c",
      "6948841f-9dc6-487c-83ed-04c6ebfbc9fe",
      "77299aeb-93d6-483e-9f77-4d5a8c67496a",
      "c10918d0-496f-4766-a6c5-923445203650",
      "6e803d45-15fe-4fb7-8f35-5f7636947888",
      "7addbaf6-e0f1-47c4-a31d-f0196200c087",
      "ac0c643a-f264-4991-b5ae-08c0e8eb2848",
      "fe61381a-7e1b-495f-a388-804cb27ea8f5",
      "fa201c0b-4173-453b-8fd8-4df4019e6ca9",
      "fe5dcc57-9a64-48a6-9ae3-2f4a5ebcecea",
    ];

    const retrievedIds = practiceAll.map((p) => p.id);
    for (const id of remappedIds) {
      expect(retrievedIds).not.toContain(id);
    }
  });

  it("8. Verifies AdminToeicAuditService reports 0 approved questions for unit.003 and prevents invalid evidence", async () => {
    const audit = await AdminToeicAuditService.generateCompleteAuditReport();
    expect(audit).toBeDefined();

    const unit3Inv = audit.conceptInventories.find((c) => c.conceptCode === "unit.003");
    expect(unit3Inv).toBeDefined();
    expect(unit3Inv?.approvedQuestionCount).toBe(0);
    expect(unit3Inv?.isEvidenceSufficient).toBe(false);
  });
});
