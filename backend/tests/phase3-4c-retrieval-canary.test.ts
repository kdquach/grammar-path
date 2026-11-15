import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";

describe("Phase 3.4C.4B.6A: Isolated Practice-Retrieval Canary & Isolation Verification", () => {
  let prisma: PrismaClient;

  const SELECTED_CANDIDATE_ALLOWLIST = [
    { bp: "U03-P01", version: 1, id: "841b8fe2-5d55-492f-9386-667ab8f38e57", rootId: "868f3018-6d3b-4518-bde9-6eb132d66931", expectedKey: "B" },
    { bp: "U03-P02", version: 1, id: "f691db84-18ef-49b3-a65b-49b4ac6e05ff", rootId: "f138af1c-4f25-49cb-94d6-deaff6b05c89", expectedKey: "A" },
    { bp: "U03-P03", version: 2, id: "75f17a6c-94f8-47a8-927a-068d87b9c6f8", rootId: "57089cab-aed2-4aba-9834-ea2220774a1b", expectedKey: "B" },
    { bp: "U03-P04", version: 1, id: "d2574e34-16f1-43de-aa40-ea87bb1ba478", rootId: "9afdfa8c-d994-4d34-a982-0f12a7a705a7", expectedKey: "A" },
    { bp: "U03-P05", version: 2, id: "b4b7b92c-c35b-41d8-b0f8-0205c4991393", rootId: "40a95b3a-655d-4882-b38d-72be5566957b", expectedKey: "C" },
    { bp: "U03-P06", version: 2, id: "c077b1ac-c8cb-45f8-b66b-c84189853473", rootId: "74ed2b1a-d4c3-449c-b986-5dfa7e45ff5d", expectedKey: "B" },
    { bp: "U03-P07", version: 2, id: "b9153c4f-38b4-458c-85fc-51813b49d7f9", rootId: "d776aaa1-e16d-4874-8f6a-8ad709c4795e", expectedKey: "B" },
    { bp: "U03-P08", version: 1, id: "2e221f4f-e874-43ff-a7c7-aafe1a619995", rootId: "fe746829-2568-43bc-91d2-07f8c284c932", expectedKey: "A" },
  ];

  const SUPERSEDED_V1_IDS = [
    "c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334", // U03-P03 v1
    "93eeddcf-1009-44a8-a7d9-539ad51ccd3a", // U03-P05 v1
    "8989cbc6-2833-48aa-9aaa-84df49d05cd5", // U03-P06 v1
    "c327dd92-8b96-47bf-9587-ae155c6327a0", // U03-P07 v1
  ];

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("A. Normal Learner Retrieval Isolation", () => {
    it("should return zero items for Unit 3 across easy, medium, and hard difficulty tiers", async () => {
      const easyItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
        unitNumber: 3,
        difficulty: "easy",
        count: 10,
      });
      const mediumItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
        unitNumber: 3,
        difficulty: "medium",
        count: 10,
      });
      const hardItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
        unitNumber: 3,
        difficulty: "hard",
        count: 10,
      });

      expect(easyItems).toHaveLength(0);
      expect(mediumItems).toHaveLength(0);
      expect(hardItems).toHaveLength(0);
    });

    it("should confirm that no Unit 3 item in the bank is approved or latest approved", async () => {
      const approvedUnit3 = await prisma.toeicQuestionBankItem.findMany({
        where: {
          unitNumber: 3,
          OR: [
            { reviewStatus: "approved" },
            { isLatestApproved: true },
          ],
        },
      });

      expect(approvedUnit3).toHaveLength(0);
    });

    it("should confirm that all four superseded v1 records remain unexposed in normal practice retrieval", async () => {
      const exposedSuperseded = await prisma.toeicQuestionBankItem.findMany({
        where: {
          id: { in: SUPERSEDED_V1_IDS },
          reviewStatus: "approved",
          isLatestApproved: true,
        },
      });

      expect(exposedSuperseded).toHaveLength(0);
    });

    it("should confirm normal practice retrieval functions correctly for approved Unit 1 items", async () => {
      const unit1Practice = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
        unitNumber: 1,
        difficulty: "easy",
        count: 5,
      });

      // Unit 1 has 12 approved items, retrieval works as expected
      expect(unit1Practice.length).toBeGreaterThan(0);
      for (const item of unit1Practice) {
        expect(item.reviewStatus).toBe("approved");
        expect(item.isLatestApproved).toBe(true);
        expect(item.unitNumber).toBe(1);
      }
    });
  });

  describe("B. Isolated Canary Evaluation via Test-Only Allowlist", () => {
    it("should resolve exactly the eight selected candidates through the isolated canary boundary", async () => {
      const allowlistIds = SELECTED_CANDIDATE_ALLOWLIST.map((c) => c.id);

      // Canary evaluation: query against allowlist boundary
      const canaryItems = await prisma.toeicQuestionBankItem.findMany({
        where: {
          id: { in: allowlistIds },
          unitNumber: 3,
        },
        include: {
          options: { orderBy: { optionKey: "asc" } },
        },
      });

      expect(canaryItems).toHaveLength(8);

      const canaryItemMap = new Map(canaryItems.map((item) => [item.id, item]));

      for (const expected of SELECTED_CANDIDATE_ALLOWLIST) {
        const item = canaryItemMap.get(expected.id);
        expect(item).toBeDefined();
        expect(item!.rootQuestionId).toBe(expected.rootId);
        expect(item!.version).toBe(expected.version);
        expect(item!.reviewStatus).toBe("validated");
        expect(item!.isLatestApproved).toBe(false);

        // Verify options structure
        expect(item!.options).toHaveLength(4);
        const correctOptions = item!.options.filter((o) => o.isCorrect);
        expect(correctOptions).toHaveLength(1);
        expect(correctOptions[0].optionKey).toBe(expected.expectedKey);
      }
    });

    it("should strictly exclude the four superseded Version 1 records from the canary allowlist", async () => {
      const allowlistIds = new Set(SELECTED_CANDIDATE_ALLOWLIST.map((c) => c.id));

      for (const supersededId of SUPERSEDED_V1_IDS) {
        expect(allowlistIds.has(supersededId)).toBe(false);
      }
    });

    it("should confirm the canary execution left database state and telemetry 100% unaltered", async () => {
      // Census check
      const total = await prisma.toeicQuestionBankItem.count();
      const approved = await prisma.toeicQuestionBankItem.count({ where: { isLatestApproved: true } });
      const validated = await prisma.toeicQuestionBankItem.count({ where: { reviewStatus: "validated" } });
      const unit3Approved = await prisma.toeicQuestionBankItem.count({
        where: { unitNumber: 3, reviewStatus: "approved" },
      });

      expect(total).toBe(53);
      expect(approved).toBe(12);
      expect(validated).toBe(32);
      expect(unit3Approved).toBe(0);

      // Telemetry check
      const exerciseAttempts = await prisma.exerciseAttempt.count();
      const questionAttempts = await prisma.questionAttemptItem.count();
      const practiceSessions = await prisma.toeicPracticeSession.count();
      const practiceItems = await prisma.toeicPracticeItem.count();

      expect(exerciseAttempts).toBe(2);
      expect(questionAttempts).toBe(5);
      expect(practiceSessions).toBe(10);
      expect(practiceItems).toBe(15);
    });
  });
});

