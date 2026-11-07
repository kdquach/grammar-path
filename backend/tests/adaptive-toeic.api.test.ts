import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("Phase 9.2: TOEIC-Style Practice Generator & Adaptive Quiz Engine REST APIs", () => {
  const timestamp = Date.now();
  const testEmail = `toeic-learner-${timestamp}@grammarpath.local`;
  const testPassword = "toeicPassword123!";
  const testDisplayName = `TOEIC Learner ${timestamp}`;

  let authToken = "";
  let testUserId = "";

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      });

      const [userProgressCount, userAttemptsCount, userQuestionAttemptsCount] =
        await Promise.all([
          prisma.learningProgress.count({ where: { userId: testUserId } }),
          prisma.exerciseAttempt.count({ where: { userId: testUserId } }),
          prisma.questionAttemptItem.count({ where: { userId: testUserId } }),
        ]);

      expect(userProgressCount).toBe(0);
      expect(userAttemptsCount).toBe(0);
      expect(userQuestionAttemptsCount).toBe(0);
    }

    await prisma.$disconnect();
  });

  // ─── 1. Authentication Setup ───────────────────────────────────────────────

  it("1. Register a test learner user and obtain JWT authentication token", async () => {
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    authToken = registerRes.body.data.token;
    testUserId = registerRes.body.data.user.id;
    expect(authToken).toBeDefined();
    expect(testUserId).toBeDefined();
  });

  // ─── 2. Feature A: TOEIC-Style Practice Generator Endpoint ──────────────────

  describe("Feature A: POST /api/v1/adaptive/toeic-practice", () => {
    it("2. Auth Guard: rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .send({ unitNumber: 1 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("3. Validation Guard: rejects invalid unitNumber (< 1 or > 145) with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 999 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("4. Generates 5 TOEIC Part 5 questions for Unit 1 with complete options and Vietnamese explanations", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 1, count: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.unitNumber).toBe(1);
      expect(data.title).toContain("Present continuous");
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(5);

      for (const q of data.questions) {
        expect(typeof q.prompt).toBe("string");
        expect(q.prompt).toContain("_______");

        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);

        const keys = q.options.map((opt: { key: string }) => opt.key);
        expect(keys).toEqual(["A", "B", "C", "D"]);

        expect(["A", "B", "C", "D"]).toContain(q.correctAnswer);
        expect(typeof q.explanation).toBe("string");
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    });

    it("5. Respects custom count parameter (count: 3)", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 2, count: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unitNumber).toBe(2);
      expect(res.body.data.questions.length).toBe(3);
    });
  });

  // ─── 3. Feature B: Adaptive Quiz Generator Endpoint ─────────────────────────

  describe("Feature B: POST /api/v1/adaptive/quiz/generate", () => {
    it("6. Auth Guard: rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .send({ questionCount: 5 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("7. Fresh user with zero mistakes: generates diagnostic quiz session from foundational units", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ questionCount: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const session = res.body.data;
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toContain("quiz_");
      expect(Array.isArray(session.targetUnits)).toBe(true);
      expect(session.targetUnits.length).toBeGreaterThan(0);
      expect(session.totalQuestions).toBe(5);
      expect(Array.isArray(session.questions)).toBe(true);
      expect(session.questions.length).toBe(5);

      for (const q of session.questions) {
        expect(q.id).toBeDefined();
        expect(q.questionId).toBeDefined();
        expect(q.unitNumber).toBeDefined();
        expect(q.unitTitle).toBeDefined();
        expect(q.prompt).toBeDefined();
        expect(q.correctAnswer).toBeDefined();
      }
    });

    it("8. User with mistake history: analyzes errors and generates personalized remedial quiz targeting weak units", async () => {
      // Simulate 2 errors in Unit 1 and 1 error in Unit 4
      const wrong1 = await request(app)
        .post("/api/v1/questions/1.1-q1/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ answer: "wrong answer for 1.1-q1" });
      expect(wrong1.status).toBe(200);
      expect(wrong1.body.data.isCorrect).toBe(false);

      const wrong2 = await request(app)
        .post("/api/v1/questions/1.1-q2/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ answer: "wrong answer for 1.1-q2" });
      expect(wrong2.status).toBe(200);
      expect(wrong2.body.data.isCorrect).toBe(false);

      // Now request an adaptive remedial quiz
      const quizRes = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ questionCount: 5 });

      expect(quizRes.status).toBe(200);
      expect(quizRes.body.success).toBe(true);

      const session = quizRes.body.data;
      expect(session.sessionId).toBeDefined();
      expect(session.targetUnits.length).toBeGreaterThan(0);

      // Top weak unit should be Unit 1 with at least 2 errors
      const topWeakUnit = session.targetUnits[0];
      expect(topWeakUnit.unitNumber).toBe(1);
      expect(topWeakUnit.errorCount).toBeGreaterThanOrEqual(2);

      // The generated questions should include items from Unit 1
      const unit1Questions = session.questions.filter(
        (q: { unitNumber: number }) => q.unitNumber === 1
      );
      expect(unit1Questions.length).toBeGreaterThanOrEqual(2);

      // Verify structure of the adaptive questions
      const firstQ = session.questions[0];
      expect(firstQ.id).toBeDefined();
      expect(firstQ.questionId).toBeDefined();
      expect(firstQ.exerciseNumber).toBeDefined();
      expect(firstQ.questionType).toBeDefined();
      expect(firstQ.prompt).toBeDefined();
      expect(firstQ.correctAnswer).toBeDefined();
    });
  });
});

