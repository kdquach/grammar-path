import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api, {
  ApiClientError,
  getStoredToken,
  setStoredToken,
} from "../src/api/client";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ToastProvider } from "../src/context/ToastContext";
import AuthModal from "../src/components/auth/AuthModal";
import ExerciseViewer from "../src/components/exercises/ExerciseViewer";
import TheoryViewer from "../src/components/theory/TheoryViewer";
import MistakeReviewPage from "../src/pages/MistakeReviewPage";
import UnitPage from "../src/pages/UnitPage";
import type {
  AuthUser,
  Exercise,
  MistakeItem,
  UnitDetail,
  UnitTheory,
} from "../src/types/api.types";

const mockUser: AuthUser = {
  id: "user-1",
  email: "learner@grammarpath.local",
  displayName: "Alex Learner",
  createdAt: "2026-11-06T10:00:00Z",
};

const sampleExercise: Exercise = {
  id: "ex-1-1",
  exerciseId: "1.1",
  exerciseNumber: "1.1",
  questionType: "fill_blank",
  instruction: "Complete the sentences.",
  hasVisualContext: false,
  displayOrder: 1,
  wordBankItems: [],
  questions: [
    {
      id: "q-1-1-1",
      questionId: "1.1-q1",
      questionContent: "Sarah _______ (drive) to work right now.",
      isExample: false,
      hasVisualContext: false,
      displayOrder: 1,
      options: [],
      blanks: [
        {
          blankIndex: 0,
        },
      ],
      parts: [],
    },
  ],
};

const sampleUnitDetail: UnitDetail = {
  id: "unit-1",
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  theoryPdfPage: 13,
  exercisePdfPage: 14,
  bookTheoryPage: 2,
  bookExercisePage: 3,
  bookAnswerKeyPage: 336,
  confidenceLevel: "high",
  sourcePages: [],
  theorySections: [
    {
      sectionId: "1A",
      heading: "Study this example situation:",
      displayOrder: 1,
    },
  ],
  exercises: [
    {
      exerciseId: "1.1",
      exerciseNumber: "1.1",
      questionType: "fill_blank",
      instruction: "Complete the sentences.",
      hasVisualContext: false,
      displayOrder: 1,
      questionCount: 1,
      wordBankCount: 0,
    },
  ],
};

const sampleUnitTheory: UnitTheory = {
  unitNumber: 1,
  title: "Present continuous (I am doing)",
  theorySections: [
    {
      id: "sec-1a",
      sectionId: "1A",
      heading: "Study this example situation:",
      sourceContent: "Sarah is in her car. She is driving to work.",
      displayOrder: 1,
      sourcePages: [13],
    },
  ],
  textbookExamples: [],
};

const sampleMistakes: MistakeItem[] = [
  {
    questionId: "1.1-q2",
    questionContent: "She's eating an apple.",
    questionType: "fill_blank",
    exerciseId: "1.1",
    exerciseNumber: "1.1",
    unitNumber: 1,
    unitTitle: "Present continuous (I am doing)",
    lastStudentAnswer: "eat",
    lastAttemptedAt: "2026-11-06T12:00:00Z",
  },
];

const AuthConsumerHarness: React.FC = () => {
  const { user } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{user ? user.email : "guest"}</span>
      <button
        type="button"
        onClick={() => {
          api.getMistakes().catch(() => {});
        }}
      >
        Trigger Protected Call
      </button>
    </div>
  );
};

