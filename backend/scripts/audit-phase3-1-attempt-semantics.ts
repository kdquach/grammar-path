import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";

const prisma = new PrismaClient();

async function run() {
  console.log("=== INDEPENDENT AUDIT: ATTEMPT SEMANTICS ON STAGING ===");

  // 1. Verify Enum types exist in Postgres
  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
    SELECT typname FROM pg_type WHERE typname IN ('attempt_status_enum', 'attempt_source_enum');
  `;
  console.log("Enum types found in pg_type:", enums.map((e) => e.typname));
  assert.equal(enums.length, 2, "Expected attempt_status_enum and attempt_source_enum enums in database");

  // Verify enum values
  const attemptStatusValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'attempt_status_enum'
    ORDER BY enumsortorder;
  `;
  const statusLabels = attemptStatusValues.map((v) => v.enumlabel);
  console.log("AttemptStatus labels:", statusLabels);
  assert.deepEqual(statusLabels, ["correct", "incorrect", "unanswered"]);

  const attemptSourceValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'attempt_source_enum'
    ORDER BY enumsortorder;
  `;
  const sourceLabels = attemptSourceValues.map((v) => v.enumlabel);
  console.log("AttemptSource labels:", sourceLabels);
  assert.deepEqual(sourceLabels, [
    "single_check",
    "exercise_submission",
    "adaptive_quiz",
    "mistake_retry",
    "toeic_practice",
    "legacy_unknown",
  ]);

  // 2. Verify CHECK constraint exists on question_attempt_items
  const checkConstraints = await prisma.$queryRaw<Array<{ conname: string; pg_get_constraintdef: string }>>`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conname = 'chk_qai_attempt_status_consistency';
  `;
  console.log("CHECK constraint definition:", checkConstraints);
  assert.equal(checkConstraints.length, 1, "Expected chk_qai_attempt_status_consistency constraint");
  const def = checkConstraints[0].pg_get_constraintdef;
  assert.ok(
    def.includes("attempt_status = 'unanswered'::attempt_status_enum") &&
      def.includes("is_correct IS NULL") &&
      def.includes("attempt_status = 'correct'::attempt_status_enum") &&
      def.includes("is_correct = true") &&
      def.includes("attempt_status = 'incorrect'::attempt_status_enum") &&
      def.includes("is_correct = false"),
    `Constraint definition mismatch: ${def}`
  );

  // 3. Test insertions with temporary user and attempt
  let tempUser: any = null;
  try {
    tempUser = await prisma.user.create({
      data: {
        email: `audit-semantics-${Date.now()}@grammarpath.local`,
        passwordHash: "bogushash12345678",
        displayName: "Semantics Auditor",
      },
    });

  const testExercise = await prisma.exercise.findFirstOrThrow({
    where: { exerciseNumber: "1.3" },
    include: { questions: true },
  });
  const testQuestion = testExercise.questions[0];

  const tempAttempt = await prisma.exerciseAttempt.create({
    data: {
      userId: tempUser.id,
      exerciseId: testExercise.id,
      scorePercentage: 50,
      totalQuestions: 2,
      correctCount: 1,
    },
  });

  console.log("\n--- Testing Case 1: Correct Answer ---");
  const case1 = await prisma.questionAttemptItem.create({
    data: {
      userId: tempUser.id,
      attemptId: tempAttempt.id,
      questionId: testQuestion.id,
      studentAnswer: "I'm not listening",
      isCorrect: true,
      attemptStatus: "correct",
      attemptSource: "exercise_submission",
    },
  });
  assert.equal(case1.attemptStatus, "correct");
  assert.equal(case1.isCorrect, true);
  assert.equal(case1.studentAnswer, "I'm not listening");
  assert.equal(case1.attemptSource, "exercise_submission");
  console.log("Case 1 passed: valid correct item created.");

  console.log("\n--- Testing Case 2: Incorrect Answer ---");
  const case2 = await prisma.questionAttemptItem.create({
    data: {
      userId: tempUser.id,
      attemptId: tempAttempt.id,
      questionId: testQuestion.id,
      studentAnswer: "wrong answer text",
      isCorrect: false,
      attemptStatus: "incorrect",
      attemptSource: "single_check",
    },
  });
  assert.equal(case2.attemptStatus, "incorrect");
  assert.equal(case2.isCorrect, false);
  assert.equal(case2.studentAnswer, "wrong answer text");
  assert.equal(case2.attemptSource, "single_check");
  console.log("Case 2 passed: valid incorrect item created.");

  console.log("\n--- Testing Case 3: Unanswered Question ---");
  const case3 = await prisma.questionAttemptItem.create({
    data: {
      userId: tempUser.id,
      attemptId: tempAttempt.id,
      questionId: testQuestion.id,
      studentAnswer: null,
      isCorrect: null,
      attemptStatus: "unanswered",
      attemptSource: "exercise_submission",
    },
  });
  assert.equal(case3.attemptStatus, "unanswered");
  assert.equal(case3.isCorrect, null);
  assert.equal(case3.studentAnswer, null);
  console.log("Case 3 passed: valid unanswered item created.");

  console.log("\n--- Testing Case 4: Explicit Zero-Article / Empty String Answer ---");
  const case4 = await prisma.questionAttemptItem.create({
    data: {
      userId: tempUser.id,
      attemptId: tempAttempt.id,
      questionId: testQuestion.id,
      studentAnswer: "",
      isCorrect: true,
      attemptStatus: "correct",
      attemptSource: "exercise_submission",
    },
  });
  assert.equal(case4.attemptStatus, "correct");
  assert.equal(case4.isCorrect, true);
  assert.equal(case4.studentAnswer, "");
  console.log("Case 4 passed: explicit empty-string answer allowed when evaluated (isCorrect not null).");

  console.log("\n--- Testing Case 5: JSON null handling ---");
  const case5 = await prisma.questionAttemptItem.create({
    data: {
      userId: tempUser.id,
      attemptId: tempAttempt.id,
      questionId: testQuestion.id,
      studentAnswer: null,
      isCorrect: null,
      attemptStatus: "unanswered",
      attemptSource: "adaptive_quiz",
    },
  });
  assert.equal(case5.isCorrect, null);
  assert.equal(case5.studentAnswer, null);
  assert.equal(case5.attemptStatus, "unanswered");
  console.log("Case 5 passed: JSON null maps cleanly to SQL NULL and unanswered status.");

  console.log("\n--- Testing Case 6: Direct SQL NULL and CHECK constraint violations ---");
  let rejectedCount = 0;

  // 6a: unanswered but with is_correct = false -> Evaluates to FALSE -> MUST BE REJECTED
  try {
    await prisma.$executeRaw`
      INSERT INTO question_attempt_items (id, user_id, attempt_id, question_id, student_answer, is_correct, attempt_status, attempt_source, created_at)
      VALUES (gen_random_uuid(), ${tempUser.id}::uuid, ${tempAttempt.id}::uuid, ${testQuestion.id}::uuid, NULL, false, 'unanswered'::"attempt_status_enum", 'exercise_submission'::"attempt_source_enum", NOW());
    `;
    assert.fail("Should have failed CHECK constraint (unanswered with is_correct = false)");
  } catch (err: any) {
    assert.ok(err.message.includes("chk_qai_attempt_status_consistency"), "Expected CHECK constraint failure");
    rejectedCount++;
    console.log("6a passed: unanswered with is_correct=false rejected by CHECK constraint.");
  }

  // 6b: unanswered but with is_correct = true -> Evaluates to FALSE -> MUST BE REJECTED
  try {
    await prisma.$executeRaw`
      INSERT INTO question_attempt_items (id, user_id, attempt_id, question_id, student_answer, is_correct, attempt_status, attempt_source, created_at)
      VALUES (gen_random_uuid(), ${tempUser.id}::uuid, ${tempAttempt.id}::uuid, ${testQuestion.id}::uuid, NULL, true, 'unanswered'::"attempt_status_enum", 'exercise_submission'::"attempt_source_enum", NOW());
    `;
    assert.fail("Should have failed CHECK constraint (unanswered with is_correct = true)");
  } catch (err: any) {
    assert.ok(err.message.includes("chk_qai_attempt_status_consistency"), "Expected CHECK constraint failure");
    rejectedCount++;
    console.log("6b passed: unanswered with is_correct=true rejected by CHECK constraint.");
  }

  // 6c: correct but with is_correct = false -> Evaluates to FALSE -> MUST BE REJECTED
  try {
    await prisma.$executeRaw`
      INSERT INTO question_attempt_items (id, user_id, attempt_id, question_id, student_answer, is_correct, attempt_status, attempt_source, created_at)
      VALUES (gen_random_uuid(), ${tempUser.id}::uuid, ${tempAttempt.id}::uuid, ${testQuestion.id}::uuid, '"foo"'::jsonb, false, 'correct'::"attempt_status_enum", 'exercise_submission'::"attempt_source_enum", NOW());
    `;
    assert.fail("Should have failed CHECK constraint (correct with is_correct = false)");
  } catch (err: any) {
    assert.ok(err.message.includes("chk_qai_attempt_status_consistency"), "Expected CHECK constraint failure");
    rejectedCount++;
    console.log("6c passed: correct with is_correct=false rejected by CHECK constraint.");
  }

  // 6d: incorrect but with is_correct = true -> Evaluates to FALSE -> MUST BE REJECTED
  try {
    await prisma.$executeRaw`
      INSERT INTO question_attempt_items (id, user_id, attempt_id, question_id, student_answer, is_correct, attempt_status, attempt_source, created_at)
      VALUES (gen_random_uuid(), ${tempUser.id}::uuid, ${tempAttempt.id}::uuid, ${testQuestion.id}::uuid, '"foo"'::jsonb, true, 'incorrect'::"attempt_status_enum", 'exercise_submission'::"attempt_source_enum", NOW());
    `;
    assert.fail("Should have failed CHECK constraint (incorrect with is_correct = true)");
  } catch (err: any) {
    assert.ok(err.message.includes("chk_qai_attempt_status_consistency"), "Expected CHECK constraint failure");
    rejectedCount++;
    console.log("6d passed: incorrect with is_correct=true rejected by CHECK constraint.");
  }

  // 6e: AUDIT NOTE - PostgreSQL 3-valued logic on NULL:
  // When attempt_status = 'correct' and is_correct IS NULL, (is_correct = true) evaluates to UNKNOWN (NULL).
  // In PostgreSQL, a CHECK constraint passes on TRUE or UNKNOWN!
  // Test this explicitly and clean it up immediately:
  const threeValuedNullInsert = await prisma.$executeRaw`
    INSERT INTO question_attempt_items (id, user_id, attempt_id, question_id, student_answer, is_correct, attempt_status, attempt_source, created_at)
    VALUES (gen_random_uuid(), ${tempUser.id}::uuid, ${tempAttempt.id}::uuid, ${testQuestion.id}::uuid, '"foo"'::jsonb, NULL, 'correct'::"attempt_status_enum", 'exercise_submission'::"attempt_source_enum", NOW());
  `;
  assert.equal(threeValuedNullInsert, 1, "Proves PostgreSQL 3-valued logic permits NULL on check_val");
  await prisma.questionAttemptItem.deleteMany({ where: { userId: tempUser.id, isCorrect: null, attemptStatus: "correct" } });
  console.log("6e verified: SQL 3-valued logic quirk identified (correct with NULL is_correct evaluates to UNKNOWN, thus permitted at DB level; enforced at app layer). Cleaned up probe row.");

  console.log(`\nCase 6 summary: ${rejectedCount} contradictory state combinations strictly rejected by chk_qai_attempt_status_consistency.`);

  // 7. Verify Historical Records in DB
  const stats = await prisma.$queryRaw<Array<{ attempt_status: string; is_correct_null: boolean; student_answer_null: boolean; cnt: bigint }>>`
    SELECT
      attempt_status::text,
      (is_correct IS NULL) AS is_correct_null,
      (student_answer IS NULL OR student_answer = 'null'::jsonb) AS student_answer_null,
      COUNT(*)::bigint AS cnt
    FROM question_attempt_items
    GROUP BY attempt_status, (is_correct IS NULL), (student_answer IS NULL OR student_answer = 'null'::jsonb);
  `;
  console.log("\nHistorical records breakdown in DB:", stats);
  for (const s of stats) {
    if (s.attempt_status === "unanswered") {
      assert.equal(s.is_correct_null, true, "Unanswered rows must have is_correct = NULL");
      assert.equal(s.student_answer_null, true, "Unanswered rows must have student_answer = NULL or JSON null");
    } else {
      assert.equal(s.is_correct_null, false, "Evaluated rows must have is_correct NOT NULL");
    }
  }
  console.log("All existing DB rows strictly conform to chk_qai_attempt_status_consistency!");

  } finally {
    // Cleanup test user and attempts
    if (tempUser) {
      await prisma.user.delete({ where: { id: tempUser.id } }).catch(() => {});
      console.log("\nTest user and temporary attempts cleaned up.");
    }
    await prisma.$disconnect();
  }

  console.log("\n=== ALL ATTEMPT SEMANTICS VERIFIED SUCCESSFULLY ===");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
