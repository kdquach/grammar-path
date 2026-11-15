import { describe, it, expect } from "vitest";
import {
  simulateLearnerMastery,
  runAllSimulations,
} from "../scripts/simulate-mastery-profiles";
import { CURRENT_MASTERY_MODEL_VERSION } from "../src/services/mastery.service";

describe("Phase 3.2 — Learning Mastery & Review Engine Unit Tests", () => {
  it("enforces CURRENT_MASTERY_MODEL_VERSION as v1.0", () => {
    expect(CURRENT_MASTERY_MODEL_VERSION).toBe("v1.0");
  });

  describe("1. Evidence Sufficiency & State Transitions", () => {
    it("returns not_started when 0 questions have been attempted", () => {
      const result = simulateLearnerMastery([]);
      expect(result.masteryStatus).toBe("not_started");
      expect(result.weightedScore).toBeNull();
      expect(result.distinctCount).toBe(0);
    });

    it("caps 1-2 distinct questions as insufficient_data even if 100% correct", () => {
      const oneQuestion = simulateLearnerMastery([
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      expect(oneQuestion.masteryStatus).toBe("insufficient_data");
      expect(oneQuestion.weightedScore).toBe(100);

      const twoQuestions = simulateLearnerMastery([
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 1 },
        { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      expect(twoQuestions.masteryStatus).toBe("insufficient_data");
      expect(twoQuestions.weightedScore).toBe(100);
    });

    it("transitions to developing if >= 3 distinct questions have score < 70%", () => {
      const developing = simulateLearnerMastery([
        { questionId: "q1", isCorrect: false, isUnanswered: false, daysAgo: 2 },
        { questionId: "q2", isCorrect: false, isUnanswered: false, daysAgo: 1 },
        { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      expect(developing.distinctCount).toBe(3);
      expect(developing.masteryStatus).toBe("developing");
      expect(developing.weightedScore).toBeLessThan(70);
    });

    it("transitions to practicing if score is between 70% and 84%", () => {
      const practicing = simulateLearnerMastery([
        { questionId: "q1", isCorrect: false, isUnanswered: false, daysAgo: 3 },
        { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
        { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
        { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      expect(practicing.distinctCount).toBe(4);
      expect(practicing.masteryStatus).toBe("practicing");
      expect(practicing.weightedScore).toBeGreaterThanOrEqual(70);
      expect(practicing.weightedScore).toBeLessThan(85);
    });

    it("transitions to proficient if score >= 85% but distinct questions < 5", () => {
      const proficient = simulateLearnerMastery([
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 2 },
        { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 1 },
        { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
        { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      expect(proficient.distinctCount).toBe(4);
      expect(proficient.masteryStatus).toBe("proficient");
      expect(proficient.weightedScore).toBeGreaterThanOrEqual(85);
    });

    it("achieves mastered only when distinct questions >= 5, score >= 85%, and high confidence", () => {
      const mastered = simulateLearnerMastery(
        [
          { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 3 },
          { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
          { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 2 },
          { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 1 },
          { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        ],
        "high",
        14.0
      );
      expect(mastered.distinctCount).toBe(5);
      expect(mastered.masteryStatus).toBe("mastered");
      expect(mastered.weightedScore).toBeGreaterThanOrEqual(85);
    });
  });

  describe("2. Repeated Attempts Anti-Inflation Protection", () => {
    it("heavily discounts repeated retries of the exact same question", () => {
      const repeatedSpam = simulateLearnerMastery([
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      ]);
      // Even with 5 correct attempts, distinctCount is only 1!
      expect(repeatedSpam.distinctCount).toBe(1);
      expect(repeatedSpam.totalAttempts).toBe(5);
      expect(repeatedSpam.masteryStatus).toBe("insufficient_data");
    });
  });

  describe("3. Unanswered Blanks Handling", () => {
    it("excludes unanswered questions from accuracy and error evidence", () => {
      const partial = simulateLearnerMastery([
        { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 1 },
        { questionId: "q2", isCorrect: null as any, isUnanswered: true, daysAgo: 1 },
        { questionId: "q3", isCorrect: null as any, isUnanswered: true, daysAgo: 1 },
        { questionId: "q4", isCorrect: null as any, isUnanswered: true, daysAgo: 1 },
      ]);
      expect(partial.unansweredCount).toBe(3);
      expect(partial.distinctCount).toBe(1);
      expect(partial.weightedScore).toBe(100);
      expect(partial.masteryStatus).toBe("insufficient_data");
    });
  });

  describe("4. Spaced Repetition Retention Decay & Review Trigger", () => {
    it("decays retention and demotes mastered concept to needs_review when retention drops below 0.60", () => {
      const decayed = simulateLearnerMastery(
        [
          { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 40 },
          { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 40 },
          { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 39 },
          { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 39 },
          { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 38 },
        ],
        "high",
        14.0 // stability 14 days
      );
      // Days elapsed = 38, stability = 14 => R = e^(-38/14) = e^(-2.71) ~ 0.06 < 0.60
      expect(decayed.retentionEstimate).toBeLessThan(0.6);
      expect(decayed.masteryStatus).toBe("needs_review");
      expect(decayed.recommendationType).toBe("review");
    });
  });

  describe("5. Concept Mapping Confidence Protection", () => {
    it("caps concepts with needs_review mapping confidence from claiming mastered", () => {
      const unreviewed = simulateLearnerMastery(
        [
          { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 2 },
          { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
          { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
          { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 1 },
          { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 0 },
        ],
        "needs_review"
      );
      expect(unreviewed.masteryStatus).not.toBe("mastered");
    });
  });

  describe("6. Complete Simulation Suite Execution", () => {
    it("runs all 10 simulated learner profiles and all pass", () => {
      const results = runAllSimulations();
      expect(results).toHaveLength(10);
      for (const r of results) {
        expect(r.verdict).toBe("PASS");
      }
    });
  });
});

