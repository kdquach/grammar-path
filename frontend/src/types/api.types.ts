export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface Book {
  id: string;
  title: string;
  edition: string;
  author: string;
  publisher?: string | null;
  pdfFilename: string;
  totalPdfPages: number;
  totalUnits: number;
  totalExercises: number;
  totalQuestions: number;
  totalTheorySections: number;
  totalTextbookExamples: number;
}

export interface UnitCounts {
  theorySections: number;
  textbookExamples: number;
  exercises: number;
  questions: number;
}

export interface UnitSummary {
  id: string;
  unitNumber: number;
  title: string;
  theoryPdfPage: number | null;
  exercisePdfPage: number | null;
  bookTheoryPage: number | null;
  bookExercisePage: number | null;
  bookAnswerKeyPage: number | null;
  confidenceLevel: string | null;
  counts: UnitCounts;
}

export interface UnitSourcePage {
  id: string;
  pageNumber: number;
  pageRole: string;
}

export interface TheorySectionSummary {
  sectionId: string;
  heading: string;
  displayOrder: number;
}

export interface ExerciseSummary {
  exerciseId: string;
  exerciseNumber: string;
  questionType: string;
  instruction: string;
  hasVisualContext: boolean;
  displayOrder: number;
  questionCount: number;
  wordBankCount: number;
}

export interface UnitDetail {
  id: string;
  unitNumber: number;
  title: string;
  theoryPdfPage: number | null;
  exercisePdfPage: number | null;
  bookTheoryPage: number | null;
  bookExercisePage: number | null;
  bookAnswerKeyPage: number | null;
  confidenceLevel: string | null;
  sourcePages: UnitSourcePage[];
  theorySections: TheorySectionSummary[];
  exercises: ExerciseSummary[];
}

export interface TheorySection {
  id: string;
  unitId?: string;
  sectionId: string;
  heading: string;
  sourceContent: string;
  displayOrder: number;
  sourcePages: number[];
  unit?: {
    unitNumber: number;
    title: string;
  };
  linkedQuestions?: {
    count: number;
    questionIds: string[];
  };
}

export interface TextbookExample {
  id: string;
  exampleId: string;
  originalText: string;
  translationVi: string | null;
  displayOrder: number;
  sourcePages: number[];
}

export interface UnitTheory {
  unitNumber: number;
  title: string;
  theorySections: TheorySection[];
  textbookExamples: TextbookExample[];
}

export interface WordBankItem {
  id: string;
  word: string;
  displayOrder: number;
}

export interface QuestionOption {
  optionKey: string;
  optionText: string;
  displayOrder: number;
}

export interface QuestionBlank {
  blankIndex: number;
  correctAnswerType?: string;
  correctAnswerText?: string | null;
  correctAnswerArray?: string[] | null;
  acceptedAnswers?: string[];
}

export interface QuestionPart {
  partId: string;
  questionContent: string;
  displayOrder: number;
  correctAnswerType?: string;
  correctAnswerText?: string | null;
  correctAnswerArray?: string[] | null;
  acceptedAnswers?: string[];
}

export interface Question {
  id: string;
  questionId: string;
  questionContent: string;
  isExample: boolean;
  exampleAnswer?: string | null;
  hasVisualContext: boolean;
  visualContextDescription?: string | null;
  contextClue?: string | null;
  displayOrder: number;
  options: QuestionOption[];
  blanks: QuestionBlank[];
  parts: QuestionPart[];
  correctAnswerType?: string;
  correctAnswerText?: string | null;
  correctAnswerArray?: string[] | null;
  acceptedAnswers?: string[];
  sourcePages?: number[];
  exercise?: {
    exerciseId: string;
    exerciseNumber: string;
    questionType: string;
    instruction?: string;
    unit?: {
      unitNumber: number;
      title: string;
    };
  };
}

export interface Exercise {
  id: string;
  exerciseId: string;
  exerciseNumber: string;
  questionType: string;
  instruction: string;
  hasVisualContext: boolean;
  visualContextDescription?: string | null;
  contextNotes?: string | null;
  displayOrder: number;
  wordBankItems: WordBankItem[];
  questions: Question[];
}

export interface AnswerKey {
  exerciseNumber: string;
  answerType: string;
  answerText: string | null;
  answerArray?: unknown;
  notes?: string | null;
  sourcePages: number[];
}

export interface Explanation {
  aiExplanation: string;
  explanationLanguage: string;
  ruleReference: string | null;
  theorySection?: {
    sectionId: string;
    heading: string;
  } | null;
}

export interface QuestionSolution {
  id: string;
  questionId: string;
  questionContent: string;
  isExample: boolean;
  exampleAnswer?: string | null;
  hasVisualContext: boolean;
  visualContextDescription?: string | null;
  contextClue?: string | null;
  displayOrder: number;
  correctAnswerType: string;
  correctAnswerText: string | null;
  correctAnswerArray?: unknown;
  acceptedAnswers: string[];
  blanks: QuestionBlank[];
  parts: QuestionPart[];
  answerKey: AnswerKey | null;
  explanation: Explanation | null;
}

