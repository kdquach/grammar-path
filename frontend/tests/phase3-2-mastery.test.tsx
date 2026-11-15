import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MasteryPage from "../src/pages/MasteryPage";
import ReviewCenterPage from "../src/pages/ReviewCenterPage";
import DashboardPage from "../src/pages/DashboardPage";
import { AuthProvider } from "../src/context/AuthContext";
import api from "../src/api/client";
import type {
  AuthUser,
  MasterySummaryResponse,
  ConceptMasteryDetailResponse,
  AllReviewsResponse,
  CompleteReviewResponse,
  RecommendationItem,
  DashboardSummary,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getCurrentUser: vi.fn(),
    getMasterySummary: vi.fn(),
    getConceptMasteryDetail: vi.fn(),
    recalculateMastery: vi.fn(),
    getDueReviews: vi.fn(),
    getAllReviews: vi.fn(),
    completeReview: vi.fn(),
    getRecommendations: vi.fn(),
    getNextRecommendation: vi.fn(),
    getDashboardSummary: vi.fn(),
    getProgressOverview: vi.fn(),
    getAdaptiveAnalytics: vi.fn(),
    getAdaptiveRecommendations: vi.fn(),
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
  id: "user-phase32-1",
  email: "learner32@grammarpath.local",
  displayName: "Hải Nam",
  createdAt: "2026-11-13T00:00:00Z",
};

const mockMasterySummary: MasterySummaryResponse = {
  totalConcepts: 161,
  startedConcepts: 3,
  statusCounts: {
    not_started: 158,
    insufficient_data: 0,
    developing: 1,
    practicing: 1,
    proficient: 0,
    mastered: 1,
    needs_review: 0,
  },
  averageMastery: 72.5,
  averageRetention: 0.9,
  dueReviewsCount: 1,
  masteries: [
    {
      conceptId: "concept-1",
      conceptCode: "unit.001.present_continuous",
      conceptName: "Present Continuous for actions happening now",
      category: "present_tenses",
      masteryStatus: "mastered",
      masteryScore: 88.5,
      retentionScore: 0.92,
      distinctQuestionCount: 6,
      evidenceCount: 7,
      lastPracticedAt: "2026-11-13T08:00:00Z",
    },
    {
      conceptId: "concept-2",
      conceptCode: "unit.002.present_simple",
      conceptName: "Present Simple vs Present Continuous",
      category: "present_tenses",
      masteryStatus: "developing",
      masteryScore: 55.0,
      retentionScore: 0.75,
      distinctQuestionCount: 3,
      evidenceCount: 4,
      lastPracticedAt: "2026-11-13T09:00:00Z",
    },
    {
      conceptId: "concept-3",
      conceptCode: "unit.005.past_simple",
      conceptName: "Past Simple irregular verbs",
      category: "past_tenses",
      masteryStatus: "needs_review",
      masteryScore: 40.0,
      retentionScore: 0.52,
      distinctQuestionCount: 5,
      evidenceCount: 6,
      lastPracticedAt: "2026-10-20T09:00:00Z",
    },
  ],
};

const mockConceptDetail: ConceptMasteryDetailResponse = {
  concept: {
    id: "concept-1",
    code: "unit.001.present_continuous",
    name: "Present Continuous for actions happening now",
    description: "Actions happening at the time of speaking",
    category: "present_tenses",
    relatedUnits: [
      {
        unitNumber: 1,
        unitTitle: "Present continuous (I am doing)",
        sectionId: "1A",
        confidence: "high",
      },
    ],
  },
  mastery: {
    status: "mastered",
    score: 88.5,
    retentionScore: 0.92,
    evidenceCount: 7,
    distinctQuestionCount: 6,
    correctCount: 6,
    incorrectCount: 1,
    repeatedAttemptCount: 1,
    lastPracticedAt: "2026-11-13T08:00:00Z",
    nextReviewDueAt: "2026-11-20T08:00:00Z",
    reviewState: "scheduled",
    stabilityDays: 7.0,
    explanationVi: "Xuất sắc! Bạn đã chứng minh sự am hiểu vững chắc với 6 câu hỏi khác nhau và điểm số 88.5%.",
    recommendedActionVi: "Duy trì lịch ôn tập ngắt quãng (Spaced Repetition) khi đến hạn để không quên kiến thức.",
  },
  historyEvents: [
    {
      id: "ev-1",
      previousStatus: "practicing",
      newStatus: "mastered",
      previousScore: 78.0,
      newScore: 88.5,
      reason: "exercise_submission",
      createdAt: "2026-11-13T08:00:00Z",
    },
  ],
};

