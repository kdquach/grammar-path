import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("Phase 9.2 & 2.1: TOEIC-Style Practice Generator & Adaptive Quiz Engine REST APIs", () => {
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

      const [
        userProgressCount,
        userAttemptsCount,
        userQuestionAttemptsCount,
        adaptiveSessionCount,
        toeicSessionCount,
      ] = await Promise.all([
        prisma.learningProgress.count({ where: { userId: testUserId } }),
        prisma.exerciseAttempt.count({ where: { userId: testUserId } }),
        prisma.questionAttemptItem.count({ where: { userId: testUserId } }),
        prisma.adaptiveQuizSession.count({ where: { userId: testUserId } }),
        prisma.toeicPracticeSession.count({ where: { userId: testUserId } }),
      ]);

      expect(userProgressCount).toBe(0);
      expect(userAttemptsCount).toBe(0);
      expect(userQuestionAttemptsCount).toBe(0);
      expect(adaptiveSessionCount).toBe(0);
      expect(toeicSessionCount).toBe(0);
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

  // ─── 2. Feature A: TOEIC-Style Practice Generator & Server Grading ─────────

  describe("Feature A: POST /api/v1/adaptive/toeic-practice & /check", () => {
    let unit1SessionId = "";
    let unit1ItemId = "";

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

    it("4. Generates 5 anti-spoiler TOEIC Part 5 items for Unit 1 with source metadata & NO pre-submission answers", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 1, count: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.sessionId).toBeDefined();
      expect(data.unitNumber).toBe(1);
      expect(data.title).toContain("Present continuous");
      expect(data.difficulty).toBe("medium");
      expect(data.isOfficialToeic).toBe(false);
      expect(typeof data.sourceNotice).toBe("string");
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(5);

      unit1SessionId = data.sessionId;
      unit1ItemId = data.questions[0].itemId;

      for (const q of data.questions) {
        expect(q.itemId).toBeDefined();
        expect(typeof q.prompt).toBe("string");
        expect(q.prompt).toContain("_______");

        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);
        const keys = q.options.map((opt: { key: string }) => opt.key);
        expect(keys).toEqual(["A", "B", "C", "D"]);

        // Anti-spoiler checks
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.acceptedAnswers).toBeUndefined();
        expect(q.difficulty).toBe("medium");
        expect(typeof q.ruleReference).toBe("string");
        expect(q.ruleReference.length).toBeGreaterThan(0);
      }
    });

    it("4b. Server-grades TOEIC practice item via POST /adaptive/toeic-practice/check and reveals explanation post-submit", async () => {
      const checkRes = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          sessionId: unit1SessionId,
          itemId: unit1ItemId,
          studentAnswer: "B",
          submissionId: `toeic-sub-${timestamp}`,
        });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.success).toBe(true);
      expect(checkRes.body.data.sessionId).toBe(unit1SessionId);
      expect(checkRes.body.data.itemId).toBe(unit1ItemId);
      expect(typeof checkRes.body.data.isCorrect).toBe("boolean");
      expect(["A", "B", "C", "D"]).toContain(checkRes.body.data.correctAnswer);
      expect(typeof checkRes.body.data.explanation).toBe("string");
      expect(checkRes.body.data.explanation.length).toBeGreaterThan(5);
    });

    it("5. Respects custom count=3 on Unit 2 and generates 20 unbiased dynamic drills on non-curated Unit 98", async () => {
      const res3 = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 2, count: 3 });

      expect(res3.status).toBe(200);
      expect(res3.body.data.unitNumber).toBe(2);
      expect(res3.body.data.questions.length).toBe(3);

      const res20 = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 98, count: 20 });

      expect(res20.status).toBe(200);
      expect(res20.body.data.unitNumber).toBe(98);
      expect(res20.body.data.questions.length).toBe(20);
      expect(res20.body.data.isOfficialToeic).toBe(false);

      // Verify DB-stored answers across the 20 items are distributed (not all 'A')
      const storedItems = await prisma.toeicPracticeItem.findMany({
        where: { sessionId: res20.body.data.sessionId },
        orderBy: { itemOrder: "asc" },
      });
      expect(storedItems).toHaveLength(20);
      const distinctAnswers = new Set(storedItems.map((it) => it.correctAnswer));
      expect(distinctAnswers.size).toBe(4);
    });

    it("5b. Supports 3-tier difficulty parameter ('easy' | 'hard')", async () => {
      const easyRes = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 1, count: 3, difficulty: "easy" });

      expect(easyRes.status).toBe(200);
      expect(easyRes.body.data.difficulty).toBe("easy");
      expect(easyRes.body.data.questions[0].difficulty).toBe("easy");
      expect(easyRes.body.data.questions[0].ruleReference).toBeDefined();

      const hardRes = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ unitNumber: 1, count: 3, difficulty: "hard" });

      expect(hardRes.status).toBe(200);
      expect(hardRes.body.data.difficulty).toBe("hard");
      expect(hardRes.body.data.questions[0].difficulty).toBe("hard");
      expect(hardRes.body.data.questions[0].ruleReference).toBeDefined();
    });
  });

  // ─── 3. Feature B: Adaptive Quiz Generator & Server Check Endpoint ────────

  describe("Feature B: POST /api/v1/adaptive/quiz/generate & /check", () => {
    it("6. Auth Guard: rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .send({ questionCount: 5 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("7. Fresh user with zero mistakes: generates anti-spoiler diagnostic quiz session from foundational units", async () => {
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
        // Anti-spoiler checks
        expect(q.correctAnswer).toBeUndefined();
        expect(q.correctAnswerText).toBeUndefined();
        expect(q.acceptedAnswers).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    });

    it("8. User with unresolved mistakes: generates remedial quiz targeting weak units, grades via /quiz/check, and resolves mistakes cleanly", async () => {
      // Simulate 2 errors in Unit 1 interactive questions
      const wrong1 = await request(app)
        .post("/api/v1/questions/1.1-q2/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ answer: "wrong answer for 1.1-q2" });
      expect(wrong1.status).toBe(200);
      expect(wrong1.body.data.isCorrect).toBe(false);

      const wrong2 = await request(app)
        .post("/api/v1/questions/1.1-q3/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ answer: "wrong answer for 1.1-q3" });
      expect(wrong2.status).toBe(200);
      expect(wrong2.body.data.isCorrect).toBe(false);

      // Generate adaptive remedial quiz
      const quizRes = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ questionCount: 5 });

      expect(quizRes.status).toBe(200);
      const session = quizRes.body.data;
      expect(session.targetUnits[0].unitNumber).toBe(1);
      expect(session.targetUnits[0].errorCount).toBeGreaterThanOrEqual(2);

      const unit1Questions = session.questions.filter(
        (q: { unitNumber: number }) => q.unitNumber === 1
      );
      expect(unit1Questions.length).toBeGreaterThanOrEqual(2);

      const firstQ = session.questions[0];
      expect(firstQ.correctAnswer).toBeUndefined();
      expect(firstQ.explanation).toBeUndefined();
      expect(firstQ.ruleReference).toBeDefined();

      // Fix 1.1-q2 via POST /adaptive/quiz/check
      const checkRes = await request(app)
        .post("/api/v1/adaptive/quiz/check")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          sessionId: session.sessionId,
          questionId: "1.1-q2",
          studentAnswer: "e",
          submissionId: `aq-resolve-${timestamp}`,
        });
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.isCorrect).toBe(true);
      expect(checkRes.body.data.questionId).toBe("1.1-q2");

      // Confirm 1.1-q2 is resolved in /progress/mistakes while 1.1-q3 stays
      const mistakesRes = await request(app)
        .get("/api/v1/progress/mistakes")
        .set("Authorization", `Bearer ${authToken}`);
      expect(mistakesRes.status).toBe(200);
      const mistakeIds = mistakesRes.body.data.map((m: any) => m.questionId);
      expect(mistakeIds).not.toContain("1.1-q2");
      expect(mistakeIds).toContain("1.1-q3");
    });

    it("9. Supports custom difficulty ('hard') on adaptive quiz generation", async () => {
      const quizRes = await request(app)
        .post("/api/v1/adaptive/quiz/generate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ questionCount: 3, difficulty: "hard" });

      expect(quizRes.status).toBe(200);
      expect(quizRes.body.success).toBe(true);
      expect(quizRes.body.data.difficulty).toBe("hard");
      expect(quizRes.body.data.questions[0].difficulty).toBe("hard");
      expect(quizRes.body.data.questions[0].ruleReference).toBeDefined();
    });
  });
});
