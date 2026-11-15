export type CanonicalAttemptStatus = "correct" | "incorrect" | "unanswered";

export type CanonicalAttemptSource =
  | "single_check"
  | "exercise_submission"
  | "adaptive_quiz"
  | "mistake_retry"
  | "toeic_practice"
  | "legacy_unknown";

export const ALLOWED_QUESTION_CHECK_SOURCES = [
  "single_check",
  "mistake_retry",
] as const;

export type QuestionCheckSource = (typeof ALLOWED_QUESTION_CHECK_SOURCES)[number];

export function deriveAttemptStatus(params: {
  hasAttempted: boolean;
  isCorrect: boolean;
}): {
  attemptStatus: CanonicalAttemptStatus;
  isCorrect: boolean | null;
} {
  if (!params.hasAttempted) {
    return {
      attemptStatus: "unanswered",
      isCorrect: null,
    };
  }

  return {
    attemptStatus: params.isCorrect ? "correct" : "incorrect",
    isCorrect: Boolean(params.isCorrect),
  };
}

export function isEvaluatedAttemptItem(item: {
  attemptStatus?: CanonicalAttemptStatus | string | null;
  isCorrect: boolean | null;
  studentAnswer?: unknown;
}): boolean {
  if (item.attemptStatus === "unanswered" || item.isCorrect === null) {
    return false;
  }
  if (!item.attemptStatus && (item.studentAnswer === null || item.studentAnswer === undefined)) {
    return false;
  }
  return item.isCorrect === true || item.isCorrect === false;
}

export function computeNullableAccuracy(
  correctCount: number,
  evaluatedCount: number
): number | null {
  if (!Number.isFinite(evaluatedCount) || evaluatedCount <= 0) {
    return null;
  }
  const safeCorrect = Math.max(0, correctCount);
  return Math.round((safeCorrect / evaluatedCount) * 1000) / 10;
}

export function computeNullableAverageScore(
  avgScore: number | null,
  totalAttempts: number
): number | null {
  if (!Number.isFinite(totalAttempts) || totalAttempts <= 0 || avgScore === null) {
    return null;
  }
  return Math.round(avgScore * 10) / 10;
}

