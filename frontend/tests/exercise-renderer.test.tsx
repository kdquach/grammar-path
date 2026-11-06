import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WordBankBar } from "../src/components/exercises/WordBankBar";
import { OptionQuestionRenderer } from "../src/components/exercises/renderers/OptionQuestionRenderer";
import { FillBlankQuestionRenderer } from "../src/components/exercises/renderers/FillBlankQuestionRenderer";
import { MultiPartQuestionRenderer } from "../src/components/exercises/renderers/MultiPartQuestionRenderer";
import { SentenceQuestionRenderer } from "../src/components/exercises/renderers/SentenceQuestionRenderer";
import { QuestionCard } from "../src/components/exercises/QuestionCard";
import { ExerciseViewer } from "../src/components/exercises/ExerciseViewer";
import { api } from "../src/api/client";
import type {
  Exercise,
  Question,
  WordBankItem,
  QuestionCheckResult,
  ExerciseCheckResult,
  QuestionSolution,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getUnitExercises: vi.fn(),
    getExerciseDetail: vi.fn(),
    getExerciseSolutions: vi.fn(),
    getQuestionDetail: vi.fn(),
    getQuestionSolution: vi.fn(),
    checkQuestionAnswer: vi.fn(),
    checkExerciseAnswers: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

const mockWordBank: WordBankItem[] = [
  { id: "wb-1", word: "hungry", displayOrder: 1 },
  { id: "wb-2", word: "thirsty", displayOrder: 2 },
  { id: "wb-3", word: "tired", displayOrder: 3 },
];

const mockExampleQuestion: Question = {
  id: "q-1",
  questionId: "1.1-q1",
  questionContent: "Please don't make so much noise.",
  isExample: true,
  exampleAnswer: "I'm trying to work.",
  contextClue: "(try)",
  hasVisualContext: false,
  displayOrder: 1,
  options: [],
  blanks: [],
  parts: [],
};

const mockOptionQuestion: Question = {
  id: "q-2",
  questionId: "1.1-q2",
  questionContent: "I'm looking for Christine.",
  isExample: false,
  hasVisualContext: false,
  displayOrder: 2,
  options: [
    { optionKey: "a", optionText: "It's getting late.", displayOrder: 1 },
    { optionKey: "b", optionText: "Do you know where she is?", displayOrder: 2 },
  ],
  blanks: [],
  parts: [],
};

const mockMultiBlankQuestion: Question = {
  id: "q-3",
  questionId: "1.2-q1",
  questionContent: "What is he doing with his car?",
  isExample: false,
  hasVisualContext: false,
  contextClue: "(wash / fix)",
  displayOrder: 3,
  options: [],
  blanks: [{ blankIndex: 1 }, { blankIndex: 2 }],
  parts: [],
};

const mockMultiPartQuestion: Question = {
  id: "q-4",
  questionId: "4.1-q9",
  questionContent: "Complete both sentences with the correct form:",
  isExample: false,
  hasVisualContext: false,
  displayOrder: 4,
  options: [],
  blanks: [],
  parts: [
    { partId: "4.1-q9.1", questionContent: "Statement one", displayOrder: 1 },
    { partId: "4.1-q9.2", questionContent: "Statement two", displayOrder: 2 },
  ],
};

const mockSentenceQuestion: Question = {
  id: "q-5",
  questionId: "1.3-q1",
  questionContent: "The water is boiling.",
  isExample: false,
  hasVisualContext: true,
  visualContextDescription: "Picture showing a pot of water on the stove.",
  contextClue: "(turn off)",
  displayOrder: 5,
  options: [],
  blanks: [],
  parts: [],
};

const mockExercise: Exercise = {
  id: "ex-1",
  exerciseId: "1.1",
  exerciseNumber: "1.1",
  questionType: "matching",
  instruction: "Complete the sentences. Put together the halves:",
  hasVisualContext: true,
  visualContextDescription: "Pictures 1 to 5 showing various situations.",
  contextNotes: null,
  displayOrder: 1,
  wordBankItems: mockWordBank,
  questions: [mockExampleQuestion, mockOptionQuestion],
};

describe("Polymorphic Exercise Renderers & Interactive Grading UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Word Bank Bar Tests
  describe("WordBankBar", () => {
    it("renders all word bank chips and toggles crossed-out state on click", () => {
      render(<WordBankBar items={mockWordBank} />);

      expect(screen.getByText("Word Bank")).toBeInTheDocument();
      expect(screen.getByText("hungry")).toBeInTheDocument();
      expect(screen.getByText("thirsty")).toBeInTheDocument();
      expect(screen.getByText("tired")).toBeInTheDocument();

      const hungryBtn = screen.getByText("hungry").closest("button")!;
      expect(hungryBtn).not.toHaveClass("line-through");

      // Click to toggle crossed-out
      fireEvent.click(hungryBtn);
      expect(hungryBtn).toHaveClass("line-through");

      // Reset button appears
      const resetBtn = screen.getByText(/Reset marks/i);
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(hungryBtn).not.toHaveClass("line-through");
    });
  });

  // 2. Individual Question Renderers Tests
  describe("Individual Renderers", () => {
    it("OptionQuestionRenderer renders option keys and texts, handling selection", () => {
      const onChange = vi.fn();
      render(
        <OptionQuestionRenderer
          question={mockOptionQuestion}
          value="a"
          onChange={onChange}
        />
      );

      expect(screen.getByText("I'm looking for Christine.")).toBeInTheDocument();
      expect(screen.getByText("It's getting late.")).toBeInTheDocument();
      expect(screen.getByText("Do you know where she is?")).toBeInTheDocument();

      const optionB = screen.getByText("Do you know where she is?").closest("button")!;
      fireEvent.click(optionB);
      expect(onChange).toHaveBeenCalledWith("b");
    });

    it("FillBlankQuestionRenderer renders multiple blank inputs", () => {
      const onChange = vi.fn();
      render(
        <FillBlankQuestionRenderer
          question={mockMultiBlankQuestion}
          value={["fixing", "washing"]}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Blank #1")).toBeInTheDocument();
      expect(screen.getByText("Blank #2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("fixing")).toBeInTheDocument();
      expect(screen.getByDisplayValue("washing")).toBeInTheDocument();

      const input1 = screen.getByDisplayValue("fixing");
      fireEvent.change(input1, { target: { value: "repairing" } });
      expect(onChange).toHaveBeenCalledWith(["repairing", "washing"]);
    });

    it("MultiPartQuestionRenderer renders sub-part inputs and updates state by partId", () => {
      const onChange = vi.fn();
      render(
        <MultiPartQuestionRenderer
          question={mockMultiPartQuestion}
          value={{ "4.1-q9.1": "First answer" }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Statement one")).toBeInTheDocument();
      expect(screen.getByText("Statement two")).toBeInTheDocument();
      expect(screen.getByDisplayValue("First answer")).toBeInTheDocument();

      const input2 = screen.getByPlaceholderText("Answer for part 2...");
      fireEvent.change(input2, { target: { value: "Second answer" } });
      expect(onChange).toHaveBeenCalledWith({
        "4.1-q9.1": "First answer",
        "4.1-q9.2": "Second answer",
      });
    });

    it("SentenceQuestionRenderer renders visual context, context clue, and text input", () => {
      const onChange = vi.fn();
      render(
        <SentenceQuestionRenderer
          question={mockSentenceQuestion}
          value="Can you turn it off?"
          onChange={onChange}
        />
      );

      expect(screen.getByText("The water is boiling.")).toBeInTheDocument();
      expect(screen.getByText("(turn off)")).toBeInTheDocument();
      expect(
        screen.getByText("Picture showing a pot of water on the stove.")
      ).toBeInTheDocument();

      const input = screen.getByDisplayValue("Can you turn it off?");
      fireEvent.change(input, { target: { value: "Turn it off please" } });
      expect(onChange).toHaveBeenCalledWith("Turn it off please");
    });
  });

  // 3. QuestionCard & Worked Example Flow
  describe("QuestionCard", () => {
    it("renders Worked Example with model answer and allows viewing solution", async () => {
      const onShowSolution = vi.fn();
      const onCheck = vi.fn();

      render(
        <QuestionCard
          question={mockExampleQuestion}
          questionNumber={1}
          value="I'm trying to work."
          onChange={vi.fn()}
          onCheck={onCheck}
          onShowSolution={onShowSolution}
        />
      );

      expect(screen.getByText("Worked Example")).toBeInTheDocument();
      expect(screen.getByText("Model Demonstration Answer")).toBeInTheDocument();
      expect(screen.getByText("I'm trying to work.")).toBeInTheDocument();
      // Should not show "Check Answer" button for worked example
      expect(screen.queryByText("Check Answer")).not.toBeInTheDocument();

      const viewExpBtn = screen.getByText("View Explanation");
      fireEvent.click(viewExpBtn);
      expect(onShowSolution).toHaveBeenCalledTimes(1);
    });

    it("renders interactive question and displays feedback panel after checking", () => {
      const mockResult: QuestionCheckResult = {
        questionId: "1.1-q2",
        isCorrect: true,
        studentAnswer: "b",
        correctAnswers: ["b"],
        expectedAnswers: ["b", "Do you know where she is?"],
        explanation: "Thì hiện tại tiếp diễn dùng để hỏi vị trí hiện tại.",
        ruleReference: "1B",
      };

      const onOpenRule = vi.fn();

      render(
        <QuestionCard
          question={mockOptionQuestion}
          questionNumber={2}
          value="b"
          onChange={vi.fn()}
          result={mockResult}
          onCheck={vi.fn()}
          onShowSolution={vi.fn()}
          onOpenRuleReference={onOpenRule}
        />
      );

      expect(screen.getByText("Correct!")).toBeInTheDocument();
      expect(screen.getAllByText("Do you know where she is?").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Thì hiện tại tiếp diễn dùng để hỏi vị trí hiện tại.")
      ).toBeInTheDocument();

      // Click Rule 1B reference badge
      const ruleBtn = screen.getByText("Rule 1B");
      fireEvent.click(ruleBtn);
      expect(onOpenRule).toHaveBeenCalledWith("1B");
    });
  });

  // 4. ExerciseViewer Whole-Exercise Workflow
  describe("ExerciseViewer Workflow", () => {
    it("loads unit exercises, handles single question check and full exercise grading", async () => {
      vi.mocked(api.getUnitExercises).mockResolvedValue([mockExercise]);

      const mockCheckResult: QuestionCheckResult = {
        questionId: "1.1-q2",
        isCorrect: true,
        studentAnswer: "b",
        correctAnswers: ["b"],
        expectedAnswers: ["b"],
        explanation: "Giải thích chi tiết",
        ruleReference: "1B",
      };

      const mockExerciseCheckResult: ExerciseCheckResult = {
        exerciseId: "1.1",
        exerciseNumber: "1.1",
        totalQuestions: 2,
        correctCount: 2,
        scorePercentage: 100,
        results: [
          {
            questionId: "1.1-q1",
            isCorrect: true,
            studentAnswer: "I'm trying to work.",
            correctAnswers: ["I'm trying to work."],
            expectedAnswers: ["I'm trying to work."],
            explanation: null,
            ruleReference: null,
          },
          mockCheckResult,
        ],
      };

      vi.mocked(api.checkQuestionAnswer).mockResolvedValue(mockCheckResult);
      vi.mocked(api.checkExerciseAnswers).mockResolvedValue(mockExerciseCheckResult);

      render(<ExerciseViewer unitNumber={1} onOpenRuleReference={vi.fn()} />);

      // Wait for exercise to load
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Exercise 1\.1/ })).toBeInTheDocument();
      });

      expect(
        screen.getByText(/"Complete the sentences. Put together the halves:"/)
      ).toBeInTheDocument();

      // Check single question
      const checkButtons = screen.getAllByText("Check Answer");
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        expect(api.checkQuestionAnswer).toHaveBeenCalledWith("1.1-q2", undefined);
      });

      // Check entire exercise
      const checkAllBtn = screen.getByText("Check Entire Exercise");
      fireEvent.click(checkAllBtn);

      await waitFor(() => {
        expect(api.checkExerciseAnswers).toHaveBeenCalledWith("1.1", {});
      });

      // Verify Score Summary Banner is shown
      await waitFor(() => {
        expect(screen.getByText("Exercise Evaluation Summary")).toBeInTheDocument();
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("2 of 2 questions correct")).toBeInTheDocument();
      });

      // Test Reset Exercise
      const resetBtn = screen.getByText("Reset Exercise");
      fireEvent.click(resetBtn);

      expect(screen.queryByText("Exercise Evaluation Summary")).not.toBeInTheDocument();
    });

    it("reveals all solutions across the exercise when 'Reveal All Solutions' is clicked", async () => {
      vi.mocked(api.getUnitExercises).mockResolvedValue([mockExercise]);

      const mockSolutions: QuestionSolution[] = [
        {
          id: "sol-1",
          questionId: "1.1-q1",
          questionContent: "Please don't make so much noise.",
          isExample: true,
          exampleAnswer: "I'm trying to work.",
          hasVisualContext: false,
          displayOrder: 1,
          correctAnswerType: "sentence",
          correctAnswerText: "I'm trying to work.",
          acceptedAnswers: ["I'm trying to work."],
          blanks: [],
          parts: [],
          answerKey: {
            exerciseNumber: "1.1",
            answerType: "sentence",
            answerText: "I'm trying to work.",
            notes: "Model answer",
            sourcePages: [347],
          },
          explanation: {
            aiExplanation: "Mẫu câu diễn tả hành động đang xảy ra.",
            explanationLanguage: "vi",
            ruleReference: "1A",
          },
        },
        {
          id: "sol-2",
          questionId: "1.1-q2",
          questionContent: "I'm looking for Christine.",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 2,
          correctAnswerType: "option",
          correctAnswerText: "b",
          acceptedAnswers: ["b", "Do you know where she is?"],
          blanks: [],
          parts: [],
          answerKey: {
            exerciseNumber: "1.1",
            answerType: "option",
            answerText: "b",
            notes: null,
            sourcePages: [347],
          },
          explanation: {
            aiExplanation: "Lời đáp phù hợp với ngữ cảnh tìm kiếm.",
            explanationLanguage: "vi",
            ruleReference: "1B",
          },
        },
      ];

      vi.mocked(api.getExerciseSolutions).mockResolvedValue(mockSolutions);

      render(<ExerciseViewer unitNumber={1} onOpenRuleReference={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Exercise 1\.1/ })).toBeInTheDocument();
      });

      const revealBtn = screen.getByText("Reveal All Solutions");
      fireEvent.click(revealBtn);

      await waitFor(() => {
        expect(api.getExerciseSolutions).toHaveBeenCalledWith("1.1");
      });

      // Verify solutions displayed on cards
      await waitFor(() => {
        expect(
          screen.getByText("Mẫu câu diễn tả hành động đang xảy ra.")
        ).toBeInTheDocument();
        expect(
          screen.getByText("Lời đáp phù hợp với ngữ cảnh tìm kiếm.")
        ).toBeInTheDocument();
        expect(screen.getAllByText("Cambridge Answer Key").length).toBeGreaterThan(0);
      });
    });
  });
});
