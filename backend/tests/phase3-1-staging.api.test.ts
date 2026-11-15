import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("Phase 3.1 Data Foundation & Dashboard Staging API Tests", () => {
  const ts = Date.now();
  const password = "Phase31StrongPassword!";

  // User A: Submits partial exercise (answered + skipped), resolves a mistake, runs TOEIC & adaptive quiz
  const emailA = `p31-partial-${ts}@grammarpath.local`;
  let tokenA = "";
  let userIdA = "";

  // User B: Submits ONLY skipped/empty exercise (0 evaluated answers) -> tests null vs 0% distinction
  const emailB = `p31-empty-${ts}@grammarpath.local`;
  let tokenB = "";
  let userIdB = "";

  beforeAll(async () => {
    const [regA, regB] = await Promise.all([
      request(app).post("/api/v1/auth/register").send({
        email: emailA,
        password,
        displayName: "Phase 3.1 Learner A",
      }),
      request(app).post("/api/v1/auth/register").send({
        email: emailB,
        password,
        displayName: "Phase 3.1 Skipped Only B",
      }),
    ]);

    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    tokenA = regA.body.data.token;
    userIdA = regA.body.data.user.id;
    tokenB = regB.body.data.token;
    userIdB = regB.body.data.user.id;
  });

  afterAll(async () => {
    const ids = [userIdA, userIdB].filter(Boolean);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("1. Enforces auth guard on /dashboard/summary and verifies baseline schema counts & Explanation FK integrity on staging", async () => {
    const unauth = await request(app).get("/api/v1/dashboard/summary");
    expect(unauth.status).toBe(401);

    const [units, sections, exercises, questions, explanations, concepts, links] =
      await Promise.all([
        prisma.unit.count(),
        prisma.theorySection.count(),
        prisma.exercise.count(),
        prisma.question.count(),
        prisma.explanation.count(),
        prisma.grammarConcept.count(),
        prisma.conceptTheoryLink.count(),
      ]);

    expect(units).toBe(145);
    expect(sections).toBe(542);
    expect(exercises).toBe(549);
    expect(questions).toBe(4414);
    expect(explanations).toBe(4414);
    expect(concepts).toBe(161);
    expect(links).toBe(542);

    const unlinkedExplanations = await prisma.explanation.count({
      where: { theorySectionId: null },
    });
    expect(unlinkedExplanations).toBe(0);
  });

  it("2. Rejects all-blank exercise submit (400), preserves SOLUTION_LOCKED & nullable accuracyPercentage (NOT 0%) when only unanswered items exist", async () => {
    // Exercise 1.3 with only whitespace must return 400 VALIDATION_ERROR
    const emptySubmitRes = await request(app)
      .post("/api/v1/exercises/1.3/check")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        answers: {
          "1.3-q3": "   ",
        },
      });
    expect(emptySubmitRes.status).toBe(400);

    // Fresh user with 0 attempts must return null accuracyPercentage (never 0%)
    const freshDash = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(freshDash.status).toBe(200);
    expect(freshDash.body.data.accuracy.accuracyPercentage).toBeNull();
    expect(freshDash.body.data.completion.averageExerciseScorePercentage).toBeNull();
    expect(freshDash.body.data.toeic.accuracyPercentage).toBeNull();

    // Seed unanswered QuestionAttemptItem rows directly (representing skipped blanks from a partial attempt)
    const ex13Questions = await prisma.question.findMany({
      where: { exercise: { exerciseId: "1.3" }, isExample: false },
      select: { id: true, questionId: true },
    });
    expect(ex13Questions).toHaveLength(8);
    await prisma.questionAttemptItem.createMany({
      data: ex13Questions.map((q) => ({
        userId: userIdB,
        questionId: q.id,
        isCorrect: null,
        attemptStatus: "unanswered",
        attemptSource: "exercise_submission",
      })),
    });

    // Skipped items must remain spoiler-locked on single solution endpoint
    const lockRes = await request(app)
      .get("/api/v1/questions/1.3-q3/solution")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(lockRes.status).toBe(403);
    expect(lockRes.body.error.code).toBe("SOLUTION_LOCKED");

    // Dashboard & Progress & Adaptive & Mistakes MUST exclude skipped items & return null accuracy
    const [dashRes, progRes, analyticsRes, mistakesRes] = await Promise.all([
      request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${tokenB}`),
      request(app)
        .get("/api/v1/progress/overview")
        .set("Authorization", `Bearer ${tokenB}`),
      request(app)
        .get("/api/v1/adaptive/analytics")
        .set("Authorization", `Bearer ${tokenB}`),
      request(app)
        .get("/api/v1/progress/mistakes")
        .set("Authorization", `Bearer ${tokenB}`),
    ]);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.accuracy.accuracyPercentage).toBeNull();
    expect(dashRes.body.data.accuracy.totalQuestionsAnswered).toBe(0);
    expect(dashRes.body.data.accuracy.totalIncorrect).toBe(0);
    expect(dashRes.body.data.accuracy.totalUnansweredSkipped).toBe(8);
    expect(dashRes.body.data.weakUnits).toEqual([]);
    expect(dashRes.body.data.mistakes.unresolvedCount).toBe(0);

    expect(progRes.status).toBe(200);
    expect(progRes.body.data.questions.accuracyPercentage).toBeNull();
    expect(progRes.body.data.questions.totalAnswered).toBe(0);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.accuracyPercentage).toBeNull();
    expect(analyticsRes.body.data.totalEvaluated).toBe(0);
    expect(analyticsRes.body.data.totalErrors).toBe(0);

    expect(mistakesRes.status).toBe(200);
    expect(mistakesRes.body.data).toEqual([]);
  });

  it("3. User A partial submission (1 right, 1 wrong, 6 skipped) + mistake_retry + TOEIC drill + source attribution + zero spoilers", async () => {
    // Exercise 1.3: q3 = "I'm not listening" (correct), q4 = "wrong" (incorrect), q5..q10 = skipped
    const submitRes = await request(app)
      .post("/api/v1/exercises/1.3/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        answers: {
          "1.3-q3": "I'm not listening",
          "1.3-q4": "definitely wrong phrase",
        },
      });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.answeredCount).toBe(2);
    expect(submitRes.body.data.unansweredCount).toBe(6);

    // Skipping later must NOT erase mistake 1.3-q4!
    const skipAgainRes = await request(app)
      .post("/api/v1/exercises/1.3/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        answers: {
          "1.3-q3": "I'm not listening",
        },
      });
    expect(skipAgainRes.status).toBe(200);

    const mistakesBeforeRetry = await request(app)
      .get("/api/v1/progress/mistakes")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(mistakesBeforeRetry.status).toBe(200);
    expect(mistakesBeforeRetry.body.data.some((m: any) => m.questionId === "1.3-q4")).toBe(
      true
    );

    // Check accuracy before retry: 2 correct ("1.3-q3" twice), 1 incorrect ("1.3-q4" once), 13 skipped!
    // Accuracy MUST be 2 / 3 = 66.7%, NEVER diluted by 13 skipped items!
    const dashBefore = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(dashBefore.status).toBe(200);
    expect(dashBefore.body.data.accuracy.totalQuestionsAnswered).toBe(3);
    expect(dashBefore.body.data.accuracy.totalCorrect).toBe(2);
    expect(dashBefore.body.data.accuracy.totalIncorrect).toBe(1);
    expect(dashBefore.body.data.accuracy.totalUnansweredSkipped).toBe(13);
    expect(dashBefore.body.data.accuracy.accuracyPercentage).toBe(66.7);

    // Verify source validation rejects invalid source
    const badSourceRes = await request(app)
      .post("/api/v1/questions/1.3-q4/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answer: "She's having", source: "fabricated_source" });
    expect(badSourceRes.status).toBe(400);

    // Resolve 1.3-q4 with explicit attemptSource = mistake_retry ("She's having")
    const retryRes = await request(app)
      .post("/api/v1/questions/1.3-q4/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answer: "She's having", source: "mistake_retry" });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.isCorrect).toBe(true);

    // Also do a quick single_check default on 73.1-q7 with ["", "the"] (empty string intentional zero-article)
    const zeroArticleRes = await request(app)
      .post("/api/v1/questions/73.1-q7/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ answer: ["", "the"] });
    expect(zeroArticleRes.status).toBe(200);
    expect(zeroArticleRes.body.data.isCorrect).toBe(true);

    // Generate & check 1 TOEIC practice item
    delete process.env.GEMINI_API_KEY;
    const toeicGen = await request(app)
      .post("/api/v1/adaptive/toeic-practice")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ unitNumber: 1, count: 5, difficulty: "medium" });
    expect(toeicGen.status).toBe(200);
    const firstItem = toeicGen.body.data.questions[0];

    const toeicCheck = await request(app)
      .post("/api/v1/adaptive/toeic-practice/check")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        sessionId: toeicGen.body.data.sessionId,
        itemId: firstItem.itemId,
        studentAnswer: "A",
      });
    expect(toeicCheck.status).toBe(200);

    // Final dashboard verification for User A
    const dashAfter = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(dashAfter.status).toBe(200);
    const bodyText = JSON.stringify(dashAfter.body.data);
    expect(bodyText).not.toContain("acceptedAnswers");
    expect(bodyText).not.toContain("correctAnswer");

    expect(dashAfter.body.data.mistakes.unresolvedCount).toBe(0);
    expect(dashAfter.body.data.accuracy.totalQuestionsAnswered).toBe(5);
    expect(dashAfter.body.data.accuracy.totalCorrect).toBe(4);
    expect(dashAfter.body.data.accuracy.accuracyPercentage).toBe(80);
    expect(dashAfter.body.data.accuracy.sourceBreakdown.exercise_submission).toBe(3);
    expect(dashAfter.body.data.accuracy.sourceBreakdown.mistake_retry).toBe(1);
    expect(dashAfter.body.data.accuracy.sourceBreakdown.single_check).toBe(1);
    expect(dashAfter.body.data.toeic.totalSessions).toBe(1);
    expect(dashAfter.body.data.toeic.itemsAnswered).toBe(1);
    expect(dashAfter.body.data.toeic.isOfficialToeic).toBe(false);
    expect(dashAfter.body.data.masteryStatus.engineActive).toBe(false);
    expect(dashAfter.body.data.activity.activeDaysLast7).toBeGreaterThanOrEqual(1);
    expect(dashAfter.body.data.activity.dailyLast14).toHaveLength(14);
  });

  it("4. Serves normalized TOEIC roadmap, concepts catalog, and linked theory section concepts", async () => {
    const [roadmapRes, part2Res, unit110Res, conceptsRes, theory1BRes] =
      await Promise.all([
        request(app).get("/api/v1/curriculum/roadmap"),
        request(app).get("/api/v1/curriculum/roadmap?part=Part%202"),
        request(app).get("/api/v1/curriculum/roadmap?unitNumber=110"),
        request(app).get("/api/v1/curriculum/concepts?includeTheoryLinks=true"),
        request(app).get("/api/v1/theory/sections/1B"),
      ]);

    expect(roadmapRes.status).toBe(200);
    expect(roadmapRes.body.data.totalStages).toBe(5);
    expect(roadmapRes.body.data.totalUnitsMatched).toBe(145);
    expect(roadmapRes.body.data.isOfficialToeic).toBe(false);

    for (const stage of roadmapRes.body.data.stages) {
      for (const mod of stage.modules) {
        for (const p of mod.toeicParts) {
          expect(p).toMatch(/^Part \d$/);
        }
        for (const u of mod.units) {
          for (const p of u.toeicParts) {
            expect(p).toMatch(/^Part \d$/);
          }
        }
      }
    }

    expect(part2Res.status).toBe(200);
    expect(part2Res.body.data.totalUnitsMatched).toBeGreaterThan(0);

    expect(unit110Res.status).toBe(200);
    expect(unit110Res.body.data.totalUnitsMatched).toBe(1);

    expect(conceptsRes.status).toBe(200);
    expect(conceptsRes.body.data.totalConcepts).toBe(161);
    expect(conceptsRes.body.data.confidenceBreakdown).toEqual({
      high: 512,
      medium: 23,
      low: 0,
      needs_review: 7,
    });

    expect(theory1BRes.status).toBe(200);
    expect(Array.isArray(theory1BRes.body.data.concepts)).toBe(true);
    expect(theory1BRes.body.data.concepts.length).toBeGreaterThanOrEqual(1);
    expect(theory1BRes.body.data.concepts[0].code).toBe("unit.001");
  });
});