const mockDueReviews = {
  count: 1,
  items: [
    {
      scheduleId: "sched-1",
      conceptId: "concept-3",
      conceptCode: "unit.005.past_simple",
      conceptName: "Past Simple irregular verbs",
      category: "past_tenses",
      unitNumbers: [5],
      dueAt: "2026-11-10T00:00:00Z",
      stabilityDays: 3.0,
      masteryScore: 40.0,
      retentionScore: 0.52,
      practiceQuestions: [
        {
          id: "q-unit5-ex1-1",
          exerciseId: "ex-5-1",
          exercise: { exerciseNumber: "5.1" },
          unitNumber: 5,
          instruction: "Complete the sentences. Put the verb into the correct form.",
          questionContent: "Yesterday I ___ (go) to the library.",
          blanks: [{ id: "b1", blankIndex: 1, placeholder: null }],
        },
      ],
    },
  ],
};

const mockAllReviews: AllReviewsResponse = {
  totalSchedules: 1,
  reviews: [
    {
      id: "sched-1",
      conceptId: "concept-3",
      conceptCode: "unit.005.past_simple",
      conceptName: "Past Simple irregular verbs",
      category: "past_tenses",
      reviewState: "due",
      stabilityDays: 3.0,
      intervalDays: 3.0,
      reviewCount: 2,
      consecutiveCorrect: 1,
      lastReviewedAt: "2026-11-07T00:00:00Z",
      isDue: true,
      dueAt: "2026-11-10T00:00:00Z",
    },
  ],
};

const mockCompleteReviewResult: CompleteReviewResponse = {
  status: "success",
  messageVi: "Xuất sắc! Độ ổn định kiến thức tăng lên 6.0 ngày.",
  accuracy: 100,
  stabilityDays: 6.0,
  intervalDays: 6,
  dueAt: "2026-11-18T00:00:00Z",
};

const mockRecommendation: RecommendationItem = {
  id: "rec-1",
  type: "review",
  priority: 95,
  conceptId: "concept-3",
  conceptCode: "unit.005.past_simple",
  conceptName: "Past Simple irregular verbs",
  category: "past_tenses",
  unitNumber: 5,
  unitTitle: "Past simple (I did)",
  exerciseId: "ex-5-1",
  exerciseTitle: "Exercise 5.1",
  estimatedQuestionCount: 3,
  reasonVi: "Điểm ghi nhớ của bạn đã giảm xuống 52%. Hãy hoàn thành 3 bài tập ngắn để củng cố trí nhớ.",
  actionUrl: "/reviews",
};

const mockDashboardSummary: DashboardSummary = {
  completion: {
    totalUnits: 145,
    openedCount: 3,
    completedCount: 1,
    inProgressCount: 2,
    notStartedCount: 142,
    completionPercentage: 1,
    totalExercises: 549,
    uniqueExercisesAttempted: 4,
    totalExerciseSubmissions: 5,
    averageExerciseScorePercentage: 80,
  },
  accuracy: {
    totalQuestionsAnswered: 20,
    totalCorrect: 16,
    totalIncorrect: 4,
    totalUnansweredSkipped: 2,
    uniqueQuestionsAnswered: 15,
    uniqueQuestionsCorrect: 12,
    accuracyPercentage: 80,
    sourceBreakdown: { exercise_submission: 16, mistake_review: 4 },
  },
  activity: {
    lastActivityAt: "2026-11-13T10:00:00Z",
    activeDaysLast7: 3,
    activeDaysLast30: 5,
    dailyLast14: [],
    recentActivity: [],
  },
  resumeUnit: {
    unitNumber: 2,
    title: "Present simple (I do)",
    reason: "in_progress",
    lastAccessedAt: "2026-11-13T09:00:00Z",
    toeicTag: "Thì hiện tại đơn",
    priority: "core",
  },
  mistakes: {
    unresolvedCount: 2,
    recentItems: [],
  },
  weakUnits: [],
  toeic: {
    totalSessions: 1,
    itemsAnswered: 5,
    itemsCorrect: 4,
    accuracyPercentage: 80,
    isOfficialToeic: false,
    scopeDisclaimer: "TOEIC grammar practice",
  },
  masteryStatus: {
    engineActive: true,
    note: "Concept mastery modeling is active and evidence-based.",
  },
};

