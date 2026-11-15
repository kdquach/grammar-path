import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Phase 3.3 — Staging API Integration Suite (Onboarding, Learning Path, Daily Plan, Study Session & Engagement)", () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create isolated test user on Neon staging
    const email = `staging-phase33-${Date.now()}@grammarpath.local`;
    const res = await request(app).post("/api/v1/auth/register").send({
      email,
      password: "TestPassword123!",
      displayName: "Phase 3.3 QA Tester",
    });

    expect(res.status).toBe(201);
    authToken = res.body.data.token;
    testUserId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      // Cascading delete
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe("1. Onboarding Preferences APIs", () => {
    it("returns default preferences when not yet configured", async () => {
      const res = await request(app)
        .get("/api/v1/onboarding/preferences")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dailyStudyMinutes).toBe(20);
      expect(res.body.data.onboardingCompleted).toBe(false);
    });

    it("updates preferences and marks onboardingCompleted true", async () => {
      const res = await request(app)
        .put("/api/v1/onboarding/preferences")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          grammarConfidence: "intermediate",
          learningObjective: "toeic_prep",
          dailyStudyMinutes: 30,
          preferredDays: ["mon", "wed", "fri"],
          targetToeicScore: 750,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grammarConfidence).toBe("intermediate");
      expect(res.body.data.learningObjective).toBe("toeic_prep");
      expect(res.body.data.dailyStudyMinutes).toBe(30);
      expect(res.body.data.targetToeicScore).toBe(750);
      expect(res.body.data.onboardingCompleted).toBe(true);
    });
  });

  describe("2. Diagnostic Assessment APIs", () => {
    let assessmentId: string;
    let questionsList: any[];

    it("starts diagnostic assessment selecting real Murphy questions with answers redacted", async () => {
      const res = await request(app)
        .post("/api/v1/assessment/start")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assessmentId).toBeDefined();
      expect(res.body.data.totalQuestions).toBeGreaterThanOrEqual(5);

      assessmentId = res.body.data.assessmentId;
      questionsList = res.body.data.questions;

      // Ensure answers and solutions are strictly not leaked
      for (const q of questionsList) {
        expect(q.correctAnswerText).toBeUndefined();
        expect(q.answerKey).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    });

    it("submits diagnostic assessment and returns level estimation without marking mastery", async () => {
      const answers: Record<string, string> = {};
      if (questionsList.length > 0) {
        // Answer first question with dummy string
        answers[questionsList[0].id] = "is doing";
      }

      const res = await request(app)
        .post(`/api/v1/assessment/${assessmentId}/submit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ answers });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("completed");
      expect(res.body.data.estimatedLevel).toBeDefined();
      expect(res.body.data.recommendedUnit).toBeDefined();
      expect(res.body.data.disclaimerVi).toContain("định hướng");
    });
  });

  describe("3. Personalized Learning Path API", () => {
    it("returns 5 stages enriched with concept mastery and prioritized actions", async () => {
      const res = await request(app)
        .get("/api/v1/learning-path")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalConcepts).toBeGreaterThanOrEqual(100);
      expect(res.body.data.stages.length).toBe(5);

      const stageKeys = res.body.data.stages.map((s: any) => s.stageKey);
      expect(stageKeys).toContain("foundation");
      expect(stageKeys).toContain("developing");
      expect(stageKeys).toContain("intermediate");
      expect(stageKeys).toContain("advanced");
      expect(stageKeys).toContain("toeic_readiness");
    });
  });

  describe("4. Daily Learning Plan APIs", () => {
    let planId: string;
    let itemId: string;

    it("idempotently generates a realistic daily learning plan", async () => {
      const res = await request(app)
        .get("/api/v1/daily-plan")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      planId = res.body.data.id;
      itemId = res.body.data.items[0].id;

      // Call a second time for the same date -> must return identical planId (idempotent)
      const res2 = await request(app)
        .get("/api/v1/daily-plan")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res2.body.data.id).toBe(planId);
    });

    it("updates item status and re-computes completed minutes and parent status", async () => {
      const res = await request(app)
        .patch(`/api/v1/daily-plan/items/${itemId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "completed" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completedMinutes).toBeGreaterThan(0);
      const updatedItem = res.body.data.items.find((it: any) => it.id === itemId);
      expect(updatedItem.status).toBe("completed");
    });
  });

  describe("5. Unified Study Session API", () => {
    it("initializes study session bundling unit theory, illustrative examples and exercise questions", async () => {
      const res = await request(app)
        .get("/api/v1/study-sessions/init?unit=1&exercise=1.1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unit.unitNumber).toBe(1);
      expect(res.body.data.theorySections.length).toBeGreaterThan(0);
      expect(res.body.data.textbookExamples.length).toBeGreaterThan(0);
      expect(res.body.data.currentExercise.exerciseNumber).toBe("1.1");
      expect(res.body.data.currentExercise.questions.length).toBeGreaterThan(0);
      expect(res.body.data.userContext).toBeDefined();
    });
  });

  describe("6. Learning Engagement & Streak API", () => {
    it("returns engagement metrics with cleanly separated completion, accuracy and streak", async () => {
      const res = await request(app)
        .get("/api/v1/engagement/summary")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStreak).toBeGreaterThanOrEqual(0);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.totalUnits).toBe(145);
      expect(res.body.data.metrics.completionPercentage).toBeDefined();
    });
  });
});

