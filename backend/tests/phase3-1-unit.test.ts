import { describe, it, expect } from "vitest";
import {
  deriveAttemptStatus,
  isEvaluatedAttemptItem,
  computeNullableAccuracy,
  computeNullableAverageScore,
  ALLOWED_QUESTION_CHECK_SOURCES,
} from "../src/utils/attempt-telemetry";
import {
  normalizeToeicPartLabel,
  normalizeToeicParts,
  TOEIC_ROADMAP_STAGES,
} from "../src/data/toeic-roadmap-data";

describe("Phase 3.1 Unit Tests: Attempt Telemetry & TOEIC Normalization", () => {
  it("deriveAttemptStatus maps attempted vs skipped consistently", () => {
    expect(deriveAttemptStatus({ hasAttempted: false, isCorrect: false })).toEqual({
      attemptStatus: "unanswered",
      isCorrect: null,
    });
    expect(deriveAttemptStatus({ hasAttempted: true, isCorrect: true })).toEqual({
      attemptStatus: "correct",
      isCorrect: true,
    });
    expect(deriveAttemptStatus({ hasAttempted: true, isCorrect: false })).toEqual({
      attemptStatus: "incorrect",
      isCorrect: false,
    });
  });

  it("isEvaluatedAttemptItem excludes unanswered/null while preserving empty-string evaluated answers", () => {
    expect(
      isEvaluatedAttemptItem({
        attemptStatus: "unanswered",
        isCorrect: null,
        studentAnswer: null,
      })
    ).toBe(false);

    // Empty string ("") can be an intentional zero-article answer submitted by learner
    expect(
      isEvaluatedAttemptItem({
        attemptStatus: "incorrect",
        isCorrect: false,
        studentAnswer: "",
      })
    ).toBe(true);

    // Legacy fallback before attemptStatus column exists on mock object
    expect(
      isEvaluatedAttemptItem({
        isCorrect: false,
        studentAnswer: null,
      })
    ).toBe(false);

    expect(
      isEvaluatedAttemptItem({
        attemptStatus: "correct",
        isCorrect: true,
        studentAnswer: "is driving",
      })
    ).toBe(true);
  });

  it("computeNullableAccuracy returns null on zero evaluated items and exact 1-decimal percentages otherwise", () => {
    expect(computeNullableAccuracy(0, 0)).toBeNull();
    expect(computeNullableAccuracy(5, 0)).toBeNull();
    expect(computeNullableAccuracy(0, 4)).toBe(0);
    expect(computeNullableAccuracy(2, 3)).toBe(66.7);
    expect(computeNullableAccuracy(1, 1)).toBe(100);
  });

  it("computeNullableAverageScore returns null when totalAttempts is 0", () => {
    expect(computeNullableAverageScore(null, 0)).toBeNull();
    expect(computeNullableAverageScore(0, 0)).toBeNull();
    expect(computeNullableAverageScore(85.34, 2)).toBe(85.3);
  });

  it("ALLOWED_QUESTION_CHECK_SOURCES restricts manual POST /questions/:id/check sources", () => {
    expect(ALLOWED_QUESTION_CHECK_SOURCES).toContain("single_check");
    expect(ALLOWED_QUESTION_CHECK_SOURCES).toContain("mistake_retry");
    expect(ALLOWED_QUESTION_CHECK_SOURCES).not.toContain("adaptive_quiz");
  });

  it("normalizeToeicPartLabel strips verbose prefixes cleanly and covers all 145 units", () => {
    expect(normalizeToeicPartLabel("Listening Part 2")).toBe("Part 2");
    expect(normalizeToeicPartLabel("Reading Part 5")).toBe("Part 5");
    expect(normalizeToeicParts(["Listening Part 2", "Reading Part 5", "Part 5"])).toEqual([
      "Part 2",
      "Part 5",
    ]);

    const seen = new Set<number>();
    for (const stage of TOEIC_ROADMAP_STAGES) {
      for (const mod of stage.modules) {
        for (const p of mod.toeicParts) {
          expect(p).toMatch(/^Part \d$/);
        }
        for (const u of mod.units) {
          seen.add(u.unitNumber);
          for (const p of u.toeicParts) {
            expect(p).toMatch(/^Part \d$/);
          }
        }
      }
    }
    expect(seen.size).toBe(145);
  });
});

