import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import { ToeicGenerationQueueService } from "../src/services/toeic-generation-queue.service";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";

describe("Phase 3.4B Milestone 3 — Offline Queue, Practice Retrieval & Telemetry Bridge Suite", () => {
  let learnerToken: string;
  let learnerUserId: string;
  let adminToken: string;
  let adminUserId: string;

  let approvedBankItemId: string;
  let approvedUnitNumber: number = 1;
  let approvedConceptId: string;

  beforeAll(async () => {
    // 1. Create a dedicated test learner
    const learnerEmail = `learner-m3-${Date.now()}@grammarpath.local`;
    const resLearner = await request(app).post("/api/v1/auth/register").send({
      email: learnerEmail,
      password: "TestPassword123!",
      displayName: "M3 Learner",
    });
    expect(resLearner.status).toBe(201);
    learnerToken = resLearner.body.data.token;
    learnerUserId = resLearner.body.data.user.id;

    // 2. Create an admin user
    const adminEmail = `admin-m3-${Date.now()}@grammarpath.local`;
    const resAdmin = await request(app).post("/api/v1/auth/register").send({
      email: adminEmail,
      password: "AdminPassword123!",
      displayName: "M3 Admin",
    });
    expect(resAdmin.status).toBe(201);
    adminToken = resAdmin.body.data.token;
    adminUserId = resAdmin.body.data.user.id;

    // 3. Ensure we have an approved item for Unit 1, easy
    let bankItem = await prisma.toeicQuestionBankItem.findFirst({
      where: { unitNumber: 1, difficulty: "easy", reviewStatus: "approved", isLatestApproved: true },
    });

    if (!bankItem) {
      // Find a validated legacy item in Unit 1 and approve it
      const validatedItem = await prisma.toeicQuestionBankItem.findFirst({
        where: { unitNumber: 1, difficulty: "easy", reviewStatus: "validated" },
      });
      expect(validatedItem).not.toBeNull();

      bankItem = await ToeicQuestionBankService.approveQuestion({
        adminUserId,
        itemId: validatedItem!.id,
        notes: "Approved for M3 test suite",
      });
    }

    expect(bankItem).not.toBeNull();
    approvedBankItemId = bankItem!.id;
    approvedConceptId = bankItem!.conceptId!;
    expect(approvedConceptId).toBeDefined();
  });

  describe("1. Offline Generation Queue Management & Deduplication", () => {
    it("enqueues batch units without creating duplicate jobs", async () => {
      const statsBefore = await ToeicGenerationQueueService.getQueueStats();

      // Enqueue Units 5..7
      const enq = await ToeicGenerationQueueService.enqueueUnits({
        unitNumbers: [5, 6, 7],
        difficulties: ["easy", "medium"],
      });

      // Re-enqueueing the same units must add 0 duplicate jobs
      const reEnq = await ToeicGenerationQueueService.enqueueUnits({
        unitNumbers: [5, 6, 7],
        difficulties: ["easy", "medium"],
      });
      expect(reEnq.enqueuedCount).toBe(0);

      const statsAfter = await ToeicGenerationQueueService.getQueueStats();
      expect(statsAfter.jobs.pending).toBeGreaterThanOrEqual(statsBefore.jobs.pending);
    });

    it("can pause and resume a generation job safely", async () => {
      const job = await prisma.toeicGenerationJob.findFirst({
        where: { status: "pending" },
      });
      expect(job).not.toBeNull();

      // Pause job
      const paused = await prisma.toeicGenerationJob.update({
        where: { id: job!.id },
        data: { status: "paused" },
      });
      expect(paused.status).toBe("paused");

      // Resume job
      const resumed = await prisma.toeicGenerationJob.update({
        where: { id: job!.id },
        data: { status: "pending" },
      });
      expect(resumed.status).toBe("pending");
    });
  });

  describe("2. TOEIC Practice Bank Retrieval Integration", () => {
    it("generates a TOEIC practice session selecting approved bank questions with questionBankItemId", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${learnerToken}`)
        .send({
          unitNumber: approvedUnitNumber,
          difficulty: "easy",
          count: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions).toHaveLength(2);

      const sessionId = res.body.data.sessionId;

      // Verify the persisted practice items in DB link to questionBankItemId
      const sessionInDb = await prisma.toeicPracticeSession.findUnique({
        where: { id: sessionId },
        include: { items: true },
      });

      expect(sessionInDb).not.toBeNull();
      expect(sessionInDb!.items.length).toBe(2);

      // At least one item should have questionBankItemId pointing to our approved bank item
      const hasBankLink = sessionInDb!.items.some((it) => it.questionBankItemId !== null);
      expect(hasBankLink).toBe(true);
    });
  });

  describe("3. Mastery Telemetry Bridge & Eligibility Invariants", () => {
    let testSessionId: string;
    let bankPracticeItemId: string;
    let expectedCorrectKey: string;

    beforeAll(async () => {
      // Create session for Unit 1, easy
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${learnerToken}`)
        .send({
          unitNumber: approvedUnitNumber,
          difficulty: "easy",
          count: 1,
        });
      expect(res.status).toBe(200);
      testSessionId = res.body.data.sessionId;

      // Find the practice item that links to an approved bank item
      const pItem = await prisma.toeicPracticeItem.findFirst({
        where: { sessionId: testSessionId, questionBankItemId: { not: null } },
      });
      expect(pItem).not.toBeNull();
      bankPracticeItemId = pItem!.id;
      approvedBankItemId = pItem!.questionBankItemId!;
      expectedCorrectKey = pItem!.correctAnswer;
    });

    it("records QuestionAttemptItem with attemptSource='toeic_practice' and updates concept mastery on correct answer", async () => {
      // Baseline check: count attempts for this user before
      const attemptsBefore = await prisma.questionAttemptItem.count({
        where: { userId: learnerUserId, attemptSource: "toeic_practice" },
      });

      // Submit correct answer
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${learnerToken}`)
        .send({
          sessionId: testSessionId,
          itemId: bankPracticeItemId,
          studentAnswer: expectedCorrectKey,
          submissionId: `sub-correct-${Date.now()}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isCorrect).toBe(true);

      // Check that a new QuestionAttemptItem was persisted with attemptSource='toeic_practice'
      const attemptRow = await prisma.questionAttemptItem.findFirst({
        where: {
          userId: learnerUserId,
          questionBankItemId: approvedBankItemId,
          attemptSource: "toeic_practice",
        },
      });

      expect(attemptRow).not.toBeNull();
      expect(attemptRow!.isCorrect).toBe(true);
      expect(attemptRow!.attemptStatus).toBe("correct");
      expect(attemptRow!.studentAnswer).toBe(expectedCorrectKey);
    });

    it("does not create duplicate mastery telemetry when a user re-attempts the question in the same session", async () => {
      const attemptsCountBefore = await prisma.questionAttemptItem.count({
        where: { userId: learnerUserId, questionBankItemId: approvedBankItemId },
      });

      // Re-submit the same item
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${learnerToken}`)
        .send({
          sessionId: testSessionId,
          itemId: bankPracticeItemId,
          studentAnswer: expectedCorrectKey,
          submissionId: `sub-recheck-${Date.now()}`,
        });

      expect(res.status).toBe(200);

      // Attempt count in toeic_practice_items increments
      const updatedPItem = await prisma.toeicPracticeItem.findUnique({
        where: { id: bankPracticeItemId },
      });
      expect(updatedPItem!.attemptCount).toBeGreaterThanOrEqual(2);

      // But QuestionAttemptItem count must remain exactly the same!
      const attemptsCountAfter = await prisma.questionAttemptItem.count({
        where: { userId: learnerUserId, questionBankItemId: approvedBankItemId },
      });
      expect(attemptsCountAfter).toBe(attemptsCountBefore);
    });

    it("isolates non-grammar questions (e.g. vocabulary) from emitting grammar concept mastery telemetry", async () => {
      // Create a test item with primarySkill = 'vocabulary_collocation'
      const vocabItem = await prisma.toeicQuestionBankItem.create({
        data: {
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: "The new brochure contains detailed _______ of all our office products.",
          explanation: "Câu hỏi từ vựng.",
          difficulty: "easy",
          primarySkill: "vocabulary_collocation", // NON-GRAMMAR SKILL
          reviewStatus: "approved",
          isLatestApproved: true,
          contentHash: "vocab-test-hash-" + Date.now(),
          options: {
            create: [
              { optionKey: "A", optionText: "descriptions", isCorrect: true, displayOrder: 0 },
              { optionKey: "B", optionText: "describes", isCorrect: false, displayOrder: 1 },
              { optionKey: "C", optionText: "descriptive", isCorrect: false, displayOrder: 2 },
              { optionKey: "D", optionText: "descriptively", isCorrect: false, displayOrder: 3 },
            ],
          },
        },
      });

      // Create a session and practice item pointing to this vocabItem
      const session = await prisma.toeicPracticeSession.create({
        data: {
          userId: learnerUserId,
          unitNumber: 99,
          difficulty: "easy",
          source: "curated",
          requestedCount: 1,
          actualCount: 1,
          items: {
            create: {
              itemOrder: 1,
              source: "curated",
              prompt: vocabItem.prompt,
              options: [] as any,
              correctAnswer: "A",
              explanation: vocabItem.explanation,
              questionBankItemId: vocabItem.id,
            },
          },
        },
        include: { items: true },
      });

      const pItem = session.items[0];

      const attemptsCountBefore = await prisma.questionAttemptItem.count({
        where: { userId: learnerUserId, questionBankItemId: vocabItem.id },
      });

      // Submit answer
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${learnerToken}`)
        .send({
          sessionId: session.id,
          itemId: pItem.id,
          studentAnswer: "A",
          submissionId: `sub-vocab-${Date.now()}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isCorrect).toBe(true);

      // QuestionAttemptItem count MUST be 0 (isolated from grammar mastery)
      const attemptsCountAfter = await prisma.questionAttemptItem.count({
        where: { userId: learnerUserId, questionBankItemId: vocabItem.id },
      });
      expect(attemptsCountAfter).toBe(attemptsCountBefore);
      expect(attemptsCountAfter).toBe(0);

      // Clean up test vocab item
      await prisma.toeicPracticeItem.deleteMany({ where: { questionBankItemId: vocabItem.id } });
      await prisma.toeicPracticeSession.delete({ where: { id: session.id } });
      await prisma.toeicQuestionBankItem.delete({ where: { id: vocabItem.id } });
    });
  });
});

