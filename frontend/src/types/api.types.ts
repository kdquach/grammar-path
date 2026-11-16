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
  toeicMetadata?: {
    priority: "core" | "extended" | "advanced";
    toeicTag: string;
    toeicParts: string[];
    grammarFocus: string;
    noteVi: string;
  } | null;
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
  concepts?: Array<{
    conceptId: string;
    code: string;
    name: string;
    category: string;
    role: "primary" | "secondary";
    confidence: "high" | "medium" | "low" | "needs_review";
  }>;
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
  status?: "correct" | "incorrect" | "unanswered";
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
  answeredCount?: number;
  unansweredCount?: number;
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
  answeredCount?: number;
  unansweredCount?: number;
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
    averageScorePercentage: number | null;
  };
  questions: {
    totalAnswered: number;
    uniqueQuestionsAnswered: number;
    correctUniqueQuestions: number;
    accuracyPercentage: number | null;
  };
  recentAttempts: RecentAttempt[];
  unitProgressMap: UnitProgressSummary[];
}

export interface AttemptItem {
  questionId: string;
  studentAnswer: unknown;
  isCorrect: boolean | null;
  attemptStatus?: "correct" | "incorrect" | "unanswered";
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
  isExample?: boolean;
  hasVisualContext?: boolean;
  visualContextDescription?: string | null;
  contextClue?: string | null;
  displayOrder?: number;
  options?: QuestionOption[];
  blanks?: QuestionBlank[];
  parts?: QuestionPart[];
  wordBankItems?: WordBankItem[];
  exerciseId: string;
  exerciseNumber: string;
  instruction?: string | null;
  unitNumber: number;
  unitTitle: string;
  ruleReference?: string | null;
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
  source?: "ai" | "fallback";
  model?: string;
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
  accuracyPercentage: number | null;
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
  accuracyPercentage: number | null;
  weakestQuestionTypes: string[];
  targetRules?: string[];
  suggestedActions: string[];
}

export interface AdaptiveRecommendationsResponse {
  recommendations: ReviewRecommendation[];
  totalRecommendations: number;
}

// ─── Phase 9.2 & 2.1: TOEIC Practice & Adaptive Quiz Types ──────────────────

export type ToeicQuestionSource = "curated" | "dynamic" | "fallback";
export type ToeicSessionSource = ToeicQuestionSource | "mixed";

export interface ToeicOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ToeicQuestion {
  itemId: string;
  itemOrder?: number;
  source?: ToeicQuestionSource;
  prompt: string;
  options: ToeicOption[];
  difficulty?: DifficultyLevel;
  ruleReference?: string | null;
}

export interface ToeicPracticeSession {
  sessionId: string;
  unitNumber: number;
  title: string;
  difficulty?: DifficultyLevel;
  source?: ToeicSessionSource;
  isOfficialToeic?: boolean;
  sourceNotice?: string;
  requestedCount?: number;
  actualCount?: number;
  questions: ToeicQuestion[];
}

export interface ToeicPracticeCheckResult {
  sessionId: string;
  itemId: string;
  isCorrect: boolean;
  studentAnswer: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  ruleReference: string | null;
  attemptCount?: number;
}

export interface QuizTargetUnit {
  unitNumber: number;
  title: string;
  errorCount: number;
}

