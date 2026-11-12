import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("Phase 2.2 End-to-End QA API Regression Tests (Staging DB)", () => {
  const ts = Date.now();
  const email = `p22-qa-api-${ts}@grammarpath.local`;
  const password = "StrongQaPassword123!";
  let token = "";
  let userId = "";

  beforeAll(async () => {
    const reg = await request(app).post("/api/v1/auth/register").send({
      email,
      password,
      displayName: "Phase 2.2 QA Api",
    });
    expect(reg.status).toBe(201);
    token = reg.body.data.token;
    userId = reg.body.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("grades multi-blank zero-article canonical question 73.1-q7 with ['', 'the'] and preserves '-' primary display", async () => {
    const res = await request(app)
      .post("/api/v1/questions/73.1-q7/check")
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: ["", "the"] });

    expect(res.status).toBe(200);
    expect(res.body.data.isCorrect).toBe(true);
    expect(res.body.data.expectedAnswers).toEqual(["-", "the"]);
  });

  it("generates defect-free TOEIC Part 5 questions on tricky units (24, 98, 110, 121, 145) without leaking 'OK', embedded stems, or spoilers", async () => {
    delete process.env.GEMINI_API_KEY;
    for (const unitNumber of [24, 98, 110, 121, 145]) {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${token}`)
        .send({ unitNumber, count: 5, difficulty: "medium" });

      expect(res.status).toBe(200);
      const questions = res.body.data.questions as Array<{
        prompt: string;
        options: Array<{ key: string; text: string }>;
        correctAnswer?: string;
        explanation?: string;
      }>;
      expect(questions).toHaveLength(5);

      for (const q of questions) {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect((q.prompt.match(/_______/g) || []).length).toBe(1);
        expect(q.options).toHaveLength(4);
        for (const opt of q.options) {
          expect(/^(ok|right|wrong|[b-h])$/i.test(opt.text.trim())).toBe(false);
          expect(opt.text).not.toContain("...");
        }
      }
    }
  });

  it("distinguishes correct, incorrect, and unanswered status on partial POST /exercises/:id/check without leaking answers/explanations for empty/whitespace/unanswered items", async () => {
    // Exercise 4.1 has parts / interactive questions; Exercise 1.3 has 8 interactive questions (after 2 worked examples)
    const ex13Res = await request(app)
      .post("/api/v1/exercises/1.3/check")
      .set("Authorization", `Bearer ${token}`)
      .send({
        answers: {
          "1.3-q3": "I'm not listening",
          "1.3-q4": "wrong answer",
          "1.3-q5": "   ",
        },
      });

    expect(ex13Res.status).toBe(200);
    const ex13Results = ex13Res.body.data.results as Array<any>;
    const q3 = ex13Results.find((r) => r.questionId === "1.3-q3");
    const q4 = ex13Results.find((r) => r.questionId === "1.3-q4");
    const q5 = ex13Results.find((r) => r.questionId === "1.3-q5");
    const q6 = ex13Results.find((r) => r.questionId === "1.3-q6");

    expect(q3.status).toBe("correct");
    expect(q3.isCorrect).toBe(true);
    expect(q4.status).toBe("incorrect");
    expect(q4.isCorrect).toBe(false);
    expect(q4.expectedAnswers.length).toBeGreaterThan(0);

    // Whitespace-only (q5) and omitted (q6) must return unanswered with zero spoilers
    for (const skipped of [q5, q6]) {
      expect(skipped.status).toBe("unanswered");
      expect(skipped.isCorrect).toBe(false);
      expect(skipped.studentAnswer).toBeNull();
      expect(skipped.expectedAnswers).toEqual([]);
      expect(skipped.correctAnswers).toEqual([]);
      expect(skipped.explanation).toBeNull();
      expect(skipped.ruleReference).toBeNull();
    }

    // Partially completed multi-blank (73.1-q1 = wrong + "") vs unanswered multi-part (4.1-q2 = {part: "  "})
    const multiPartEx = await prisma.exercise.findFirst({
      where: { questions: { some: { parts: { some: {} }, isExample: false } } },
      include: {
        questions: {
          where: { isExample: false },
          orderBy: { displayOrder: "asc" },
          include: { parts: true },
        },
      },
    });
    expect(multiPartEx).toBeTruthy();
    const mpQ = multiPartEx!.questions.find((q) => q.parts.length > 0)!;
    const siblingQ = multiPartEx!.questions.find((q) => q.questionId !== mpQ.questionId)!;
    const mpRes = await request(app)
      .post(`/api/v1/exercises/${multiPartEx!.exerciseId}/check`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answers: {
          [siblingQ.questionId]: "wrong_sibling_answer",
          [mpQ.questionId]: { [mpQ.parts[0].partId]: "   " },
        },
      });
    expect(mpRes.status).toBe(200);
    const mpResult = (mpRes.body.data.results as Array<any>).find(
      (r) => r.questionId === mpQ.questionId
    );
    expect(mpResult.status).toBe("unanswered");
    expect(mpResult.isCorrect).toBe(false);
    expect(mpResult.expectedAnswers).toEqual([]);
    expect(mpResult.explanation).toBeNull();
  });
});

