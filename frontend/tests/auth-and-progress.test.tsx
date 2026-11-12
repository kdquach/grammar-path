import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import AppLayout from "../src/components/layout/AppLayout";
import ProgressDashboardPage from "../src/pages/ProgressDashboardPage";
import MistakeReviewPage from "../src/pages/MistakeReviewPage";
import UnitPage from "../src/pages/UnitPage";
import api from "../src/api/client";
import type {
  AuthResponse,
  AuthUser,
  ProgressOverview,
  MistakeItem,
  QuestionCheckResult,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    getCurrentUser: vi.fn(),
    getProgressOverview: vi.fn(),
    getUnitDetail: vi.fn(),
    getUnitTheory: vi.fn(),
    getUnitExercises: vi.fn(),
    getUnitProgress: vi.fn(),
    updateUnitProgress: vi.fn(),
    getMistakes: vi.fn(),
    checkQuestionAnswer: vi.fn(),
    getQuestionSolution: vi.fn(),
    getAdaptiveAnalytics: vi.fn(),
    getAdaptiveRecommendations: vi.fn(),
    explainTheory: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
    getStoredToken: vi.fn(() => localStorage.getItem("grammarpath_token")),
    setStoredToken: vi.fn((token: string | null) => {
      if (token) localStorage.setItem("grammarpath_token", token);
      else localStorage.removeItem("grammarpath_token");
    }),
  };
});

const mockUser: AuthUser = {
  id: "user-123",
  email: "alex@grammarpath.local",
  displayName: "Alex Learner",
  createdAt: "2026-11-06T10:00:00Z",
};

const mockAuthResponse: AuthResponse = {
  token: "mock-jwt-token-xyz",
  user: mockUser,
};

const mockOverview: ProgressOverview = {
  units: {
    completedCount: 5,
    inProgressCount: 3,
    notStartedCount: 137,
    totalUnits: 145,
    completionPercentage: 3.4,
  },
  exercises: {
    totalAttempts: 12,
    uniqueExercisesAttempted: 10,
    totalExercises: 549,
    averageScorePercentage: 88.5,
  },
  questions: {
    totalAnswered: 40,
    uniqueQuestionsAnswered: 35,
    correctUniqueQuestions: 31,
    accuracyPercentage: 87.5,
  },
  recentAttempts: [
    {
      id: "attempt-1",
      exerciseId: "1.1",
      exerciseNumber: "1.1",
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      scorePercentage: 87.5,
      correctCount: 7,
      totalQuestions: 8,
      submittedAt: "2026-11-06T12:00:00Z",
    },
  ],
  unitProgressMap: [
    {
      unitNumber: 1,
      status: "completed",
      lastAccessedAt: "2026-11-06T12:00:00Z",
      completedAt: "2026-11-06T12:00:00Z",
    },
  ],
};

const mockMistakes: MistakeItem[] = [
  {
    questionId: "1.1-q2",
    questionContent: "She's eating an apple.",
    questionType: "matching",
    exerciseId: "1.1",
    exerciseNumber: "1.1",
    unitNumber: 1,
    unitTitle: "Present continuous (I am doing)",
    lastStudentAnswer: "wrong_ans",
    lastAttemptedAt: "2026-11-06T12:00:00Z",
  },
];

