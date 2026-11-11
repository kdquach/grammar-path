import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

describe("User Authentication, Learning Progress, Exercise Attempts & Mistake Review REST APIs", () => {
  const timestamp = Date.now();
  const testEmail = `test-learner-${timestamp}@grammarpath.local`;
  const testPassword = "securePassword123!";
  const testDisplayName = `Learner ${timestamp}`;

  let authToken = "";
  let testUserId = "";

  afterAll(async () => {
    // 8. Cascading cleanup: delete the test user if created
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      });

      // Verify cascading cleanup left 0 orphaned rows for this user
      const [userProgressCount, userAttemptsCount, userQuestionAttemptsCount] = await Promise.all([
        prisma.learningProgress.count({ where: { userId: testUserId } }),
        prisma.exerciseAttempt.count({ where: { userId: testUserId } }),
        prisma.questionAttemptItem.count({ where: { userId: testUserId } }),
      ]);

      expect(userProgressCount).toBe(0);
      expect(userAttemptsCount).toBe(0);
      expect(userQuestionAttemptsCount).toBe(0);
    }

    // Verify all 22 core tables remain 100% intact
    const [unitsCount, exercisesCount, questionsCount] = await Promise.all([
      prisma.unit.count(),
      prisma.exercise.count(),
      prisma.question.count(),
    ]);

    expect(unitsCount).toBe(145);
    expect(exercisesCount).toBe(549);
    expect(questionsCount).toBe(4414);

    await prisma.$disconnect();
  });

  // 1. User Registration
  it("1. POST /api/v1/auth/register -> creates user (201), returns JWT token; duplicate email returns 409 CONFLICT", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.user.displayName).toBe(testDisplayName);
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    authToken = res.body.data.token;
    testUserId = res.body.data.user.id;

    // Duplicate email registration should fail with 409 CONFLICT
    const dupRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail.toUpperCase(), // Test case insensitivity
        password: testPassword,
        displayName: "Another Name",
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error.code).toBe("CONFLICT");

    // Password < 8 chars should fail with 400 VALIDATION_ERROR
    const shortPwdRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `short-${timestamp}@grammarpath.local`,
        password: "123",
        displayName: "Short Pwd",
      });

    expect(shortPwdRes.status).toBe(400);
    expect(shortPwdRes.body.success).toBe(false);
  });

  // 2. User Login
  it("2. POST /api/v1/auth/login -> valid credentials returns 200 with token; invalid credentials returns 401 INVALID_CREDENTIALS", async () => {
    // Valid credentials
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.id).toBe(testUserId);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());

    // Invalid password
    const wrongPwdRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: "incorrectPassword!",
      });

    expect(wrongPwdRes.status).toBe(401);
    expect(wrongPwdRes.body.success).toBe(false);
    expect(wrongPwdRes.body.error.code).toBe("INVALID_CREDENTIALS");

    // Non-existent email
    const noUserRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "non-existent-user@grammarpath.local",
        password: testPassword,
      });

    expect(noUserRes.status).toBe(401);
    expect(noUserRes.body.success).toBe(false);
    expect(noUserRes.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  // 3. User Profile
  it("3. GET /api/v1/auth/me -> returns 200 with valid token, 401 UNAUTHORIZED without token", async () => {
    // Valid token
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testUserId);
    expect(res.body.data.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.displayName).toBe(testDisplayName);

    // Missing token
    const noAuthRes = await request(app).get("/api/v1/auth/me");
    expect(noAuthRes.status).toBe(401);
    expect(noAuthRes.body.success).toBe(false);
    expect(noAuthRes.body.error.code).toBe("UNAUTHORIZED");

    // Invalid token
    const invalidTokenRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-jwt-token-xyz");

    expect(invalidTokenRes.status).toBe(401);
    expect(invalidTokenRes.body.success).toBe(false);
    expect(invalidTokenRes.body.error.code).toBe("UNAUTHORIZED");
  });

  // 4. Authenticated Exercise Grading & Progress Persistence
  it("4. Authenticated POST /api/v1/exercises/1.1/check -> grades exercise AND persists ExerciseAttempt + QuestionAttemptItems + updates Unit 1 LearningProgress", async () => {
    // Submit 1 correct answer (1.1-q1 = 'f') and 1 incorrect answer (1.1-q2 = 'wrong_ans')
    const res = await request(app)
      .post("/api/v1/exercises/1.1/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        answers: {
          "1.1-q1": "f",
          "1.1-q2": "wrong_ans",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exerciseId).toBe("1.1");
    expect(res.body.data.attemptId).toBeDefined();
    expect(res.body.data.unitProgressStatus).toBeDefined();

    // Verify ExerciseAttempt was created in DB
    const attemptInDb = await prisma.exerciseAttempt.findUnique({
      where: { id: res.body.data.attemptId },
      include: { items: true },
    });

    expect(attemptInDb).not.toBeNull();
    expect(attemptInDb?.userId).toBe(testUserId);
    expect(attemptInDb?.items.length).toBe(res.body.data.results.length);

    // Verify Unit 1 learning progress was set to 'in_progress'
    const unit1 = await prisma.unit.findFirst({ where: { unitNumber: 1 } });
    expect(unit1).not.toBeNull();

    const progressInDb = await prisma.learningProgress.findUnique({
      where: {
        userId_unitId: {
          userId: testUserId,
          unitId: unit1!.id,
        },
      },
    });

    expect(progressInDb).not.toBeNull();
    expect(progressInDb?.status).toBe("in_progress");
  });

  // 5. Manual Progress Update
  it("5. PUT /api/v1/progress/units/1 -> manually updates Unit 1 status to 'completed' and verifies completedAt is set", async () => {
    const putRes = await request(app)
      .put("/api/v1/progress/units/1")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "completed" });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.unitNumber).toBe(1);
    expect(putRes.body.data.status).toBe("completed");
    expect(putRes.body.data.completedAt).not.toBeNull();

    // Verify GET /api/v1/progress/units/1
    const getUnitRes = await request(app)
      .get("/api/v1/progress/units/1")
      .set("Authorization", `Bearer ${authToken}`);

    expect(getUnitRes.status).toBe(200);
    expect(getUnitRes.body.success).toBe(true);
    expect(getUnitRes.body.data.unitNumber).toBe(1);
    expect(getUnitRes.body.data.status).toBe("completed");
    expect(getUnitRes.body.data.attempts.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Progress Overview Statistics
  it("6. GET /api/v1/progress/overview -> returns accurate counts (completedCount: 1, totalAttempts >= 1, recentAttempts, unitProgressMap)", async () => {
    const res = await request(app)
      .get("/api/v1/progress/overview")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { units, exercises, questions, recentAttempts, unitProgressMap } = res.body.data;

    expect(units.completedCount).toBe(1);
    expect(units.totalUnits).toBe(145);
    expect(units.completionPercentage).toBeGreaterThan(0);

    expect(exercises.totalAttempts).toBeGreaterThanOrEqual(1);
    expect(exercises.uniqueExercisesAttempted).toBe(1);
    expect(exercises.totalExercises).toBe(549);

    expect(questions.totalAnswered).toBeGreaterThan(0);
    expect(questions.uniqueQuestionsAnswered).toBeGreaterThan(0);

    expect(recentAttempts.length).toBeGreaterThanOrEqual(1);
    expect(recentAttempts[0].unitNumber).toBe(1);
    expect(recentAttempts[0].exerciseId).toBe("1.1");

    expect(unitProgressMap.length).toBe(1);
    expect(unitProgressMap[0].unitNumber).toBe(1);
    expect(unitProgressMap[0].status).toBe("completed");
  });

  // 7. Mistakes Review & Resolution
  it("7. GET /api/v1/progress/mistakes -> returns unresolved mistakes; resolving via single question check clears mistake from list", async () => {
    // 1.1-q2 was answered with "wrong_ans" in test 4, so it should be in mistakes list
    const mistakesRes1 = await request(app)
      .get("/api/v1/progress/mistakes")
      .set("Authorization", `Bearer ${authToken}`);

    expect(mistakesRes1.status).toBe(200);
    expect(mistakesRes1.body.success).toBe(true);
    expect(mistakesRes1.body.data.length).toBeGreaterThanOrEqual(1);

    const mistake11q2 = mistakesRes1.body.data.find(
      (m: { questionId: string }) => m.questionId === "1.1-q2"
    );
    expect(mistake11q2).toBeDefined();
    expect(mistake11q2.exerciseId).toBe("1.1");
    expect(mistake11q2.unitNumber).toBe(1);
    expect(mistake11q2.lastStudentAnswer).toBe("wrong_ans");

    // Now resolve mistake by submitting correct answer for 1.1-q2 ("e") with Bearer token
    const correctCheckRes = await request(app)
      .post("/api/v1/questions/1.1-q2/check")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ answer: "e" });

    expect(correctCheckRes.status).toBe(200);
    expect(correctCheckRes.body.success).toBe(true);
    expect(correctCheckRes.body.data.isCorrect).toBe(true);

    // Verify 1.1-q2 is now cleared from the mistakes list!
    const mistakesRes2 = await request(app)
      .get("/api/v1/progress/mistakes")
      .set("Authorization", `Bearer ${authToken}`);

    expect(mistakesRes2.status).toBe(200);
    expect(mistakesRes2.body.success).toBe(true);

    const clearedMistake = mistakesRes2.body.data.find(
      (m: { questionId: string }) => m.questionId === "1.1-q2"
    );
    expect(clearedMistake).toBeUndefined();
  });
});
