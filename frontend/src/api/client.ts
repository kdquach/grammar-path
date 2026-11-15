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
  DashboardSummary,
  CurriculumRoadmapResponse,
  MasterySummaryResponse,
  ConceptMasteryDetailResponse,
  DueReviewsResponse,
  AllReviewsResponse,
  CompleteReviewResponse,
  PersonalizedRecommendationsResponse,
  NextRecommendationResponse,
  UserLearningPreferencesDto,
  UpdatePreferencesInput,
  StartDiagnosticResponse,
  DiagnosticResultResponse,
  LearningPathResponse,
  DailyPlanResponse,
  StudySessionBundle,
  EngagementSummaryResponse,
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
    submissionId?: string,
    source?: "single_check" | "mistake_retry"
  ): Promise<QuestionCheckResult> {
    const { data } = await request<QuestionCheckResult>(
      `/questions/${questionId}/check`,
      {
        method: "POST",
        body: JSON.stringify({
          answer,
          ...(submissionId ? { submissionId } : {}),
          ...(source ? { source } : {}),
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

  // ─── Phase 3.1: Dashboard Summary & Normalized TOEIC Roadmap ──────────────

  /**
   * Fetches aggregated completion, answered accuracy, activity, mistakes, and TOEIC metrics.
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await request<DashboardSummary>("/dashboard/summary");
    return data;
  },

  /**
   * Fetches DB-backed normalized TOEIC roadmap stages, modules, and unit metadata.
   */
  async getCurriculumRoadmap(params?: {
    part?: string;
    priority?: "core" | "recommended" | "advanced";
    goalBand?: "450+" | "600+" | "750+";
    unitNumber?: number;
  }): Promise<CurriculumRoadmapResponse> {
    const search = new URLSearchParams();
    if (params?.part) search.set("part", params.part);
    if (params?.priority) search.set("priority", params.priority);
    if (params?.goalBand) search.set("goalBand", params.goalBand);
    if (params?.unitNumber !== undefined) search.set("unitNumber", String(params.unitNumber));
    const qs = search.toString();
    const { data } = await request<CurriculumRoadmapResponse>(
      `/curriculum/roadmap${qs ? `?${qs}` : ""}`
    );
    return data;
  },

  /**
   * Fetches overall grammar concept mastery summary for the authenticated user.
   */
  async getMasterySummary(): Promise<MasterySummaryResponse> {
    const { data } = await request<MasterySummaryResponse>("/mastery");
    return data;
  },

  /**
   * Fetches explainable concept mastery details including event timeline.
   */
  async getConceptMasteryDetail(conceptId: string): Promise<ConceptMasteryDetailResponse> {
    const { data } = await request<ConceptMasteryDetailResponse>(`/mastery/concepts/${conceptId}`);
    return data;
  },

  /**
   * Triggers deterministic recalculation of concept mastery for the current user.
   */
  async recalculateMastery(): Promise<{ recalculatedCount: number; conceptIds: string[] }> {
    const { data } = await request<{ recalculatedCount: number; conceptIds: string[] }>(
      "/mastery/recalculate",
      { method: "POST" }
    );
    return data;
  },

  /**
   * Fetches all scheduled spaced repetition reviews.
   */
  async getAllReviews(): Promise<AllReviewsResponse> {
    const { data } = await request<AllReviewsResponse>("/reviews");
    return data;
  },

  /**
   * Fetches spaced repetition concepts currently due for review with practice questions.
   */
  async getDueReviews(): Promise<DueReviewsResponse> {
    const { data } = await request<DueReviewsResponse>("/reviews/due");
    return data;
  },

  /**
   * Completes a review session for a concept with server-authoritative grading.
   */
  async completeReview(
    conceptId: string,
    payload: {
      answers: Record<string, string>;
      scheduleId?: string;
      submissionId?: string;
    }
  ): Promise<CompleteReviewResponse> {
    const { data } = await request<CompleteReviewResponse>(`/reviews/${conceptId}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data;
  },

  /**
   * Fetches prioritized personalized learning recommendations with data-driven rationale.
   */
  async getRecommendations(): Promise<PersonalizedRecommendationsResponse> {
    const { data } = await request<PersonalizedRecommendationsResponse>("/recommendations");
    return data;
  },

  /**
   * Fetches single top-priority recommended next action for the user.
   */
  async getNextRecommendation(): Promise<NextRecommendationResponse> {
    const { data } = await request<NextRecommendationResponse>("/recommendations/next");
    return data;
  },

  /**
   * Fetches user learning preferences.
   */
  async getPreferences(): Promise<UserLearningPreferencesDto> {
    const { data } = await request<UserLearningPreferencesDto>("/onboarding/preferences");
    return data;
  },

  /**
   * Updates user learning preferences and marks onboarding completed.
   */
  async updatePreferences(input: UpdatePreferencesInput): Promise<UserLearningPreferencesDto> {
    const { data } = await request<UserLearningPreferencesDto>("/onboarding/preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return data;
  },

  /**
   * Starts diagnostic assessment selecting questions with answers redacted.
   */
  async startDiagnostic(): Promise<StartDiagnosticResponse> {
    const { data } = await request<StartDiagnosticResponse>("/assessment/start", {
      method: "POST",
    });
    return data;
  },

  /**
   * Submits answers for diagnostic assessment.
   */
  async submitDiagnostic(
    assessmentId: string,
    answers: Record<string, any>
  ): Promise<DiagnosticResultResponse> {
    const { data } = await request<DiagnosticResultResponse>(
      `/assessment/${assessmentId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      }
    );
    return data;
  },

  /**
   * Fetches personalized 5-tier learning path progression.
   */
  async getLearningPath(): Promise<LearningPathResponse> {
    const { data } = await request<LearningPathResponse>("/learning-path");
    return data;
  },

  /**
   * Fetches or generates daily learning plan.
   */
  async getDailyPlan(date?: string): Promise<DailyPlanResponse> {
    const endpoint = date ? `/daily-plan?date=${encodeURIComponent(date)}` : "/daily-plan";
    const { data } = await request<DailyPlanResponse>(endpoint);
    return data;
  },

  /**
   * Updates a daily learning plan item status.
   */
  async updateDailyPlanItemStatus(
    itemId: string,
    status: "not_started" | "in_progress" | "completed" | "deferred"
  ): Promise<DailyPlanResponse> {
    const { data } = await request<DailyPlanResponse>(`/daily-plan/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return data;
  },

  /**
   * Initializes unified study session (theory + exercise + concepts + examples).
   */
  async initStudySession(unit: number, exercise?: string): Promise<StudySessionBundle> {
    const query = exercise
      ? `/study-sessions/init?unit=${unit}&exercise=${encodeURIComponent(exercise)}`
      : `/study-sessions/init?unit=${unit}`;
    const { data } = await request<StudySessionBundle>(query);
    return data;
  },

  /**
   * Fetches comprehensive learning engagement and streak summary.
   */
  async getEngagementSummary(): Promise<EngagementSummaryResponse> {
    const { data } = await request<EngagementSummaryResponse>("/engagement/summary");
    return data;
  },
};

export { ApiClientError };
export default api;

