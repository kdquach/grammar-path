import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import { ToastProvider } from "../src/context/ToastContext";
import { OnboardingModal } from "../src/components/onboarding/OnboardingModal";
import { DailyPlanWidget } from "../src/components/daily/DailyPlanWidget";
import { LearningPathPage } from "../src/pages/LearningPathPage";
import { StudySessionPage } from "../src/pages/StudySessionPage";
import api from "../src/api/client";
import type {
  AuthUser,
  StartDiagnosticResponse,
  DiagnosticResultResponse,
  DailyPlanResponse,
  LearningPathResponse,
  StudySessionBundle,
  ExerciseCheckResult,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  const mockApi = {
    getCurrentUser: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    startDiagnostic: vi.fn(),
    submitDiagnostic: vi.fn(),
    getLearningPath: vi.fn(),
    getDailyPlan: vi.fn(),
    updateDailyPlanItemStatus: vi.fn(),
    initStudySession: vi.fn(),
    checkExerciseAnswers: vi.fn(),
    getDashboardSummary: vi.fn(),
    getMasterySummary: vi.fn(),
    getNextRecommendation: vi.fn(),
    getEngagementSummary: vi.fn(),
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
  id: "user-phase33-1",
  email: "learner33@grammarpath.local",
  displayName: "Tuấn Anh",
  createdAt: "2026-11-13T00:00:00Z",
};

describe("Phase 3.3 Experience Components & Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("grammarpath_token", "mock-token-33");
    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
  });

  describe("OnboardingModal", () => {
    it("renders preferences step and allows configuring goals", async () => {
      const onClose = vi.fn();
      const onCompleted = vi.fn();

      vi.mocked(api.updatePreferences).mockResolvedValue({
        grammarConfidence: "elementary",
        learningObjective: "foundation",
        dailyStudyMinutes: 20,
        preferredDays: ["monday", "wednesday", "friday"],
        targetToeicScore: null,
        targetDate: null,
        onboardingCompleted: false,
      });

      render(
        <ToastProvider>
          <OnboardingModal isOpen={true} onClose={onClose} onCompleted={onCompleted} />
        </ToastProvider>
      );

      expect(screen.getByText("Thiết lập Kế hoạch Học tập")).toBeInTheDocument();
      expect(screen.getByText("1. Mục tiêu học tập chính")).toBeInTheDocument();
      expect(screen.getByText("2. Mức độ tự tin hiện tại")).toBeInTheDocument();
      expect(screen.getByText(/3\. Thời gian học mỗi ngày/i)).toBeInTheDocument();

      // Click "Tiếp tục"
      const nextButton = screen.getByText("Tiếp tục");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(api.updatePreferences).toHaveBeenCalledWith({
          grammarConfidence: "elementary",
          learningObjective: "foundation",
          dailyStudyMinutes: 20,
          targetToeicScore: null,
        });
      });
    });

    it("runs diagnostic assessment and renders results", async () => {
      const mockDiagnostic: StartDiagnosticResponse = {
        assessmentId: "diag-123",
        status: "in_progress",
        startedAt: "2026-11-13T00:00:00Z",
        totalQuestions: 2,
        questions: [
          {
            id: "q-diag-1",
            questionId: "1.1.1",
            exerciseNumber: "1.1",
            unitNumber: 1,
            unitTitle: "Present continuous",
            concept: { id: "c-1", code: "PRES_CONT_BASIC", name: "Present continuous basic", category: "present_tenses" },
            promptText: "She (eat) dinner right now.",
            questionType: "fill_in_blank",
            blanks: [{ blankIndex: 1, hint: "eat" }],
            options: [],
          },
          {
            id: "q-diag-2",
            questionId: "2.1.1",
            exerciseNumber: "2.1",
            unitNumber: 2,
            unitTitle: "Present simple",
            concept: { id: "c-2", code: "PRES_SIMP_BASIC", name: "Present simple basic", category: "present_tenses" },
            promptText: "They (play) tennis every Sunday.",
            questionType: "fill_in_blank",
            blanks: [{ blankIndex: 1, hint: "play" }],
            options: [],
          },
        ],
      };

      const mockResult: DiagnosticResultResponse = {
        assessmentId: "diag-123",
        status: "completed",
        totalQuestions: 2,
        correctCount: 1,
        scorePercentage: 50,
        estimatedLevel: "developing",
        recommendedUnit: { unitNumber: 1, title: "Present continuous" },
        strengths: ["Present simple basic"],
        weaknesses: ["Present continuous basic"],
        summaryVi: "Bạn đạt 1/2 câu đúng. Trình độ ước tính: developing.",
        disclaimerVi: "Kết quả đánh giá mang tính chất định hướng học tập.",
        items: [],
      };

      vi.mocked(api.updatePreferences).mockResolvedValue({
        grammarConfidence: "elementary",
        learningObjective: "foundation",
        dailyStudyMinutes: 20,
        preferredDays: ["monday", "wednesday", "friday"],
        targetToeicScore: null,
        targetDate: null,
        onboardingCompleted: false,
      });
      vi.mocked(api.startDiagnostic).mockResolvedValue(mockDiagnostic);
      vi.mocked(api.submitDiagnostic).mockResolvedValue(mockResult);

      const onClose = vi.fn();
      render(
        <ToastProvider>
          <OnboardingModal isOpen={true} onClose={onClose} />
        </ToastProvider>
      );

      // Advance from preferences to choose diagnostic
      fireEvent.click(screen.getByText("Tiếp tục"));

      await waitFor(() => {
        expect(screen.getByText("Đánh giá Sơ bộ Ngữ pháp?")).toBeInTheDocument();
      });

      // Start diagnostic assessment
      fireEvent.click(screen.getByText("Làm bài đánh giá 5 phút"));

      await waitFor(() => {
        expect(screen.getByText("Bài Đánh giá Sơ bộ")).toBeInTheDocument();
        expect(screen.getByText("She (eat) dinner right now.")).toBeInTheDocument();
      });

      // Answer questions
      const inputs = screen.getAllByPlaceholderText("Nhập câu trả lời...");
      fireEvent.change(inputs[0], { target: { value: "is eating" } });
      fireEvent.change(inputs[1], { target: { value: "play" } });

      // Submit
      const submitBtn = screen.getByText("Nộp bài & Xem kết quả").closest("button");
      expect(submitBtn).not.toBeNull();
      fireEvent.click(submitBtn!);

      await waitFor(() => {
        expect(api.submitDiagnostic).toHaveBeenCalledWith("diag-123", {
          "1.1.1": "is eating",
          "2.1.1": "play",
        });
        expect(screen.getByText("Kết Quả Đánh Giá")).toBeInTheDocument();
        expect(screen.getByText("50%")).toBeInTheDocument();
      });
    });
  });

  describe("DailyPlanWidget", () => {
    const mockPlan: DailyPlanResponse = {
      id: "plan-1",
      planDate: "2026-11-13",
      status: "in_progress",
      targetMinutes: 25,
      completedMinutes: 10,
      summaryVi: "2 nhiệm vụ hôm nay",
      items: [
        {
          id: "item-1",
          activityType: "theory_reading",
          title: "Đọc lý thuyết Unit 1",
          description: "Ôn tập thì hiện tại tiếp diễn",
          targetId: "unit-1",
          targetNumber: "Unit 1",
          estimatedMinutes: 10,
          status: "completed",
          displayOrder: 1,
          metadata: { unitNumber: 1 },
          completedAt: "2026-11-13T10:00:00Z",
        },
        {
          id: "item-2",
          activityType: "exercise_practice",
          title: "Làm bài tập Exercise 1.1",
          description: "Thực hành điền từ",
          targetId: "ex-1-1",
          targetNumber: "1.1",
          estimatedMinutes: 15,
          status: "not_started",
          displayOrder: 2,
          metadata: { unitNumber: 1, exerciseNumber: "1.1" },
          completedAt: null,
        },
      ],
    };

    it("renders daily learning plan with completion metrics and toggle handler", async () => {
      const onToggle = vi.fn();

      render(
        <MemoryRouter>
          <DailyPlanWidget plan={mockPlan} onToggleStatus={onToggle} />
        </MemoryRouter>
      );

      expect(screen.getByText("Kế hoạch học tập hôm nay")).toBeInTheDocument();
      expect(screen.getByText(/40%/i)).toBeInTheDocument();
      expect(screen.getByText("Đọc lý thuyết Unit 1")).toBeInTheDocument();
      expect(screen.getByText("Làm bài tập Exercise 1.1")).toBeInTheDocument();

      // Click second item's button to toggle completion
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[1]);

      expect(onToggle).toHaveBeenCalledWith("item-2", "not_started");
    });
  });

  describe("LearningPathPage", () => {
    const mockLearningPath: LearningPathResponse = {
      totalConcepts: 161,
      masteredCount: 15,
      practicingCount: 20,
      needsReviewCount: 2,
      stages: [
        {
          stageKey: "foundation",
          titleVi: "Nền tảng Ngữ pháp cơ bản",
          subtitleEn: "Present & Past Essentials",
          unitRange: "Units 1-25",
          concepts: [
            {
              conceptId: "c-1",
              conceptCode: "PRES_CONT_BASIC",
              conceptName: "Hiện tại tiếp diễn (Cơ bản)",
              category: "present_tenses",
              displayOrder: 1,
              masteryStatus: "proficient",
              masteryScore: 82,
              retentionScore: 0.88,
              evidenceCount: 12,
              distinctQuestionCount: 8,
              reviewState: "scheduled",
              isDue: false,
              dueAt: null,
              units: [
                {
                  unitNumber: 1,
                  title: "Present continuous",
                  exercises: [{ exerciseNumber: "1.1", questionCount: 8 }],
                },
              ],
              suggestedAction: {
                type: "progress",
                labelVi: "Tiếp tục học Unit 1",
                priority: 1,
                targetUnitNumber: 1,
                targetExerciseNumber: "1.1",
              },
            },
          ],
        },
      ],
    };

    it("renders learning path stages and concept item cards", async () => {
      vi.mocked(api.getLearningPath).mockResolvedValue(mockLearningPath);

      render(
        <MemoryRouter>
          <AuthProvider>
            <LearningPathPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Lộ Trình Học Tập Cá Nhân/i)).toBeInTheDocument();
        expect(screen.getByText("Nền tảng Ngữ pháp cơ bản")).toBeInTheDocument();
        expect(screen.getByText("Hiện tại tiếp diễn (Cơ bản)")).toBeInTheDocument();
        expect(screen.getByText("Tiếp tục học Unit 1")).toBeInTheDocument();
      });
    });
  });

  describe("StudySessionPage", () => {
    const mockBundle: StudySessionBundle = {
      unit: {
        id: "u-1",
        unitNumber: 1,
        title: "Present continuous (I am doing)",
        bookTitle: "English Grammar in Use",
        theoryPage: 2,
        exercisePage: 3,
      },
      theorySections: [
        {
          id: "ts-1",
          sectionId: "1A",
          heading: "Study this example situation",
          sourceContent: "Sarah is in her car. She is on her way to work. She is driving to work.",
          displayOrder: 1,
        },
      ],
      textbookExamples: [
        {
          id: "ex-eg-1",
          exampleId: "eg-1A-1",
          originalText: "She is driving to work.",
          translationVi: "Cô ấy đang lái xe đi làm.",
          displayOrder: 1,
        },
      ],
      exercisesList: [
        {
          exerciseNumber: "1.1",
          questionCount: 1,
          isCurrent: true,
        },
      ],
      currentExercise: {
        id: "ex-1",
        exerciseNumber: "1.1",
        instructionText: "Complete the sentences with present continuous.",
        questionType: "fill_in_blank",
        wordBank: ["driving", "eating"],
        questions: [
          {
            id: "q-1",
            questionId: "1.1.1",
            promptText: "She is _______ (drive) to work.",
            questionType: "fill_in_blank",
            displayOrder: 1,
            blanks: [{ blankIndex: 1, hint: "drive" }],
            options: [],
          },
        ],
      },
      userContext: {
        unitStatus: "in_progress",
        masteryScore: 75,
        masteryStatus: "practicing",
        retentionScore: 80,
        conceptName: "Present continuous",
      },
    };

    const mockCheckResult: ExerciseCheckResult = {
      exerciseId: "ex-1",
      exerciseNumber: "1.1",
      totalQuestions: 1,
      answeredCount: 1,
      correctCount: 1,
      scorePercentage: 100,
      results: [
        {
          questionId: "1.1.1",
          isCorrect: true,
          studentAnswer: "driving",
          correctAnswers: ["driving"],
          expectedAnswers: ["driving"],
          explanation: "Present continuous is used for actions happening now.",
          ruleReference: "1A",
        },
      ],
    };

    it("renders unified study session, allows tab switching and exercise grading", async () => {
      vi.mocked(api.initStudySession).mockResolvedValue(mockBundle);
      vi.mocked(api.checkExerciseAnswers).mockResolvedValue(mockCheckResult);

      render(
        <MemoryRouter initialEntries={["/study-session?unit=1"]}>
          <ToastProvider>
            <AuthProvider>
              <StudySessionPage />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      // Verify theory tab loaded
      await waitFor(() => {
        expect(screen.getByText("Present continuous (I am doing)")).toBeInTheDocument();
        expect(screen.getByText("Study this example situation")).toBeInTheDocument();
        expect(screen.getByText("Cô ấy đang lái xe đi làm.")).toBeInTheDocument();
      });

      // Switch to practice tab
      const practiceTab = screen.getByText("Luyện tập");
      fireEvent.click(practiceTab);

      await waitFor(() => {
        expect(screen.getByText(/Complete the sentences with present continuous/i)).toBeInTheDocument();
        expect(screen.getByText("She is _______ (drive) to work.")).toBeInTheDocument();
      });

      // Fill answer
      const input = screen.getByPlaceholderText("Nhập câu trả lời vào đây...");
      fireEvent.change(input, { target: { value: "driving" } });

      // Submit
      const submitButton = screen.getByText("Nộp bài & Chấm điểm");
      fireEvent.click(submitButton);

      // Verify grading result
      await waitFor(() => {
        expect(api.checkExerciseAnswers).toHaveBeenCalledWith("1.1", {
          "1.1.1": "driving",
        });
        expect(screen.getByText("Tổng Kết Buổi Học")).toBeInTheDocument();
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("Present continuous is used for actions happening now.")).toBeInTheDocument();
      });
    });
  });
});
