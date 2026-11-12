import prisma from "../lib/prisma";
import { formatQuestion } from "../utils/formatters";

interface LatestUnresolvedRow {
  questionUuid: string;
  lastStudentAnswer: unknown;
  lastAttemptedAt: Date;
}

export interface UnresolvedMistakeRecord {
  questionUuid: string;
  questionId: string;
  questionContent: string;
  questionType: string;
  isExample: boolean;
  hasVisualContext: boolean;
  visualContextDescription: string | null;
  contextClue: string | null;
  displayOrder: number;
  options: Array<{ optionKey: string; optionText: string; displayOrder: number }>;
  blanks: Array<{ blankIndex: number }>;
  parts: Array<{ partId: string; questionContent: string; displayOrder: number }>;
  wordBankItems: Array<{ id: string; word: string; displayOrder: number }>;
  exerciseId: string;
  exerciseNumber: string;
  instruction: string | null;
  unitNumber: number;
  unitTitle: string;
  ruleReference: string | null;
  lastStudentAnswer: unknown;
  lastAttemptedAt: Date;
}

/**
 * Fetches only the user's LATEST unresolved mistakes (latest attempt per question_id
 * has is_correct = false) and hydrates full non-spoiler question structures
 * (options, blanks, parts, visual context, context clue, wordBankItems).
 */
export async function getLatestUnresolvedMistakes(
  userId: string,
  targetUnitNumbers?: number[]
): Promise<UnresolvedMistakeRecord[]> {
  const latestWrongRows = await prisma.$queryRaw<LatestUnresolvedRow[]>`
    WITH latest_attempts AS (
      SELECT DISTINCT ON (qai.question_id)
        qai.question_id AS "questionUuid",
        qai.student_answer AS "lastStudentAnswer",
        qai.created_at AS "lastAttemptedAt",
        qai.is_correct AS "isCorrect"
      FROM question_attempt_items qai
      WHERE qai.user_id = ${userId}::uuid
        AND qai.student_answer IS NOT NULL
        AND qai.student_answer::text <> 'null'
      ORDER BY qai.question_id, qai.created_at DESC, qai.id DESC
    )
    SELECT
      "questionUuid",
      "lastStudentAnswer",
      "lastAttemptedAt"
    FROM latest_attempts
    WHERE "isCorrect" = false
    ORDER BY "lastAttemptedAt" DESC;
  `;

  if (latestWrongRows.length === 0) {
    return [];
  }

  const uuids = latestWrongRows.map((r) => r.questionUuid);
  const questions = await prisma.question.findMany({
    where: {
      id: { in: uuids },
      ...(targetUnitNumbers && targetUnitNumbers.length > 0
        ? {
            exercise: {
              unit: { unitNumber: { in: targetUnitNumbers } },
            },
          }
        : {}),
    },
    include: {
      options: { orderBy: { displayOrder: "asc" } },
      blanks: { orderBy: { blankIndex: "asc" } },
      parts: { orderBy: { displayOrder: "asc" } },
      explanation: { select: { ruleReference: true } },
      exercise: {
        include: {
          unit: {
            select: { unitNumber: true, title: true },
          },
          wordBankItems: {
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const result: UnresolvedMistakeRecord[] = [];

  for (const row of latestWrongRows) {
    const q = questionMap.get(row.questionUuid);
    if (!q) continue;

    // Strictly use formatQuestion(q, false) so NO answers/acceptedAnswers/solutions leak
    const safeQuestion = formatQuestion(q, false);

    result.push({
      questionUuid: q.id,
      questionId: safeQuestion.questionId,
      questionContent: safeQuestion.questionContent,
      questionType: q.exercise.questionType,
      isExample: safeQuestion.isExample,
      hasVisualContext: safeQuestion.hasVisualContext,
      visualContextDescription: safeQuestion.visualContextDescription || null,
      contextClue: safeQuestion.contextClue || null,
      displayOrder: safeQuestion.displayOrder,
      options: safeQuestion.options,
      blanks: safeQuestion.blanks,
      parts: safeQuestion.parts,
      wordBankItems: (q.exercise.wordBankItems || []).map((w) => ({
        id: w.id,
        word: w.word,
        displayOrder: w.displayOrder,
      })),
      exerciseId: q.exercise.exerciseId,
      exerciseNumber: q.exercise.exerciseNumber,
      instruction: q.exercise.instruction || null,
      unitNumber: q.exercise.unit.unitNumber,
      unitTitle: q.exercise.unit.title,
      ruleReference: q.explanation?.ruleReference || null,
      lastStudentAnswer: row.lastStudentAnswer,
      lastAttemptedAt: row.lastAttemptedAt,
    });
  }

  return result;
}

