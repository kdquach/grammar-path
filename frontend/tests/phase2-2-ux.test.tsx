import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QuestionFeedbackPanel } from "../src/components/exercises/QuestionFeedbackPanel";
import { QuestionCard } from "../src/components/exercises/QuestionCard";
import { ExerciseViewer } from "../src/components/exercises/ExerciseViewer";
import { ToeicPracticeModal } from "../src/components/adaptive/ToeicPracticeModal";
import { RuleReferenceModal } from "../src/components/theory/RuleReferenceModal";
import { AuthModal } from "../src/components/auth/AuthModal";
import { AuthProvider } from "../src/context/AuthContext";
import { ToastProvider } from "../src/context/ToastContext";
import api from "../src/api/client";
import type { Exercise, Question, QuestionSolution } from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    generateToeicPractice: vi.fn(),
    checkToeicPracticeAnswer: vi.fn(),
    getTheorySection: vi.fn(),
    getUnitExercises: vi.fn(),
    checkExerciseAnswers: vi.fn(),
    getCurrentUser: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
    getStoredToken: vi.fn(() => localStorage.getItem("grammarpath_token")),
    setStoredToken: vi.fn(),
  };
});

describe("Phase 2.2 Frontend UX Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders ordered blank/part chips ('Blank #1', 'Blank #2') instead of misleading 'Also accepted:' on multi-blank questions", () => {
    render(
      <QuestionFeedbackPanel
        feedback={{
          isCorrect: false,
          isOrderedMultiExpected: true,
          partLabelPrefix: "Blank #",
          expectedAnswers: ["-", "the"],
          explanation: "Giải thích mạo từ.",
          ruleReference: "73A",
        }}
      />
    );

    expect(screen.getByText("Expected Answers:")).toBeInTheDocument();
    expect(screen.getByText("Blank #1:")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Blank #2:")).toBeInTheDocument();
    expect(screen.getByText("the")).toBeInTheDocument();
    expect(screen.queryByText("Also accepted:")).not.toBeInTheDocument();
  });

  it("hydrates multi-part QuestionSolution ordered answers inside QuestionCard", () => {
    const multiPartQ: Question = {
      id: "q-mp-1",
      questionId: "1.2-q1",
      questionContent: "Complete both parts:",
      isExample: false,
      hasVisualContext: false,
      displayOrder: 1,
      options: [],
      blanks: [],
      parts: [
        { partId: "1.2-q1.1", questionContent: "What is he doing?", displayOrder: 1 },
        { partId: "1.2-q1.2", questionContent: "Is he working?", displayOrder: 2 },
      ],
    };

    const solution: QuestionSolution = {
      id: "q-mp-1",
      questionId: "1.2-q1",
      questionContent: "Complete both parts:",
      isExample: false,
      hasVisualContext: false,
      displayOrder: 1,
      correctAnswerType: "array",
      correctAnswerText: null,
      acceptedAnswers: [],
      blanks: [],
      parts: [
        {
          partId: "1.2-q1.1",
          questionContent: "What is he doing?",
          displayOrder: 1,
          correctAnswerText: "What's he studying",
          acceptedAnswers: ["What's he studying"],
        },
        {
          partId: "1.2-q1.2",
          questionContent: "Is he working?",
          displayOrder: 2,
          correctAnswerText: "Is he enjoying it",
          acceptedAnswers: ["Is he enjoying it"],
        },
      ],
      answerKey: null,
      explanation: {
        aiExplanation: "Giải thích từng phần.",
        explanationLanguage: "vi",
        ruleReference: "1A",
      },
    };

    render(
      <QuestionCard
        question={multiPartQ}
        questionNumber={1}
        value={{}}
        onChange={vi.fn()}
        result={solution}
        onCheck={vi.fn()}
        onShowSolution={vi.fn()}
      />
    );

    expect(screen.getByText("Part #1:")).toBeInTheDocument();
    expect(screen.getByText("What's he studying")).toBeInTheDocument();
    expect(screen.getByText("Part #2:")).toBeInTheDocument();
    expect(screen.getByText("Is he enjoying it")).toBeInTheDocument();
    expect(screen.queryByText("Also accepted:")).not.toBeInTheDocument();
  });

  it("fills 2-blank correlative TOEIC options ('are / debating') cleanly across blank 1 and blank 2 in ToeicPracticeModal", async () => {
    vi.mocked(api.generateToeicPractice).mockResolvedValue({
      sessionId: "toeic-2b",
      unitNumber: 1,
      title: "Present continuous",
      difficulty: "medium",
      requestedCount: 5,
      actualCount: 1,
      source: "curated",
      isOfficialToeic: false,
      sourceNotice: "Demo notice",
      questions: [
        {
          itemId: "item-2b",
          prompt: "Why _______ so many employees _______ over the policy today?",
          options: [
            { key: "A", text: "are / debating" },
            { key: "B", text: "do / debate" },
            { key: "C", text: "have / debated" },
            { key: "D", text: "were / debating" },
          ],
          difficulty: "medium",
          ruleReference: "1C",
        },
      ],
    });

    render(
      <ToastProvider>
        <ToeicPracticeModal
          isOpen={true}
          onClose={vi.fn()}
          unitNumber={1}
          unitTitle="Present continuous"
        />
      </ToastProvider>
    );

    const optA = await screen.findByRole("button", { name: /A are \/ debating/i });
    fireEvent.click(optA);

    const sentenceContainer = screen.getByText(/so many employees/i);
    expect(sentenceContainer).toHaveTextContent(
      "Why are so many employees debating over the policy today?"
    );
    expect(sentenceContainer).not.toHaveTextContent("are / debating over");
  });

  it("closes RuleReferenceModal and AuthModal on Escape key press", async () => {
    vi.mocked(api.getTheorySection).mockResolvedValue({
      id: "ts-1a",
      sectionId: "1A",
      heading: "Present continuous",
      sourceContent: "Sarah is in her car.",
      displayOrder: 1,
      sourcePages: [13],
    });

    const onCloseRule = vi.fn();
    render(
      <MemoryRouter>
        <RuleReferenceModal sectionId="1A" onClose={onCloseRule} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Grammar Rule Reference")).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseRule).toHaveBeenCalledTimes(1);

    const onCloseAuth = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onCloseAuth} />
      </AuthProvider>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseAuth).toHaveBeenCalledTimes(1);
  });

  it("distinguishes correct, incorrect, and unanswered states across all renderers (empty, whitespace-only, partial multi-blank, unanswered multi-part, and reload restoration)", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      id: "u-p222",
      email: "p222@grammarpath.local",
      displayName: "Phase 2.2.2 Learner",
      createdAt: "2026-11-12T10:00:00Z",
    });
    localStorage.setItem("grammarpath_token", "tok-p222");

    const mixedExercise: Exercise = {
      id: "ex-mix",
      exerciseId: "99.1",
      exerciseNumber: "99.1",
      questionType: "fill_blank",
      instruction: "Complete all types",
      hasVisualContext: false,
      displayOrder: 1,
      wordBankItems: [],
      questions: [
        {
          id: "q-opt",
          questionId: "99.1-q1",
          questionContent: "Choose option",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 1,
          options: [
            { optionKey: "A", optionText: "Right option", displayOrder: 1 },
            { optionKey: "B", optionText: "Wrong option", displayOrder: 2 },
          ],
          blanks: [],
          parts: [],
        },
        {
          id: "q-sent-wrong",
          questionId: "99.1-q2",
          questionContent: "Sentence wrong",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 2,
          options: [],
          blanks: [],
          parts: [],
        },
        {
          id: "q-blank-empty",
          questionId: "99.1-q3",
          questionContent: "Single blank empty [___]",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 3,
          options: [],
          blanks: [{ blankIndex: 1 }],
          parts: [],
        },
        {
          id: "q-sent-ws",
          questionId: "99.1-q4",
          questionContent: "Sentence whitespace only",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 4,
          options: [],
          blanks: [],
          parts: [],
        },
        {
          id: "q-multi-blank",
          questionId: "99.1-q5",
          questionContent: "Partial multi-blank [___] and [___]",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 5,
          options: [],
          blanks: [{ blankIndex: 1 }, { blankIndex: 2 }],
          parts: [],
        },
        {
          id: "q-multi-part",
          questionId: "99.1-q6",
          questionContent: "Unanswered multi-part",
          isExample: false,
          hasVisualContext: false,
          displayOrder: 6,
          options: [],
          blanks: [],
          parts: [
            { partId: "99.1-q6.1", questionContent: "Part A", displayOrder: 1 },
            { partId: "99.1-q6.2", questionContent: "Part B", displayOrder: 2 },
          ],
        },
      ],
    };

    vi.mocked(api.getUnitExercises).mockResolvedValue([mixedExercise]);
    vi.mocked(api.checkExerciseAnswers).mockResolvedValue({
      exerciseId: "99.1",
      exerciseNumber: "99.1",
      totalQuestions: 6,
      correctCount: 1,
      scorePercentage: 16.7,
      results: [
        {
          questionId: "99.1-q1",
          status: "correct",
          isCorrect: true,
          studentAnswer: "A",
          correctAnswers: ["A"],
          expectedAnswers: ["A"],
          explanation: "Correct option explanation.",
          ruleReference: "99A",
        },
        {
          questionId: "99.1-q2",
          status: "incorrect",
          isCorrect: false,
          studentAnswer: "bad",
          correctAnswers: ["good"],
          expectedAnswers: ["good"],
          explanation: "Incorrect sentence explanation.",
          ruleReference: "99B",
        },
        {
          questionId: "99.1-q3",
          status: "unanswered",
          isCorrect: false,
          studentAnswer: null,
          correctAnswers: [],
          expectedAnswers: [],
          explanation: null,
          ruleReference: null,
        },
        {
          questionId: "99.1-q4",
          status: "unanswered",
          isCorrect: false,
          studentAnswer: null,
          correctAnswers: [],
          expectedAnswers: [],
          explanation: null,
          ruleReference: null,
        },
        {
          questionId: "99.1-q5",
          status: "incorrect",
          isCorrect: false,
          studentAnswer: ["first", ""],
          correctAnswers: ["first", "second"],
          expectedAnswers: ["first", "second"],
          explanation: "Second blank was missing.",
          ruleReference: "99C",
        },
        {
          questionId: "99.1-q6",
          status: "unanswered",
          isCorrect: false,
          studentAnswer: null,
          correctAnswers: [],
          expectedAnswers: [],
          explanation: null,
          ruleReference: null,
        },
      ],
    });

    const { unmount } = render(
      <ToastProvider>
        <AuthProvider>
          <ExerciseViewer unitNumber={99} />
        </AuthProvider>
      </ToastProvider>
    );

    // Wait for questions to render
    await screen.findByText("99.1-q1");

    // 1. Answer q1 (Option A -> correct)
    fireEvent.click(screen.getByRole("button", { name: /Right option/i }));

    // 2. Answer q2 (Sentence wrong -> incorrect)
    const sentenceInputs = screen.getAllByPlaceholderText(
      /Type full sentence or missing phrase\.\.\./i
    );
    fireEvent.change(sentenceInputs[0], { target: { value: "bad" } });

    // 3. Leave q3 (single blank) empty ""
    // 4. Fill q4 (sentence) with whitespace-only "   "
    fireEvent.change(sentenceInputs[1], { target: { value: "   " } });

    // 5. Partially fill q5 (multi-blank: fill Blank #1 only, leave Blank #2 empty)
    fireEvent.change(screen.getByPlaceholderText("Answer for blank #1..."), {
      target: { value: "first" },
    });

    // 6. Leave q6 (multi-part) unanswered

    fireEvent.click(screen.getByRole("button", { name: /Check Entire Exercise/i }));

    await waitFor(() => {
      // Whitespace-only q4 and empty q3/q6 must NOT be sent as attempted answers
      expect(api.checkExerciseAnswers).toHaveBeenCalledWith("99.1", {
        "99.1-q1": "A",
        "99.1-q2": "bad",
        "99.1-q5": ["first", ""],
      });
    });

    // Verify all 6 question feedback states
    const q1Card = screen.getByText("99.1-q1").closest(".bg-white") as HTMLElement;
    const q2Card = screen.getByText("99.1-q2").closest(".bg-white") as HTMLElement;
    const q3Card = screen.getByText("99.1-q3").closest(".bg-white") as HTMLElement;
    const q4Card = screen.getByText("99.1-q4").closest(".bg-white") as HTMLElement;
    const q5Card = screen.getByText("99.1-q5").closest(".bg-white") as HTMLElement;
    const q6Card = screen.getByText("99.1-q6").closest(".bg-white") as HTMLElement;

    expect(within(q1Card).getByText("Correct!")).toBeInTheDocument();
    expect(within(q2Card).getByText("Incorrect")).toBeInTheDocument();

    // Unanswered cards (empty single-blank, whitespace sentence, unanswered multi-part) must show Unanswered, NOT Incorrect, with zero spoilers
    for (const card of [q3Card, q4Card, q6Card]) {
      expect(within(card).getByText("Unanswered")).toBeInTheDocument();
      expect(within(card).queryByText("Incorrect")).not.toBeInTheDocument();
      expect(within(card).queryByText(/Expected Answer/i)).not.toBeInTheDocument();
      expect(within(card).queryByText(/Giải thích/i)).not.toBeInTheDocument();
    }

    // Partially completed multi-blank must be graded as Incorrect (not Unanswered)
    expect(within(q5Card).getByText("Incorrect")).toBeInTheDocument();
    expect(within(q5Card).queryByText("Unanswered")).not.toBeInTheDocument();

    // Unmount and remount with restored unitProgress (Scenario 7: Reload after partial submission)
    unmount();

    render(
      <ToastProvider>
        <AuthProvider>
          <ExerciseViewer
            unitNumber={99}
            unitProgress={{
              unitNumber: 99,
              title: "Mixed Unit",
              status: "in_progress",
              lastAccessedAt: "2026-11-12T10:00:00Z",
              completedAt: null,
              attempts: [
                {
                  id: "att-99",
                  exerciseId: "99.1",
                  exerciseNumber: "99.1",
                  scorePercentage: 16.7,
                  correctCount: 1,
                  totalQuestions: 6,
                  submittedAt: "2026-11-12T10:00:00Z",
                  items: [
                    { questionId: "99.1-q1", studentAnswer: "A", isCorrect: true },
                    { questionId: "99.1-q2", studentAnswer: "bad", isCorrect: false },
                    { questionId: "99.1-q3", studentAnswer: null, isCorrect: false },
                    { questionId: "99.1-q4", studentAnswer: null, isCorrect: false },
                    { questionId: "99.1-q5", studentAnswer: ["first", ""], isCorrect: false },
                    { questionId: "99.1-q6", studentAnswer: null, isCorrect: false },
                  ],
                },
              ],
            }}
          />
        </AuthProvider>
      </ToastProvider>
    );

    await screen.findByText(/Đã khôi phục từ lần làm trước/i);
    const rq1 = screen.getByText("99.1-q1").closest(".bg-white") as HTMLElement;
    const rq2 = screen.getByText("99.1-q2").closest(".bg-white") as HTMLElement;
    const rq3 = screen.getByText("99.1-q3").closest(".bg-white") as HTMLElement;
    const rq4 = screen.getByText("99.1-q4").closest(".bg-white") as HTMLElement;
    const rq5 = screen.getByText("99.1-q5").closest(".bg-white") as HTMLElement;
    const rq6 = screen.getByText("99.1-q6").closest(".bg-white") as HTMLElement;

    expect(within(rq1).getByText("Correct!")).toBeInTheDocument();
    expect(within(rq2).getByText("Incorrect")).toBeInTheDocument();
    expect(within(rq5).getByText("Incorrect")).toBeInTheDocument();

    for (const card of [rq3, rq4, rq6]) {
      expect(within(card).getByText("Unanswered")).toBeInTheDocument();
      expect(within(card).queryByText("Incorrect")).not.toBeInTheDocument();
      expect(within(card).queryByText(/Expected Answer/i)).not.toBeInTheDocument();
    }
  });
});

