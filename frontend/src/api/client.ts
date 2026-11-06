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
} from "../types/api.types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = `${BASE_URL}/api/v1`;

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
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
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
};

export { ApiClientError };
export default api;
