import { describe, it, expect, beforeEach } from "vitest";
import { evaluateQuestion, isEmptyStudentAnswer } from "../src/utils/grader";
import { formatExercise, formatQuestionDetail } from "../src/utils/formatters";
import { assertNoSpoilerQueryParams } from "../src/controllers/exercises.controller";
import { runDeduplicatedSubmission, stableSerialize } from "../src/utils/idempotency";
import {
  buildUnitGroundedDynamicQuestions,
  generateToeicQuestionsForUnit,
  rebalanceBatchOptionDistribution,
  ToeicQuestion,
} from "../src/services/toeic-generator.service";

describe("Phase 2.1 Offline Unit Tests (Grading, Anti-Spoiler, Idempotency & TOEIC Generator)", () => {
  describe("1. Grader & Empty Answer Detection", () => {
    it("identifies empty answers across strings, arrays, and objects", () => {
      expect(isEmptyStudentAnswer(undefined)).toBe(true);
      expect(isEmptyStudentAnswer(null)).toBe(true);
      expect(isEmptyStudentAnswer("")).toBe(true);
      expect(isEmptyStudentAnswer("   ")).toBe(true);
      expect(isEmptyStudentAnswer([])).toBe(true);
      expect(isEmptyStudentAnswer(["", "  "])).toBe(true);
      expect(isEmptyStudentAnswer({})).toBe(true);
      expect(isEmptyStudentAnswer({ "1": " " })).toBe(true);

      expect(isEmptyStudentAnswer("am going")).toBe(false);
      expect(isEmptyStudentAnswer(["No-one", ""])).toBe(false);
      expect(isEmptyStudentAnswer({ p1: "done" })).toBe(false);
    });

    it("grades array/multi-blank questions cleanly with string arrays or indexed records", () => {
      const multiBlankQ = {
        questionId: "86.4-q9",
        correctAnswerType: "array",
        correctAnswerText: "No-one / anyone",
        acceptedAnswers: [{ answerText: "No-one / anyone" }],
        options: [],
        parts: [],
        blanks: [
          {
            id: "b1",
            blankIndex: 1,
            correctAnswerText: "No-one",
            acceptedAnswers: [{ answerText: "no one" }],
          },
          {
            id: "b2",
            blankIndex: 2,
            correctAnswerText: "anyone",
            acceptedAnswers: [{ answerText: "anybody" }],
          },
        ],
        explanation: { aiExplanation: "Giải thích", ruleReference: "86B" },
      };

      expect(evaluateQuestion(multiBlankQ, ["No-one", "anyone"]).isCorrect).toBe(true);
      expect(evaluateQuestion(multiBlankQ, ["no one", "anybody"]).isCorrect).toBe(true);
      expect(evaluateQuestion(multiBlankQ, ["No-one", "someone"]).isCorrect).toBe(false);
      expect(evaluateQuestion(multiBlankQ, { "1": "No-one", "2": "anyone" }).isCorrect).toBe(true);
    });
  });

  describe("2. Anti-Spoiler Query Guard & Formatters", () => {
    it("blocks ?includeAnswers=true and equivalent spoiler query parameters with 403 SPOILER_FORBIDDEN", () => {
      for (const key of [
        "includeAnswers",
        "includeSolutions",
        "showAnswers",
        "revealAnswers",
        "withAnswers",
      ]) {
        expect(() => assertNoSpoilerQueryParams({ [key]: "true" })).toThrowError(
          /disabled/i
        );
        expect(() => assertNoSpoilerQueryParams({ [key]: "1" })).toThrowError(
          /disabled/i
        );
      }
      expect(() => assertNoSpoilerQueryParams({ includeAnswers: "false" })).not.toThrow();
      expect(() => assertNoSpoilerQueryParams({})).not.toThrow();
    });

    it("formatExercise(ex, false) and formatQuestionDetail(q, false) never expose answer keys", () => {
      const rawEx = {
        id: "ex-1",
        exerciseId: "1.1",
        exerciseNumber: "1.1",
        questionType: "fill_blank",
        instruction: "Complete",
        hasVisualContext: false,
        displayOrder: 1,
        wordBankItems: [],
        questions: [
          {
            id: "q-2",
            questionId: "1.1-q2",
            questionContent: "Test prompt",
            isExample: false,
            hasVisualContext: false,
            displayOrder: 2,
            correctAnswerType: "string",
            correctAnswerText: "SECRET",
            correctAnswerArray: ["SECRET"],
            acceptedAnswers: [{ answerText: "SECRET" }],
            options: [],
            blanks: [
              {
                blankIndex: 1,
                correctAnswerText: "SECRET_BLANK",
                acceptedAnswers: [{ answerText: "SECRET_BLANK" }],
              },
            ],
            parts: [
              {
                partId: "p1",
                questionContent: "Part 1",
                displayOrder: 1,
                correctAnswerText: "SECRET_PART",
                acceptedAnswers: [{ answerText: "SECRET_PART" }],
              },
            ],
            exercise: {
              exerciseId: "1.1",
              exerciseNumber: "1.1",
              questionType: "fill_blank",
              unit: { unitNumber: 1, title: "Present continuous" },
            },
            sourcePages: [],
          },
        ],
      };

      const formattedEx = formatExercise(rawEx, false);
      const q = formattedEx.questions[0];
      expect(q.correctAnswerText).toBeUndefined();
      expect(q.acceptedAnswers).toBeUndefined();
      expect(q.blanks[0].correctAnswerText).toBeUndefined();
      expect(q.parts[0].correctAnswerText).toBeUndefined();

      const formattedDetail = formatQuestionDetail(rawEx.questions[0], false);
      expect(formattedDetail.correctAnswerText).toBeUndefined();
      expect(formattedDetail.acceptedAnswers).toBeUndefined();
    });
  });

  describe("3. Submission Idempotency Helper", () => {
    it("deduplicates concurrent in-flight submissions with the same key and serializes objects stably", async () => {
      expect(stableSerialize({ b: 2, a: 1 })).toBe(stableSerialize({ a: 1, b: 2 }));

      let dbWrites = 0;
      const key = `unit-test-dedupe-${Date.now()}`;
      const results = await Promise.all([
        runDeduplicatedSubmission(key, async () => {
          dbWrites += 1;
          await new Promise((r) => setTimeout(r, 15));
          return { attemptId: "att-1" };
        }),
        runDeduplicatedSubmission(key, async () => {
          dbWrites += 1;
          return { attemptId: "att-2" };
        }),
      ]);

      expect(dbWrites).toBe(1);
      expect(results[0]).toEqual({ attemptId: "att-1" });
      expect(results[1]).toEqual({ attemptId: "att-1" });
    });
  });

  describe("4. TOEIC Practice Generator (Unbiased Distribution, Unit Grounding, Count/422 Contract)", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "";
    });

    it("eliminates hardcoded 'A' answer bias across batches via rebalanceBatchOptionDistribution", () => {
      const biasedBatch: ToeicQuestion[] = Array.from({ length: 12 }, (_, idx) => ({
        prompt: `Question ${idx + 1}: The manager _______ the report.`,
        options: [
          { key: "A", text: `correct_${idx}` },
          { key: "B", text: `wrong1_${idx}` },
          { key: "C", text: `wrong2_${idx}` },
          { key: "D", text: `wrong3_${idx}` },
        ],
        correctAnswer: "A",
        explanation: "Giải thích",
        difficulty: "medium",
        ruleReference: "1A",
        source: "dynamic",
      }));

      const balanced = rebalanceBatchOptionDistribution(biasedBatch);
      const counts = { A: 0, B: 0, C: 0, D: 0 };
      for (const q of balanced) {
        counts[q.correctAnswer] += 1;
        const chosenOpt = q.options.find((o) => o.key === q.correctAnswer);
        expect(chosenOpt?.text.startsWith("correct_")).toBe(true);
      }
      expect(counts).toEqual({ A: 3, B: 3, C: 3, D: 3 });
    });

    it("normalizes {blank} and '...' markers cleanly without leaving literal '{blank}' in dynamic prompts", () => {
      const dynamicItems = buildUnitGroundedDynamicQuestions({
        unitNumber: 145,
        title: "Phrasal verbs 9 (away / back)",
        theorySections: [
          {
            sectionId: "145A",
            heading: "Away and back",
            sourceContent: "The wind blew all the papers away immediately.",
          },
        ],
        textbookExamples: [],
        unitQuestions: [
          {
            questionId: "145.1-q1",
            questionContent: "It was windy. I dropped a twenty-pound note and it {blank}",
            isExample: false,
            correctAnswerText: "blew away",
            acceptedAnswers: [{ answerText: "blew away" }],
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "blew away" }],
            explanation: {
              ruleReference: "145A",
              aiExplanation: "Dùng blew away.",
            },
          },
          {
            questionId: "145.1-q2",
            questionContent: "Don't walk away from me...",
            isExample: false,
            correctAnswerText: "ran away",
            acceptedAnswers: [],
            options: [],
            blanks: [],
            explanation: null,
          },
          {
            questionId: "145.1-q3",
            questionContent: "Please put it back [blank]",
            isExample: false,
            correctAnswerText: "flew away",
            acceptedAnswers: [],
            options: [],
            blanks: [],
            explanation: null,
          },
          {
            questionId: "145.1-q4",
            questionContent: "She turned back [blank]",
            isExample: false,
            correctAnswerText: "got away",
            acceptedAnswers: [],
            options: [],
            blanks: [],
            explanation: null,
          },
        ],
      });

      expect(dynamicItems.length).toBeGreaterThanOrEqual(1);
      expect(dynamicItems[0].prompt).not.toContain("{blank}");
      expect(dynamicItems[0].prompt).toContain("_______");
    });

    it("throws explicit 422 INSUFFICIENT_CONTENT when unit materials cannot satisfy requested count", async () => {
      await expect(
        generateToeicQuestionsForUnit({
          unitNumber: 98,
          title: "Adjectives and adverbs 1",
          count: 10,
          difficulty: "medium",
          theorySections: [],
          textbookExamples: [],
          unitQuestions: [],
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: "INSUFFICIENT_CONTENT",
      });
    });
  });
});
