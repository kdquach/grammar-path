import type {
  Book,
  UnitSummary,
  PaginationMeta,
  UnitDetail,
  UnitTheory,
  TheorySection,
  Exercise,
  Question,
  QuestionSolution,
  QuestionCheckResult,
  ExerciseCheckResult,
  AuthUser,
  AuthResponse,
  LearningStatus,
  ProgressOverview,
  UnitProgressDetail,
  MistakeItem,
  ExplainTheoryPayload,
  ExplainTheoryResponse,
  AdaptiveAnalytics,
  AdaptiveRecommendationsResponse,
  ToeicPracticeSession,
  ToeicPracticeCheckResult,
  AdaptiveQuizSession,
  DifficultyLevel,
} from "../types/api.types";
import { emitUnauthorized } from "./authEvents";
import { buildApiUrl } from "./apiUrl";

const TOKEN_KEY = "grammarpath_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

class ApiClientError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(code: string, message: string, details?: unknown, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function getDefaultHttpErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 413:
      return "Request payload exceeds the maximum allowed size.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return `Request failed with status ${status}`;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const url = buildApiUrl(endpoint, import.meta.env.VITE_API_BASE_URL);
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await response.text();
  let parsedBody: unknown = null;
  if (rawText.trim().length > 0) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = null;
    }
  }

  const bodyObj =
    parsedBody && typeof parsedBody === "object"
      ? (parsedBody as {
          success?: boolean;
          data?: T;
          meta?: Record<string, unknown>;
          error?: { code?: string; message?: string; details?: unknown };
        })
      : null;

  if (!response.ok || bodyObj?.success === false) {
    const errorCode =
      bodyObj?.error?.code || (response.status === 401 ? "UNAUTHORIZED" : `HTTP_${response.status}`);
    const errorMessage =
      bodyObj?.error?.message || getDefaultHttpErrorMessage(response.status);

    if (response.status === 401 && errorCode === "UNAUTHORIZED" && Boolean(token)) {
      setStoredToken(null);
      emitUnauthorized({ endpoint, message: errorMessage });
    }

    throw new ApiClientError(
      errorCode,
      errorMessage,
      bodyObj?.error?.details,
      response.status
    );
  }

  if (!bodyObj || bodyObj.success !== true) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Received an unexpected non-JSON response from server",
      undefined,
      response.status
    );
  }

  return { data: bodyObj.data as T, meta: bodyObj.meta };
}

