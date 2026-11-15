import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Phase 3.2 — Staging API Integration Suite (Mastery, Reviews & Recommendations)", () => {
  let authToken: string;
  let testUserId: string;
  let testConceptId: string;
  let testQuestionId: string;
  let unit1: any;

  beforeAll(async () => {
    // 1. Create isolated test user on staging
    const email = `staging-phase32-${Date.now()}@grammarpath.local`;
    const res = await request(app).post("/api/v1/auth/register").send({
      email,
      password: "TestPassword123!",
      displayName: "Phase 3.2 QA Tester",
    });

    expect(res.status).toBe(201);
    authToken = res.body.data.token;
    testUserId = res.body.data.user.id;

    // 2. Fetch Unit 1 and Concept 1
    const foundUnit = await prisma.unit.findFirst({
      where: { unitNumber: 1 },
      include: {
        exercises: {
          include: {
            questions: true,
          },
        },
      },
    });
    expect(foundUnit).toBeDefined();
    unit1 = foundUnit!;

    const foundConcept = await prisma.grammarConcept.findFirst({
      where: { code: "unit.001" },
    });
    expect(foundConcept).toBeDefined();
    testConceptId = foundConcept!.id;

    testQuestionId = unit1.exercises[0].questions[0].id;
  });

  afterAll(async () => {
    // Clean up test user and cascading data
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe("1. Authentication & User Isolation", () => {
    it("rejects unauthenticated requests to /api/v1/mastery with 401", async () => {
      const res = await request(app).get("/api/v1/mastery");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated requests to /api/v1/reviews/due with 401", async () => {
      const res = await request(app).get("/api/v1/reviews/due");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated requests to /api/v1/recommendations with 401", async () => {
      const res = await request(app).get("/api/v1/recommendations");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("2. Initial Mastery State for New Learner", () => {
    it("returns clean empty mastery state for new user", async () => {
      const res = await request(app)
        .get("/api/v1/mastery")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.totalConcepts).toBe(161);
      expect(data.startedConcepts).toBe(0);
      expect(data.averageMastery).toBeNull();
      expect(data.dueReviewsCount).toBe(0);
      expect(data.statusCounts.not_started).toBe(161);
    });

    it("returns next recommended action starting with curriculum next steps", async () => {
      const res = await request(app)
        .get("/api/v1/recommendations/next")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nextAction).toBeDefined();
      expect(res.body.data.nextAction.type).toBe("curriculum_next");
      expect(res.body.data.nextAction.unitNumber).toBe(1);
    });
  });

  describe("3. Incremental Mastery & Anti-Inflation Progression", () => {
    it("classifies single question completion as insufficient_data", async () => {
      // Complete 1 question
      const checkRes = await request(app)
        .post(`/api/v1/questions/${unit1.exercises[0].questions[0].questionId}/check`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          answer: "She's taking a picture.",
          source: "single_check",
        });

      expect(checkRes.status).toBe(200);

      // Fetch concept mastery detail
      const detailRes = await request(app)
        .get(`/api/v1/mastery/concepts/${testConceptId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(detailRes.status).toBe(200);
      const mastery = detailRes.body.data.mastery;
      expect(mastery.status).toBe("insufficient_data");
      expect(mastery.distinctQuestionCount).toBe(1);
      expect(mastery.explanationVi).toContain("tối thiểu 3 câu");
    });

    it("prevents repeated retries of the same question from inflating distinct evidence", async () => {
      // Repeat the exact same question 3 more times with distinct submission IDs
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/v1/questions/${unit1.exercises[0].questions[0].questionId}/check`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            answer: "She's taking a picture.",
            source: "single_check",
            submissionId: `retry-audit-${Date.now()}-${i}`,
          });
      }

      const detailRes = await request(app)
        .get(`/api/v1/mastery/concepts/${testConceptId}`)
        .set("Authorization", `Bearer ${authToken}`);

      const mastery = detailRes.body.data.mastery;
      expect(mastery.distinctQuestionCount).toBe(1);
      expect(mastery.repeatedAttemptCount).toBeGreaterThanOrEqual(3);
      // Status MUST remain insufficient_data!
      expect(mastery.status).toBe("insufficient_data");
    });
  });

  describe("4. Spaced Repetition Review Center APIs", () => {
    it("fetches review schedule and completes a review session with stability growth", async () => {
      // Complete review with 100% correct
      const completeRes = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          correctCount: 3,
          totalCount: 3,
          unansweredCount: 0,
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe("success");
      expect(completeRes.body.data.stabilityDays).toBeGreaterThan(2.0); // Stability expanded
      expect(completeRes.body.data.intervalDays).toBeGreaterThanOrEqual(2);

      // Verify schedule list reflects new date
      const allRes = await request(app)
        .get("/api/v1/reviews")
        .set("Authorization", `Bearer ${authToken}`);

      expect(allRes.status).toBe(200);
      expect(allRes.body.data.totalSchedules).toBeGreaterThan(0);
    });

    it("handles 100% unanswered review session by rescheduling without stability penalty", async () => {
      const scheduleBefore = await prisma.conceptReviewSchedule.findUnique({
        where: { userId_conceptId: { userId: testUserId, conceptId: testConceptId } },
      });

      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          correctCount: 0,
          totalCount: 3,
          unansweredCount: 3, // All left unanswered
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("rescheduled_unanswered");
      expect(res.body.data.schedule.stabilityDays).toBe(scheduleBefore?.stabilityDays);
    });

    it("rejects invalid review completion payloads", async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${testConceptId}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          correctCount: 5,
          totalCount: 2, // invalid: correct > total
          unansweredCount: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("5. Personalized Practice Recommendations API", () => {
    it("returns ranked recommendations with human-readable reasons and playable targets", async () => {
      const res = await request(app)
        .get("/api/v1/recommendations")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const recs = res.body.data.recommendations;
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);

      const topRec = recs[0];
      expect(topRec.reasonVi).toBeDefined();
      expect(topRec.actionUrl).toBeDefined();
      expect(topRec.unitNumber).toBeGreaterThan(0);
    });
  });

  describe("6. Manual Mastery Recalculation API", () => {
    it("successfully runs idempotent recalculation for user", async () => {
      const res = await request(app)
        .post("/api/v1/mastery/recalculate")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recalculatedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
