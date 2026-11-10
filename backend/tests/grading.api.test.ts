import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Stateless Answer Evaluation & Grading Engine REST APIs", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Exact match grading for string answers
  it("1. Exact match grading: POST /api/v1/questions/1.1-q1/check and 1.1-q2/check -> evaluates exact match correctly", async () => {
    const res1 = await request(app)
      .post("/api/v1/questions/1.1-q1/check")
      .send({ answer: "f" });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.questionId).toBe("1.1-q1");
    expect(res1.body.data.isCorrect).toBe(true);
    expect(res1.body.data.studentAnswer).toBe("f");
    expect(res1.body.data.expectedAnswers).toContain("f");

    // Test with whitespace and uppercase
    const res2 = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .send({ answer: "  E  " });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.isCorrect).toBe(true);
    expect(res2.body.data.expectedAnswers).toContain("e");
  });

  // 2. Accepted alternative answer variant matching
  it("2. Accepted variant matching: POST /api/v1/questions/1.1-q2/check -> matches alternative text and normalized contractions", async () => {
    // 1.1-q2 accepted answer contains "I'm getting hungry."
    const resVariant = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .send({ answer: "I'm getting hungry." });

    expect(resVariant.status).toBe(200);
    expect(resVariant.body.success).toBe(true);
    expect(resVariant.body.data.isCorrect).toBe(true);

    // Test with curly apostrophe and no trailing period
    const resCurly = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .send({ answer: "i’m getting hungry" });

    expect(resCurly.status).toBe(200);
    expect(resCurly.body.success).toBe(true);
    expect(resCurly.body.data.isCorrect).toBe(true);
  });

  // 3. Multi-blank question grading
  it("3. Multi-blank grading: POST /api/v1/questions/1.2-q1/check -> evaluates multi-blank array submissions", async () => {
    // 1.2-q1 has 2 blanks: "What's he studying" and "Is he enjoying"
    const resMultiBlank = await request(app)
      .post("/api/v1/questions/1.2-q1/check")
      .send({
        answer: ["What's he studying", "Is he enjoying"],
      });

    expect(resMultiBlank.status).toBe(200);
    expect(resMultiBlank.body.success).toBe(true);
    expect(resMultiBlank.body.data.isCorrect).toBe(true);

    // Test uncontracted variant on blank 1
    const resVariantBlank = await request(app)
      .post("/api/v1/questions/1.2-q1/check")
      .send({
        answer: ["what is he studying", "is he enjoying"],
      });

    expect(resVariantBlank.status).toBe(200);
    expect(resVariantBlank.body.success).toBe(true);
    expect(resVariantBlank.body.data.isCorrect).toBe(true);

    // Test partially incorrect blank
    const resPartial = await request(app)
      .post("/api/v1/questions/1.2-q1/check")
      .send({
        answer: ["What is he studying", "wrong answer"],
      });

    expect(resPartial.status).toBe(200);
    expect(resPartial.body.success).toBe(true);
    expect(resPartial.body.data.isCorrect).toBe(false);
  });

  // 4. Multi-part question grading
  it("4. Multi-part grading: POST /api/v1/questions/4.1-q9/check -> evaluates multi-part submissions (array & record format)", async () => {
    // 4.1-q9 has 2 parts: (1) "I think", (2) "You don't use" / "You do not use"
    const resArray = await request(app)
      .post("/api/v1/questions/4.1-q9/check")
      .send({
        answer: ["I think", "You do not use"],
      });

    expect(resArray.status).toBe(200);
    expect(resArray.body.success).toBe(true);
    expect(resArray.body.data.isCorrect).toBe(true);

    // Record format keyed by partId
    const resRecord = await request(app)
      .post("/api/v1/questions/4.1-q9/check")
      .send({
        answer: {
          "4.1-q9.1": "I think",
          "4.1-q9.2": "You don't use",
        },
      });

    expect(resRecord.status).toBe(200);
    expect(resRecord.body.success).toBe(true);
    expect(resRecord.body.data.isCorrect).toBe(true);
  });

  // 5. Incorrect answer feedback and explanation return
  it("5. Incorrect answer feedback: returns isCorrect: false with Vietnamese explanation and rule reference", async () => {
    const res = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .send({ answer: "definitely_wrong_answer" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCorrect).toBe(false);
    expect(res.body.data.explanation).toBeTruthy();
    expect(typeof res.body.data.explanation).toBe("string");
    expect(res.body.data.ruleReference).toBe("1E");
    expect(res.body.data.expectedAnswers).toContain("e");
  });

  // 6. Exercise-level grading (POST /exercises/:exerciseId/check)
  // Option B: Worked examples (isExample: true) are excluded from scoring; only interactive test questions are graded.
  it("6. Exercise-level grading: POST /api/v1/exercises/1.1/check -> scores test questions accurately, excluding worked examples", async () => {
    // All 7 test questions correct (1.1-q2 to 1.1-q8; 1.1-q1 is an example)
    const resPerfect = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .send({
        answers: {
          "1.1-q1": "f",
          "1.1-q2": "e",
          "1.1-q3": "g",
          "1.1-q4": "a",
          "1.1-q5": "d",
          "1.1-q6": "h",
          "1.1-q7": "b",
          "1.1-q8": "c",
        },
      });

    expect(resPerfect.status).toBe(200);
    expect(resPerfect.body.success).toBe(true);
    expect(resPerfect.body.data.totalQuestions).toBe(7);
    expect(resPerfect.body.data.correctCount).toBe(7);
    expect(resPerfect.body.data.scorePercentage).toBe(100);
    expect(resPerfect.body.data.results).toHaveLength(7);

    // 6 correct, 1 wrong (1.1-q8 wrong)
    const resPartial = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .send({
        answers: {
          "1.1-q1": "f",
          "1.1-q2": "e",
          "1.1-q3": "g",
          "1.1-q4": "a",
          "1.1-q5": "d",
          "1.1-q6": "h",
          "1.1-q7": "b",
          "1.1-q8": "wrong_value",
        },
      });

    expect(resPartial.status).toBe(200);
    expect(resPartial.body.data.totalQuestions).toBe(7);
    expect(resPartial.body.data.correctCount).toBe(6);
    expect(resPartial.body.data.scorePercentage).toBe(85.7);
    expect(resPartial.body.data.results).toHaveLength(7);

    // Option B: Worked example (1.1-q1) is omitted by student; exercise is graded on the 7 test items
    const resOmitted = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .send({
        answers: {
          // 1.1-q1 is omitted because learner has no input in UI
          "1.1-q2": "e",
          "1.1-q3": "g",
          "1.1-q4": "a",
          "1.1-q5": "d",
          "1.1-q6": "h",
          "1.1-q7": "b",
          "1.1-q8": "c",
        },
      });

    expect(resOmitted.status).toBe(200);
    expect(resOmitted.body.data.totalQuestions).toBe(7);
    expect(resOmitted.body.data.correctCount).toBe(7);
    expect(resOmitted.body.data.scorePercentage).toBe(100);
    expect(resOmitted.body.data.results).toHaveLength(7);
  });

  // 7. Verify statelessness: zero database write operations
  it("7. Statelessness verification: counts in DB remain completely unchanged before and after grading requests", async () => {
    const [unitsBefore, exercisesBefore, questionsBefore] = await Promise.all([
      prisma.unit.count(),
      prisma.exercise.count(),
      prisma.question.count(),
    ]);

    // Send 3 grading requests
    await request(app).post("/api/v1/questions/1.1-q1/check").send({ answer: "f" });
    await request(app).post("/api/v1/questions/1.1-q2/check").send({ answer: "wrong" });
    await request(app).post("/api/v1/exercises/1.1/check").send({
      answers: { "1.1-q1": "f" },
    });

    const [unitsAfter, exercisesAfter, questionsAfter] = await Promise.all([
      prisma.unit.count(),
      prisma.exercise.count(),
      prisma.question.count(),
    ]);

    expect(unitsAfter).toBe(unitsBefore);
    expect(exercisesAfter).toBe(exercisesBefore);
    expect(questionsAfter).toBe(questionsBefore);
  });

  // 8. Error handling for grading endpoints
  it("8. Error handling: non-existent exercise/question returns 404 NOT_FOUND, empty body returns 400 VALIDATION_ERROR", async () => {
    // 404 for non-existent exercise
    const resEx404 = await request(app)
      .post("/api/v1/exercises/999.9/check")
      .send({ answers: {} });
    expect(resEx404.status).toBe(404);
    expect(resEx404.body.error.code).toBe("NOT_FOUND");

    // 404 for non-existent question
    const resQ404 = await request(app)
      .post("/api/v1/questions/999.9-q99/check")
      .send({ answer: "x" });
    expect(resQ404.status).toBe(404);
    expect(resQ404.body.error.code).toBe("NOT_FOUND");

    // 400 for missing answer field in question check
    const resBadBody = await request(app)
      .post("/api/v1/questions/1.1-q1/check")
      .send({});
    expect(resBadBody.status).toBe(400);
    expect(resBadBody.body.error.code).toBe("VALIDATION_ERROR");
  });

  // 9. Option questions that also carry auxiliary blank rows (e.g., Unit 70 Exercise 70.1)
  it("9. Option + auxiliary single-blank grading: POST /api/v1/questions/70.1-q2a and 70.1-q2b -> accepts optionKey and optionText while rejecting wrong options", async () => {
    const q2aKeyRight = await request(app)
      .post("/api/v1/questions/70.1-q2a/check")
      .send({ answer: "b" });
    expect(q2aKeyRight.status).toBe(200);
    expect(q2aKeyRight.body.data.isCorrect).toBe(true);
    expect(q2aKeyRight.body.data.expectedAnswers).toContain("a paper");
    expect(q2aKeyRight.body.data.expectedAnswers).toContain("b");

    const q2aTextRight = await request(app)
      .post("/api/v1/questions/70.1-q2a/check")
      .send({ answer: "a paper" });
    expect(q2aTextRight.status).toBe(200);
    expect(q2aTextRight.body.data.isCorrect).toBe(true);

    const q2aWrong = await request(app)
      .post("/api/v1/questions/70.1-q2a/check")
      .send({ answer: "a" });
    expect(q2aWrong.status).toBe(200);
    expect(q2aWrong.body.data.isCorrect).toBe(false);

    const q2bKeyRight = await request(app)
      .post("/api/v1/questions/70.1-q2b/check")
      .send({ answer: "a" });
    expect(q2bKeyRight.status).toBe(200);
    expect(q2bKeyRight.body.data.isCorrect).toBe(true);

    const q2bWrong = await request(app)
      .post("/api/v1/questions/70.1-q2b/check")
      .send({ answer: "b" });
    expect(q2bWrong.status).toBe(200);
    expect(q2bWrong.body.data.isCorrect).toBe(false);

    // Reverse key/text cases (46.1-q1, 50.1-q2, 12.1-q2)
    const ex46Text = await request(app)
      .post("/api/v1/questions/46.1-q1/check")
      .send({ answer: "Sarah is having her hair cut." });
    expect(ex46Text.status).toBe(200);
    expect(ex46Text.body.data.isCorrect).toBe(true);

    const ex50Key = await request(app)
      .post("/api/v1/questions/50.1-q2/check")
      .send({ answer: "c" });
    expect(ex50Key.status).toBe(200);
    expect(ex50Key.body.data.isCorrect).toBe(true);
  });

  // 10. Multi-blank combined options (32.1-q7, 98.2-q10), split-slash blank anomaly (86.4-q9), and multi-part + blank alignment (10.1-q1, 13.3-q10)
  it("10. Combined multi-blank options, split-slash blanks, and multi-part questions with duplicate blanks grade accurately", async () => {
    const q32Key = await request(app)
      .post("/api/v1/questions/32.1-q7/check")
      .send({ answer: "a" });
    expect(q32Key.status).toBe(200);
    expect(q32Key.body.data.isCorrect).toBe(true);

    const q32Arr = await request(app)
      .post("/api/v1/questions/32.1-q7/check")
      .send({ answer: ["must", "mustn't"] });
    expect(q32Arr.status).toBe(200);
    expect(q32Arr.body.data.isCorrect).toBe(true);

    const q32Wrong = await request(app)
      .post("/api/v1/questions/32.1-q7/check")
      .send({ answer: "b" });
    expect(q32Wrong.status).toBe(200);
    expect(q32Wrong.body.data.isCorrect).toBe(false);

    const q98Key = await request(app)
      .post("/api/v1/questions/98.2-q10/check")
      .send({ answer: "a" });
    expect(q98Key.status).toBe(200);
    expect(q98Key.body.data.isCorrect).toBe(true);

    // 86.4-q9 split-blank slash hints
    const q86Arr = await request(app)
      .post("/api/v1/questions/86.4-q9/check")
      .send({ answer: ["No-one", "anyone"] });
    expect(q86Arr.status).toBe(200);
    expect(q86Arr.body.data.isCorrect).toBe(true);

    const q86Str = await request(app)
      .post("/api/v1/questions/86.4-q9/check")
      .send({ answer: "No-one ... anyone" });
    expect(q86Str.status).toBe(200);
    expect(q86Str.body.data.isCorrect).toBe(true);

    const q86Wrong = await request(app)
      .post("/api/v1/questions/86.4-q9/check")
      .send({ answer: ["Anyone", "no-one"] });
    expect(q86Wrong.status).toBe(200);
    expect(q86Wrong.body.data.isCorrect).toBe(false);

    // 10.1-q1 & 13.3-q10 parts + blanks priority
    const q10Parts = await request(app)
      .post("/api/v1/questions/10.1-q1/check")
      .send({
        answer: {
          "10.1-q1.1": "has been reading",
          "10.1-q1.2": "has read",
        },
      });
    expect(q10Parts.status).toBe(200);
    expect(q10Parts.body.data.isCorrect).toBe(true);

    const q13Parts = await request(app)
      .post("/api/v1/questions/13.3-q10/check")
      .send({
        answer: {
          "13.3-q10.1": "'s broken",
          "13.3-q10.2": "did that happen",
          "13.3-q10.3": "he fell",
        },
      });
    expect(q13Parts.status).toBe(200);
    expect(q13Parts.body.data.isCorrect).toBe(true);
  });

  // 11. Multi-select option exercises (17.2 & 24.1)
  it("11. Multi-select option grading: evaluates unordered multi-option arrays and rejects incomplete subsets", async () => {
    const q17Right = await request(app)
      .post("/api/v1/questions/17.2-q3/check")
      .send({ answer: ["C", "A"] });
    expect(q17Right.status).toBe(200);
    expect(q17Right.body.data.isCorrect).toBe(true);

    const q17Partial = await request(app)
      .post("/api/v1/questions/17.2-q3/check")
      .send({ answer: ["A"] });
    expect(q17Partial.status).toBe(200);
    expect(q17Partial.body.data.isCorrect).toBe(false);

    const q24Right = await request(app)
      .post("/api/v1/questions/24.1-q3/check")
      .send({ answer: ["c", "a"] });
    expect(q24Right.status).toBe(200);
    expect(q24Right.body.data.isCorrect).toBe(true);

    const q24CommaString = await request(app)
      .post("/api/v1/questions/24.1-q3/check")
      .send({ answer: "c, a" });
    expect(q24CommaString.status).toBe(200);
    expect(q24CommaString.body.data.isCorrect).toBe(true);

    const q24SingleInMultiEx = await request(app)
      .post("/api/v1/questions/24.1-q2/check")
      .send({ answer: ["b"] });
    expect(q24SingleInMultiEx.status).toBe(200);
    expect(q24SingleInMultiEx.body.data.isCorrect).toBe(true);
  });
});