export interface AdaptiveQuizQuestion {
  id: string;
  questionId: string;
  questionContent?: string;
  isExample?: boolean;
  hasVisualContext?: boolean;
  visualContextDescription?: string | null;
  unitNumber: number;
  unitTitle: string;
  exerciseId: string;
  canonicalExerciseId?: string;
  exerciseNumber: string;
  questionType: string;
  instruction: string;
  prompt: string;
  options?: QuestionOption[] | Array<{ key: string; text: string }>;
  blanks?: QuestionBlank[];
  parts?: QuestionPart[];
  wordBankItems?: WordBankItem[];
  displayOrder?: number;
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

// ─── Phase 3.1: Dashboard Foundation & Curriculum Roadmap Types ──────────────

export interface DashboardDailyActivityPoint {
  date: string;
  answeredCount: number;
  correctCount: number;
  exerciseSubmissions: number;
  toeicItemsAnswered: number;
}

export interface DashboardRecentActivityItem {
  id: string;
  type: "exercise_attempt" | "toeic_practice";
  unitNumber: number;
  unitTitle?: string;
  exerciseNumber?: string;
  scorePercentage?: number;
  difficulty?: string;
  answeredCount: number;
  unansweredCount?: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercentage?: number | null;
  occurredAt: string;
}

export interface DashboardSummary {
  completion: {
    totalUnits: number;
    openedCount: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    completionPercentage: number;
    totalExercises: number;
    uniqueExercisesAttempted: number;
    totalExerciseSubmissions: number;
    averageExerciseScorePercentage: number | null;
  };
  accuracy: {
    totalQuestionsAnswered: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalUnansweredSkipped: number;
    uniqueQuestionsAnswered: number;
    uniqueQuestionsCorrect: number;
    accuracyPercentage: number | null;
    sourceBreakdown: Record<string, number>;
  };
  activity: {
    lastActivityAt: string | null;
    activeDaysLast7: number;
    activeDaysLast30: number;
    dailyLast14: DashboardDailyActivityPoint[];
    recentActivity: DashboardRecentActivityItem[];
  };
  resumeUnit: {
    unitNumber: number;
    title: string;
    reason: "in_progress" | "next_recommended" | "all_completed";
    lastAccessedAt: string | null;
    toeicTag: string | null;
    priority: string | null;
  } | null;
  mistakes: {
    unresolvedCount: number;
    recentItems: Array<{
      questionId: string;
      questionContent: string;
      exerciseNumber: string;
      unitNumber: number;
      unitTitle: string;
      ruleReference: string | null;
      lastStudentAnswer: unknown;
      lastAttemptedAt: string;
    }>;
  };
  weakUnits: Array<{
    unitNumber: number;
    unitTitle: string;
    evaluatedCount: number;
    errorCount: number;
    accuracyPercentage: number | null;
    conceptCode: string | null;
    category: string | null;
  }>;
  toeic: {
    totalSessions: number;
    itemsAnswered: number;
    itemsCorrect: number;
    accuracyPercentage: number | null;
    isOfficialToeic: boolean;
    scopeDisclaimer: string;
  };
  masteryStatus: {
    engineActive: boolean;
    note: string;
  };
}

export interface CurriculumRoadmapUnitItem {
  unitNumber: number;
  unitTitle: string;
  priority: "core" | "recommended" | "advanced";
  toeicTag: string;
  toeicParts: string[];
  grammarFocus: string;
  noteVi: string;
  isOfficialToeic: boolean;
  conceptCode: string | null;
  conceptCategory: string | null;
}

export interface CurriculumRoadmapModuleItem {
  id: string;
  code: string;
  titleVi: string;
  subtitleEn: string;
  toeicParts: string[];
  descriptionVi: string;
  trapTipVi: string;
  units: CurriculumRoadmapUnitItem[];
}

export interface CurriculumRoadmapStageItem {
  id: string;
  stageNumber: number;
  titleVi: string;
  targetBand: string;
  goalBandKey: "450+" | "600+" | "750+";
  durationEstimate: string;
  accent: "sky" | "emerald" | "indigo" | "amber" | "rose";
  summaryVi: string;
  whyForBeginnersVi: string;
  outcomeVi: string;
  modules: CurriculumRoadmapModuleItem[];
}

export interface CurriculumRoadmapResponse {
  stages: CurriculumRoadmapStageItem[];
  goalTracks: Array<{
    id: "450+" | "600+" | "750+";
    titleVi: string;
    targetBadge: string;
    weeklyPaceVi: string;
    descriptionVi: string;
    includedStages: number[];
    recommendedMode: "core" | "all";
  }>;
  partMatrix: Array<{
    part: string;
    titleVi: string;
    weightVi: string;
    keyTopicsVi: string;
    unitNumbers: number[];
  }>;
  dailyStudySteps: Array<{
    step: number;
    minutes: string;
    titleVi: string;
    descriptionVi: string;
  }>;
  totalStages: number;
  totalUnitsMatched: number;
  isOfficialToeic: boolean;
  scopeNotice: string;
}

// ─── Phase 3.2: Learning Mastery & Review Scheduling Types ────────────────────

export type MasteryStatus =
  | "not_started"
  | "insufficient_data"
  | "developing"
  | "practicing"
  | "proficient"
  | "mastered"
  | "needs_review";

export type ReviewState = "new" | "scheduled" | "due" | "completed" | "suspended";

export interface ConceptMasteryItem {
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  masteryStatus: MasteryStatus;
  masteryScore: number | null;
  retentionScore: number;
  evidenceCount: number;
  distinctQuestionCount: number;
  lastPracticedAt: string | null;
}

export interface MasterySummaryResponse {
  totalConcepts: number;
  startedConcepts: number;
  statusCounts: {
    not_started: number;
    insufficient_data: number;
    developing: number;
    practicing: number;
    proficient: number;
    mastered: number;
    needs_review: number;
  };
  averageMastery: number | null;
  averageRetention: number;
  dueReviewsCount: number;
  masteries: ConceptMasteryItem[];
}

export interface ConceptMasteryDetailResponse {
  concept: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string;
    relatedUnits: Array<{
      unitNumber: number;
      unitTitle: string;
      sectionId: string;
      confidence: "high" | "medium" | "needs_review";
    }>;
  };
  mastery: {
    status: MasteryStatus;
    score: number | null;
    retentionScore: number;
    evidenceCount: number;
    distinctQuestionCount: number;
    correctCount: number;
    incorrectCount: number;
    repeatedAttemptCount: number;
    lastPracticedAt: string | null;
    nextReviewDueAt: string | null;
    reviewState: ReviewState;
    stabilityDays: number;
    explanationVi: string;
    recommendedActionVi: string;
  };
  historyEvents: Array<{
    id: string;
    previousStatus: MasteryStatus | null;
    newStatus: MasteryStatus;
    previousScore: number | null;
    newScore: number | null;
    reason: string;
    createdAt: string;
  }>;
}

