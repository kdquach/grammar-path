import { describe, it, expect, beforeEach } from "vitest";
import { evaluateQuestion } from "../src/utils/grader";
import { buildUnitGroundedDynamicQuestions } from "../src/services/toeic-generator.service";

describe("Phase 2.2 Regression Unit Tests (Grader & TOEIC Generator Quality)", () => {
  describe("1. Grader: Zero-article / empty-string accepted alternatives on multi-blank questions", () => {
    it("accepts explicit empty string '' alternative while preserving non-empty primary display answer", () => {
      const q73_1_7 = {
        questionId: "73.1-q7",
        correctAnswerType: "array",
        correctAnswerText: "- ... the",
        acceptedAnswers: [{ answerText: "- ... the" }],
        options: [],
        parts: [],
        blanks: [
          {
            id: "b1",
            blankIndex: 1,
            correctAnswerText: "-",
            acceptedAnswers: [{ answerText: "-" }, { answerText: "" }],
          },
          {
            id: "b2",
            blankIndex: 2,
            correctAnswerText: "the",
            acceptedAnswers: [{ answerText: "the" }],
          },
        ],
        explanation: { aiExplanation: "Không dùng mạo từ trước danh từ số nhiều chung.", ruleReference: "73A" },
      };

      const emptyFirstBlank = evaluateQuestion(q73_1_7, ["", "the"]);
      expect(emptyFirstBlank.isCorrect).toBe(true);
      expect(emptyFirstBlank.expectedAnswers).toEqual(["-", "the"]);

      const hyphenFirstBlank = evaluateQuestion(q73_1_7, ["-", "the"]);
      expect(hyphenFirstBlank.isCorrect).toBe(true);

      const wrongSecondBlank = evaluateQuestion(q73_1_7, ["", "a"]);
      expect(wrongSecondBlank.isCorrect).toBe(false);
    });
  });

  describe("2. TOEIC Generator Quality Hardening", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "";
    });

    it("excludes embedded multi-choice stems, compound 'a or b' answers, multi-blank items, multi-part items, and sentence_correction 'OK' items", () => {
      const items = buildUnitGroundedDynamicQuestions({
        unitNumber: 24,
        title: "will be doing and will have done",
        theorySections: [
          {
            sectionId: "24A",
            heading: "Will be doing",
            sourceContent: "This time next week I'll be on holiday.",
          },
        ],
        textbookExamples: [
          {
            originalText: "The concert will be starting in ten minutes.",
            translationVi: "Buổi hòa nhạc sẽ bắt đầu trong 10 phút nữa.",
          },
        ],
        unitQuestions: [
          // 1. Compound multi-select embedded stem (like 24.1-q2) -> MUST be skipped
          {
            questionId: "24.1-q2",
            questionContent:
              "2 At 8.15:\na he'll be leaving the house\nb he'll have left the house\nc he'll have arrived at work\nd he'll be working",
            isExample: false,
            correctAnswerText: "a or b",
            acceptedAnswers: [{ answerText: "a or b" }],
            options: [
              { optionKey: "a", optionText: "he'll be leaving the house" },
              { optionKey: "b", optionText: "he'll have left the house" },
              { optionKey: "c", optionText: "he'll have arrived at work" },
              { optionKey: "d", optionText: "he'll be working" },
            ],
            blanks: [{ blankIndex: 1, correctAnswerText: "b" }],
            exercise: { exerciseId: "24.1", questionType: "multiple_choice" },
          },
          // 2. sentence_correction with 'OK' -> MUST be skipped
          {
            questionId: "110.1-q2",
            questionContent: "Sue always arrives at work early.",
            isExample: false,
            correctAnswerText: "OK",
            acceptedAnswers: [{ answerText: "OK" }],
            options: [],
            blanks: [],
            exercise: { exerciseId: "110.1", questionType: "sentence_correction" },
          },
          // 3. Multi-part question -> MUST be skipped
          {
            questionId: "1.2-q1",
            questionContent: "What is he doing? ... He is reading ...",
            isExample: false,
            correctAnswerText: "reading ... studying",
            parts: [{ partId: "p1" }, { partId: "p2" }],
            blanks: [
              { blankIndex: 1, correctAnswerText: "reading" },
              { blankIndex: 2, correctAnswerText: "studying" },
            ],
            exercise: { exerciseId: "1.2", questionType: "fill_blank" },
          },
          // 4. Multi-blank question -> MUST be skipped
          {
            questionId: "72.1-q2",
            questionContent: "I bought [blank] newspaper and [blank] magazine.",
            isExample: false,
            correctAnswerText: "a ... a",
            blanks: [
              { blankIndex: 1, correctAnswerText: "a" },
              { blankIndex: 2, correctAnswerText: "a" },
            ],
            exercise: { exerciseId: "72.1", questionType: "fill_blank" },
          },
          // 5. Clean single-blank question -> MUST be preserved
          {
            questionId: "24.2-q2",
            questionContent: "Phone me after 8 o'clock. [_____] dinner by then. (we / finish)",
            isExample: false,
            correctAnswerText: "We'll have finished",
            acceptedAnswers: [{ answerText: "We'll have finished" }],
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "We'll have finished" }],
            exercise: { exerciseId: "24.2", questionType: "fill_blank" },
          },
          {
            questionId: "24.2-q3",
            questionContent: "At 4 o'clock, [_____] tennis.",
            isExample: false,
            correctAnswerText: "we'll be playing",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "we'll be playing" }],
            exercise: { exerciseId: "24.2", questionType: "fill_blank" },
          },
          {
            questionId: "24.2-q4",
            questionContent: "Don't phone in the afternoon. [_____].",
            isExample: false,
            correctAnswerText: "I'll be working",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "I'll be working" }],
            exercise: { exerciseId: "24.2", questionType: "fill_blank" },
          },
          {
            questionId: "24.2-q5",
            questionContent: "Yes, [_____] by then.",
            isExample: false,
            correctAnswerText: "it will have ended",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "it will have ended" }],
            exercise: { exerciseId: "24.2", questionType: "fill_blank" },
          },
        ],
      });

      const prompts = items.map((i) => i.prompt);
      const allOptTexts = items.flatMap((i) => i.options.map((o) => o.text));

      expect(prompts.some((p) => p.includes("8.15"))).toBe(false);
      expect(prompts.some((p) => p.includes("Sue always arrives"))).toBe(false);
      expect(prompts.some((p) => p.includes("newspaper"))).toBe(false);
      expect(allOptTexts).not.toContain("OK");
      expect(allOptTexts).not.toContain("a or b");

      const cleanQ24 = items.find((i) => i.prompt.includes("Phone me after 8 o'clock"));
      expect(cleanQ24).toBeDefined();
      expect((cleanQ24!.prompt.match(/_______/g) || []).length).toBe(1);
    });

    it("masks inline two-option slash choices cleanly and protects parenthetical cues like (exhaust...)", () => {
      const items = buildUnitGroundedDynamicQuestions({
        unitNumber: 98,
        title: "Adjectives ending in -ing and -ed",
        theorySections: [],
        textbookExamples: [],
        unitQuestions: [
          {
            questionId: "98.1-q2a",
            questionContent: "She enjoys her job. (exhaust...) -> It's often ...",
            isExample: false,
            correctAnswerText: "exhausting",
            options: [],
            exercise: { exerciseId: "98.1", questionType: "fill_blank" },
          },
          {
            questionId: "98.2-q2",
            questionContent: "Are you interesting / interested in football?",
            isExample: false,
            correctAnswerText: "interested",
            options: [
              { optionKey: "a", optionText: "interesting" },
              { optionKey: "b", optionText: "interested" },
            ],
            exercise: { exerciseId: "98.2", questionType: "multiple_choice" },
          },
          {
            questionId: "98.3-q2",
            questionContent: "I've got nothing to do. I'm ...",
            isExample: false,
            correctAnswerText: "bored",
            options: [],
            exercise: { exerciseId: "98.3", questionType: "fill_blank" },
          },
          {
            questionId: "98.3-q3",
            questionContent: "The teacher's explanation was ...",
            isExample: false,
            correctAnswerText: "confusing",
            options: [],
            exercise: { exerciseId: "98.3", questionType: "fill_blank" },
          },
        ],
      });

      const q98_1 = items.find((i) => i.prompt.includes("enjoys her job"));
      expect(q98_1).toBeDefined();
      expect((q98_1!.prompt.match(/_______/g) || []).length).toBe(1);
      expect(q98_1!.prompt).toContain("(exhaust)");

      const q98_2 = items.find((i) => i.prompt.includes("football"));
      expect(q98_2).toBeDefined();
      expect(q98_2!.prompt).toBe("Are you _______ in football?");
      expect(q98_2!.options.map((o) => o.text)).toContain("interested");
      expect(q98_2!.options.map((o) => o.text)).toContain("interesting");
    });

    it("never puts accepted alternative answers or bare option keys ('B'/'C') into TOEIC distractors", () => {
      const items = buildUnitGroundedDynamicQuestions({
        unitNumber: 145,
        title: "Phrasal verbs 9 (away / back)",
        theorySections: [],
        textbookExamples: [],
        unitQuestions: [
          {
            questionId: "145.2-q2",
            questionContent: "I think they must {blank}.",
            isExample: false,
            correctAnswerText: "be away / have gone away",
            acceptedAnswers: [{ answerText: "be away" }, { answerText: "have gone away" }],
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "be away" }],
            exercise: { exerciseId: "145.2", questionType: "fill_blank" },
          },
          {
            questionId: "145.1-q1",
            questionContent: "It was windy and it {blank}.",
            isExample: false,
            correctAnswerText: "blew away",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "blew away" }],
            exercise: { exerciseId: "145.1", questionType: "fill_blank" },
          },
          {
            questionId: "145.1-q2",
            questionContent: "She opened the letter and {blank}.",
            isExample: false,
            correctAnswerText: "put it back",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "put it back" }],
            exercise: { exerciseId: "145.1", questionType: "fill_blank" },
          },
          {
            questionId: "145.1-q3",
            questionContent: "He tried to talk to her but she {blank}.",
            isExample: false,
            correctAnswerText: "walked away",
            options: [],
            blanks: [{ blankIndex: 1, correctAnswerText: "walked away" }],
            exercise: { exerciseId: "145.1", questionType: "fill_blank" },
          },
          {
            questionId: "145.9-q9",
            questionContent: "Dummy choice",
            isExample: false,
            correctAnswerText: "B",
            options: [
              { optionKey: "A", optionText: "went away" },
              { optionKey: "B", optionText: "ran away" },
            ],
            exercise: { exerciseId: "145.9", questionType: "multiple_choice" },
          },
        ],
      });

      const q145_2 = items.find((i) => i.prompt.includes("I think they must"));
      expect(q145_2).toBeDefined();
      const texts = q145_2!.options.map((o) => o.text);
      expect(texts).not.toContain("have gone away");
      expect(texts).not.toContain("B");
    });
  });
});

