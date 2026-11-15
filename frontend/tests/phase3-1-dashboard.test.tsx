import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../src/pages/DashboardPage";
import ProgressDashboardPage from "../src/pages/ProgressDashboardPage";
import AdaptiveReviewPanel from "../src/components/adaptive/AdaptiveReviewPanel";
import { AuthProvider } from "../src/context/AuthContext";
import api from "../src/api/client";
import type {
  AuthUser,
  DashboardSummary,
  ProgressOverview,
  AdaptiveAnalytics,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getCurrentUser: vi.fn(),
    getDashboardSummary: vi.fn(),
    getProgressOverview: vi.fn(),
    getAdaptiveAnalytics: vi.fn(),
    getAdaptiveRecommendations: vi.fn(),
    getMasterySummary: vi.fn().mockResolvedValue(null),
    getNextRecommendation: vi.fn().mockResolvedValue({ nextAction: null }),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
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
  id: "user-p31-1",
  email: "learner31@grammarpath.local",
  displayName: "Minh Quân",
  createdAt: "2026-11-13T00:00:00Z",
};

const emptySummary: DashboardSummary = {
  completion: {
    totalUnits: 145,
    openedCount: 1,
    completedCount: 0,
    inProgressCount: 1,
    notStartedCount: 144,
    completionPercentage: 0,
    totalExercises: 549,
    uniqueExercisesAttempted: 1,
    totalExerciseSubmissions: 1,
    averageExerciseScorePercentage: 0,
  },
  accuracy: {
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalUnansweredSkipped: 5,
    uniqueQuestionsAnswered: 0,
    uniqueQuestionsCorrect: 0,
    accuracyPercentage: null,
    sourceBreakdown: {},
  },
  activity: {
    lastActivityAt: null,
    activeDaysLast7: 0,
    activeDaysLast30: 0,
    dailyLast14: Array.from({ length: 14 }, (_, idx) => ({
      date: `2026-11-${String(idx + 1).padStart(2, "0")}`,
      answeredCount: 0,
      correctCount: 0,
      exerciseSubmissions: 0,
      toeicItemsAnswered: 0,
    })),
    recentActivity: [],
  },
  resumeUnit: {
    unitNumber: 1,
    title: "Present continuous (I am doing)",
    reason: "next_recommended",
    lastAccessedAt: null,
    toeicTag: "Mô tả đang diễn ra",
    priority: "core",
  },
  mistakes: {
    unresolvedCount: 0,
    recentItems: [],
  },
  weakUnits: [],
  toeic: {
    totalSessions: 0,
    itemsAnswered: 0,
    itemsCorrect: 0,
    accuracyPercentage: null,
    isOfficialToeic: false,
    scopeDisclaimer:
      "TOEIC grammar practice supports Part 5–6 sentence structures from your textbook units.",
  },
  masteryStatus: {
    engineActive: false,
    note: "Concept mastery modeling will be introduced in Phase 3.2.",
  },
};

const populatedSummary: DashboardSummary = {
  completion: {
    totalUnits: 145,
    openedCount: 4,
    completedCount: 2,
    inProgressCount: 2,
    notStartedCount: 141,
    completionPercentage: 1.4,
    totalExercises: 549,
    uniqueExercisesAttempted: 5,
    totalExerciseSubmissions: 6,
    averageExerciseScorePercentage: 84.5,
  },
  accuracy: {
    totalQuestionsAnswered: 20,
    totalCorrect: 16,
    totalIncorrect: 4,
    totalUnansweredSkipped: 7,
    uniqueQuestionsAnswered: 18,
    uniqueQuestionsCorrect: 15,
    accuracyPercentage: 80,
    sourceBreakdown: {
      exercise_submission: 16,
      mistake_retry: 4,
    },
  },
  activity: {
    lastActivityAt: "2026-11-13T03:00:00Z",
    activeDaysLast7: 3,
    activeDaysLast30: 5,
    dailyLast14: Array.from({ length: 14 }, (_, idx) => ({
      date: `2026-11-${String(idx + 1).padStart(2, "0")}`,
      answeredCount: idx === 13 ? 8 : 0,
      correctCount: idx === 13 ? 7 : 0,
      exerciseSubmissions: idx === 13 ? 2 : 0,
      toeicItemsAnswered: idx === 13 ? 5 : 0,
    })),
    recentActivity: [
      {
        id: "att-1",
        type: "exercise_attempt",
        unitNumber: 1,
        unitTitle: "Present continuous (I am doing)",
        exerciseNumber: "1.1",
        scorePercentage: 75,
        answeredCount: 6,
        unansweredCount: 2,
        correctCount: 5,
        totalQuestions: 8,
        occurredAt: "2026-11-13T02:30:00Z",
      },
      {
        id: "toeic-1",
        type: "toeic_practice",
        unitNumber: 98,
        difficulty: "medium",
        answeredCount: 5,
        correctCount: 4,
        totalQuestions: 5,
        accuracyPercentage: 80,
        occurredAt: "2026-11-13T03:00:00Z",
      },
    ],
  },
  resumeUnit: {
    unitNumber: 2,
    title: "Present simple (I do)",
    reason: "in_progress",
    lastAccessedAt: "2026-11-13T01:00:00Z",
    toeicTag: "Thì hiện tại đơn",
    priority: "core",
  },
  mistakes: {
    unresolvedCount: 1,
    recentItems: [
      {
        questionId: "1.2-q3",
        questionContent: "Please be quiet. I [blank] (work).",
        exerciseNumber: "1.2",
        unitNumber: 1,
        unitTitle: "Present continuous (I am doing)",
        ruleReference: "1B",
        lastStudentAnswer: "work",
        lastAttemptedAt: "2026-11-13T02:15:00Z",
      },
    ],
  },
  weakUnits: [
    {
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      evaluatedCount: 8,
      errorCount: 2,
      accuracyPercentage: 75,
      conceptCode: "unit.001",
      category: "Tenses",
    },
  ],
  toeic: {
    totalSessions: 2,
    itemsAnswered: 10,
    itemsCorrect: 8,
    accuracyPercentage: 80,
    isOfficialToeic: false,
    scopeDisclaimer:
      "TOEIC grammar practice supports Part 5–6 sentence structures from your textbook units.",
  },
  masteryStatus: {
    engineActive: false,
    note: "Concept mastery modeling will be introduced in Phase 3.2. Dashboard figures distinguish curriculum completion, answered accuracy, and recent activity.",
  },
};