describe("Phase 1 Frontend Runtime Reliability, Non-Blocking Errors & Session Expiry", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─── 1. API Client Non-JSON Error Resilience & 401 Session Handling ────────

  it("handles non-JSON proxy error responses gracefully without JSON parse crashes", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("<html><body>502 Bad Gateway</body></html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      });
    }) as typeof fetch;

    await expect(api.getUnits()).rejects.toMatchObject({
      name: "ApiClientError",
      code: "HTTP_502",
      status: 502,
      message: "Request failed with status 502",
    });
  });

  it("clears expired token, logs user out, and shows non-blocking toast on 401 UNAUTHORIZED", async () => {
    setStoredToken("expired-jwt-token");
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return new Response(
          JSON.stringify({ success: true, data: mockUser }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired authentication token",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    render(
      <ToastProvider>
        <AuthProvider>
          <AuthConsumerHarness />
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(mockUser.email);
    });

    fireEvent.click(screen.getByRole("button", { name: /Trigger Protected Call/i }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
      expect(getStoredToken()).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /session has expired/i
      );
    });
  });

  it("does NOT clear session or trigger expired warning on 401 INVALID_CREDENTIALS during login", async () => {
    setStoredToken("existing-session-token");
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    await expect(
      api.loginUser({ email: "wrong@example.com", password: "bad" })
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });

    expect(getStoredToken()).toBe("existing-session-token");
  });

  // ─── 2. Replacement of Blocking alert() with Non-Blocking Toasts ───────────

  it("replaces window.alert() in ExerciseViewer with dismissible toast notifications", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    setStoredToken("valid-token");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(mockUser);
    vi.spyOn(api, "getUnitExercises").mockResolvedValueOnce([sampleExercise]);
    vi.spyOn(api, "checkExerciseAnswers").mockRejectedValueOnce(
      new ApiClientError("INTERNAL_SERVER_ERROR", "Grading temporarily unavailable")
    );
    vi.spyOn(api, "getExerciseSolutions").mockRejectedValueOnce(
      new ApiClientError("INTERNAL_SERVER_ERROR", "Solutions temporarily unavailable")
    );

    render(
      <ToastProvider>
        <AuthProvider>
          <ExerciseViewer
            unitNumber={1}
            unitProgress={{
              unitNumber: 1,
              title: "Present continuous (I am doing)",
              status: "in_progress",
              lastAccessedAt: null,
              completedAt: null,
              attempts: [
                {
                  id: "att-1",
                  exerciseId: "1.1",
                  exerciseNumber: "1.1",
                  totalQuestions: 1,
                  correctCount: 0,
                  scorePercentage: 0,
                  submittedAt: "2026-11-06T12:00:00Z",
                  items: [],
                },
              ],
            }}
          />
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Complete the sentences\./i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Type your answer here/i), {
      target: { value: "is driving" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check Entire Exercise/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Grading temporarily unavailable"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Dismiss notification/i }));
    expect(screen.queryByText("Grading temporarily unavailable")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reveal All Solutions/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Solutions temporarily unavailable"
      );
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("replaces window.alert() in MistakeReviewPage when checkQuestionAnswer fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    setStoredToken("valid-token");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(mockUser);
    vi.spyOn(api, "getMistakes").mockResolvedValueOnce(sampleMistakes);
    vi.spyOn(api, "getAdaptiveAnalytics").mockResolvedValueOnce({
      totalEvaluated: 1,
      totalCorrect: 0,
      totalErrors: 1,
      accuracyPercentage: 0,
      weakestUnits: [],
      errorDistribution: [],
      weakestQuestionType: null,
      weakRules: [],
    });
    vi.spyOn(api, "getAdaptiveRecommendations").mockResolvedValueOnce({
      recommendations: [],
      totalRecommendations: 0,
    });
    vi.spyOn(api, "checkQuestionAnswer").mockRejectedValueOnce(
      new ApiClientError("INTERNAL_SERVER_ERROR", "Failed to grade mistake retry")
    );

    render(
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>
            <MistakeReviewPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/type full sentence or missing phrase\.\.\./i)
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(/type full sentence or missing phrase\.\.\./i),
      {
        target: { value: "is eating" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: /Check Correction/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to grade mistake retry"
      );
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("prompts signed-out guests in UnitPage before calling AI Tutor and handles progress errors via toast", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(api, "getUnitDetail").mockResolvedValue(sampleUnitDetail);
    vi.spyOn(api, "getUnitTheory").mockResolvedValue(sampleUnitTheory);
    const explainSpy = vi.spyOn(api, "explainTheory");

    // 1. Guest flow on UnitPage
    const guestView = render(
      <MemoryRouter initialEntries={["/units/1"]}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/units/:unitNumber" element={<UnitPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /AI giảng lại bằng tiếng Việt/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /AI giảng lại bằng tiếng Việt/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Sign In to GrammarPath/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/sign in to use AI Tutor/i);
    });
    expect(explainSpy).not.toHaveBeenCalled();

    guestView.unmount();

    // 2. Authenticated progress update failure -> toast (no alert())
    setStoredToken("valid-token");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(mockUser);
    vi.spyOn(api, "getUnitProgress").mockResolvedValueOnce({
      unitNumber: 1,
      title: sampleUnitDetail.title,
      status: "in_progress",
      lastAccessedAt: null,
      completedAt: null,
      attempts: [],
    });
    vi.spyOn(api, "updateUnitProgress").mockRejectedValueOnce(
      new ApiClientError("INTERNAL_SERVER_ERROR", "Could not persist progress")
    );

    render(
      <MemoryRouter initialEntries={["/units/1"]}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/units/:unitNumber" element={<UnitPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Mark as Completed/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Mark as Completed/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not persist progress");
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  // ─── 3. Registration Validation & TheoryViewer AI Error States ─────────────

  it("enforces 8-character minimum password on registration matching backend policy", async () => {
    const registerSpy = vi.spyOn(api, "registerUser");

    render(
      <ToastProvider>
        <AuthProvider>
          <AuthModal isOpen onClose={() => {}} initialMode="register" />
        </AuthProvider>
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: "Alex" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "alex@grammarpath.local" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "1234567" },
    });
    fireEvent.click(screen.getByTestId("auth-submit-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters.")
      ).toBeInTheDocument();
    });
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("renders user-friendly AI unavailability message when TheoryViewer receives 503 AI_PROVIDER_UNAVAILABLE", async () => {
    vi.spyOn(api, "explainTheory").mockRejectedValueOnce(
      new ApiClientError(
        "AI_PROVIDER_UNAVAILABLE",
        "AI explanation provider is currently unavailable.",
        undefined,
        503
      )
    );

    render(
      <TheoryViewer
        theorySections={sampleUnitTheory.theorySections}
        textbookExamples={[]}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /AI giảng lại bằng tiếng Việt/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Dịch vụ Gia sư AI hiện đang tạm gián đoạn/i)
      ).toBeInTheDocument();
    });
  });
});
