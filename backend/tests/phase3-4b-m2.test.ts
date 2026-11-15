import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import { validateToeicQuestionQuality } from "../src/services/toeic-quality-engine.service";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";
import { randomUUID, createHash } from "node:crypto";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Phase 3.4B Milestone 2 — Quality Engine, Editorial Lifecycle & Authorization Suite", () => {
  let learnerToken: string;
  let adminToken: string;
  let adminUserId: string;
  const createdItemIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a standard learner user
    const learnerEmail = `learner-phase34b-${Date.now()}@grammarpath.local`;
    const resLearner = await request(app).post("/api/v1/auth/register").send({
      email: learnerEmail,
      password: "TestPassword123!",
      displayName: "Standard Learner",
    });
    expect(resLearner.status).toBe(201);
    learnerToken = resLearner.body.data.token;
    createdUserIds.push(resLearner.body.data.user.id);

    // 2. Create an administrative user (using authorized email)
    const adminEmail = `admin-${Date.now()}@grammarpath.local`;
    const resAdmin = await request(app).post("/api/v1/auth/register").send({
      email: adminEmail,
      password: "AdminPassword123!",
      displayName: "Editorial Admin",
    });
    expect(resAdmin.status).toBe(201);
    adminToken = resAdmin.body.data.token;
    adminUserId = resAdmin.body.data.user.id;
    createdUserIds.push(adminUserId);
  });

  afterAll(async () => {
    // 1. Clean up test created items
    if (createdItemIds.length > 0) {
      await prisma.toeicQuestionOption.deleteMany({
        where: { questionBankItemId: { in: createdItemIds } },
      });
      await prisma.toeicQuestionBankItem.deleteMany({
        where: { id: { in: createdItemIds } },
      });
    }

    // 2. Clean up test users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  describe("1. Quality Gate & Automated Evaluation Engine", () => {
    it("approves a high-quality, authentic TOEIC Part 5 question with score >= 8.50", async () => {
      const report = await validateToeicQuestionQuality(
        {
          prompt: "The regional marketing manager _______ the quarterly sales figures at tomorrow's conference.",
          options: [
            { optionKey: "A", optionText: "will present", isCorrect: true },
            { optionKey: "B", optionText: "presentation", isCorrect: false },
            { optionKey: "C", optionText: "presents", isCorrect: false },
            { optionKey: "D", optionText: "was presented", isCorrect: false },
          ],
          correctAnswer: "A",
          explanation:
            "Dấu hiệu 'tomorrow' chỉ một sự việc trong tương lai, cần động từ ở thì tương lai đơn 'will present'.",
          unitNumber: 1,
          difficulty: "medium",
        },
        { checkDbDuplicates: false }
      );

      expect(report.isValid).toBe(true);
      expect(report.canQualifyForValidatedStatus).toBe(true);
      expect(report.overallScore).toBeGreaterThanOrEqual(8.5);
      expect(report.blockingDefects).toHaveLength(0);
    });

    it("detects and blocks format violations (missing blank and multiple blanks)", async () => {
      // Missing blank
      const reportNoBlank = await validateToeicQuestionQuality(
        {
          prompt: "The company reported record profits this year.",
          options: [
            { optionKey: "A", optionText: "high", isCorrect: true },
            { optionKey: "B", optionText: "low" },
            { optionKey: "C", optionText: "slow" },
            { optionKey: "D", optionText: "fast" },
          ],
          correctAnswer: "A",
          explanation: "Giải thích quy tắc.",
        },
        { checkDbDuplicates: false }
      );
      expect(reportNoBlank.isValid).toBe(false);
      expect(reportNoBlank.blockingDefects.some((d) => d.code === "BLK_FORMAT")).toBe(true);

      // Multiple blanks
      const reportMultiBlank = await validateToeicQuestionQuality(
        {
          prompt: "The manager _______ the client _______ 2 P.M.",
          options: [
            { optionKey: "A", optionText: "meets / at", isCorrect: true },
            { optionKey: "B", optionText: "meet / on" },
            { optionKey: "C", optionText: "met / in" },
            { optionKey: "D", optionText: "meeting / of" },
          ],
          correctAnswer: "A",
          explanation: "Giải thích quy tắc.",
        },
        { checkDbDuplicates: false }
      );
      expect(reportMultiBlank.isValid).toBe(false);
      expect(reportMultiBlank.blockingDefects.some((d) => d.code === "BLK_FORMAT")).toBe(true);
    });

    it("detects and blocks answer-key defects (zero keys and ambiguous multiple keys)", async () => {
      // Zero keys
      const reportNoKey = await validateToeicQuestionQuality(
        {
          prompt: "The courier _______ the package to the reception desk.",
          options: [
            { optionKey: "A", optionText: "delivers", isCorrect: false },
            { optionKey: "B", optionText: "delivering", isCorrect: false },
            { optionKey: "C", optionText: "delivered", isCorrect: false },
            { optionKey: "D", optionText: "deliver", isCorrect: false },
          ],
          explanation: "Giải thích ngữ pháp.",
        },
        { checkDbDuplicates: false }
      );
      expect(reportNoKey.isValid).toBe(false);
      expect(reportNoKey.blockingDefects.some((d) => d.code === "BLK_WRONG_KEY")).toBe(true);

      // Multiple keys (ambiguity)
      const reportMultiKey = await validateToeicQuestionQuality(
        {
          prompt: "The courier _______ the package to the reception desk.",
          options: [
            { optionKey: "A", optionText: "delivers", isCorrect: true },
            { optionKey: "B", optionText: "delivering", isCorrect: false },
            { optionKey: "C", optionText: "delivered", isCorrect: true },
            { optionKey: "D", optionText: "deliver", isCorrect: false },
          ],
          explanation: "Giải thích ngữ pháp.",
        },
        { checkDbDuplicates: false }
      );
      expect(reportMultiKey.isValid).toBe(false);
      expect(reportMultiKey.blockingDefects.some((d) => d.code === "BLK_AMBIGUITY")).toBe(true);
    });

    it("detects and blocks duplicate option texts", async () => {
      const reportDupOpts = await validateToeicQuestionQuality(
        {
          prompt: "The supervisor _______ all travel expense vouchers.",
          options: [
            { optionKey: "A", optionText: "approves", isCorrect: true },
            { optionKey: "B", optionText: "approves", isCorrect: false }, // Duplicate
            { optionKey: "C", optionText: "approving", isCorrect: false },
            { optionKey: "D", optionText: "approved", isCorrect: false },
          ],
          correctAnswer: "A",
          explanation: "Giải thích ngữ pháp thì hiện tại đơn.",
        },
        { checkDbDuplicates: false }
      );
      expect(reportDupOpts.isValid).toBe(false);
      expect(reportDupOpts.blockingDefects.some((d) => d.code === "BLK_DISTRACTOR")).toBe(true);
    });
  });

  describe("2. Admin Authorization & Permission Checks", () => {
    it("rejects unauthenticated requests to admin endpoints with 401", async () => {
      const res = await request(app).get("/api/v1/admin/toeic/queue");
      expect(res.status).toBe(401);
    });

    it("rejects standard learners without administrative privileges with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/admin/toeic/queue")
        .set("Authorization", `Bearer ${learnerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows authorized administrators with admin credentials or admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/toeic/queue")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-admin-key", "staging-admin-secret-key-2026");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe("3. Editorial Lifecycle State Machine & Versioning Invariants", () => {
    let testItemId: string;
    let rootQuestionId: string;

    beforeAll(async () => {
      // Create a dedicated isolated test item in Unit 1 (never mutate real staging inventory)
      const rootId = randomUUID();
      const item = await prisma.toeicQuestionBankItem.create({
        data: {
          rootQuestionId: rootId,
          version: 1,
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: "The regional compliance officer _______ all safety reports before submission.",
          explanation: "Kiểm tra ngữ pháp thì hiện tại đơn.",
          difficulty: "easy",
          primarySkill: "direct_grammar",
          unitNumber: 1,
          reviewStatus: "validated",
          isLatestApproved: false,
          contentHash: sha256(`test-m2-item-${Date.now()}-${randomUUID()}`),
          options: {
            create: [
              { optionKey: "A", optionText: "inspects", isCorrect: true, displayOrder: 0 },
              { optionKey: "B", optionText: "inspecting", isCorrect: false, displayOrder: 1 },
              { optionKey: "C", optionText: "inspection", isCorrect: false, displayOrder: 2 },
              { optionKey: "D", optionText: "inspected", isCorrect: false, displayOrder: 3 },
            ],
          },
        },
      });
      testItemId = item.id;
      rootQuestionId = item.rootQuestionId;
      createdItemIds.push(item.id);
    });

    it("approves a validated question, setting isLatestApproved=true and audit fields", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/toeic/items/${testItemId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-admin-key", "staging-admin-secret-key-2026")
        .send({ notes: "Editorial review complete: high business realism, unambiguous key." });

      expect(res.status).toBe(200);
      expect(res.body.data.reviewStatus).toBe("approved");
      expect(res.body.data.isLatestApproved).toBe(true);
      expect(res.body.data.reviewedBy).toBe(adminUserId);

      // Verify in DB
      const dbItem = await prisma.toeicQuestionBankItem.findUnique({ where: { id: testItemId } });
      expect(dbItem!.reviewStatus).toBe("approved");
      expect(dbItem!.isLatestApproved).toBe(true);
    });

    it("creates Version 2 of the approved question; Version 2 starts unapproved (isLatestApproved=false)", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/toeic/items/${testItemId}/version`)
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-admin-key", "staging-admin-secret-key-2026")
        .send({
          prompt: "The regional compliance officer _______ all safety reports before final submission.",
          explanation: "Cập nhật giải thích chi tiết hơn cho người học.",
        });

      expect(res.status).toBe(201);
      const v2Item = res.body.data;
      createdItemIds.push(v2Item.id);

      expect(v2Item.version).toBe(2);
      expect(v2Item.rootQuestionId).toBe(rootQuestionId);
      expect(v2Item.isLatestApproved).toBe(false);
      expect(["draft", "validated"]).toContain(v2Item.reviewStatus);

      // Verify Version 1 is still approved at this moment
      const v1Item = await prisma.toeicQuestionBankItem.findUnique({ where: { id: testItemId } });
      expect(v1Item!.isLatestApproved).toBe(true);
      expect(v1Item!.reviewStatus).toBe("approved");

      // Now approve Version 2
      const resApproveV2 = await request(app)
        .post(`/api/v1/admin/toeic/items/${v2Item.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-admin-key", "staging-admin-secret-key-2026")
        .send({ notes: "Approved updated Version 2." });

      expect(resApproveV2.status).toBe(200);
      expect(resApproveV2.body.data.isLatestApproved).toBe(true);
      expect(resApproveV2.body.data.reviewStatus).toBe("approved");

      // Verify atomic transition: Version 1 must now be archived and no longer latest approved!
      const v1After = await prisma.toeicQuestionBankItem.findUnique({ where: { id: testItemId } });
      expect(v1After!.reviewStatus).toBe("archived");
      expect(v1After!.isLatestApproved).toBe(false);
    });

    it("executes emergency withdrawal for a defective question, immediately revoking active status", async () => {
      // Create a dummy candidate item
      const candidate = await prisma.toeicQuestionBankItem.create({
        data: {
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: "Emergency withdrawal test question _______ for testing.",
          explanation: "Giải thích câu hỏi thử nghiệm.",
          difficulty: "easy",
          reviewStatus: "approved",
          isLatestApproved: true,
          contentHash: sha256(`dummy-emergency-test-hash-${Date.now()}-${randomUUID()}`),
          options: {
            create: [
              { optionKey: "A", optionText: "valid", isCorrect: true, displayOrder: 0 },
              { optionKey: "B", optionText: "invalid 1", isCorrect: false, displayOrder: 1 },
              { optionKey: "C", optionText: "invalid 2", isCorrect: false, displayOrder: 2 },
              { optionKey: "D", optionText: "invalid 3", isCorrect: false, displayOrder: 3 },
            ],
          },
        },
      });
      createdItemIds.push(candidate.id);

      const res = await request(app)
        .post(`/api/v1/admin/toeic/items/${candidate.id}/withdraw`)
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-admin-key", "staging-admin-secret-key-2026")
        .send({ reason: "Emergency withdrawal: discovered dual correct answer in distractor C" });

      expect(res.status).toBe(200);
      expect(res.body.data.reviewStatus).toBe("withdrawn");
      expect(res.body.data.isLatestApproved).toBe(false);
      expect(res.body.data.withdrawnReason).toContain("dual correct answer");
    });
  });

  describe("4. Practice Selection Invariant Gate", () => {
    it("ensures practice selection service strictly retrieves ONLY active, approved items", async () => {
      // Query approved questions for Unit 1, easy
      const approvedItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
        unitNumber: 1,
        difficulty: "easy",
        count: 10,
      });

      // All returned items must have reviewStatus='approved' AND isLatestApproved=true
      for (const item of approvedItems) {
        expect(item.reviewStatus).toBe("approved");
        expect(item.isLatestApproved).toBe(true);
      }

      // Validated, draft, rejected, archived, or withdrawn questions must NEVER be returned
      const nonApprovedCount = await prisma.toeicQuestionBankItem.count({
        where: {
          unitNumber: 1,
          difficulty: "easy",
          OR: [{ reviewStatus: { not: "approved" } }, { isLatestApproved: false }],
        },
      });

      expect(nonApprovedCount).toBeGreaterThan(0);
      // Non-approved items exist in DB, but getApprovedQuestionsForPractice excluded every single one of them!
      const nonApprovedIds = (
        await prisma.toeicQuestionBankItem.findMany({
          where: {
            unitNumber: 1,
            difficulty: "easy",
            OR: [{ reviewStatus: { not: "approved" } }, { isLatestApproved: false }],
          },
          select: { id: true },
        })
      ).map((i) => i.id);

      for (const item of approvedItems) {
        expect(nonApprovedIds).not.toContain(item.id);
      }
    });
  });
});

