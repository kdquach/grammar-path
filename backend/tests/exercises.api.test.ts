import { describe, it, expect, afterAll, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Exercise, Question, Answer Key, Explanation & Anti-Spoiler Mode REST APIs", () => {
  const timestamp = Date.now();
  const testEmail = `ex-anti-spoiler-${timestamp}@grammarpath.local`;
  const testPassword = "securePassword123!";
  let authToken = "";
  let testUserId = "";

  beforeAll(async () => {
    const regRes = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: testPassword,
      displayName: "Exercise Anti-Spoiler Tester",
    });
    expect(regRes.status).toBe(201);
    authToken = regRes.body.data.token;
    testUserId = regRes.body.data.user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  // 1. GET /api/v1/units/1/exercises -> returns 200, 4 exercises (1.1 to 1.4)
  it("1. GET /api/v1/units/1/exercises -> returns 200, 4 exercises (1.1 to 1.4)", async () => {
    const res = await request(app).get("/api/v1/units/1/exercises");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(4);

    const exerciseNumbers = res.body.data.map((e: any) => e.exerciseNumber);
    expect(exerciseNumbers).toEqual(["1.1", "1.2", "1.3", "1.4"]);

    // Verify metadata
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.unitNumber).toBe(1);
    expect(res.body.meta.totalExercises).toBe(4);
  });

  // 2. Anti-Spoiler Mode (Default): test items (isExample=false) do NOT contain correctAnswerText or acceptedAnswers
  it("2. Verify Anti-Spoiler Mode (Default): test items (isExample=false) do NOT contain correctAnswerText or acceptedAnswers", async () => {
    const res = await request(app).get("/api/v1/units/1/exercises");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exercise1 = res.body.data[0];
    expect(exercise1.questions.length).toBeGreaterThan(0);

    // Filter test items (isExample === false)
    const testItems = exercise1.questions.filter((q: any) => !q.isExample);
    expect(testItems.length).toBeGreaterThan(0);

    for (const item of testItems) {
      expect(item.correctAnswerText).toBeUndefined();
      expect(item.correctAnswerType).toBeUndefined();
      expect(item.correctAnswerArray).toBeUndefined();
      expect(item.acceptedAnswers).toBeUndefined();

      for (const blank of item.blanks) {
        expect(blank.correctAnswerText).toBeUndefined();
        expect(blank.acceptedAnswers).toBeUndefined();
      }

      for (const part of item.parts) {
        expect(part.correctAnswerText).toBeUndefined();
        expect(part.acceptedAnswers).toBeUndefined();
      }
    }

    // Verify example item has exampleAnswer but not correctAnswerText/acceptedAnswers
    const exampleItems = exercise1.questions.filter((q: any) => q.isExample);
    expect(exampleItems.length).toBeGreaterThan(0);
    expect(exampleItems[0].exampleAnswer).toBe("f");
    expect(exampleItems[0].correctAnswerText).toBeUndefined();
  });

  // 3. Anti-Spoiler Bypass Blocked: ?includeAnswers=true rejected with 403 SPOILER_FORBIDDEN
  it("3. Verify Anti-Spoiler Bypass Blocked: GET /units/1/exercises?includeAnswers=true and equivalent flags return 403 SPOILER_FORBIDDEN", async () => {
    const res1 = await request(app).get("/api/v1/units/1/exercises?includeAnswers=true");
    expect(res1.status).toBe(403);
    expect(res1.body.success).toBe(false);
    expect(res1.body.error.code).toBe("SPOILER_FORBIDDEN");

    const res2 = await request(app).get("/api/v1/exercises/1.1?includeAnswers=true");
    expect(res2.status).toBe(403);
    expect(res2.body.error.code).toBe("SPOILER_FORBIDDEN");

    const res3 = await request(app).get("/api/v1/questions/1.1-q2?includeAnswers=true");
    expect(res3.status).toBe(403);
    expect(res3.body.error.code).toBe("SPOILER_FORBIDDEN");
  });

  // 4. GET /api/v1/exercises/1.1 -> returns exercise 1.1 with word bank items and questions
  it("4. GET /api/v1/exercises/1.1 -> returns exercise 1.1 with its word bank items and questions", async () => {
    const res = await request(app).get("/api/v1/exercises/1.1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const ex = res.body.data;

    expect(ex.exerciseId).toBe("1.1");
    expect(ex.exerciseNumber).toBe("1.1");
    expect(ex.questionType).toBe("matching");
    expect(ex.instruction).toBe(
      "The sentences on the right follow those on the left. Which sentence goes with which?"
    );
    expect(Array.isArray(ex.wordBankItems)).toBe(true);
    expect(Array.isArray(ex.questions)).toBe(true);
    expect(ex.questions).toHaveLength(8);

    // Also check exercise 1.4 with 5 word bank items
    const res14 = await request(app).get("/api/v1/exercises/1.4");
    expect(res14.status).toBe(200);
    expect(res14.body.data.wordBankItems).toHaveLength(5);
    const words = res14.body.data.wordBankItems.map((w: any) => w.word);
    expect(words).toEqual(["start", "get", "increase", "change", "rise"]);
  });

  // 5. GET /api/v1/questions/1.1-q1 -> returns question detail
  it("5. GET /api/v1/questions/1.1-q1 -> returns question detail", async () => {
    const res = await request(app).get("/api/v1/questions/1.1-q1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const q = res.body.data;

    expect(q.questionId).toBe("1.1-q1");
    expect(q.questionContent).toBe("1 Please don't make so much noise.");
    expect(q.isExample).toBe(true);
    expect(q.exampleAnswer).toBe("f");
    expect(q.displayOrder).toBe(1);

    // Parent exercise & unit info
    expect(q.exercise).toBeDefined();
    expect(q.exercise.exerciseId).toBe("1.1");
    expect(q.exercise.unit).toBeDefined();
    expect(q.exercise.unit.unitNumber).toBe(1);

    // Source pages
    expect(Array.isArray(q.sourcePages)).toBe(true);
  });

  // 6. Question Solution Access Control: Guest -> 401; Worked example (auth) -> 200; Unattempted non-example -> 403; Attempted -> 200
  it("6. GET /api/v1/questions/:id/solution -> enforces auth & attempt gate before returning solution", async () => {
    const guestRes = await request(app).get("/api/v1/questions/1.1-q1/solution");
    expect(guestRes.status).toBe(401);

    // Worked example is inspectable by authenticated learner
    const exampleRes = await request(app)
      .get("/api/v1/questions/1.1-q1/solution")
      .set("Authorization", `Bearer ${authToken}`);
    expect(exampleRes.status).toBe(200);
    expect(exampleRes.body.data.questionId).toBe("1.1-q1");
    expect(exampleRes.body.data.correctAnswerText).toBe("f");
    expect(exampleRes.body.data.explanation.ruleReference).toBe("1B");

    // Interactive item locked before attempt
    const lockedRes = await request(app)
      .get("/api/v1/questions/1.1-q2/solution")
      .set("Authorization", `Bearer ${authToken}`);
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.error.code).toBe("SOLUTION_LOCKED");

    // Attempt question -> unlocks solution
    const checkRes = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ answer: "e" });
    expect(checkRes.status).toBe(200);

    const unlockedRes = await request(app)
      .get("/api/v1/questions/1.1-q2/solution")
      .set("Authorization", `Bearer ${authToken}`);
    expect(unlockedRes.status).toBe(200);
    expect(unlockedRes.body.data.correctAnswerText).toBe("e");
    expect(unlockedRes.body.data.explanation.explanationLanguage).toBe("vi");
  });

  // 7. Exercise Solutions Access Control: Guest -> 401; Unattempted auth -> 403; Submitted exercise -> 200
  it("7. GET /api/v1/exercises/1.1/solutions -> enforces auth & attempt gate, then returns all 8 ordered solutions", async () => {
    const guestRes = await request(app).get("/api/v1/exercises/1.1/solutions");
    expect(guestRes.status).toBe(401);

    const lockedRes = await request(app)
      .get("/api/v1/exercises/1.1/solutions")
      .set("Authorization", `Bearer ${authToken}`);
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.error.code).toBe("SOLUTION_LOCKED");

    // Submit exercise attempt first
    const attemptRes = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ answers: { "1.1-q2": "e" } });
    expect(attemptRes.status).toBe(200);

    const res = await request(app)
      .get("/api/v1/exercises/1.1/solutions")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(8);

    const questionIds = res.body.data.map((s: any) => s.questionId);
    expect(questionIds).toEqual([
      "1.1-q1",
      "1.1-q2",
      "1.1-q3",
      "1.1-q4",
      "1.1-q5",
      "1.1-q6",
      "1.1-q7",
      "1.1-q8",
    ]);

    for (const sol of res.body.data) {
      expect(sol.correctAnswerText).toBeDefined();
      expect(sol.answerKey).toBeDefined();
      expect(sol.explanation).toBeDefined();
    }

    expect(res.body.meta.exerciseId).toBe("1.1");
    expect(res.body.meta.totalSolutions).toBe(8);
  });

  // 8. Error handling: non-existent exercise ID or question ID returns 404 NOT_FOUND
  it("8. Error handling: requesting non-existent exercise ID or question ID returns 404 NOT_FOUND (when authenticated for solution endpoints)", async () => {
    const resEx = await request(app).get("/api/v1/exercises/999.9");
    expect(resEx.status).toBe(404);
    expect(resEx.body.error.code).toBe("NOT_FOUND");

    const resExSol = await request(app)
      .get("/api/v1/exercises/999.9/solutions")
      .set("Authorization", `Bearer ${authToken}`);
    expect(resExSol.status).toBe(404);
    expect(resExSol.body.error.code).toBe("NOT_FOUND");

    const resQ = await request(app).get("/api/v1/questions/999.9-q99");
    expect(resQ.status).toBe(404);
    expect(resQ.body.error.code).toBe("NOT_FOUND");

    const resQSol = await request(app)
      .get("/api/v1/questions/999.9-q99/solution")
      .set("Authorization", `Bearer ${authToken}`);
    expect(resQSol.status).toBe(404);
    expect(resQSol.body.error.code).toBe("NOT_FOUND");
  });
});
