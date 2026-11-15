import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Phase 3.4A — Staging API Integration Suite (Server-Authoritative Review Grader & Rate Limiting)", () => {
  let authTokenA: string;
  let testUserIdA: string;
  let authTokenB: string;
  let testUserIdB: string;

  let testConceptId: string;
  let testQuestionId: string;
  let testScheduleAId: string;
  let expectedAnswer: string;

  beforeAll(async () => {
    // 1. Create User A on staging
    const emailA = `staging-phase34a-userA-${Date.now()}@grammarpath.local`;
    const resA = await request(app).post("/api/v1/auth/register").send({
      email: emailA,
      password: "TestPassword123!",
      displayName: "Phase 3.4A Tester A",
    });
    expect(resA.status).toBe(201);
    authTokenA = resA.body.data.token;
    testUserIdA = resA.body.data.user.id;

    // 2. Create User B on staging (for IDOR tests)
    const emailB = `staging-phase34a-userB-${Date.now()}@grammarpath.local`;
    const resB = await request(app).post("/api/v1/auth/register").send({
      email: emailB,
      password: "TestPassword123!",
      displayName: "Phase 3.4A Tester B",
    });
    expect(resB.status).toBe(201);
    authTokenB = resB.body.data.token;
    testUserIdB = resB.body.data.user.id;

    // 3. Find Unit 1 and Concept 1 on staging
    const foundConcept = await prisma.grammarConcept.findFirst({
      where: { code: "unit.001" },
    });
    expect(foundConcept).toBeDefined();
    testConceptId = foundConcept!.id;

    // 4. Find a real question with answerKey from Unit 1
    const unit1 = await prisma.unit.findFirst({
      where: { unitNumber: 1 },
      include: {
        exercises: {
          include: {
            questions: {
              where: { isExample: false },
              include: {
                answerKey: true,
                acceptedAnswers: true,
              },
            },
          },
        },
      },
    });
    expect(unit1).toBeDefined();

    const sampleQ = unit1!.exercises[0].questions[0];
    expect(sampleQ).toBeDefined();
    testQuestionId = sampleQ.id;
    expectedAnswer = sampleQ.correctAnswerText || sampleQ.answerKey?.answerText || "am doing";

    // 5. Create an initial review schedule for User A
    const scheduleA = await prisma.conceptReviewSchedule.create({
      data: {
        userId: testUserIdA,
        conceptId: testConceptId,
        stabilityDays: 2.0,
        intervalDays: 2,
        reviewCount: 1,
        consecutiveCorrect: 1,
        reviewState: "due",
        dueAt: new Date(Date.now() - 3600000), // 1 hour overdue
      },
    });
    testScheduleAId = scheduleA.id;
  });

  afterAll(async () => {
    // Clean up test users safely
    if (testUserIdA) {
      await prisma.user.delete({ where: { id: testUserIdA } }).catch(() => {});
    }
    if (testUserIdB) {
      await prisma.user.delete({ where: { id: testUserIdB } }).catch(() => {});
    }
  });

  describe("1. Authentication & Route Protection", () => {
    it("rejects unauthenticated GET /api/v1/reviews/due with 401", async () => {
      const res = await request(app).get("/api/v1/reviews/due");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated POST /api/v1/reviews/:conceptId/complete with 401", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .send({ answers: { [testQuestionId]: "test" } });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("2. Server-Authoritative Answer Validation & Mastery Pipeline", () => {
    it("grades correct answer server-authoritatively and expands review stability", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authTokenA}`)
        .send({
          scheduleId: testScheduleAId,
          answers: {
            [testQuestionId]: expectedAnswer,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("success");
      expect(res.body.data.accuracy).toBe(100);
      expect(res.body.data.correctCount).toBe(1);
      expect(res.body.data.stabilityDays).toBe(4.0); // 2.0 * 2.0
      expect(res.body.data.results[0].isCorrect).toBe(true);

      // Verify questionAttemptItem persisted in database with attemptSource: 'single_check'
      const attemptItem = await prisma.questionAttemptItem.findFirst({
        where: {
          userId: testUserIdA,
          questionId: testQuestionId,
          attemptSource: "single_check",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(attemptItem).not.toBeNull();
      expect(attemptItem!.isCorrect).toBe(true);
      expect(attemptItem!.attemptStatus).toBe("correct");
    });

    it("grades incorrect answer server-authoritatively and halves review stability", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authTokenA}`)
        .send({
          scheduleId: testScheduleAId,
          answers: {
            [testQuestionId]: "completely wrong grammar answer xyz",
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("reinforcement_needed");
      expect(res.body.data.accuracy).toBe(0);
      expect(res.body.data.correctCount).toBe(0);
      expect(res.body.data.intervalDays).toBe(1);
      expect(res.body.data.results[0].isCorrect).toBe(false);

      const attemptItem = await prisma.questionAttemptItem.findFirst({
        where: {
          userId: testUserIdA,
          questionId: testQuestionId,
          attemptStatus: "incorrect",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(attemptItem).not.toBeNull();
      expect(attemptItem!.isCorrect).toBe(false);
    });

    it("neutralizes client tampering: isCorrect: true and correctCount: 99 are ignored when answer is wrong", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authTokenA}`)
        .send({
          scheduleId: testScheduleAId,
          answers: {
            [testQuestionId]: "blatantly incorrect answer",
          },
          isCorrect: true, // Tampered client field
          correctCount: 99, // Tampered client field
          accuracy: 100, // Tampered client field
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Server overrides client claims completely!
      expect(res.body.data.accuracy).toBe(0);
      expect(res.body.data.correctCount).toBe(0);
      expect(res.body.data.status).toBe("reinforcement_needed");
      expect(res.body.data.results[0].isCorrect).toBe(false);
    });
  });

  describe("3. Security Defenses: IDOR & Fabricated Question Rejection", () => {
    it("BLOCKS User B from submitting User A's review schedule with 403 Forbidden (IDOR)", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authTokenB}`) // User B!
        .send({
          scheduleId: testScheduleAId, // User A's schedule!
          answers: {
            [testQuestionId]: expectedAnswer,
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("Access denied: You do not own this review schedule");
    });

    it("REJECTS fabricated or foreign question IDs with 400 Bad Request", async () => {
      const fabricatedId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authTokenA}`)
        .send({
          scheduleId: testScheduleAId,
          answers: {
            [fabricatedId]: "fake answer",
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("invalid or fabricated question ID");
    });
  });

  describe("4. Idempotency & Concurrency Safety", () => {
    it("safely handles duplicate concurrent submissions with identical submissionId", async () => {
      const submissionId = `sub-staging-${Date.now()}`;

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/reviews/${testConceptId}/complete`)
          .set("Authorization", `Bearer ${authTokenA}`)
          .send({
            scheduleId: testScheduleAId,
            submissionId,
            answers: { [testQuestionId]: expectedAnswer },
          }),
        request(app)
          .post(`/api/v1/reviews/${testConceptId}/complete`)
          .set("Authorization", `Bearer ${authTokenA}`)
          .send({
            scheduleId: testScheduleAId,
            submissionId,
            answers: { [testQuestionId]: expectedAnswer },
          }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.accuracy).toBe(res2.body.data.accuracy);
    });
  });
});

