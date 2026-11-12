import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

function containsForbiddenSpoilerKeys(obj: unknown): string[] {
  const forbidden = new Set([
    "correctAnswer",
    "correctAnswerText",
    "correctAnswerArray",
    "acceptedAnswers",
    "explanation",
  ]);
  const hits: string[] = [];

  const visit = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, idx) => visit(item, `${path}[${idx}]`));
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = `${path}.${k}`;
      if (forbidden.has(k) && v !== undefined && v !== null) {
        hits.push(nextPath);
      }
      visit(v, nextPath);
    }
  };

  visit(obj, "root");
  return hits;
}

describe("Phase 2.1 Adversarial & Integration Verification Suite (10 Required Scenarios)", () => {
  const ts = Date.now();
  const userAEmail = `p21-adversarial-a-${ts}@grammarpath.local`;
  const userBEmail = `p21-adversarial-b-${ts}@grammarpath.local`;
  const password = "StrongTestPassword123!";

  let tokenA = "";
  let userAId = "";
  let tokenB = "";
  let userBId = "";

  beforeAll(async () => {
    const [regA, regB] = await Promise.all([
      request(app).post("/api/v1/auth/register").send({
        email: userAEmail,
        password,
        displayName: "Adversarial Learner A",
      }),
      request(app).post("/api/v1/auth/register").send({
        email: userBEmail,
        password,
        displayName: "Adversarial Learner B",
      }),
    ]);

    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    tokenA = regA.body.data.token;
    userAId = regA.body.data.user.id;
    tokenB = regB.body.data.token;
    userBId = regB.body.data.user.id;
  });

  afterAll(async () => {
    const ids = [userAId, userBId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });

      const [progCount, exAttCount, qAttCount, quizCount, toeicCount] =
        await Promise.all([
          prisma.learningProgress.count({ where: { userId: { in: ids } } }),
          prisma.exerciseAttempt.count({ where: { userId: { in: ids } } }),
          prisma.questionAttemptItem.count({ where: { userId: { in: ids } } }),
          prisma.adaptiveQuizSession.count({ where: { userId: { in: ids } } }),
          prisma.toeicPracticeSession.count({ where: { userId: { in: ids } } }),
        ]);

      expect(progCount).toBe(0);
      expect(exAttCount).toBe(0);
      expect(qAttCount).toBe(0);
      expect(quizCount).toBe(0);
      expect(toeicCount).toBe(0);
    }

    await prisma.$disconnect();
  });

  it("Scenario 1: Unauthenticated GET /questions/:id/solution and GET /exercises/:id/solutions are blocked (401)", async () => {
    const qSol = await request(app).get("/api/v1/questions/1.1-q1/solution");
    expect(qSol.status).toBe(401);
    expect(qSol.body.error.code).toBe("UNAUTHORIZED");

    const qSolNonEx = await request(app).get("/api/v1/questions/1.1-q2/solution");
    expect(qSolNonEx.status).toBe(401);
    expect(qSolNonEx.body.error.code).toBe("UNAUTHORIZED");

    const exSol = await request(app).get("/api/v1/exercises/1.1/solutions");
    expect(exSol.status).toBe(401);
    expect(exSol.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Scenario 2: Authenticated user who has NOT attempted 1.1-q2 or 1.1 is blocked from /solution and /solutions (403 SOLUTION_LOCKED)", async () => {
    const qRes = await request(app)
      .get("/api/v1/questions/1.1-q2/solution")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(qRes.status).toBe(403);
    expect(qRes.body.error.code).toBe("SOLUTION_LOCKED");

    const exRes = await request(app)
      .get("/api/v1/exercises/1.1/solutions")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(exRes.status).toBe(403);
    expect(exRes.body.error.code).toBe("SOLUTION_LOCKED");
  });

  it("Scenario 3: ?includeAnswers=true (and sibling spoiler query flags) on unit/exercise/question GET routes are rejected with 403 SPOILER_FORBIDDEN", async () => {
    for (const url of [
      "/api/v1/units/1/exercises?includeAnswers=true",
      "/api/v1/units/1/exercises?includeSolutions=true",
      "/api/v1/exercises/1.1?includeAnswers=true",
      "/api/v1/exercises/1.1?showAnswers=1",
      "/api/v1/questions/1.1-q2?includeAnswers=true",
      "/api/v1/questions/1.1-q2?withAnswers=true",
    ]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("SPOILER_FORBIDDEN");
    }
  });

  it("Scenario 4: POST /adaptive/toeic-practice and POST /adaptive/quiz/generate omit all answer keys and explanations before submission", async () => {
    const toeicRes = await request(app)
      .post("/api/v1/adaptive/toeic-practice")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ unitNumber: 1, count: 5, difficulty: "medium" });

    expect(toeicRes.status).toBe(200);
    expect(containsForbiddenSpoilerKeys(toeicRes.body.data)).toEqual([]);

    const quizRes = await request(app)
      .post("/api/v1/adaptive/quiz/generate")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ questionCount: 5, difficulty: "medium" });

    expect(quizRes.status).toBe(200);
    expect(containsForbiddenSpoilerKeys(quizRes.body.data)).toEqual([]);
  });

  it("Scenario 5: Forged foreign or unknown questionId inside POST /exercises/1.1/check fails with 400 VALIDATION_ERROR without DB writes", async () => {
    const beforeAttempts = await prisma.exerciseAttempt.count({
      where: { userId: userAId },
    });

    const foreignRes = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answers: { "1.2-q1": "bogus" } });

    expect(foreignRes.status).toBe(400);
    expect(foreignRes.body.error.code).toBe("VALIDATION_ERROR");

    const unknownRes = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answers: { "999.9-q99": "bogus" } });

    expect(unknownRes.status).toBe(400);
    expect(unknownRes.body.error.code).toBe("VALIDATION_ERROR");

    const emptyRes = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answers: {} });

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe("VALIDATION_ERROR");

    const afterAttempts = await prisma.exerciseAttempt.count({
      where: { userId: userAId },
    });
    expect(afterAttempts).toBe(beforeAttempts);
  });

  it("Scenario 6: Wrong answer -> mistake appears -> solved via POST /adaptive/quiz/check -> disappears from mistakes & future adaptive quiz mistake pool while history remains", async () => {
    const wrongCheck = await request(app)
      .post("/api/v1/questions/1.1-q3/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answer: "wrong_attempt_1" });
    expect(wrongCheck.status).toBe(200);
    expect(wrongCheck.body.data.isCorrect).toBe(false);

    // Must appear in GET /progress/mistakes with full polymorphic metadata (and no spoiler keys)
    const mistakesBefore = await request(app)
      .get("/api/v1/progress/mistakes")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(mistakesBefore.status).toBe(200);
    const m13 = mistakesBefore.body.data.find((m: any) => m.questionId === "1.1-q3");
    expect(m13).toBeDefined();
    expect(Array.isArray(m13.wordBankItems)).toBe(true);
    expect(Array.isArray(m13.options)).toBe(true);
    expect(m13.correctAnswerText).toBeUndefined();

    // Generate Adaptive Quiz & verify errorCount >= 1
    const quizGen1 = await request(app)
      .post("/api/v1/adaptive/quiz/generate")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ questionCount: 5 });
    expect(quizGen1.status).toBe(200);
    expect(quizGen1.body.data.targetUnits[0].errorCount).toBeGreaterThanOrEqual(1);

    // Resolve 1.1-q3 via POST /adaptive/quiz/check (canonical answer from DB = "g")
    const q13 = await prisma.question.findFirst({
      where: { questionId: "1.1-q3" },
      select: { correctAnswerText: true },
    });
    const fixRes = await request(app)
      .post("/api/v1/adaptive/quiz/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        sessionId: quizGen1.body.data.sessionId,
        questionId: "1.1-q3",
        studentAnswer: q13!.correctAnswerText!,
      });
    expect(fixRes.status).toBe(200);
    expect(fixRes.body.data.isCorrect).toBe(true);

    // Mistakes list no longer contains 1.1-q3
    const mistakesAfter = await request(app)
      .get("/api/v1/progress/mistakes")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(mistakesAfter.status).toBe(200);
    expect(
      mistakesAfter.body.data.some((m: any) => m.questionId === "1.1-q3")
    ).toBe(false);

    // Future quiz generation reflects zero unresolved mistakes
    const quizGen2 = await request(app)
      .post("/api/v1/adaptive/quiz/generate")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ questionCount: 5 });
    expect(quizGen2.status).toBe(200);
    expect(
      quizGen2.body.data.targetUnits.every((u: any) => u.errorCount === 0)
    ).toBe(true);

    // Historical QuestionAttemptItems are preserved (both wrong + fixed rows exist)
    const historyCount = await prisma.questionAttemptItem.count({
      where: {
        userId: userAId,
        question: { questionId: "1.1-q3" },
      },
    });
    expect(historyCount).toBe(2);
  });

  it("Scenario 7: Multi-exercise unit partial/stale-MAX guard (pass ex 23.1, fail 23.1 later, then pass ex 23.2 -> Unit 23 stays 'in_progress', not 'completed')", async () => {
    const unit23Exercises = await prisma.exercise.findMany({
      where: { unit: { unitNumber: 23 } },
      orderBy: { displayOrder: "asc" },
      include: {
        questions: {
          where: { isExample: false },
          orderBy: { displayOrder: "asc" },
          include: {
            blanks: { orderBy: { blankIndex: "asc" } },
            parts: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
    });
    expect(unit23Exercises).toHaveLength(2);

    const buildPerfectAnswers = (ex: (typeof unit23Exercises)[number]) => {
      const map: Record<string, unknown> = {};
      for (const q of ex.questions) {
        if (q.parts.length > 0) {
          const partMap: Record<string, string> = {};
          for (const p of q.parts) {
            partMap[p.partId] = p.correctAnswerText || "";
          }
          map[q.questionId] = partMap;
        } else if (q.blanks.length > 1) {
          map[q.questionId] = q.blanks.map((b) => b.correctAnswerText || "");
        } else {
          map[q.questionId] =
            q.correctAnswerText || q.blanks[0]?.correctAnswerText || "";
        }
      }
      return map;
    };

    const buildZeroAnswers = (ex: (typeof unit23Exercises)[number]) => {
      const map: Record<string, unknown> = {};
      for (const q of ex.questions) {
        map[q.questionId] = "completely_wrong_answer_xyz";
      }
      return map;
    };

    // Step 1: Pass 23.1 with 100%
    const pass231 = await request(app)
      .post("/api/v1/exercises/23.1/check")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ answers: buildPerfectAnswers(unit23Exercises[0]) });
    expect(pass231.status).toBe(200);
    expect(pass231.body.data.scorePercentage).toBe(100);
    expect(pass231.body.data.unitProgressStatus).toBe("in_progress");

    // Step 2: Retry 23.1 and fail with 0% (latest for 23.1 is now 0%, though historical MAX was 100%)
    const fail231 = await request(app)
      .post("/api/v1/exercises/23.1/check")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ answers: buildZeroAnswers(unit23Exercises[0]) });
    expect(fail231.status).toBe(200);
    expect(fail231.body.data.scorePercentage).toBe(0);
    expect(fail231.body.data.unitProgressStatus).toBe("in_progress");

    // Step 3: Pass 23.2 with 100% -> latest scores are [0%, 100%], so Unit 23 MUST NOT become completed!
    const pass232 = await request(app)
      .post("/api/v1/exercises/23.2/check")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ answers: buildPerfectAnswers(unit23Exercises[1]) });
    expect(pass232.status).toBe(200);
    expect(pass232.body.data.scorePercentage).toBe(100);
    expect(pass232.body.data.unitProgressStatus).toBe("in_progress");
  });

  it("Scenario 8: Manually toggling unit status preserves all historical attempts in DB and in PUT /progress/units/:unitNumber response", async () => {
    const beforeDetail = await request(app)
      .get("/api/v1/progress/units/23")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(beforeDetail.status).toBe(200);
    const attemptCountBefore = beforeDetail.body.data.attempts.length;
    expect(attemptCountBefore).toBe(3);

    const putCompleted = await request(app)
      .put("/api/v1/progress/units/23")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ status: "completed" });
    expect(putCompleted.status).toBe(200);
    expect(putCompleted.body.data.status).toBe("completed");
    expect(putCompleted.body.data.attempts).toHaveLength(attemptCountBefore);

    const putBack = await request(app)
      .put("/api/v1/progress/units/23")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ status: "in_progress" });
    expect(putBack.status).toBe(200);
    expect(putBack.body.data.status).toBe("in_progress");
    expect(putBack.body.data.attempts).toHaveLength(attemptCountBefore);

    const overviewRes = await request(app)
      .get("/api/v1/progress/overview")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.exercises.totalAttempts).toBeGreaterThanOrEqual(3);
  });

  it("Scenario 9: Concurrent / duplicate submissions with identical payload create only ONE persisted attempt/item row", async () => {
    const subIdEx = `dedupe-ex-${ts}`;
    const beforeExCount = await prisma.exerciseAttempt.count({
      where: { userId: userAId },
    });

    const [exR1, exR2] = await Promise.all([
      request(app)
        .post("/api/v1/exercises/1.2/check")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answers: { "1.2-q2": "is sitting" }, submissionId: subIdEx }),
      request(app)
        .post("/api/v1/exercises/1.2/check")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answers: { "1.2-q2": "is sitting" }, submissionId: subIdEx }),
    ]);

    expect(exR1.status).toBe(200);
    expect(exR2.status).toBe(200);
    expect(exR1.body.data.attemptId).toBe(exR2.body.data.attemptId);

    const afterExCount = await prisma.exerciseAttempt.count({
      where: { userId: userAId },
    });
    expect(afterExCount).toBe(beforeExCount + 1);

    // Also verify question-level concurrent deduplication
    const subIdQ = `dedupe-q-${ts}`;
    const beforeQCount = await prisma.questionAttemptItem.count({
      where: { userId: userAId },
    });
    const [qR1, qR2] = await Promise.all([
      request(app)
        .post("/api/v1/questions/1.1-q4/check")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answer: "d", submissionId: subIdQ }),
      request(app)
        .post("/api/v1/questions/1.1-q4/check")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answer: "d", submissionId: subIdQ }),
    ]);
    expect(qR1.status).toBe(200);
    expect(qR2.status).toBe(200);
    expect(qR1.body.data.questionAttemptId).toBe(qR2.body.data.questionAttemptId);

    const afterQCount = await prisma.questionAttemptItem.count({
      where: { userId: userAId },
    });
    expect(afterQCount).toBe(beforeQCount + 1);
  });

  it("Scenario 10: POST /adaptive/toeic-practice on Unit 98 with count=20 yields 20 valid unit-grounded unbiased items without pre-submission spoilers", async () => {
    const res = await request(app)
      .post("/api/v1/adaptive/toeic-practice")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ unitNumber: 98, count: 20, difficulty: "medium" });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.unitNumber).toBe(98);
    expect(data.actualCount).toBe(20);
    expect(data.questions).toHaveLength(20);
    expect(data.isOfficialToeic).toBe(false);
    expect(data.sourceNotice).toContain("Unit 98");
    expect(containsForbiddenSpoilerKeys(data)).toEqual([]);

    for (const q of data.questions) {
      expect(q.prompt).toContain("_______");
      expect(q.prompt).not.toContain("{blank}");
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o: any) => o.key)).toEqual(["A", "B", "C", "D"]);
    }

    // Verify stored items in PostgreSQL have balanced A/B/C/D correct answers (5 each for batch of 20)
    const dbItems = await prisma.toeicPracticeItem.findMany({
      where: { sessionId: data.sessionId },
    });
    expect(dbItems).toHaveLength(20);
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const it of dbItems) dist[it.correctAnswer] += 1;
    expect(dist).toEqual({ A: 5, B: 5, C: 5, D: 5 });

    // Cross-user ownership guard on /toeic-practice/check
    const crossUserCheck = await request(app)
      .post("/api/v1/adaptive/toeic-practice/check")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        sessionId: data.sessionId,
        itemId: data.questions[0].itemId,
        studentAnswer: "B",
      });
    expect(crossUserCheck.status).toBe(403);
    expect(crossUserCheck.body.error.code).toBe("FORBIDDEN");
  });
});