export interface DueReviewItem {
  scheduleId: string;
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  unitNumber: number | null;
  unitTitle: string | null;
  dueAt: string;
  isOverdue: boolean;
  stabilityDays: number;
  intervalDays: number;
  reviewCount: number;
  consecutiveCorrect: number;
  masteryStatus: MasteryStatus;
  retentionScore: number;
  practiceQuestions: Array<{
    id: string;
    questionId: string;
    questionContent: string;
    displayOrder: number;
    exercise: {
      id: string;
      exerciseId: string;
      exerciseNumber: string;
      instruction: string;
      unitId: string;
      unit: {
        unitNumber: number;
        title: string;
      };
    };
    blanks: Array<{
      id: string;
      blankIndex: number;
    }>;
    options: Array<{
      id: string;
      optionKey: string;
      optionText: string;
    }>;
  }>;
}

export interface DueReviewsResponse {
  dueCount: number;
  items: DueReviewItem[];
}

export interface AllReviewsResponse {
  totalSchedules: number;
  reviews: Array<{
    id: string;
    conceptId: string;
    conceptCode: string;
    conceptName: string;
    category: string;
    dueAt: string;
    isDue: boolean;
    reviewState: ReviewState;
    stabilityDays: number;
    intervalDays: number;
    reviewCount: number;
    consecutiveCorrect: number;
    lastReviewedAt: string | null;
  }>;
}

export interface ReviewQuestionResult {
  questionId: string;
  isCorrect: boolean;
  status: "correct" | "incorrect" | "unanswered";
  studentAnswer: unknown;
  correctAnswers?: string[];
  expectedAnswers?: string[];
  explanation?: string | null;
  ruleReference?: string | null;
}

export interface CompleteReviewResponse {
  status: "success" | "reinforcement_needed" | "rescheduled_unanswered";
  accuracy?: number;
  correctCount?: number;
  totalCount?: number;
  unansweredCount?: number;
  stabilityDays: number;
  intervalDays: number;
  dueAt: string;
  messageVi: string;
  results?: ReviewQuestionResult[];
}

export interface RecommendationItem {
  id: string;
  type: "review" | "weakness" | "build_evidence" | "curriculum_next";
  priority: number;
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  unitNumber: number;
  unitTitle: string;
  exerciseId: string;
  exerciseTitle: string;
  estimatedQuestionCount: number;
  reasonVi: string;
  actionUrl: string;
}

export interface PersonalizedRecommendationsResponse {
  total: number;
  recommendations: RecommendationItem[];
}

export interface NextRecommendationResponse {
  nextAction: RecommendationItem | null;
}

// ─── Phase 3.3: Learning Experience & Engagement Types ────────────────────────

export interface UserLearningPreferencesDto {
  grammarConfidence: "beginner" | "elementary" | "intermediate" | "advanced";
  learningObjective: "foundation" | "toeic_prep" | "speaking_writing" | "review";
  dailyStudyMinutes: number;
  preferredDays: string[];
  targetToeicScore: number | null;
  targetDate: string | null;
  onboardingCompleted: boolean;
}

export interface UpdatePreferencesInput {
  grammarConfidence?: "beginner" | "elementary" | "intermediate" | "advanced";
  learningObjective?: "foundation" | "toeic_prep" | "speaking_writing" | "review";
  dailyStudyMinutes?: number;
  preferredDays?: string[];
  targetToeicScore?: number | null;
  targetDate?: string | null;
}

