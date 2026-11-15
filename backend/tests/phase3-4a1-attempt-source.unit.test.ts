import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveAttemptStatus,
  isEvaluatedAttemptItem,
  ALLOWED_QUESTION_CHECK_SOURCES,
  CanonicalAttemptSource,
} from "../src/utils/attempt-telemetry";
import { completeConceptReview } from "../src/services/review.service";

// Mock dependencies for completeConceptReview
vi.mock("../src/lib/prisma", () => {
  const mockPrisma = {
    grammarConcept: {
      findUnique: vi.fn(),
    },
    conceptReviewSchedule: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    questionAttemptItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dailyLearningPlanItem: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: any) => callback(mockPrisma)),
    $queryRaw: vi.fn(),
  };
  return { default: mockPrisma };
});

vi.mock("../src/services/mastery.service", () => ({
  calculateConceptMastery: vi.fn().mockResolvedValue({
    conceptId: "test-concept-id",
    masteryScore: 85,
    retentionScore: 90,
    masteryStatus: "mastered",
  }),
}));

import prisma from "../src/lib/prisma";

const mockPrisma = prisma as any;

describe("Phase 3.4A.1: AttemptSource Semantics & Provenance Verification", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const conceptId = "22222222-2222-2222-2222-222222222222";
  const scheduleId = "33333333-3333-3333-3333-333333333333";

  const sampleQuestion = {
    id: "44444444-4444-4444-4444-444444444444",
    questionId: "1.1-q1",
    questionContent: "Look! That man [___] (drive) too fast.",
    correctAnswerText: "is driving",
    answerKey: {
      answerText: "is driving",
    },
    acceptedAnswers: [
      { id: "acc-1", answerText: "'s driving", displayOrder: 1 },
    ],
    explanation: {
      aiExplanation: "Use present continuous for an action happening now.",
      ruleReference: "1A",
    },
    blanks: [],
    parts: [],
    options: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.grammarConcept.findUnique.mockResolvedValue({
      id: conceptId,
      code: "unit.001",
      name: "Present continuous",
      theoryLinks: [],
      toeicUnits: [],
    });

    mockPrisma.conceptReviewSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      userId,
      conceptId,
      stabilityDays: 2.0,
      intervalDays: 2,
      consecutiveCorrect: 1,
      reviewCount: 1,
      reviewState: "due",
      dueAt: new Date(Date.now() - 3600000),
    });

    mockPrisma.question.findMany.mockResolvedValue([sampleQuestion]);

    mockPrisma.questionAttemptItem.create.mockImplementation(async ({ data }: any) => ({
      id: "attempt-" + Math.random().toString(36).substring(7),
      ...data,
    }));

    mockPrisma.conceptReviewSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      userId,
      conceptId,
      stabilityDays: 4.0,
      intervalDays: 4,
    });

    mockPrisma.dailyLearningPlanItem.updateMany.mockResolvedValue({ count: 1 });
  });

  describe("1. Review Center AttemptSource & Provenance", () => {
    it("persists Review Center submissions with AttemptSource 'single_check' (NOT 'mistake_retry')", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: { [sampleQuestion.id]: "is driving" },
        scheduleId,
        submissionId: "sub-review-1",
      });

      expect(result.status).toBe("success");
      expect(result.correctCount).toBe(1);

      // Explicitly assert AttemptSource is 'single_check'
      expect(mockPrisma.questionAttemptItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId: sampleQuestion.id,
          attemptSource: "single_check",
          attemptStatus: "correct",
          isCorrect: true,
        }),
      });

      // Verify that 'mistake_retry' is NEVER used for general concept reviews
      expect(mockPrisma.questionAttemptItem.create).not.toHaveBeenCalledWith({
        data: expect.objectContaining({
          attemptSource: "mistake_retry",
        }),
      });
    });

    it("evaluates unanswered items as 'unanswered' with isCorrect: false and studentAnswer: null", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: { [sampleQuestion.id]: "" },
        scheduleId,
        submissionId: "sub-review-empty",
      });

      expect(result.status).toBe("rescheduled_unanswered");
      expect(result.unansweredCount).toBe(1);
      expect(result.accuracy).toBe(0);
      expect(result.results[0].status).toBe("unanswered");
      expect(result.results[0].studentAnswer).toBeNull();
    });
  });

  describe("2. AttemptStatus & AttemptSource Telemetry Semantics", () => {
    it("deriveAttemptStatus guarantees unattempted questions have attemptStatus 'unanswered' and isCorrect null", () => {
      const unattempted = deriveAttemptStatus({ hasAttempted: false, isCorrect: false });
      expect(unattempted.attemptStatus).toBe("unanswered");
      expect(unattempted.isCorrect).toBeNull();
      // Crucial: unattempted items must NEVER be classified as incorrect
      expect(unattempted.isCorrect).not.toBe(false);
    });

    it("deriveAttemptStatus maps attempted items to correct and incorrect accurately", () => {
      const correct = deriveAttemptStatus({ hasAttempted: true, isCorrect: true });
      expect(correct.attemptStatus).toBe("correct");
      expect(correct.isCorrect).toBe(true);

      const incorrect = deriveAttemptStatus({ hasAttempted: true, isCorrect: false });
      expect(incorrect.attemptStatus).toBe("incorrect");
      expect(incorrect.isCorrect).toBe(false);
    });

    it("isEvaluatedAttemptItem filters out unanswered and unattempted items from accuracy calculation", () => {
      expect(isEvaluatedAttemptItem({ attemptStatus: "unanswered", isCorrect: null })).toBe(false);
      expect(isEvaluatedAttemptItem({ attemptStatus: "correct", isCorrect: true })).toBe(true);
      expect(isEvaluatedAttemptItem({ attemptStatus: "incorrect", isCorrect: false })).toBe(true);
    });

    it("ALLOWED_QUESTION_CHECK_SOURCES explicitly delineates single checks from mistake retries", () => {
      expect(ALLOWED_QUESTION_CHECK_SOURCES).toEqual(["single_check", "mistake_retry"]);
      // Whole exercise submissions and adaptive quizzes are NOT allowed on manual question check endpoint
      expect(ALLOWED_QUESTION_CHECK_SOURCES).not.toContain("exercise_submission");
      expect(ALLOWED_QUESTION_CHECK_SOURCES).not.toContain("adaptive_quiz");
    });
  });

  describe("3. Idempotency & Deduplicated Submissions", () => {
    it("deduplicates concurrent review submissions with identical submissionId without duplicate attempt items", async () => {
      const submissionId = "sub-concurrent-dedupe-test";

      const [res1, res2] = await Promise.all([
        completeConceptReview(userId, conceptId, {
          answers: { [sampleQuestion.id]: "is driving" },
          scheduleId,
          submissionId,
        }),
        completeConceptReview(userId, conceptId, {
          answers: { [sampleQuestion.id]: "is driving" },
          scheduleId,
          submissionId,
        }),
      ]);

      expect(res1.status).toBe("success");
      expect(res2.status).toBe("success");
      // Exactly 1 database transaction and 1 QuestionAttemptItem created
      expect(mockPrisma.questionAttemptItem.create).toHaveBeenCalledTimes(1);
    });
  });
});