describe("Phase 3.1 Dashboard & Nullable Accuracy UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("1. Shows sign-in gate on DashboardPage when unauthenticated", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /learning dashboard/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in \/ create account/i })
      ).toBeInTheDocument();
    });
  });

  it("2. Displays explicit null indicator '—' instead of '0%' when zero evaluated answers exist despite skipped blanks", async () => {
    localStorage.setItem("grammarpath_token", "valid-token");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getDashboardSummary).mockResolvedValue(emptySummary);

    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back, minh quân/i)).toBeInTheDocument();
    });

    const accuracyCard = screen.getByTestId("dashboard-accuracy-card");
    expect(accuracyCard).toHaveTextContent("—");
    expect(accuracyCard).toHaveTextContent("No evaluated answers yet");
    expect(accuracyCard).toHaveTextContent("5");
    expect(accuracyCard).toHaveTextContent("Skipped");
    expect(
      screen.getByText(/concept mastery modeling will be introduced in phase 3\.2/i)
    ).toBeInTheDocument();
  });

  it("3. Clearly distinguishes Completion, Answered Accuracy, Activity SVG chart, and TOEIC summary when populated", async () => {
    localStorage.setItem("grammarpath_token", "valid-token");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getDashboardSummary).mockResolvedValue(populatedSummary);

    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-completion-card")).toHaveTextContent(
        "/ 145 Units Completed (1.4%)"
      );
    });

    expect(screen.getByTestId("dashboard-accuracy-card")).toHaveTextContent("80%");
    expect(screen.getByTestId("dashboard-accuracy-card")).toHaveTextContent(
      "Exercise Check: 16"
    );
    expect(screen.getByTestId("dashboard-accuracy-card")).toHaveTextContent(
      "Mistake Retry: 4"
    );
    expect(
      screen.getByRole("img", { name: /14-day study activity bar chart/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Continue Unit 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Mistakes \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("TOEIC Drill")).toBeInTheDocument();
    expect(screen.getByText(/6 answered \(2 skipped\)/i)).toBeInTheDocument();
  });

  it("4. Renders nullable '—' and 'Chưa có dữ liệu' in ProgressDashboardPage and AdaptiveReviewPanel for zero evaluated items", async () => {
    localStorage.setItem("grammarpath_token", "valid-token");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);

    const zeroOverview: ProgressOverview = {
      units: {
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 145,
        totalUnits: 145,
        completionPercentage: 0,
      },
      exercises: {
        totalAttempts: 0,
        uniqueExercisesAttempted: 0,
        totalExercises: 549,
        averageScorePercentage: null,
      },
      questions: {
        totalAnswered: 0,
        uniqueQuestionsAnswered: 0,
        correctUniqueQuestions: 0,
        accuracyPercentage: null,
      },
      recentAttempts: [],
      unitProgressMap: [],
    };

    const zeroAnalytics: AdaptiveAnalytics = {
      totalEvaluated: 0,
      totalCorrect: 0,
      totalErrors: 0,
      accuracyPercentage: null,
      weakestUnits: [],
      errorDistribution: [],
      weakestQuestionType: null,
      weakRules: [],
    };

    vi.mocked(api.getProgressOverview).mockResolvedValue(zeroOverview);
    vi.mocked(api.getAdaptiveAnalytics).mockResolvedValue(zeroAnalytics);
    vi.mocked(api.getAdaptiveRecommendations).mockResolvedValue({
      recommendations: [],
      totalRecommendations: 0,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProgressDashboardPage />
          <AdaptiveReviewPanel />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No answered questions yet")).toBeInTheDocument();
      expect(
        screen.getAllByText("No exercise attempts recorded yet").length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Chưa có dữ liệu").length).toBeGreaterThanOrEqual(1);
    });
  });
});
