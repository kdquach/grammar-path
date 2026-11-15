import prisma from "../lib/prisma";
import { AppError } from "../middleware/error-handler";

export interface StudySessionInitResponse {
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

export async function initUnifiedStudySession(
  userId: string | null,
  unitNumber: number,
  requestedExerciseNumber?: string
): Promise<StudySessionInitResponse> {
  const unit = await prisma.unit.findFirst({
    where: { unitNumber },
    include: {
      book: { select: { title: true } },
      theorySections: {
        orderBy: { displayOrder: "asc" },
        include: {
          conceptLinks: {
            include: { concept: true },
          },
        },
      },
      textbookExamples: {
        orderBy: { displayOrder: "asc" },
      },
      exercises: {
        orderBy: { exerciseNumber: "asc" },
        include: {
          wordBankItems: { orderBy: { displayOrder: "asc" } },
          questions: {
            where: { isExample: false },
            orderBy: { displayOrder: "asc" },
            include: {
              blanks: { orderBy: { blankIndex: "asc" } },
              options: { orderBy: { displayOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!unit) {
    throw AppError.notFound(`Unit ${unitNumber} not found`, "UNIT_NOT_FOUND");
  }

  // Find requested exercise or default to first exercise
  const targetExercise =
    (requestedExerciseNumber &&
      unit.exercises.find((e) => e.exerciseNumber === requestedExerciseNumber)) ||
    unit.exercises[0];

  if (!targetExercise) {
    throw AppError.notFound(
      `No exercises found for Unit ${unitNumber}`,
      "EXERCISE_NOT_FOUND"
    );
  }

  const exercisesList = unit.exercises.map((e) => ({
    exerciseNumber: e.exerciseNumber,
    questionCount: e.questions.length,
    isCurrent: e.exerciseNumber === targetExercise.exerciseNumber,
  }));

  // Resolve linked concept for user context
  let primaryConcept = unit.theorySections[0]?.conceptLinks[0]?.concept ?? null;

  let userContext: StudySessionInitResponse["userContext"] = undefined;

  if (userId) {
    const [progress, mastery] = await Promise.all([
      prisma.learningProgress.findUnique({
        where: { userId_unitId: { userId, unitId: unit.id } },
      }),
      primaryConcept
        ? prisma.userConceptMastery.findUnique({
            where: { userId_conceptId: { userId, conceptId: primaryConcept.id } },
          })
        : null,
    ]);

    userContext = {
      unitStatus: progress?.status ?? "not_started",
      masteryScore: mastery?.masteryScore ?? null,
      masteryStatus: mastery?.masteryStatus ?? "not_started",
      retentionScore: mastery?.retentionScore ?? 1.0,
      conceptName: primaryConcept?.name ?? null,
    };
  }

  return {
    unit: {
      id: unit.id,
      unitNumber: unit.unitNumber,
      title: unit.title,
      bookTitle: unit.book.title,
      theoryPage: unit.bookTheoryPage,
      exercisePage: unit.bookExercisePage,
    },
    theorySections: unit.theorySections.map((ts) => ({
      id: ts.id,
      sectionId: ts.sectionId,
      heading: ts.heading,
      sourceContent: ts.sourceContent,
      displayOrder: ts.displayOrder,
    })),
    textbookExamples: unit.textbookExamples.map((ex) => ({
      id: ex.id,
      exampleId: ex.exampleId,
      originalText: ex.originalText,
      translationVi: ex.translationVi,
      displayOrder: ex.displayOrder,
    })),
    exercisesList,
    currentExercise: {
      id: targetExercise.id,
      exerciseNumber: targetExercise.exerciseNumber,
      instructionText: targetExercise.instruction,
      questionType: targetExercise.questionType,
      wordBank: targetExercise.wordBankItems.map((wb) => wb.word),
      questions: targetExercise.questions.map((q) => ({
        id: q.id,
        questionId: q.questionId,
        promptText: q.questionContent,
        questionType: targetExercise.questionType,
        displayOrder: q.displayOrder,
        blanks: q.blanks.map((b) => ({
          blankIndex: b.blankIndex,
        })),
        options: q.options.map((o) => ({
          key: o.optionKey,
          text: o.optionText,
        })),
      })),
    },
    userContext,
  };
}
