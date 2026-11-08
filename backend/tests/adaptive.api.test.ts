import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("Adaptive Learning, AI Explanation & Personalized Review Engine REST APIs", () => {
  const timestamp = Date.now();
  const testEmail = `adaptive-learner-${timestamp}@grammarpath.local`;
  const testPassword = "adaptivePassword123!";
  const testDisplayName = `Adaptive Learner ${timestamp}`;

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

  // ─── 1. AI Theory Explainer ────────────────────────────────────────────────

  it("1. POST /api/v1/theory/explain-theory -> returns friendly pedagogical Vietnamese explanation (200)", async () => {
    const res = await request(app)
      .post("/api/v1/theory/explain-theory")
      .send({
        sectionId: "1A",
        heading: "Study this example situation:",
        sourceContent:
          "Sarah is in her car. She is on her way to work. She is driving to work. This means: she is driving now, at the time of speaking. The action is not finished.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.explanation).toBe("string");
    expect(res.body.data.explanation.length).toBeGreaterThan(50);
    // Should mention section or heading or vietnamese grammar keywords
    expect(res.body.data.explanation).toContain("1A");
  });

  it("2. POST /api/v1/theory/explain-theory with userQuestion -> personalizes explanation addressing student question", async () => {
    const res = await request(app)
      .post("/api/v1/theory/explain-theory")
      .send({
        sectionId: "1B",
        heading: "I am doing something = I'm in the middle of doing it",
        sourceContent:
          "Please don't make so much noise. I'm trying to work. Where is Mark? He's having a shower.",
        userQuestion: "Tại sao lại dùng 'trying' mà không dùng 'try'?",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.explanation).toBe("string");
    expect(res.body.data.explanation).toContain("trying");
  });

  it("3. POST /api/v1/theory/explain-theory validation error -> rejects empty or missing required fields with 400", async () => {
    const res = await request(app)
      .post("/api/v1/theory/explain-theory")
      .send({
        heading: "Missing sectionId",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── 2. Adaptive Analytics & Recommendations ───────────────────────────────

  it("4. Auth Guard: GET /api/v1/adaptive/analytics and /recommendations require authentication (401)", async () => {
    const analyticsRes = await request(app).get("/api/v1/adaptive/analytics");
    expect(analyticsRes.status).toBe(401);
    expect(analyticsRes.body.success).toBe(false);
    expect(analyticsRes.body.error.code).toBe("UNAUTHORIZED");

    const recRes = await request(app).get("/api/v1/adaptive/recommendations");
    expect(recRes.status).toBe(401);
    expect(recRes.body.success).toBe(false);
    expect(recRes.body.error.code).toBe("UNAUTHORIZED");
  });

  it("5. Register test user and verify empty state analytics & initial recommendations", async () => {
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      });

    expect(registerRes.status).toBe(201);
    authToken = registerRes.body.data.token;
    testUserId = registerRes.body.data.user.id;

    // Analytics for fresh user
    const analyticsRes = await request(app)
      .get("/api/v1/adaptive/analytics")
      .set("Authorization", `Bearer ${authToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.success).toBe(true);
    expect(analyticsRes.body.data.totalEvaluated).toBe(0);
    expect(analyticsRes.body.data.totalErrors).toBe(0);
    expect(analyticsRes.body.data.accuracyPercentage).toBe(0);
    expect(analyticsRes.body.data.weakestUnits).toEqual([]);
    expect(analyticsRes.body.data.errorDistribution).toEqual([]);
    expect(analyticsRes.body.data.weakestQuestionType).toBeNull();
    expect(analyticsRes.body.data.weakRules).toEqual([]);

    // Recommendations for fresh user -> starters (Unit 1)
    const recRes = await request(app)
      .get("/api/v1/adaptive/recommendations")
      .set("Authorization", `Bearer ${authToken}`);

    expect(recRes.status).toBe(200);
    expect(recRes.body.success).toBe(true);
    expect(recRes.body.data.recommendations.length).toBeGreaterThan(0);
    expect(recRes.body.data.recommendations[0].unitNumber).toBe(1);
    expect(recRes.body.data.recommendations[0].priority).toBeDefined();
    expect(Array.isArray(recRes.body.data.recommendations[0].targetRules)).toBe(true);
  });

  it("6. Submit correct and incorrect answers, then verify adaptive analytics and prioritized recommendations", async () => {
    // Submit an incorrect answer to Question 1.1-q1
    const check1 = await request(app)
      .post("/api/v1/questions/1.1-q1/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ answer: "completely wrong answer" });

    expect(check1.status).toBe(200);
    expect(check1.body.data.isCorrect).toBe(false);

    // Submit an incorrect answer to Question 1.1-q2
    const check2 = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ answer: "another wrong answer" });

    expect(check2.status).toBe(200);
    expect(check2.body.data.isCorrect).toBe(false);

    // Verify GET /api/v1/adaptive/analytics identifies Unit 1 as weakest unit
    const analyticsRes = await request(app)
      .get("/api/v1/adaptive/analytics")
      .set("Authorization", `Bearer ${authToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.success).toBe(true);
    const analytics = analyticsRes.body.data;
    expect(analytics.totalEvaluated).toBe(2);
    expect(analytics.totalErrors).toBe(2);
    expect(analytics.totalCorrect).toBe(0);
    expect(analytics.accuracyPercentage).toBe(0);

    expect(analytics.weakestUnits.length).toBeGreaterThan(0);
    expect(analytics.weakestUnits[0].unitNumber).toBe(1);
    expect(analytics.weakestUnits[0].errorCount).toBe(2);
    expect(analytics.weakestUnits[0].weakestQuestionTypes.length).toBeGreaterThan(0);

    expect(analytics.errorDistribution.length).toBeGreaterThan(0);
    expect(analytics.weakestQuestionType).toBeDefined();

    // Verify granular ruleReference analytics (weakRules)
    expect(Array.isArray(analytics.weakRules)).toBe(true);
    expect(analytics.weakRules.length).toBeGreaterThan(0);
    expect(analytics.weakRules[0].ruleReference).toBeDefined();
    expect(analytics.weakRules[0].heading).toBeDefined();
    expect(analytics.weakRules[0].errorCount).toBeGreaterThanOrEqual(1);
    expect(analytics.weakRules[0].unitNumber).toBe(1);

    // Verify GET /api/v1/adaptive/recommendations prioritizes Unit 1
    const recRes = await request(app)
      .get("/api/v1/adaptive/recommendations")
      .set("Authorization", `Bearer ${authToken}`);

    expect(recRes.status).toBe(200);
    expect(recRes.body.success).toBe(true);
    const recommendations = recRes.body.data.recommendations;
    expect(recommendations.length).toBeGreaterThan(0);

    const unit1Rec = recommendations.find((r: { unitNumber: number }) => r.unitNumber === 1);
    expect(unit1Rec).toBeDefined();
    expect(unit1Rec.errorCount).toBe(2);
    expect(unit1Rec.reason).toContain("Unit");
    expect(Array.isArray(unit1Rec.targetRules)).toBe(true);
    expect(unit1Rec.targetRules.length).toBeGreaterThan(0);
    expect(unit1Rec.suggestedActions.length).toBeGreaterThan(0);
  });
});