export const api = {
  /**
   * Fetches singleton Book metadata with aggregate curriculum counts.
   */
  async getBook(): Promise<Book> {
    const { data } = await request<Book>("/book");
    return data;
  },

  /**
   * Fetches paginated units list with search and range filters.
   */
  async getUnits(params?: {
    page?: number;
    limit?: number;
    search?: string;
    fromUnit?: number;
    toUnit?: number;
  }): Promise<{ units: UnitSummary[]; meta: PaginationMeta }> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.fromUnit) query.set("fromUnit", params.fromUnit.toString());
    if (params?.toUnit) query.set("toUnit", params.toUnit.toString());

    const qs = query.toString();
    const endpoint = `/units${qs ? `?${qs}` : ""}`;
    const { data, meta } = await request<UnitSummary[]>(endpoint);
    return {
      units: data,
      meta: (meta as unknown as PaginationMeta) || {
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalItems: data.length,
        totalPages: 1,
      },
    };
  },

  /**
   * Fetches single unit detail by unit number (1..145).
   */
  async getUnitDetail(unitNumber: number): Promise<UnitDetail> {
    const { data } = await request<UnitDetail>(`/units/${unitNumber}`);
    return data;
  },

  /**
   * Fetches theory sections and translated illustrative examples for a unit.
   */
  async getUnitTheory(unitNumber: number): Promise<UnitTheory> {
    const { data } = await request<UnitTheory>(`/units/${unitNumber}/theory`);
    return data;
  },

  /**
   * Resolves a specific theory section by section ID (e.g. "1B").
   */
  async getTheorySection(sectionId: string): Promise<TheorySection> {
    const { data } = await request<TheorySection>(`/theory/sections/${sectionId}`);
    return data;
  },

  /**
   * Fetches all exercises belonging to a unit (strict anti-spoiler mode).
   */
  async getUnitExercises(unitNumber: number): Promise<Exercise[]> {
    const { data } = await request<Exercise[]>(`/units/${unitNumber}/exercises`);
    return data;
  },

  /**
   * Fetches a single exercise by ID (e.g. "1.1", strict anti-spoiler mode).
   */
  async getExerciseDetail(exerciseId: string): Promise<Exercise> {
    const { data } = await request<Exercise>(`/exercises/${exerciseId}`);
    return data;
  },

  /**
   * Fetches complete pedagogical solutions for all questions in an exercise
   * (requires authenticated learner + prior exercise attempt).
   */
  async getExerciseSolutions(exerciseId: string): Promise<QuestionSolution[]> {
    const { data } = await request<QuestionSolution[]>(
      `/exercises/${exerciseId}/solutions`
    );
    return data;
  },

  /**
   * Fetches single question detail (strict anti-spoiler mode).
   */
  async getQuestionDetail(questionId: string): Promise<Question> {
    const { data } = await request<Question>(`/questions/${questionId}`);
    return data;
  },

  /**
   * Fetches complete solution for a single question.
   */
  async getQuestionSolution(questionId: string): Promise<QuestionSolution> {
    const { data } = await request<QuestionSolution>(
      `/questions/${questionId}/solution`
    );
    return data;
  },

  /**
   * Evaluates student answer for a single question on the server.
   */
  async checkQuestionAnswer(
    questionId: string,
    answer: unknown,
    submissionId?: string
  ): Promise<QuestionCheckResult> {
    const { data } = await request<QuestionCheckResult>(
      `/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({
          answer,
          ...(submissionId ? { submissionId } : {}),
        }),
      }
    );
    return data;
  },

  /**
   * Evaluates student answers for an entire exercise on the server.
   */
  async checkExerciseAnswers(
    exerciseId: string,
    answers: Record<string, unknown>,
    submissionId?: string
  ): Promise<ExerciseCheckResult> {
    const { data } = await request<ExerciseCheckResult>(
      `/exercises/${exerciseId}/check`,
      {
        method: "POST",
        body: JSON.stringify({
          answers,
          ...(submissionId ? { submissionId } : {}),
        }),
      }
    );
    return data;
  },

  // ─── Phase 7 Authentication & Progress Methods ─────────────────────────────

  /**
   * Registers a new user account.
   */
  async registerUser(payload: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResponse> {
    const { data } = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    return data;
  },

  /**
   * Logs in an existing user with email and password.
   */
  async loginUser(payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const { data } = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    return data;
  },

  /**
   * Fetches profile of the currently authenticated user.
   */
  async getCurrentUser(): Promise<AuthUser> {
    const { data } = await request<AuthUser>("/auth/me");
    return data;
  },

  /**
   * Fetches learning dashboard statistics and recent attempts for the current user.
   */
  async getProgressOverview(): Promise<ProgressOverview> {
    const { data } = await request<ProgressOverview>("/progress/overview");
    return data;
  },

  /**
   * Fetches unit learning progress status and attempt history for a specific unit.
   */
  async getUnitProgress(unitNumber: number): Promise<UnitProgressDetail> {
    const { data } = await request<UnitProgressDetail>(`/progress/units/${unitNumber}`);
    return data;
  },

  /**
   * Manually updates a unit's learning status (not_started, in_progress, completed).
   */
  async updateUnitProgress(
    unitNumber: number,
    status: LearningStatus
  ): Promise<UnitProgressDetail> {
    const { data } = await request<UnitProgressDetail>(
      `/progress/units/${unitNumber}`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
    return data;
  },

  /**
   * Fetches all unresolved mistake items for the current user.
   */
  async getMistakes(): Promise<MistakeItem[]> {
    const { data } = await request<MistakeItem[]>("/progress/mistakes");
    return data;
  },

  // ─── Phase 9 Adaptive Learning & AI Methods ────────────────────────────────

  /**
   * Requests an AI-powered pedagogical explanation for a specific theory section in natural Vietnamese.
   */
  async explainTheory(payload: ExplainTheoryPayload): Promise<ExplainTheoryResponse> {
    const { data } = await request<ExplainTheoryResponse>("/theory/explain-theory", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data;
  },

  /**
   * Fetches learner's error pattern analytics, weakest units, and question type breakdown.
   */
  async getAdaptiveAnalytics(): Promise<AdaptiveAnalytics> {
    const { data } = await request<AdaptiveAnalytics>("/adaptive/analytics");
    return data;
  },

  /**
   * Fetches personalized review recommendations prioritized by error rate and learning progress.
   */
  async getAdaptiveRecommendations(): Promise<AdaptiveRecommendationsResponse> {
    const { data } = await request<AdaptiveRecommendationsResponse>("/adaptive/recommendations");
    return data;
  },

  // ─── Phase 9.2 TOEIC Practice & Adaptive Quiz Methods ──────────────────────

  /**
   * Generates TOEIC Part 5 practice questions for a specific unit without pre-submission answers.
   */
  async generateToeicPractice(
    unitNumber: number,
    count = 5,
    difficulty: DifficultyLevel = "medium"
  ): Promise<ToeicPracticeSession> {
    const { data } = await request<ToeicPracticeSession>("/adaptive/toeic-practice", {
      method: "POST",
      body: JSON.stringify({ unitNumber, count, difficulty }),
    });
    return data;
  },

  /**
   * Grades a single persisted TOEIC practice item on the server.
   */
  async checkToeicPracticeAnswer(payload: {
    sessionId: string;
    itemId: string;
    studentAnswer: string;
    submissionId?: string;
  }): Promise<ToeicPracticeCheckResult> {
    const { data } = await request<ToeicPracticeCheckResult>("/adaptive/toeic-practice/check", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data;
  },

  /**
   * Generates a personalized remedial or diagnostic quiz session targeting weak units with difficulty tier.
   */
  async generateAdaptiveQuiz(
    questionCount = 5,
    difficulty: DifficultyLevel = "medium",
    targetUnitNumbers?: number[]
  ): Promise<AdaptiveQuizSession> {
    const { data } = await request<AdaptiveQuizSession>("/adaptive/quiz/generate", {
      method: "POST",
      body: JSON.stringify({
        questionCount,
        difficulty,
        ...(targetUnitNumbers && targetUnitNumbers.length > 0
          ? { targetUnitNumbers }
          : {}),
      }),
    });
    return data;
  },

  /**
   * Grades an Adaptive Quiz question on the server and records QuestionAttemptItem.
   */
  async checkAdaptiveQuizAnswer(payload: {
    sessionId?: string;
    questionId: string;
    studentAnswer: unknown;
    submissionId?: string;
  }): Promise<QuestionCheckResult & { sessionId?: string | null }> {
    const { data } = await request<QuestionCheckResult & { sessionId?: string | null }>(
      "/adaptive/quiz/check",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return data;
  },
};

export { ApiClientError };
export default api;

