import type {
  ApiResponse,
  ApiError,
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
  AdaptiveQuizSession,
} from "../types/api.types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = `${BASE_URL}/api/v1`;
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

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const url = `${API_PREFIX}${endpoint}`;
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

  const body = await response.json();

  if (!response.ok || !body.success) {
    const errorBody = body as ApiError;
    throw new ApiClientError(
      errorBody?.error?.code || "HTTP_ERROR",
      errorBody?.error?.message || `Request failed with status ${response.status}`,
      errorBody?.error?.details
    );
  }

  const successBody = body as ApiResponse<T>;
  return { data: successBody.data, meta: successBody.meta };
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
   * Fetches all exercises belonging to a unit with optional spoiler answers.
   */
  async getUnitExercises(
    unitNumber: number,
    includeAnswers = false
  ): Promise<Exercise[]> {
    const endpoint = `/units/${unitNumber}/exercises${
      includeAnswers ? "?includeAnswers=true" : ""
    }`;
    const { data } = await request<Exercise[]>(endpoint);
    return data;
  },

  /**
   * Fetches a single exercise by ID (e.g. "1.1").
   */
  async getExerciseDetail(
    exerciseId: string,
    includeAnswers = false
  ): Promise<Exercise> {
    const endpoint = `/exercises/${exerciseId}${
      includeAnswers ? "?includeAnswers=true" : ""
    }`;
    const { data } = await request<Exercise>(endpoint);
    return data;
  },

  /**
   * Fetches complete pedagogical solutions for all questions in an exercise.
   */
  async getExerciseSolutions(exerciseId: string): Promise<QuestionSolution[]> {
    const { data } = await request<QuestionSolution[]>(
      `/exercises/${exerciseId}/solutions`
    );
    return data;
  },

  /**
   * Fetches single question detail.
   */
  async getQuestionDetail(
    questionId: string,
    includeAnswers = false
  ): Promise<Question> {
    const endpoint = `/questions/${questionId}${
      includeAnswers ? "?includeAnswers=true" : ""
    }`;
    const { data } = await request<Question>(endpoint);
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
   * Evaluates student answer for a single question statelessly.
   */
  async checkQuestionAnswer(
    questionId: string,
    answer: unknown
  ): Promise<QuestionCheckResult> {
    const { data } = await request<QuestionCheckResult>(
      `/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      }
    );
    return data;
  },

  /**
   * Evaluates student answers for an entire exercise statelessly.
   */
  async checkExerciseAnswers(
    exerciseId: string,
    answers: Record<string, unknown>
  ): Promise<ExerciseCheckResult> {
    const { data } = await request<ExerciseCheckResult>(
      `/exercises/${exerciseId}/check`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
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
   * Generates AI-powered TOEIC Part 5 practice questions for a specific unit.
   */
  async generateToeicPractice(
    unitNumber: number,
    count = 5
  ): Promise<ToeicPracticeSession> {
    const { data } = await request<ToeicPracticeSession>("/adaptive/toeic-practice", {
      method: "POST",
      body: JSON.stringify({ unitNumber, count }),
    });
    return data;
  },

  /**
   * Generates a personalized remedial or diagnostic quiz session targeting weak units.
   */
  async generateAdaptiveQuiz(
    questionCount = 5
  ): Promise<AdaptiveQuizSession> {
    const { data } = await request<AdaptiveQuizSession>("/adaptive/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ questionCount }),
    });
    return data;
  },
};

export { ApiClientError };
export default api;