export interface DiagnosticQuestion {
  id: string;
  questionId: string;
  exerciseNumber: string;
  unitNumber: number;
  unitTitle: string;
  promptText: string;
  questionType: string;
  concept: { id: string; code: string; name: string; category: string } | null;
  blanks: Array<{ blankIndex: number; hint?: string | null }>;
  options: Array<{ key: string; text: string }>;
}

export interface StartDiagnosticResponse {
  assessmentId: string;
  status: string;
  startedAt: string;
  totalQuestions: number;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticResultItem {
  questionId: string;
  promptText: string;
  unitNumber: number;
  unitTitle: string;
  studentAnswer: any;
  isCorrect: boolean;
  correctAnswers: string[];
  explanation: string | null;
  conceptName: string;
}

export interface DiagnosticResultResponse {
  assessmentId: string;
  status: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  estimatedLevel: "foundation" | "developing" | "intermediate" | "advanced";
  recommendedUnit: { unitNumber: number; title: string };
  strengths: string[];
  weaknesses: string[];
  summaryVi: string;
  disclaimerVi: string;
  items: DiagnosticResultItem[];
}

export interface LearningPathItem {
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  displayOrder: number;
  masteryStatus: MasteryStatus;
  masteryScore: number | null;
  retentionScore: number;
  evidenceCount: number;
  distinctQuestionCount: number;
  reviewState: ReviewState | null;
  isDue: boolean;
  dueAt: string | null;
  units: Array<{
    unitNumber: number;
    title: string;
    exercises: Array<{ exerciseNumber: string; questionCount: number }>;
  }>;
  suggestedAction: {
    type: "review" | "remediate" | "build_evidence" | "progress";
    labelVi: string;
    priority: number;
    targetExerciseNumber?: string;
    targetUnitNumber?: number;
  };
}

export interface LearningPathStage {
  stageKey: string;
  titleVi: string;
  subtitleEn: string;
  unitRange: string;
  concepts: LearningPathItem[];
}

export interface LearningPathResponse {
  totalConcepts: number;
  masteredCount: number;
  practicingCount: number;
  needsReviewCount: number;
  stages: LearningPathStage[];
}

export interface DailyPlanItem {
  id: string;
  activityType: "spaced_review" | "theory_reading" | "exercise_practice" | "mistake_review" | "toeic_practice";
  status: "not_started" | "in_progress" | "completed" | "deferred";
  title: string;
  description: string | null;
  estimatedMinutes: number;
  targetId: string | null;
  targetNumber: string | null;
  metadata: any;
  displayOrder: number;
  completedAt: string | null;
}

export interface DailyPlanResponse {
  id: string;
  planDate: string;
  status: "not_started" | "in_progress" | "completed" | "partially_completed" | "deferred";
  targetMinutes: number;
  completedMinutes: number;
  summaryVi: string;
  items: DailyPlanItem[];
}

export interface StudySessionBundle {
  unit: {
    id: string;
    unitNumber: number;
    title: string;
    bookTitle: string;
    theoryPage: number | null;
    exercisePage: number | null;
  };
  theorySections: Array<{
    id: string;
    sectionId: string;
    heading: string;
    sourceContent: string;
    displayOrder: number;
  }>;
  textbookExamples: Array<{
    id: string;
    exampleId: string;
    originalText: string;
    translationVi: string | null;
    displayOrder: number;
  }>;
  exercisesList: Array<{
    exerciseNumber: string;
    questionCount: number;
    isCurrent: boolean;
  }>;
  currentExercise: {
    id: string;
    exerciseNumber: string;
    instructionText: string | null;
    questionType: string;
    wordBank: string[];
    questions: Array<{
      id: string;
      questionId: string;
      promptText: string;
      questionType: string;
      displayOrder: number;
      blanks: Array<{ blankIndex: number; hint?: string | null }>;
      options: Array<{ key: string; text: string }>;
    }>;
  };
  userContext?: {
    unitStatus: string;
    masteryScore: number | null;
    masteryStatus: string;
    retentionScore: number;
    conceptName: string | null;
  };
}

export interface EngagementSummaryResponse {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  activeDatesLast30Days: string[];
  weeklyDaysActive: number;
  weeklyGoalDays: number;
  dailyGoalMinutes: number;
  dailyMinutesCompletedToday: number;
  metrics: {
    unitsCompleted: number;
    totalUnits: number;
    completionPercentage: number;
    overallAccuracy: number | null;
    totalEvaluatedQuestions: number;
    masteredConceptsCount: number;
    practicingConceptsCount: number;
    needsReviewConceptsCount: number;
    averageRetention: number;
  };
}