describe("Phase 3.2: Learning Mastery Engine & Personalized Learning Frontend UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("grammarpath_token", "fake-token");
    (api.getCurrentUser as any).mockResolvedValue(mockUser);
    (api.getMasterySummary as any).mockResolvedValue(mockMasterySummary);
    (api.getConceptMasteryDetail as any).mockResolvedValue(mockConceptDetail);
    (api.getDueReviews as any).mockResolvedValue(mockDueReviews);
    (api.getAllReviews as any).mockResolvedValue(mockAllReviews);
    (api.getNextRecommendation as any).mockResolvedValue({ nextAction: mockRecommendation });
    (api.getRecommendations as any).mockResolvedValue({ total: 1, recommendations: [mockRecommendation] });
    (api.getDashboardSummary as any).mockResolvedValue(mockDashboardSummary);
    (api.completeReview as any).mockResolvedValue(mockCompleteReviewResult);
  });

  it("1. MasteryPage renders summary metrics, status counts, and concept cards", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MasteryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Độ thành thạo Ngữ pháp")).toBeInTheDocument();
    });

    // Metric assertions
    expect(screen.getAllByText("Mastered")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Proficient")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Practicing")[0]).toBeInTheDocument();

    // Concept items rendered
    expect(screen.getByText("Present Continuous for actions happening now")).toBeInTheDocument();
    expect(screen.getByText("Present Simple vs Present Continuous")).toBeInTheDocument();
    expect(screen.getByText("Past Simple irregular verbs")).toBeInTheDocument();
  });

  it("2. MasteryPage filters concepts by search query", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MasteryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Độ thành thạo Ngữ pháp")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên chủ điểm/i);
    fireEvent.change(searchInput, { target: { value: "irregular" } });

    // Should only show Past Simple irregular verbs
    expect(screen.getByText("Past Simple irregular verbs")).toBeInTheDocument();
    expect(screen.queryByText("Present Continuous for actions happening now")).not.toBeInTheDocument();
  });

  it("3. MasteryPage opens Explainability Modal on concept card click", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MasteryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Present Continuous for actions happening now")).toBeInTheDocument();
    });

    const conceptCard = screen.getByText("Present Continuous for actions happening now");
    fireEvent.click(conceptCard);

    await waitFor(() => {
      expect(api.getConceptMasteryDetail).toHaveBeenCalledWith("concept-1");
      expect(screen.getByText("Căn cứ xác định trạng thái")).toBeInTheDocument();
    });

    // Verify explanation and metrics shown in modal
    expect(
      screen.getByText(/Xuất sắc! Bạn đã chứng minh sự am hiểu vững chắc/i)
    ).toBeInTheDocument();
    expect(screen.getByText("7 ngày")).toBeInTheDocument(); // Stability
  });

  it("4. ReviewCenterPage renders due reviews and submits interactive drill", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ReviewCenterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Trung tâm Ôn tập Ngắt quãng")).toBeInTheDocument();
    });

    // Due card shown
    const dueConcept = screen.getAllByText("Past Simple irregular verbs")[0];
    expect(dueConcept).toBeInTheDocument();

    // Start review drill
    const startButton = screen.getByRole("button", { name: /Ôn tập ngay/i });
    fireEvent.click(startButton);

    // Drill modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Yesterday I ___ \(go\) to the library/i)).toBeInTheDocument();
    });

    // Fill in the answer
    const input = screen.getByPlaceholderText("Nhập câu trả lời của bạn...");
    fireEvent.change(input, { target: { value: "went" } });

    // Submit review
    const submitButton = screen.getByRole("button", { name: /Nộp bài & Cập nhật lịch/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.completeReview).toHaveBeenCalledWith("concept-3", {
        answers: { "q-unit5-ex1-1": "went" },
        scheduleId: "sched-1",
      });
    });

    // Success feedback
    await waitFor(() => {
      expect(screen.getByText("Hoàn thành xuất sắc!")).toBeInTheDocument();
      expect(screen.getByText(/Độ ổn định kiến thức tăng lên 6.0 ngày/i)).toBeInTheDocument();
    });
  });

  it("5. DashboardPage renders Personalized Recommendation Banner and Mastery quick pills", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("personalized-recommendation-card")).toBeInTheDocument();
    });

    // Recommendation banner assertions
    const banner = screen.getByTestId("personalized-recommendation-card");
    expect(banner).toHaveTextContent("🎯 Khuyến nghị học tập cá nhân hóa");
    expect(banner).toHaveTextContent("Past Simple irregular verbs — Unit 5");
    expect(banner).toHaveTextContent("Điểm ghi nhớ của bạn đã giảm xuống 52%");

    // Header Quick Link assertions
    expect(screen.getByText(/Độ thành thạo \(1\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ôn tập \(1\)/i)[0]).toBeInTheDocument();
  });
});
