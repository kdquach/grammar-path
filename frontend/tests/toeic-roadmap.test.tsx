import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import AppLayout from "../src/components/layout/AppLayout";
import ToeicRoadmapPage from "../src/pages/ToeicRoadmapPage";
import {
  TOEIC_PART_MATRIX,
  TOEIC_ROADMAP_STAGES,
  getAllRoadmapUnits,
} from "../src/data/toeicRoadmap";
import api from "../src/api/client";
import type {
  AdaptiveAnalytics,
  AuthUser,
  ProgressOverview,
  ToeicPracticeSession,
  UnitSummary,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getUnits: vi.fn(),
    getCurrentUser: vi.fn(),
    getProgressOverview: vi.fn(),
    getAdaptiveAnalytics: vi.fn(),
    generateToeicPractice: vi.fn(),
    checkToeicPracticeAnswer: vi.fn(),
    getTheorySection: vi.fn(),
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

const mockUnits: UnitSummary[] = [
  {
    id: "u-84",
    unitNumber: 84,
    title: "There ... and it ...",
    theoryPdfPage: 181,
    exercisePdfPage: 182,
    bookTheoryPage: 168,
    bookExercisePage: 169,
    bookAnswerKeyPage: 358,
    confidenceLevel: "verified_visual",
    counts: { theorySections: 4, textbookExamples: 10, exercises: 4, questions: 24 },
  },
  {
    id: "u-1",
    unitNumber: 1,
    title: "Present continuous (I am doing)",
    theoryPdfPage: 13,
    exercisePdfPage: 14,
    bookTheoryPage: 2,
    bookExercisePage: 3,
    bookAnswerKeyPage: 336,
    confidenceLevel: "verified_visual",
    counts: { theorySections: 5, textbookExamples: 14, exercises: 4, questions: 25 },
  },
  {
    id: "u-97",
    unitNumber: 97,
    title: "Relative clauses 6: extra information clauses (2)",
    theoryPdfPage: 207,
    exercisePdfPage: 208,
    bookTheoryPage: 194,
    bookExercisePage: 195,
    bookAnswerKeyPage: 362,
    confidenceLevel: "verified_visual",
    counts: { theorySections: 3, textbookExamples: 8, exercises: 3, questions: 18 },
  },
  {
    id: "u-98",
    unitNumber: 98,
    title: "Adjectives and adverbs 1 (quick/quickly)",
    theoryPdfPage: 209,
    exercisePdfPage: 210,
    bookTheoryPage: 196,
    bookExercisePage: 197,
    bookAnswerKeyPage: 363,
    confidenceLevel: "verified_visual",
    counts: { theorySections: 4, textbookExamples: 9, exercises: 4, questions: 22 },
  },
];

const mockUser: AuthUser = {
  id: "user-roadmap-1",
  email: "toeic@grammarpath.local",
  displayName: "Minh Anh",
  createdAt: "2026-11-11T10:00:00Z",
};

const mockOverview: ProgressOverview = {
  units: {
    completedCount: 1,
    inProgressCount: 1,
    notStartedCount: 143,
    totalUnits: 145,
    completionPercentage: 0.7,
  },
  exercises: {
    totalAttempts: 3,
    uniqueExercisesAttempted: 3,
    totalExercises: 549,
    averageScorePercentage: 82.0,
  },
  questions: {
    totalAnswered: 18,
    uniqueQuestionsAnswered: 18,
    correctUniqueQuestions: 15,
    accuracyPercentage: 83.3,
  },
  recentAttempts: [],
  unitProgressMap: [
    {
      unitNumber: 84,
      status: "completed",
      lastAccessedAt: "2026-11-11T09:00:00Z",
      completedAt: "2026-11-11T09:30:00Z",
    },
    {
      unitNumber: 1,
      status: "in_progress",
      lastAccessedAt: "2026-11-11T09:40:00Z",
      completedAt: null,
    },
  ],
};

const mockAnalytics: AdaptiveAnalytics = {
  totalEvaluated: 20,
  totalCorrect: 14,
  totalErrors: 6,
  accuracyPercentage: 70,
  weakestUnits: [
    {
      unitNumber: 98,
      unitTitle: "Adjectives and adverbs 1 (quick/quickly)",
      errorCount: 4,
      totalAttempts: 10,
      accuracyPercentage: 60,
      weakestQuestionTypes: ["multiple_choice"],
    },
  ],
  errorDistribution: [],
  weakestQuestionType: null,
  weakRules: [],
};

const mockToeicSession: ToeicPracticeSession = {
  sessionId: "toeic_roadmap_98",
  unitNumber: 98,
  title: "Adjectives and adverbs 1 (quick/quickly)",
  difficulty: "medium",
  requestedCount: 5,
  actualCount: 1,
  source: "dynamic",
  isOfficialToeic: false,
  sourceNotice: "Câu hỏi chuyển thể từ Unit 98 (không phải đề thi chính thức của ETS).",
  questions: [
    {
      itemId: "toeic-item-98-1",
      difficulty: "medium",
      prompt: "The marketing team reviewed the quarterly report _______ before the board meeting.",
      options: [
        { key: "A", text: "careful" },
        { key: "B", text: "carefully" },
        { key: "C", text: "carefulness" },
        { key: "D", text: "caring" },
      ],
      ruleReference: "98A",
    },
  ],
};

describe("TOEIC Foundation Roadmap Data & Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.getUnits).mockResolvedValue({
      units: mockUnits,
      meta: { page: 1, limit: 145, totalItems: mockUnits.length, totalPages: 1 },
    });
  });

  it("1. Roadmap data covers all 145 Murphy units uniquely once with valid metadata", () => {
    const allEntries = getAllRoadmapUnits();
    expect(allEntries).toHaveLength(145);

    const seen = new Set<number>();
    for (const entry of allEntries) {
      expect(entry.unitNumber).toBeGreaterThanOrEqual(1);
      expect(entry.unitNumber).toBeLessThanOrEqual(145);
      expect(seen.has(entry.unitNumber)).toBe(false);
      seen.add(entry.unitNumber);

      expect(entry.toeicTag.trim().length).toBeGreaterThan(0);
      expect(entry.noteVi.trim().length).toBeGreaterThan(0);
      expect(entry.toeicParts.length).toBeGreaterThan(0);
    }

    for (let u = 1; u <= 145; u++) {
      expect(seen.has(u)).toBe(true);
    }

    expect(TOEIC_ROADMAP_STAGES).toHaveLength(5);
    for (const partRow of TOEIC_PART_MATRIX) {
      expect(partRow.unitNumbers.length).toBeGreaterThan(0);
      for (const uNum of partRow.unitNumbers) {
        expect(seen.has(uNum)).toBe(true);
      }
    }
  });

  it("2. Guest workflow: goal switching persists, Part matrix & filters work, and clicking TOEIC prompt opens AuthModal", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToeicRoadmapPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /lộ trình luyện ngữ pháp toeic từ mất gốc/i })
      ).toBeInTheDocument();
    });

    // Goal track defaults to 600+ and can switch to 450+
    const goal450Btn = screen.getByRole("button", { name: /mục tiêu 450\+/i });
    fireEvent.click(goal450Btn);
    expect(localStorage.getItem("grammarpath_toeic_goal")).toBe("450+");
    expect(goal450Btn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Mục tiêu 450+").length).toBeGreaterThanOrEqual(2);

    // Switch guide tab to Part 1-7 matrix
    fireEvent.click(screen.getByRole("button", { name: /tra cứu theo part 1–7 toeic/i }));
    expect(screen.getByText("Mô tả tranh (6 câu)")).toBeInTheDocument();

    // Enable Core-only filter and verify stages expand & can still be collapsed manually
    const coreBtn = screen.getByRole("button", { name: /chỉ unit trọng tâm toeic/i });
    fireEvent.click(coreBtn);
    await waitFor(() => {
      expect(screen.getByText("There ... and it ...")).toBeInTheDocument();
      expect(screen.getByText("Present continuous (I am doing)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /thu gọn hết/i }));
    expect(screen.queryByText("There ... and it ...")).not.toBeInTheDocument();

    // Search filters to specific unit and Reset restores default
    const searchInput = screen.getByPlaceholderText(/tìm chủ điểm/i);
    fireEvent.change(searchInput, { target: { value: "relative clauses 6" } });
    await waitFor(() => {
      expect(screen.queryByText("There ... and it ...")).not.toBeInTheDocument();
      expect(
        screen.getByText("Relative clauses 6: extra information clauses (2)")
      ).toBeInTheDocument();
    });

    // Empty search state offers Reset button
    fireEvent.change(searchInput, { target: { value: "khong-ton-tai-xyz" } });
    expect(
      screen.getByText(/không tìm thấy unit nào khớp bộ lọc hiện tại/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /đặt lại bộ lọc/i }));
    await waitFor(() => {
      expect(screen.getByText("There ... and it ...")).toBeInTheDocument();
    });

    // Guest clicking TOEIC practice opens AuthModal
    const toeicButtons = screen.getAllByRole("button", { name: /đề toeic/i });
    fireEvent.click(toeicButtons[0]);
    expect(screen.getByRole("heading", { name: /sign in to grammarpath/i })).toBeInTheDocument();
  });

  it("3. Authenticated workflow: syncs user progress, recommends weak unit 98, filters unfinished units, and launches ToeicPracticeModal", async () => {
    localStorage.setItem("grammarpath_token", "mock-token");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getProgressOverview).mockResolvedValue(mockOverview);
    vi.mocked(api.getAdaptiveAnalytics).mockResolvedValue(mockAnalytics);
    vi.mocked(api.generateToeicPractice).mockResolvedValue(mockToeicSession);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ToeicRoadmapPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/tiến độ sẵn sàng của minh anh/i)).toBeInTheDocument();
      expect(screen.getByText(/ưu tiên vá lỗ hổng ngay/i)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /unit 98: adjectives and adverbs 1 \(quick\/quickly\)/i,
        })
      ).toBeInTheDocument();
    });

    // Toggle hide completed units
    const hideCompletedBtn = screen.getByRole("button", {
      name: /ẩn unit đã hoàn thành/i,
    });
    fireEvent.click(hideCompletedBtn);
    await waitFor(() => {
      expect(screen.queryByText("There ... and it ...")).not.toBeInTheDocument();
    });

    // Click TOEIC practice CTA on recommended weak unit card
    fireEvent.click(
      screen.getByRole("button", { name: /luyện 5 câu toeic part 5/i })
    );

    await waitFor(() => {
      expect(api.generateToeicPractice).toHaveBeenCalledWith(98, 5, "medium");
      expect(
        screen.getByText(/The marketing team reviewed the quarterly report/i)
      ).toBeInTheDocument();
    });
  });

  it("4. AppLayout Sidebar includes visible 'Lộ trình TOEIC' link pointing to /roadmap", async () => {
    render(
      <MemoryRouter initialEntries={["/roadmap"]}>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </MemoryRouter>
    );

    const roadmapLinks = screen.getAllByRole("link", { name: /lộ trình toeic/i });
    expect(roadmapLinks.length).toBeGreaterThanOrEqual(1);
    expect(roadmapLinks[0]).toHaveAttribute("href", "/roadmap");
  });
});
