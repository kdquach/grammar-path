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
}

export interface ExerciseCheckResult {
  exerciseId: string;
  exerciseNumber: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  results: QuestionCheckResult[];
}
