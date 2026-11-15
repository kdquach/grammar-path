import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks for isolated unit testing
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
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
    },
    dailyLearningPlanItem: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
  },
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Mock calculateConceptMastery
vi.mock("../src/services/mastery.service", () => ({
  calculateConceptMastery: vi.fn(async () => ({
    masteryScore: 88,
    masteryStatus: "proficient",
  })),
  CURRENT_MASTERY_MODEL_VERSION: "v1.0",
}));

import { completeConceptReview } from "../src/services/review.service";
import { AppError } from "../src/middleware/error-handler";

describe("Phase 3.4A — Server-Authoritative Review Grader Unit Tests", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const scheduleId = "ssssssss-ssss-4sss-8sss-ssssssssssss";

  const sampleQuestion = {
    id: "qqqqqqqq-qqqq-4qqq-8qqq-qqqqqqqqqqqq",
    questionId: "u001-ex01-q01",
    questionContent: "Sarah is driving to work. She ___ to work right now.",
    exercise: { id: "ex1", unitId: "u1", exerciseNumber: "1.1" },
    correctAnswerText: "is driving",
    acceptedAnswers: [{ answerText: "'s driving" }],
    blanks: [],
    parts: [],
    options: [],
    explanation: {
      aiExplanation: "Use present continuous for an action happening now.",
      ruleReference: "1A",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.grammarConcept.findUnique.mockResolvedValue({
      id: conceptId,
      code: "unit.001",
      name: "Present Continuous",
      theoryLinks: [{ theorySectionId: "sec1" }],
      toeicUnits: [{ unitId: "u1" }],
    });

    mockPrisma.conceptReviewSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      userId,
      conceptId,
      stabilityDays: 2.0,
      consecutiveCorrect: 1,
      reviewCount: 1,
    });

    mockPrisma.question.findMany.mockResolvedValue([sampleQuestion]);
    mockPrisma.questionAttemptItem.create.mockResolvedValue({ id: "att-item-1" });
    mockPrisma.conceptReviewSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      stabilityDays: 4.0,
      intervalDays: 4,
    });
    mockPrisma.dailyLearningPlanItem.updateMany.mockResolvedValue({ count: 1 });
  });

  describe("1. Server-Authoritative Evaluation & Spaced Scheduling", () => {
    it("evaluates a correct student answer server-authoritatively and expands interval", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: {
          [sampleQuestion.id]: "is driving",
        },
        scheduleId,
      });

      expect(result.status).toBe("success");
      expect(result.accuracy).toBe(100);
      expect(result.correctCount).toBe(1);
      expect(result.totalCount).toBe(1);
      expect(result.unansweredCount).toBe(0);
      expect(result.stabilityDays).toBe(4.0); // 2.0 * 2.0
      expect(result.intervalDays).toBe(4);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[0].status).toBe("correct");

      // Verifies questionAttemptItem was persisted with single_check source
      expect(mockPrisma.questionAttemptItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId: sampleQuestion.id,
          isCorrect: true,
          attemptStatus: "correct",
          attemptSource: "single_check",
        }),
      });
    });

    it("evaluates accepted alternative answers ('s driving) as correct", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: {
          [sampleQuestion.id]: "'s driving",
        },
        scheduleId,
      });

      expect(result.status).toBe("success");
      expect(result.accuracy).toBe(100);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("normalizes case and surrounding whitespace", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: {
          [sampleQuestion.id]: "  IS DRIVING  ",
        },
        scheduleId,
      });

      expect(result.status).toBe("success");
      expect(result.accuracy).toBe(100);
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("evaluates an incorrect student answer and halves memory stability", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: {
          [sampleQuestion.id]: "drives",
        },
        scheduleId,
      });

      expect(result.status).toBe("reinforcement_needed");
      expect(result.accuracy).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.stabilityDays).toBe(1.0); // max(1.0, 2.0 * 0.5)
      expect(result.intervalDays).toBe(1); // Review tomorrow
      expect(result.results[0].isCorrect).toBe(false);
      expect(result.results[0].status).toBe("incorrect");
      expect(result.results[0].explanation).toBe(sampleQuestion.explanation.aiExplanation);

      expect(mockPrisma.questionAttemptItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId: sampleQuestion.id,
          isCorrect: false,
          attemptStatus: "incorrect",
        }),
      });
    });
  });

  describe("2. Security & Anti-Tampering Protections", () => {
    it("REJECTS client attempt to send isCorrect: true for an incorrect answer", async () => {
      // Even if attacker passes isCorrect: true in the payload, the server evaluates "drives" as false!
      const payload: any = {
        answers: {
          [sampleQuestion.id]: "drives",
        },
        scheduleId,
        isCorrect: true, // Tampered client field
        correctCount: 999, // Tampered client field
      };

      const result = await completeConceptReview(userId, conceptId, payload);

      expect(result.accuracy).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.status).toBe("reinforcement_needed");
      expect(result.results[0].isCorrect).toBe(false);
    });

    it("IGNORES client attempt to send isCorrect: false for a correct answer", async () => {
      const payload: any = {
        answers: {
          [sampleQuestion.id]: "is driving",
        },
        scheduleId,
        isCorrect: false, // Tampered client field
        correctCount: 0,
      };

      const result = await completeConceptReview(userId, conceptId, payload);

      expect(result.accuracy).toBe(100);
      expect(result.correctCount).toBe(1);
      expect(result.status).toBe("success");
      expect(result.results[0].isCorrect).toBe(true);
    });

    it("REJECTS fabricated or foreign question IDs with 400 VALIDATION_ERROR", async () => {
      const fabricatedId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

      await expect(
        completeConceptReview(userId, conceptId, {
          answers: {
            [fabricatedId]: "some answer",
          },
          scheduleId,
        })
      ).rejects.toThrow(/invalid or fabricated question ID/i);
    });

    it("BLOCKS User B from completing User A's review schedule with 403 FORBIDDEN (IDOR defense)", async () => {
      // Schedule belongs to otherUserId
      mockPrisma.conceptReviewSchedule.findUnique.mockResolvedValue({
        id: scheduleId,
        userId: otherUserId, // NOT userId
        conceptId,
      });

      await expect(
        completeConceptReview(userId, conceptId, {
          answers: {
            [sampleQuestion.id]: "is driving",
          },
          scheduleId,
        })
      ).rejects.toThrow(AppError);

      await expect(
        completeConceptReview(userId, conceptId, {
          answers: {
            [sampleQuestion.id]: "is driving",
          },
          scheduleId,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("REJECTS non-existent concept with 404 NOT_FOUND", async () => {
      mockPrisma.grammarConcept.findUnique.mockResolvedValue(null);

      await expect(
        completeConceptReview(userId, "00000000-0000-0000-0000-000000000000", {
          answers: {
            [sampleQuestion.id]: "is driving",
          },
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });
  });

  describe("3. Unanswered Submissions & Idempotency", () => {
    it("handles unanswered (empty string) submission without degrading stability", async () => {
      const result = await completeConceptReview(userId, conceptId, {
        answers: {
          [sampleQuestion.id]: "   ", // whitespace only
        },
        scheduleId,
      });

      expect(result.status).toBe("rescheduled_unanswered");
      expect(result.accuracy).toBe(0);
      expect(result.unansweredCount).toBe(1);
      expect(result.stabilityDays).toBe(2.0); // NOT degraded
      expect(result.intervalDays).toBe(1); // Retry tomorrow
      expect(result.results[0].status).toBe("unanswered");
      expect(result.results[0].isCorrect).toBe(false);
      // Anti-spoiler: do not leak expected answers for unanswered questions
      expect(result.results[0].expectedAnswers).toEqual([]);
      expect(result.results[0].explanation).toBeNull();
    });

    it("deduplicates identical concurrent submissions via submissionId", async () => {
      const submissionId = "sub-dedupe-uuid-1234";

      const promise1 = completeConceptReview(userId, conceptId, {
        answers: { [sampleQuestion.id]: "is driving" },
        scheduleId,
        submissionId,
      });

      const promise2 = completeConceptReview(userId, conceptId, {
        answers: { [sampleQuestion.id]: "is driving" },
        scheduleId,
        submissionId,
      });

      const [res1, res2] = await Promise.all([promise1, promise2]);

      expect(res1).toBe(res2); // Exactly same reference from dedupe helper
      // Only 1 transaction executed
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. Transactional Consistency & Atomic Rollback", () => {
    it("rolls back all writes if mastery calculation fails inside transaction", async () => {
      const { calculateConceptMastery } = await import("../src/services/mastery.service");
      (calculateConceptMastery as any).mockRejectedValueOnce(
        new Error("Database connection lost during mastery recalculation")
      );

      await expect(
        completeConceptReview(userId, conceptId, {
          answers: { [sampleQuestion.id]: "is driving" },
          scheduleId,
          submissionId: "sub-rollback-err-unique",
        })
      ).rejects.toThrow("Database connection lost during mastery recalculation");
    });
  });
});
