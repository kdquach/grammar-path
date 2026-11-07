import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UnitPage from "../src/pages/UnitPage";
import ProgressDashboardPage from "../src/pages/ProgressDashboardPage";
import { AuthProvider } from "../src/context/AuthContext";
import api from "../src/api/client";
import type {
  UnitDetail,
  UnitTheory,
  UnitProgressDetail,
  ToeicPracticeSession,
  AdaptiveQuizSession,
  AuthUser,
  ProgressOverview,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getUnitDetail: vi.fn(),
    getUnitTheory: vi.fn(),
    getUnitProgress: vi.fn(),
    updateUnitProgress: vi.fn(),
    generateToeicPractice: vi.fn(),
    generateAdaptiveQuiz: vi.fn(),
    getProgressOverview: vi.fn(),
    getAdaptiveAnalytics: vi.fn(),
    getAdaptiveRecommendations: vi.fn(),
    getCurrentUser: vi.fn(),
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

const mockAuthUser: AuthUser = {
  id: "user-toeic-1",
  email: "learner@grammarpath.local",
  displayName: "TOEIC Master",
  createdAt: "2026-11-06T12:00:00Z",
};

const mockUnitDetail: UnitDetail = {
  id: "unit-1",
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  theoryPdfPage: 13,
  exercisePdfPage: 14,
  bookTheoryPage: 2,
  bookExercisePage: 3,
  bookAnswerKeyPage: 347,
  confidenceLevel: "high",
  sourcePages: [{ id: "p-1", pageNumber: 13, pageRole: "theory" }],
  theorySections: [
    { sectionId: "1A", heading: "Study this example situation:", displayOrder: 1 },
  ],
  exercises: [
    {
      exerciseId: "1.1",
      exerciseNumber: "1.1",
      questionType: "fill_blank",
      instruction: "Complete the sentences.",
      hasVisualContext: false,
      displayOrder: 1,
      questionCount: 4,
      wordBankCount: 0,
    },
  ],
};

const mockUnitTheory: UnitTheory = {
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  theorySections: [
    {
      id: "ts-1",
      sectionId: "1A",
      heading: "Study this example situation:",
      sourceContent: "Sarah is driving to work. She is doing it now.",
      displayOrder: 1,
      sourcePages: [13],
    },
  ],
  textbookExamples: [
    {
      id: "te-1",
      exampleId: "1A-ex1",
      originalText: "Sarah is driving to work.",
      translationVi: "Sarah đang lái xe đi làm.",
      displayOrder: 1,
      sourcePages: [13],
    },
  ],
};

const mockUnitProgress: UnitProgressDetail = {
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  status: "completed",
  lastAccessedAt: "2026-11-06T14:00:00Z",
  completedAt: "2026-11-06T14:30:00Z",
  attempts: [],
};

const mockToeicSession: ToeicPracticeSession = {
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  questions: [
    {
      prompt: "Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now.",
      options: [
        { key: "A", text: "conducts" },
        { key: "B", text: "is conducting" },
        { key: "C", text: "conducted" },
        { key: "D", text: "has conducted" },
      ],
      correctAnswer: "B",
      explanation: "Dấu hiệu 'right now' diễn tả hành động đang diễn ra tại thời điểm nói. Chọn 'is conducting'.",
    },
    {
      prompt: "The IT support team _______ a new firewall this week.",
      options: [
        { key: "A", text: "is installing" },
        { key: "B", text: "installs" },
        { key: "C", text: "installed" },
        { key: "D", text: "install" },
      ],
      correctAnswer: "A",
      explanation: "Trạng ngữ 'this week' diễn tả tiến trình tạm thời trong hiện tại. Chọn 'is installing'.",
    },
  ],
};

const mockAdaptiveQuizSession: AdaptiveQuizSession = {
  sessionId: "quiz_test_12345",
  targetUnits: [
    { unitNumber: 1, title: "Present continuous (I am doing)", errorCount: 3 },
  ],
  totalQuestions: 2,
  questions: [
    {
      id: "q-1",
      questionId: "1.1-q1",
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      exerciseId: "ex-1",
      exerciseNumber: "1.1",
      questionType: "multiple_choice",
      instruction: "Choose the correct verb form",
      prompt: "Please don't make noise. I _______ to concentrate.",
      options: [
        { key: "A", text: "try" },
        { key: "B", text: "am trying" },
        { key: "C", text: "tried" },
        { key: "D", text: "was trying" },
      ],
      correctAnswer: "B",
      explanation: "Diễn tả hành động đang diễn ra lúc nói: 'am trying'.",
      contextClue: "Diễn ra ngay bây giờ",
    },
    {
      id: "q-2",
      questionId: "1.1-q2",
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      exerciseId: "ex-1",
      exerciseNumber: "1.1",
      questionType: "fill_blank",
      instruction: "Complete the sentence",
      prompt: "Where is Mark? He _______ a shower.",
      correctAnswer: "is having",
      explanation: "Hành động đang tiếp diễn: is having a shower.",
      contextClue: null,
    },
  ],
};

const mockProgressOverview: ProgressOverview = {
  units: {
    totalUnits: 145,
    completedCount: 5,
    inProgressCount: 2,
    notStartedCount: 138,
    completionPercentage: 3.4,
  },
  exercises: {
    totalExercises: 549,
    uniqueExercisesAttempted: 12,
    totalAttempts: 15,
    averageScorePercentage: 75,
  },
  questions: {
    totalAnswered: 40,
    uniqueQuestionsAnswered: 35,
    correctUniqueQuestions: 30,
    accuracyPercentage: 75,
  },
  recentAttempts: [],
  unitProgressMap: [],
};

describe("Phase 9.2: TOEIC-Style Practice Generator & Adaptive Quiz Engine UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("grammarpath_token", "fake-jwt-token");
    localStorage.setItem("grammarpath_user", JSON.stringify(mockAuthUser));

    vi.mocked(api.getCurrentUser).mockResolvedValue(mockAuthUser);
    vi.mocked(api.getUnitDetail).mockResolvedValue(mockUnitDetail);
    vi.mocked(api.getUnitTheory).mockResolvedValue(mockUnitTheory);
    vi.mocked(api.getUnitProgress).mockResolvedValue(mockUnitProgress);
    vi.mocked(api.generateToeicPractice).mockResolvedValue(mockToeicSession);
    vi.mocked(api.generateAdaptiveQuiz).mockResolvedValue(mockAdaptiveQuizSession);
    vi.mocked(api.getProgressOverview).mockResolvedValue(mockProgressOverview);
    vi.mocked(api.getAdaptiveAnalytics).mockResolvedValue({
      totalEvaluated: 10,
      totalCorrect: 6,
      totalErrors: 4,
      accuracyPercentage: 60,
      weakestUnits: [
        {
          unitNumber: 1,
          unitTitle: "Present continuous (I am doing)",
          totalAttempts: 6,
          errorCount: 3,
          accuracyPercentage: 50,
          weakestQuestionTypes: ["fill_blank"],
        },
      ],
      errorDistribution: [],
      weakestQuestionType: "fill_blank",
    });
    vi.mocked(api.getAdaptiveRecommendations).mockResolvedValue({
      recommendations: [],
      totalRecommendations: 0,
    });
  });

  // ─── 1. TOEIC Practice on UnitPage ─────────────────────────────────────────

  it("1. UnitPage: Renders '🎯 Luyện tập thêm dạng đề TOEIC' button and opens modal with questions", async () => {
    render(
      <MemoryRouter initialEntries={["/units/1"]}>
        <AuthProvider>
          <Routes>
            <Route path="/units/:unitNumber" element={<UnitPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for UnitPage to load
    await waitFor(() => {
      expect(screen.getByText("Present continuous (I am doing)")).toBeInTheDocument();
    });

    // Check that TOEIC Practice button exists
    const toeicBtn = screen.getByRole("button", {
      name: /🎯 Luyện tập thêm dạng đề TOEIC/i,
    });
    expect(toeicBtn).toBeInTheDocument();

    // Click to open TOEIC modal
    fireEvent.click(toeicBtn);

    // Verify API was called
    expect(api.generateToeicPractice).toHaveBeenCalledWith(1, 5);

    // Verify modal elements are displayed
    await waitFor(() => {
      expect(screen.getByText(/TOEIC Part 5 Format/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Ms. Patterson/i)
      ).toBeInTheDocument();
      expect(screen.getByText("is conducting")).toBeInTheDocument();
    });

    // Select option B and check answer
    const optionB = screen.getByRole("button", { name: /B is conducting/i });
    fireEvent.click(optionB);

    const checkBtn = screen.getByRole("button", { name: /Kiểm tra đáp án/i });
    fireEvent.click(checkBtn);

    // Verify feedback is shown with explanation
    await waitFor(() => {
      expect(screen.getByText(/Chính xác! Đáp án đúng là \(B\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Dấu hiệu 'right now' diễn tả hành động đang diễn ra/i)
      ).toBeInTheDocument();
    });
  });

  // ─── 2. Adaptive Quiz on ProgressDashboardPage ──────────────────────────────

  it("2. ProgressDashboardPage: Renders '⚡ Làm bài Quiz thông minh (Luyện theo điểm yếu)' button and triggers adaptive quiz", async () => {
    render(
      <MemoryRouter initialEntries={["/progress"]}>
        <AuthProvider>
          <Routes>
            <Route path="/progress" element={<ProgressDashboardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for dashboard to load
    await waitFor(() => {
      expect(
        screen.getByText(/Learning Progress Dashboard/i)
      ).toBeInTheDocument();
    });

    // Locate the Smart Quiz button (may be present in header or adaptive panel)
    const quizButtons = screen.getAllByRole("button", {
      name: /⚡ Làm bài Quiz thông minh \(Luyện theo điểm yếu\)/i,
    });
    expect(quizButtons.length).toBeGreaterThan(0);

    // Click the button
    fireEvent.click(quizButtons[0]);

    // Verify API call
    expect(api.generateAdaptiveQuiz).toHaveBeenCalledWith(5);

    // Verify Adaptive Quiz Modal content
    await waitFor(() => {
      expect(screen.getByText(/Adaptive Learning Engine/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Quiz Thông Minh — Luyện Theo Điểm Yếu/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please don't make noise\. I _______ to concentrate\./i)
      ).toBeInTheDocument();
    });

    // Select option B and check answer
    const optB = screen.getByRole("button", { name: /B am trying/i });
    fireEvent.click(optB);

    const checkBtn = screen.getByRole("button", { name: /Kiểm tra đáp án/i });
    fireEvent.click(checkBtn);

    // Verify explanation and accuracy
    await waitFor(() => {
      expect(
        screen.getByText(/Chính xác! Đáp án chuẩn: B/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Diễn tả hành động đang diễn ra lúc nói/i)
      ).toBeInTheDocument();
    });
  });
});
