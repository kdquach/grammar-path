import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TheoryViewer from "../src/components/theory/TheoryViewer";
import AdaptiveReviewPanel from "../src/components/adaptive/AdaptiveReviewPanel";
import { AuthProvider } from "../src/context/AuthContext";
import api from "../src/api/client";
import type {
  TheorySection,
  TextbookExample,
  AdaptiveAnalytics,
  AdaptiveRecommendationsResponse,
  AuthUser,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    explainTheory: vi.fn(),
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

const mockTheorySections: TheorySection[] = [
  {
    id: "ts-1",
    sectionId: "1A",
    heading: "Study this example situation:",
    sourceContent: "Sarah is in her car. She is driving to work.",
    displayOrder: 1,
    sourcePages: [13],
  },
  {
    id: "ts-2",
    sectionId: "1B",
    heading: "I am doing something = I'm in the middle of doing it:",
    sourceContent: "The action is not finished.",
    displayOrder: 2,
    sourcePages: [13],
  },
];

const mockTextbookExamples: TextbookExample[] = [
  {
    id: "ex-1",
    exampleId: "1A-ex1",
    originalText: "Sarah is driving to work.",
    translationVi: "Sarah đang lái xe đi làm.",
    displayOrder: 1,
    sourcePages: [13],
  },
];

const mockAnalytics: AdaptiveAnalytics = {
  totalEvaluated: 12,
  totalCorrect: 7,
  totalErrors: 5,
  accuracyPercentage: 58.3,
  weakestUnits: [
    {
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      totalAttempts: 8,
      errorCount: 4,
      accuracyPercentage: 50,
      weakestQuestionTypes: ["fill_blank", "transformation"],
    },
    {
      unitNumber: 2,
      unitTitle: "Present simple (I do)",
      totalAttempts: 4,
      errorCount: 1,
      accuracyPercentage: 75,
      weakestQuestionTypes: ["multiple_choice"],
    },
  ],
  errorDistribution: [
    {
      questionType: "fill_blank",
      errorCount: 3,
      totalAttempts: 6,
      errorRatePercentage: 50,
    },
    {
      questionType: "transformation",
      errorCount: 2,
      totalAttempts: 4,
      errorRatePercentage: 50,
    },
  ],
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
};

const mockRecommendations: AdaptiveRecommendationsResponse = {
  totalRecommendations: 1,
  recommendations: [
    {
      unitNumber: 1,
      unitTitle: "Present continuous (I am doing)",
      priority: "high",
      reason: "Tỷ lệ sai cao với 4 lỗi sai ở Unit này (độ chính xác 50%). Bạn hay gặp nhầm lẫn ở dạng bài (fill_blank, transformation).",
      errorCount: 4,
      accuracyPercentage: 50,
      weakestQuestionTypes: ["fill_blank", "transformation"],
      suggestedActions: [
        "Đọc lại lý thuyết Unit 1: Present continuous (I am doing)",
        "Nhấn '🤖 AI giảng lại bằng tiếng Việt' trong mục lý thuyết nếu cần giải thích sâu hơn",
        "Luyện tập lại các câu hỏi bị sai trong trang Review Mistakes",
      ],
    },
  ],
};

const mockUser: AuthUser = {
  id: "user-test-1",
  email: "learner@grammarpath.local",
  displayName: "Test Learner",
  createdAt: "2026-11-06T10:00:00Z",
};

describe("Phase 9: Adaptive Learning, AI Theory Explainer & Review Recommendations UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── 1. TheoryViewer AI Explainer Button & Modal ──────────────────────────

  it("1. TheoryViewer: Renders '🤖 AI giảng lại bằng tiếng Việt' button for each section card", () => {
    render(
      <TheoryViewer
        theorySections={mockTheorySections}
        textbookExamples={mockTextbookExamples}
      />
    );

    const aiButtons = screen.getAllByRole("button", {
      name: /AI giảng lại bằng tiếng Việt/i,
    });
    expect(aiButtons.length).toBe(mockTheorySections.length);
  });

  it("2. TheoryViewer: Clicking AI button opens modal, requests explanation from API, and renders formatted result", async () => {
    vi.mocked(api.explainTheory).mockResolvedValueOnce({
      explanation:
        "## 🤖 Gia sư AI GrammarPath — Giải thích Mục 1A\n\n### 🎯 Điểm cốt lõi: Hiện tại tiếp diễn\nQuy tắc này dùng để diễn đạt hành động đang xảy ra tại thời điểm nói.",
    });

    render(
      <TheoryViewer
        theorySections={mockTheorySections}
        textbookExamples={mockTextbookExamples}
      />
    );

    const aiButtons = screen.getAllByRole("button", {
      name: /AI giảng lại bằng tiếng Việt/i,
    });
    fireEvent.click(aiButtons[0]);

    // Verify API called with Section 1A payload
    expect(api.explainTheory).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: "1A",
        heading: "Study this example situation:",
      })
    );

    // Verify modal elements displayed
    await waitFor(() => {
      expect(screen.getByText(/Gia sư AI — Mục 1A/i)).toBeInTheDocument();
      expect(screen.getByText(/🎯 Điểm cốt lõi: Hiện tại tiếp diễn/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Quy tắc này dùng để diễn đạt hành động đang xảy ra tại thời điểm nói./i)
      ).toBeInTheDocument();
    });

    // Test custom question input
    vi.mocked(api.explainTheory).mockResolvedValueOnce({
      explanation:
        "### 💡 Giải đáp thắc mắc của bạn:\nChúng ta dùng driving vì hành động đang tiếp diễn.",
    });

    const questionInput = screen.getByPlaceholderText(/Khi nào không dùng thì này/i);
    fireEvent.change(questionInput, { target: { value: "Tại sao lại có ing?" } });

    const askButton = screen.getByRole("button", { name: /Hỏi AI/i });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(api.explainTheory).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: "1A",
          userQuestion: "Tại sao lại có ing?",
        })
      );
    });

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Đóng/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Gia sư AI — Mục 1A/i)).not.toBeInTheDocument();
    });
  });

  // ─── 2. AdaptiveReviewPanel Component ─────────────────────────────────────

  it("3. AdaptiveReviewPanel: Renders guest banner when user is not authenticated", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdaptiveReviewPanel />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Adaptive Learning & AI Tutor Recommendations/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Đăng nhập \/ Tạo tài khoản/i)
    ).toBeInTheDocument();
  });

  it("4. AdaptiveReviewPanel: Renders error pattern analytics and prioritized review recommendations when authenticated", async () => {
    localStorage.setItem("grammarpath_token", "mock-token");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.getAdaptiveAnalytics).mockResolvedValue(mockAnalytics);
    vi.mocked(api.getAdaptiveRecommendations).mockResolvedValue(mockRecommendations);

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdaptiveReviewPanel />
        </AuthProvider>
      </MemoryRouter>
    );

    // Check loading & then data render
    await waitFor(() => {
      expect(
        screen.getByText(/Adaptive Review Engine & AI Tutor/i)
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText("fill_blank").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tổng số lỗi sai cần xử lý/i)).toBeInTheDocument();
    expect(screen.getByText(/58.3%/)).toBeInTheDocument();
    expect(screen.getByText("Ưu tiên cao")).toBeInTheDocument();
    expect(screen.getAllByText(/Present continuous/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Tỷ lệ sai cao với 4 lỗi sai ở Unit này/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Luyện tập lại các câu hỏi bị sai trong trang Review Mistakes/)
    ).toBeInTheDocument();
  });
});