describe("Frontend Authentication, Progress Dashboard & Mistake Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.getAdaptiveAnalytics).mockResolvedValue({
      totalEvaluated: 10,
      totalCorrect: 8,
      totalErrors: 2,
      accuracyPercentage: 80,
      weakestUnits: [],
      errorDistribution: [],
      weakestQuestionType: null,
      weakRules: [],
    });
    vi.mocked(api.getAdaptiveRecommendations).mockResolvedValue({
      recommendations: [],
      totalRecommendations: 0,
    });
  });

  // 1. AuthModal & AppLayout Header authentication state
  it("1. AuthModal and AppLayout: Logging in updates header state with displayName and navigation links", async () => {
    vi.mocked(api.loginUser).mockResolvedValue(mockAuthResponse);
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initially logged out: "Sign In / Register" button is visible
    const signInBtn = screen.getByRole("button", { name: /sign in \/ register/i });
    expect(signInBtn).toBeInTheDocument();

    // Navigation links for progress and mistakes should not be visible when logged out
    expect(screen.queryByText("My Progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Mistakes")).not.toBeInTheDocument();

    // Click "Sign In / Register" to open AuthModal
    fireEvent.click(signInBtn);

    // Modal is now open
    expect(screen.getByRole("heading", { name: /sign in to grammarpath/i })).toBeInTheDocument();

    // Fill in credentials
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByTestId("auth-submit-button");

    fireEvent.change(emailInput, { target: { value: "alex@grammarpath.local" } });
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(submitBtn);

    // Verify api.loginUser was called
    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        email: "alex@grammarpath.local",
        password: "secret123",
      });
    });

    // Verify header updates to show user display name and navigation links
    await waitFor(() => {
      expect(screen.getByText("Alex Learner")).toBeInTheDocument();
      expect(screen.getByText("My Progress")).toBeInTheDocument();
      expect(screen.getByText("Review Mistakes")).toBeInTheDocument();
    });
  });

  // 2. ProgressDashboardPage
  it("2. ProgressDashboardPage: Renders KPI cards and recent exercise attempts from getProgressOverview()", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getProgressOverview).mockResolvedValue(mockOverview);

    // Seed token in localStorage so user is restored as authenticated
    localStorage.setItem("grammarpath_token", "mock-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProgressDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify title and user greeting
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /learning progress dashboard/i })
      ).toBeInTheDocument();
    });

    // Verify 4 KPI cards values
    await waitFor(() => {
      // Units Completed KPI
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText(/\/ 145 Units/i)).toBeInTheDocument();

      // Exercises Practiced KPI
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText(/\/ 549 Exercises/i)).toBeInTheDocument();

      // Average Score KPI
      expect(screen.getByText("88.5%")).toBeInTheDocument();

      // Accuracy KPI (appears in KPI card and recent attempts table)
      expect(screen.getAllByText("87.5%").length).toBeGreaterThanOrEqual(1);
    });

    // Verify recent exercise attempts list
    expect(screen.getByText("Exercise 1.1")).toBeInTheDocument();
    expect(screen.getByText(/Unit 1: Present continuous/i)).toBeInTheDocument();
    expect(screen.getByText("7 / 8")).toBeInTheDocument();
  });

  // 3. MistakeReviewPage
  it("3. MistakeReviewPage: Renders unresolved mistake items, allows submitting retry answer, and marks as resolved when correct", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getMistakes).mockResolvedValue(mockMistakes);

    const mockCheckResult: QuestionCheckResult = {
      questionId: "1.1-q2",
      isCorrect: true,
      studentAnswer: "e",
      correctAnswers: ["e"],
      expectedAnswers: ["e"],
      explanation: "Diễn tả hành động đang diễn ra tại thời điểm nói.",
      ruleReference: "1A",
    };

    vi.mocked(api.checkQuestionAnswer).mockResolvedValue(mockCheckResult);

    // Seed token in localStorage
    localStorage.setItem("grammarpath_token", "mock-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <MistakeReviewPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for mistake to load
    await waitFor(() => {
      expect(screen.getByText("She's eating an apple.")).toBeInTheDocument();
      expect(screen.getByText("wrong_ans")).toBeInTheDocument();
      expect(screen.getByText("1 Unresolved")).toBeInTheDocument();
    });

    // Locate polymorphic retry input and submit correct answer
    const retryInput = screen.getByPlaceholderText(/type full sentence or missing phrase\.\.\./i);
    const checkBtn = screen.getByRole("button", { name: /check correction/i });

    fireEvent.change(retryInput, { target: { value: "e" } });
    fireEvent.click(checkBtn);

    // Verify checkQuestionAnswer was called
    await waitFor(() => {
      expect(api.checkQuestionAnswer).toHaveBeenCalledWith("1.1-q2", "e");
    });

    // Verify resolved banner and explanation are displayed
    await waitFor(() => {
      expect(screen.getByText(/resolved! cleared from mistakes list/i)).toBeInTheDocument();
      expect(
        screen.getByText("Diễn tả hành động đang diễn ra tại thời điểm nói.")
      ).toBeInTheDocument();
    });
  });

  // 4. MistakeReviewPage polymorphic multi-blank + Word Bank + option retry
  it("5. MistakeReviewPage: Supports polymorphic multi-blank retry, WordBankBar insertion, and refreshes adaptive analytics on resolve", async () => {
    const polyMistakes: MistakeItem[] = [
      {
        questionId: "86.4-q9",
        questionContent:
          "'Who were you talking to just now?' '[blank]. I wasn't talking to [blank].'",
        questionType: "fill_blank",
        instruction: "Complete the sentences with nobody/anything/...",
        ruleReference: "86A",
        wordBankItems: [{ id: "wb-86", word: "anyone", displayOrder: 1 }],
        options: [
          { optionKey: "a", optionText: "No-one / Anyone", displayOrder: 1 },
          { optionKey: "b", optionText: "no-one / anyone", displayOrder: 2 },
        ],
        blanks: [{ blankIndex: 1 }, { blankIndex: 2 }],
        parts: [],
        exerciseId: "86.4",
        exerciseNumber: "86.4",
        unitNumber: 86,
        unitTitle: "No/none/any Nothing/nobody etc.",
        lastStudentAnswer: ["Nothing", "nothing"],
        lastAttemptedAt: "2026-11-12T10:00:00Z",
      },
    ];

    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getMistakes).mockResolvedValue(polyMistakes);
    vi.mocked(api.checkQuestionAnswer).mockResolvedValue({
      questionId: "86.4-q9",
      isCorrect: true,
      studentAnswer: ["No-one", "anyone"],
      correctAnswers: ["No-one / anyone"],
      expectedAnswers: ["No-one / anyone"],
      explanation: "Sau 'I wasn't talking to' dùng 'anyone'.",
      ruleReference: "86A",
    });

    localStorage.setItem("grammarpath_token", "mock-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <MistakeReviewPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Blank #1")).toBeInTheDocument();
      expect(screen.getByText("Blank #2")).toBeInTheDocument();
      expect(screen.getByText("Nothing / nothing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Rule 86A/i })).toBeInTheDocument();
    });

    // Click slash pills and verify WordBankBar click inserts into focused/empty blank
    fireEvent.click(screen.getByRole("button", { name: "No-one" }));
    fireEvent.click(
      within(screen.getByTestId("word-bank-bar")).getByRole("button", {
        name: "anyone",
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /check correction/i }));

    await waitFor(() => {
      expect(api.checkQuestionAnswer).toHaveBeenCalledWith("86.4-q9", [
        "No-one",
        "anyone",
      ]);
      expect(screen.getByText(/resolved! cleared from mistakes list/i)).toBeInTheDocument();
      // Analytics refetched after resolving mistake
      expect(vi.mocked(api.getAdaptiveAnalytics).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // 6. UnitPage manual status toggle preserves attempts
  it("6. UnitPage: Toggling manual completion status preserves exercise attempts in state", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getUnitDetail).mockResolvedValue({
      id: "unit-23",
      unitNumber: 23,
      title: "Will and shall 2",
      theoryPdfPage: 58,
      exercisePdfPage: 59,
      bookTheoryPage: 46,
      bookExercisePage: 47,
      bookAnswerKeyPage: 342,
      confidenceLevel: "high",
      sourcePages: [],
      theorySections: [{ sectionId: "23A", heading: "23A", displayOrder: 1 }],
      exercises: [
        {
          exerciseId: "23.1",
          exerciseNumber: "23.1",
          questionType: "fill_blank",
          instruction: "Complete sentences",
          hasVisualContext: false,
          displayOrder: 1,
          questionCount: 4,
          wordBankCount: 0,
        },
      ],
    });
    vi.mocked(api.getUnitTheory).mockResolvedValue({
      unitNumber: 23,
      title: "Will and shall 2",
      theorySections: [
        {
          id: "ts-23",
          sectionId: "23A",
          heading: "23A",
          sourceContent: "Sample theory",
          displayOrder: 1,
          sourcePages: [46],
        },
      ],
      textbookExamples: [],
    });
    vi.mocked(api.getUnitProgress).mockResolvedValue({
      unitNumber: 23,
      title: "Will and shall 2",
      status: "in_progress",
      lastAccessedAt: "2026-11-12T10:00:00Z",
      completedAt: null,
      attempts: [
        {
          id: "att-23-1",
          exerciseId: "23.1",
          exerciseNumber: "23.1",
          scorePercentage: 75,
          correctCount: 3,
          totalQuestions: 4,
          submittedAt: "2026-11-12T09:50:00Z",
          items: [
            {
              questionId: "23.1-q1",
              studentAnswer: "will go",
              isCorrect: true,
            },
          ],
        },
      ],
    });
    vi.mocked(api.getUnitExercises).mockResolvedValue([
      {
        id: "ex-23-1",
        exerciseId: "23.1",
        exerciseNumber: "23.1",
        questionType: "fill_blank",
        instruction: "Complete sentences",
        hasVisualContext: false,
        displayOrder: 1,
        wordBankItems: [],
        questions: [
          {
            id: "q-23-1",
            questionId: "23.1-q1",
            questionContent: "I [___] tomorrow.",
            isExample: false,
            hasVisualContext: false,
            displayOrder: 1,
            options: [],
            blanks: [{ blankIndex: 1 }],
            parts: [],
          },
        ],
      },
    ]);
    vi.mocked(api.updateUnitProgress).mockResolvedValue({
      unitNumber: 23,
      title: "Will and shall 2",
      status: "completed",
      lastAccessedAt: "2026-11-12T10:05:00Z",
      completedAt: "2026-11-12T10:05:00Z",
      attempts: [],
    });

    localStorage.setItem("grammarpath_token", "mock-token");

    render(
      <MemoryRouter initialEntries={["/units/23"]}>
        <AuthProvider>
          <Routes>
            <Route path="/units/:unitNumber" element={<UnitPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const markBtn = await screen.findByRole("button", { name: /mark as completed/i });
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    // Switch to Exercises tab -> preserved score badge (75%) must still render!
    fireEvent.click(screen.getByRole("button", { name: /exercises overview/i }));
    await waitFor(() => {
      expect(screen.getByText("✓ 75%")).toBeInTheDocument();
    });
  });

  // 4. Sidebar Collapsible State Toggle
  it("4. AppLayout Sidebar: Toggle collapse/expand button toggles sidebar width and persists preference in localStorage", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial state: expanded, shows "Catalog", "Curriculum", and collapse button
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    expect(screen.getByText("Murphy's English Grammar")).toBeInTheDocument();

    const toggleBtn = screen.getByTestId("sidebar-toggle-button");
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-label", "Thu nhỏ thanh bên");

    // Click toggle button to collapse
    fireEvent.click(toggleBtn);

    // In collapsed mode: full text label "Murphy's English Grammar" is hidden, aria-label switches to expand
    expect(screen.queryByText("Murphy's English Grammar")).not.toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-label", "Mở rộng thanh bên");
    expect(localStorage.getItem("grammarpath_sidebar_collapsed")).toBe("true");

    // Click toggle button again to expand
    fireEvent.click(toggleBtn);

    // Full text restored
    expect(screen.getByText("Murphy's English Grammar")).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-label", "Thu nhỏ thanh bên");
    expect(localStorage.getItem("grammarpath_sidebar_collapsed")).toBe("false");
  });
});
