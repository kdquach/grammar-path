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
      expect(screen.getByText("2 left")).toBeInTheDocument();

      // Reset button appears
      const resetBtn = screen.getByText(/Reset marks/i);
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(hungryBtn).not.toHaveClass("line-through");
    });

    it("supports sticky pinning, pin toggle, and collapse/expand controls", () => {
      const { rerender } = render(
        <WordBankBar items={mockWordBank} sticky resetVersion={0} />
      );

      const bar = screen.getByTestId("word-bank-bar");
      expect(bar).toHaveClass("sticky");
      expect(bar).toHaveClass("top-14");
      expect(bar).toHaveClass("md:top-3");

      // Unpin toggles sticky positioning off
      const pinBtn = screen.getByRole("button", { name: /Pinned/i });
      expect(pinBtn).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(pinBtn);
      expect(bar).not.toHaveClass("sticky");
      expect(screen.getByRole("button", { name: /^Pin$/i })).toHaveAttribute(
        "aria-pressed",
        "false"
      );

      // Mark a word, then collapse & expand
      const hungryBtn = screen.getByText("hungry").closest("button")!;
      fireEvent.click(hungryBtn);
      expect(hungryBtn).toHaveClass("line-through");

      const hideBtn = screen.getByRole("button", { name: /Hide/i });
      fireEvent.click(hideBtn);
      expect(screen.queryByText("hungry")).not.toBeInTheDocument();

      const showBtn = screen.getByRole("button", { name: /Show/i });
      fireEvent.click(showBtn);
      expect(screen.getByText("hungry").closest("button")!).toHaveClass("line-through");

      // Incrementing resetVersion clears crossed-out marks
      rerender(<WordBankBar items={mockWordBank} sticky resetVersion={1} />);
      expect(screen.getByText("hungry").closest("button")!).not.toHaveClass("line-through");
    });

    it("tracks duplicate word bank entries independently when clicked", () => {
      const duplicateItems: WordBankItem[] = [
        { id: "wb-exp-1", word: "experience", displayOrder: 1 },
        { id: "wb-exp-2", word: "experience", displayOrder: 2 },
        { id: "wb-adv", word: "advice", displayOrder: 3 },
      ];

      render(<WordBankBar items={duplicateItems} />);

      const expButtons = screen
        .getAllByText("experience")
        .map((el) => el.closest("button")!);
      expect(expButtons).toHaveLength(2);

      fireEvent.click(expButtons[0]);

      expect(expButtons[0]).toHaveClass("line-through");
      expect(expButtons[1]).not.toHaveClass("line-through");
      expect(screen.getByText("2 left")).toBeInTheDocument();
      expect(screen.getByText(/Reset marks \(1\)/i)).toBeInTheDocument();

      // Clicking the second duplicate marks it separately
      fireEvent.click(expButtons[1]);
      expect(expButtons[1]).toHaveClass("line-through");
      expect(screen.getByText("1 left")).toBeInTheDocument();
      expect(screen.getByText(/Reset marks \(2\)/i)).toBeInTheDocument();
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

    it("supports multi-select checkboxes on 17.2/24.1-style exercises and split-blank slash hints on 86.4-q9", async () => {
      const multiSelectExercise: Exercise = {
        id: "ex-17-2",
        exerciseId: "17.2",
        exerciseNumber: "17.2",
        questionType: "multiple_choice",
        instruction:
          "Which alternatives are correct? Sometimes two alternatives are possible, sometimes only one.",
        hasVisualContext: false,
        displayOrder: 1,
        wordBankItems: [],
        questions: [
          {
            id: "q-17-3",
            questionId: "17.2-q3",
            questionContent: "I need a stamp for this letter. [_____] one?",
            isExample: false,
            hasVisualContext: false,
            displayOrder: 1,
            options: [
              { optionKey: "A", optionText: "Do you have", displayOrder: 1 },
              { optionKey: "B", optionText: "Are you having", displayOrder: 2 },
              { optionKey: "C", optionText: "Have you got", displayOrder: 3 },
            ],
            blanks: [],
            parts: [],
          },
          {
            id: "q-86-9",
            questionId: "86.4-q9",
            questionContent:
              "'Who were you talking to just now?' '[blank]. I wasn't talking to [blank].'",
            isExample: false,
            hasVisualContext: false,
            displayOrder: 2,
            options: [
              { optionKey: "a", optionText: "No-one / Anyone", displayOrder: 1 },
              { optionKey: "b", optionText: "no-one / anyone", displayOrder: 2 },
            ],
            blanks: [{ blankIndex: 1 }, { blankIndex: 2 }],
            parts: [],
          },
        ],
      };

      vi.mocked(api.getUnitExercises).mockResolvedValue([multiSelectExercise]);
      vi.mocked(api.checkQuestionAnswer).mockResolvedValue({
        questionId: "17.2-q3",
        isCorrect: true,
        studentAnswer: ["A", "C"],
        correctAnswers: ["A or C", "A and C"],
        expectedAnswers: ["A or C", "A and C"],
        explanation: null,
        ruleReference: null,
      });

      render(<ExerciseViewer unitNumber={17} onOpenRuleReference={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Multiple options may be correct/i)).toBeInTheDocument();
      });

      // Toggle C then A -> canonical option order ["A", "C"]
      fireEvent.click(screen.getByText("Have you got").closest("button")!);
      fireEvent.click(screen.getByText("Do you have").closest("button")!);

      const checkButtons = screen.getAllByText("Check Answer");
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        expect(api.checkQuestionAnswer).toHaveBeenCalledWith("17.2-q3", ["A", "C"]);
      });

      // 86.4-q9 should render Blank #1 & Blank #2 with clickable slash choice pills, NOT broken OptionQuestionRenderer
      expect(screen.getByText("Blank #1")).toBeInTheDocument();
      expect(screen.getByText("Blank #2")).toBeInTheDocument();
      expect(screen.queryByText("No-one / Anyone")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "No-one" }));
      fireEvent.click(screen.getByRole("button", { name: "anyone" }));
      fireEvent.click(checkButtons[1]);

      await waitFor(() => {
        expect(api.checkQuestionAnswer).toHaveBeenCalledWith("86.4-q9", [
          "No-one",
          "anyone",
        ]);
      });
    });

    it("OptionQuestionRenderer safely handles array value in single-select mode without throwing", () => {
      const onChange = vi.fn();
      render(
        <OptionQuestionRenderer
          question={mockOptionQuestion}
          value={["b"]}
          onChange={onChange}
        />
      );
      const optB = screen.getByText("Do you know where she is?").closest("button")!;
      expect(optB).toHaveAttribute("aria-pressed", "true");
    });

    it("formats textbook sub-item prefixes like '4 a' into a compact '4a' pill without breaking normal English sentences", () => {
      const subItemQuestion: Question = {
        id: "q-70-4a",
        questionId: "70.1-q4a",
        questionContent:
          "4 a I was in a hurry this morning. I didn't have [time / a time] for breakfast.",
        isExample: false,
        hasVisualContext: false,
        displayOrder: 6,
        options: [
          { optionKey: "a", optionText: "time", displayOrder: 1 },
          { optionKey: "b", optionText: "a time", displayOrder: 2 },
        ],
        blanks: [{ blankIndex: 1 }],
        parts: [],
      };

      const { rerender } = render(
        <OptionQuestionRenderer
          question={subItemQuestion}
          value={undefined}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText("4a")).toBeInTheDocument();
      expect(
        screen.getByText(/I was in a hurry this morning\./)
      ).toBeInTheDocument();

      // Normal numbered English sentence starting with uppercase article 'A' stays untouched
      rerender(
        <OptionQuestionRenderer
          question={{
            ...subItemQuestion,
            questionContent: "2 A man was sitting next to me.",
          }}
          value={undefined}
          onChange={vi.fn()}
        />
      );
      expect(screen.queryByText("2A")).not.toBeInTheDocument();
      expect(screen.getByText("2 A man was sitting next to me.")).toBeInTheDocument();
    });

    it("mounts sticky WordBankBar directly in the questions dock outside the header section and resets marks on Reset Exercise", async () => {
      vi.mocked(api.getUnitExercises).mockResolvedValue([mockExercise]);

      render(<ExerciseViewer unitNumber={1} onOpenRuleReference={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("word-bank-bar")).toBeInTheDocument();
      });

      const wordBankBar = screen.getByTestId("word-bank-bar");
      // Sticky dock is placed in the questions container, NOT trapped inside the top <section>
      expect(wordBankBar.closest("section")).toBeNull();
      expect(wordBankBar).toHaveClass("sticky");
      expect(wordBankBar.parentElement).toContainElement(
        screen.getByText("Worked Example")
      );

      // Cross out a word, then Reset Exercise should clear the mark too
      const hungryBtn = screen.getByText("hungry").closest("button")!;
      fireEvent.click(hungryBtn);
      expect(hungryBtn).toHaveClass("line-through");

      fireEvent.click(screen.getByRole("button", { name: /Reset Exercise/i }));
      expect(hungryBtn).not.toHaveClass("line-through");
    });
  });
});
