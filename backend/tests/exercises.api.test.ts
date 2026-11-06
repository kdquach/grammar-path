import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Exercise, Question, Answer Key, Explanation & Anti-Spoiler Mode REST APIs", () => {
  afterAll(async () => {
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

      // Blanks (if any) should not leak answers
      for (const blank of item.blanks) {
        expect(blank.correctAnswerText).toBeUndefined();
        expect(blank.acceptedAnswers).toBeUndefined();
      }

      // Parts (if any) should not leak answers
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

  // 3. Spoiler Mode Enabled: ?includeAnswers=true returns correctAnswerText and acceptedAnswers
  it("3. Verify Spoiler Mode Enabled: GET /api/v1/units/1/exercises?includeAnswers=true successfully returns correctAnswerText and acceptedAnswers for test items", async () => {
    const res = await request(app).get("/api/v1/units/1/exercises?includeAnswers=true");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const exercise1 = res.body.data[0];
    const testItems = exercise1.questions.filter((q: any) => !q.isExample);
    expect(testItems.length).toBeGreaterThan(0);

    // First non-example test item (1.1-q2)
    const q2 = testItems[0];
    expect(q2.questionId).toBe("1.1-q2");
    expect(q2.correctAnswerText).toBe("e");
    expect(q2.correctAnswerType).toBe("string");
    expect(Array.isArray(q2.acceptedAnswers)).toBe(true);
    expect(q2.acceptedAnswers).toContain("e");
    expect(q2.acceptedAnswers).toContain("I'm getting hungry.");
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

  // 6. GET /api/v1/questions/1.1-q1/solution -> returns 200, correct answer, answer key, explanation, rule reference
  it("6. GET /api/v1/questions/1.1-q1/solution -> returns 200, including correct answer, Cambridge answer key, Vietnamese explanation, and rule reference (1A or similar)", async () => {
    const res = await request(app).get("/api/v1/questions/1.1-q1/solution");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sol = res.body.data;

    expect(sol.questionId).toBe("1.1-q1");
    expect(sol.correctAnswerText).toBe("f");
    expect(sol.correctAnswerType).toBe("string");
    expect(sol.acceptedAnswers).toContain("f");

    // Official Cambridge Answer Key
    expect(sol.answerKey).toBeDefined();
    expect(sol.answerKey.exerciseNumber).toBe("1.1");
    expect(sol.answerKey.answerText).toBe("f");

    // Pedagogical Vietnamese Explanation
    expect(sol.explanation).toBeDefined();
    expect(sol.explanation.explanationLanguage).toBe("vi");
    expect(sol.explanation.aiExplanation).toContain("Hành động đang diễn ra");
    expect(sol.explanation.ruleReference).toBe("1B");
    expect(sol.explanation.theorySection).toBeDefined();
    expect(sol.explanation.theorySection.sectionId).toBe("1B");
    expect(sol.explanation.theorySection.heading).toContain("I am doing something");
  });

  // 7. GET /api/v1/exercises/1.1/solutions -> returns solutions for all questions in exercise 1.1
  it("7. GET /api/v1/exercises/1.1/solutions -> returns solutions for all questions in exercise 1.1", async () => {
    const res = await request(app).get("/api/v1/exercises/1.1/solutions");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(8);

    // Verify ordering by displayOrder ASC
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

    // Verify all solutions contain answers, keys, and explanations
    for (const sol of res.body.data) {
      expect(sol.correctAnswerText).toBeDefined();
      expect(sol.answerKey).toBeDefined();
      expect(sol.explanation).toBeDefined();
    }

    // Verify meta
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.exerciseId).toBe("1.1");
    expect(res.body.meta.totalSolutions).toBe(8);
  });

  // 8. Error handling: non-existent exercise ID or question ID returns 404 NOT_FOUND
  it("8. Error handling: requesting non-existent exercise ID or question ID returns 404 NOT_FOUND", async () => {
    const resEx = await request(app).get("/api/v1/exercises/999.9");
    expect(resEx.status).toBe(404);
    expect(resEx.body.success).toBe(false);
    expect(resEx.body.error.code).toBe("NOT_FOUND");

    const resExSol = await request(app).get("/api/v1/exercises/999.9/solutions");
    expect(resExSol.status).toBe(404);
    expect(resExSol.body.success).toBe(false);
    expect(resExSol.body.error.code).toBe("NOT_FOUND");

    const resQ = await request(app).get("/api/v1/questions/999.9-q99");
    expect(resQ.status).toBe(404);
    expect(resQ.body.success).toBe(false);
    expect(resQ.body.error.code).toBe("NOT_FOUND");

    const resQSol = await request(app).get("/api/v1/questions/999.9-q99/solution");
    expect(resQSol.status).toBe(404);
    expect(resQSol.body.success).toBe(false);
    expect(resQSol.body.error.code).toBe("NOT_FOUND");
  });
});

