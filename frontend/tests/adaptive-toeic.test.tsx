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
    getTheorySection: vi.fn(),
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
  difficulty: "medium",
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
      difficulty: "medium",
      ruleReference: "1A",
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
      difficulty: "medium",
      ruleReference: "1C",
    },
  ],
};

const mockAdaptiveQuizSession: AdaptiveQuizSession = {
  sessionId: "quiz_test_12345",
  difficulty: "medium",
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
      difficulty: "medium",
      ruleReference: "1B",
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
      difficulty: "medium",
      ruleReference: "1B",
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
    totalAnswered: 50,
    uniqueQuestionsAnswered: 40,
    correctUniqueQuestions: 32,
    accuracyPercentage: 80,
  },
  recentAttempts: [],
  unitProgressMap: [],
};

describe("Phase 9.2 & 9.3: TOEIC Practice, Adaptive Quiz & Rule Analytics UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("grammarpath_token", "fake-jwt-token-toeic");
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
      weakRules: [
        {
          ruleReference: "1A",
          heading: "Study this example situation:",
          unitNumber: 1,
          unitTitle: "Present continuous (I am doing)",
          errorCount: 3,
          totalAttempts: 5,
          accuracyPercentage: 40,
        },
      ],
    });
    vi.mocked(api.getAdaptiveRecommendations).mockResolvedValue({
      recommendations: [
        {
          unitNumber: 1,
          unitTitle: "Present continuous (I am doing)",
          priority: "high",
          reason: "Tỷ lệ sai cao ở Unit 1",
          errorCount: 3,
          accuracyPercentage: 50,
          weakestQuestionTypes: ["fill_blank"],
          targetRules: ["1A", "1B"],
          suggestedActions: ["Đọc lại lý thuyết mục 1A"],
        },
      ],
      totalRecommendations: 1,
    });
  });

  // ─── 1. TOEIC Practice on UnitPage ─────────────────────────────────────────

  it("1. UnitPage: Renders '🎯 Luyện tập thêm dạng đề TOEIC' button, opens modal, supports 3-tier difficulty selector, and displays rule reference badges", async () => {
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

    // Verify API was called initially with medium difficulty
    expect(api.generateToeicPractice).toHaveBeenCalledWith(1, 5, "medium");

    // Verify modal elements and 3-tier difficulty selector are displayed
    await waitFor(() => {
      expect(screen.getByText(/TOEIC Part 5 Format/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Dễ \(Cơ bản\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Trung bình \(TOEIC Chuẩn\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Khó \(Bẫy TOEIC 700\+\)/i })).toBeInTheDocument();
      expect(screen.getByText(/Ms. Patterson/i)).toBeInTheDocument();
    });

    // Select option B and check answer
    const optionB = screen.getByRole("button", { name: /B is conducting/i });
    fireEvent.click(optionB);

    const checkBtn = screen.getByRole("button", { name: /Kiểm tra đáp án/i });
    fireEvent.click(checkBtn);

    // Verify feedback is shown with explanation AND ruleReference badge
    await waitFor(() => {
      expect(screen.getByText(/Chính xác! Đáp án đúng là \(B\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Dấu hiệu 'right now' diễn tả hành động đang diễn ra/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Quy tắc 1A/i })).toBeInTheDocument();
    });

    // Switch difficulty to 'hard'
    const hardBtn = screen.getByRole("button", { name: /Khó \(Bẫy TOEIC 700\+\)/i });
    fireEvent.click(hardBtn);

    expect(api.generateToeicPractice).toHaveBeenCalledWith(1, 5, "hard");
  });

  // ─── 2. Adaptive Quiz & Rule Analytics on ProgressDashboardPage ────────────

  it("2. ProgressDashboardPage: Renders 'Tiểu mục lý thuyết hay sai nhất (Weak Theory Rules)' and triggers adaptive quiz with difficulty options", async () => {
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

    // Verify Granular Weak Theory Sub-sections section is rendered
    await waitFor(() => {
      expect(
        screen.getByText(/Tiểu mục lý thuyết hay sai nhất \(Weak Theory Rules\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Quy tắc 1A/i)).toBeInTheDocument();
      expect(screen.getByText(/Study this example situation:/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Mục 1A/i })).toBeInTheDocument();
    });

    // Locate the Smart Quiz button and click
    const quizButtons = screen.getAllByRole("button", {
      name: /⚡ Làm bài Quiz thông minh \(Luyện theo điểm yếu\)/i,
    });
    expect(quizButtons.length).toBeGreaterThan(0);
    fireEvent.click(quizButtons[0]);

    // Verify API call
    expect(api.generateAdaptiveQuiz).toHaveBeenCalledWith(5, "medium");

    // Verify Adaptive Quiz Modal content & difficulty selector
    await waitFor(() => {
      expect(screen.getByText(/Adaptive Learning Engine/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Quiz Thông Minh — Luyện Theo Điểm Yếu/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Dễ \(Cơ bản\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Khó \(Bẫy TOEIC 700\+\)/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Please don't make noise\. I _______ to concentrate\./i)
      ).toBeInTheDocument();
    });

    // Select option B and check answer
    const optB = screen.getByRole("button", { name: /B am trying/i });
    fireEvent.click(optB);

    const checkBtn = screen.getByRole("button", { name: /Kiểm tra đáp án/i });
    fireEvent.click(checkBtn);

    // Verify explanation and ruleReference badge in feedback
    await waitFor(() => {
      expect(screen.getByText(/Chính xác! Đáp án chuẩn: B/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Quy tắc 1B/i })).toBeInTheDocument();
    });
  });
});