export interface QuestionCheckResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: unknown;
  correctAnswers: string[];
  expectedAnswers: string[];
  explanation: string | null;
  ruleReference: string | null;
  questionAttemptId?: string;
}

export interface ExerciseCheckResult {
  exerciseId: string;
  exerciseNumber: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  results: QuestionCheckResult[];
  attemptId?: string;
  unitProgressStatus?: string;
}

// ─── Phase 7 Authentication & Progress Types ─────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type LearningStatus = "not_started" | "in_progress" | "completed";

export interface UnitProgressSummary {
  unitNumber: number;
  status: LearningStatus;
  lastAccessedAt: string;
  completedAt: string | null;
}

export interface RecentAttempt {
  id: string;
  exerciseId: string;
  exerciseNumber: string;
  unitNumber: number;
  unitTitle: string;
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface ProgressOverview {
  units: {
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    totalUnits: number;
    completionPercentage: number;
  };
  exercises: {
    totalAttempts: number;
    uniqueExercisesAttempted: number;
    totalExercises: number;
    averageScorePercentage: number;
  };
  questions: {
    totalAnswered: number;
    uniqueQuestionsAnswered: number;
    correctUniqueQuestions: number;
    accuracyPercentage: number;
  };
  recentAttempts: RecentAttempt[];
  unitProgressMap: UnitProgressSummary[];
}

export interface AttemptItem {
  questionId: string;
  studentAnswer: unknown;
  isCorrect: boolean;
}

export interface UnitProgressAttempt {
  id: string;
  exerciseId: string;
  exerciseNumber: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  submittedAt: string;
  items?: AttemptItem[];
}

export interface UnitProgressDetail {
  unitNumber: number;
  title: string;
  status: LearningStatus;
  lastAccessedAt: string | null;
  completedAt: string | null;
  attempts: UnitProgressAttempt[];
}

export interface MistakeItem {
  questionId: string;
  questionContent: string;
  questionType: string;
  exerciseId: string;
  exerciseNumber: string;
  unitNumber: number;
  unitTitle: string;
  lastStudentAnswer: unknown;
  lastAttemptedAt: string;
}

// ─── Phase 9 Adaptive Learning & AI Types ───────────────────────────────────

export interface ExplainTheoryPayload {
  sectionId: string;
  heading: string;
  sourceContent: string;
  userQuestion?: string;
}

export interface ExplainTheoryResponse {
  explanation: string;
}

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface AdaptiveWeakUnit {
  unitNumber: number;
  unitTitle: string;
  totalAttempts: number;
  errorCount: number;
  accuracyPercentage: number;
  weakestQuestionTypes: string[];
}

export interface AdaptiveErrorDistributionItem {
  questionType: string;
  errorCount: number;
  totalAttempts: number;
  errorRatePercentage: number;
}

export interface WeakRuleMetric {
  ruleReference: string;
  heading: string;
  unitNumber: number;
  unitTitle: string;
  errorCount: number;
  totalAttempts: number;
  accuracyPercentage: number;
}

export interface AdaptiveAnalytics {
  totalEvaluated: number;
  totalCorrect: number;
  totalErrors: number;
  accuracyPercentage: number;
  weakestUnits: AdaptiveWeakUnit[];
  errorDistribution: AdaptiveErrorDistributionItem[];
  weakestQuestionType: string | null;
  weakRules: WeakRuleMetric[];
}

export interface ReviewRecommendation {
  unitNumber: number;
  unitTitle: string;
  priority: "high" | "medium" | "low";
  reason: string;
  errorCount: number;
  accuracyPercentage: number;
  weakestQuestionTypes: string[];
  targetRules?: string[];
  suggestedActions: string[];
}

export interface AdaptiveRecommendationsResponse {
  recommendations: ReviewRecommendation[];
  totalRecommendations: number;
}

// ─── Phase 9.2: TOEIC Practice & Adaptive Quiz Types ─────────────────────────

export interface ToeicOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ToeicQuestion {
  prompt: string;
  options: ToeicOption[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty?: DifficultyLevel;
  ruleReference?: string;
}

export interface ToeicPracticeSession {
  unitNumber: number;
  title: string;
  difficulty?: DifficultyLevel;
  questions: ToeicQuestion[];
}

export interface QuizTargetUnit {
  unitNumber: number;
  title: string;
  errorCount: number;
}

export interface AdaptiveQuizQuestion {
  id: string;
  questionId: string;
  unitNumber: number;
  unitTitle: string;
  exerciseId: string;
  exerciseNumber: string;
  questionType: string;
  instruction: string;
  prompt: string;
  options?: Array<{ key: string; text: string }>;
  correctAnswer?: string;
  explanation?: string | null;
  ruleReference?: string | null;
  difficulty?: DifficultyLevel;
  contextClue?: string | null;
}

export interface AdaptiveQuizSession {
  sessionId: string;
  difficulty?: DifficultyLevel;
  targetUnits: QuizTargetUnit[];
  totalQuestions: number;
  questions: AdaptiveQuizQuestion[];
}

