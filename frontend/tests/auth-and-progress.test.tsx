import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import AppLayout from "../src/components/layout/AppLayout";
import ProgressDashboardPage from "../src/pages/ProgressDashboardPage";
import MistakeReviewPage from "../src/pages/MistakeReviewPage";
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

    // Locate retry input and submit correct answer
    const retryInput = screen.getByPlaceholderText(/type your correction\.\.\./i);
    const checkBtn = screen.getByRole("button", { name: /check correction/i });

    fireEvent.change(retryInput, { target: { value: "e" } });
    fireEvent.click(checkBtn);

    // Verify checkQuestionAnswer was called
    await waitFor(() => {
      expect(api.checkQuestionAnswer).toHaveBeenCalledWith("1.1-q2", "e");
    });

    // Verify resolved banner is displayed with Vietnamese explanation
    await waitFor(() => {
      expect(screen.getByText(/resolved! cleared from mistakes list/i)).toBeInTheDocument();
      expect(
        screen.getByText("Diễn tả hành động đang diễn ra tại thời điểm nói.")
      ).toBeInTheDocument();
    });
  });
});
