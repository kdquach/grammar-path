export interface EvaluatedQuestionResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: unknown;
  correctAnswers: string[];
  expectedAnswers: string[];
  explanation: string | null;
  ruleReference: string | null;
}

/**
 * Normalizes string for comparison:
 * - Trims leading and trailing whitespace
 * - Collapses inner consecutive whitespace into single space
 * - Converts curly quotes / apostrophes to standard straight ASCII characters (' and ")
 * - Converts to lower-case
 */
export function normalizeString(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u00B4\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ");
}

/**
 * Normalizes string and strips trailing sentence punctuation (.,?!) for flexible matching
 */
export function normalizePunctuation(str: string): string {
  return normalizeString(str).replace(/[.,?!]+$/, "").trim();
}

/**
 * Checks if a student's string answer matches an expected string answer.
 */
export function areStringsEquivalent(
  student: string,
  expected: string
): boolean {
  if (typeof student !== "string" || typeof expected !== "string") {
    return false;
  }
  const normStudent = normalizeString(student);
  const normExpected = normalizeString(expected);
  if (normStudent === normExpected) return true;

  const puncStudent = normalizePunctuation(student);
  const puncExpected = normalizePunctuation(expected);
  if (puncStudent.length > 0 && puncStudent === puncExpected) return true;

  return false;
}

/**
 * Matches a student's string answer against a list of acceptable string answers.
 */
export function matchesAnyExpected(
  student: string,
  acceptableList: string[]
): boolean {
  for (const expected of acceptableList) {
    if (areStringsEquivalent(student, expected)) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluates a single question against a student's submitted answer.
 * Handles single answers, multi-blank questions, and multi-part questions.
 */
export function evaluateQuestion(
  question: any,
  studentAnswer: unknown
): EvaluatedQuestionResult {
  const questionId = question.questionId;
  const explanation = question.explanation?.aiExplanation || null;
  const ruleReference = question.explanation?.ruleReference || null;

  // Case 1: Multi-blank question
  if (question.blanks && question.blanks.length > 0) {
    const blanks = question.blanks;
    let allBlanksCorrect = true;
    const expectedAnswers: string[] = [];

    // Collect expected answers per blank
    for (const b of blanks) {
      const blankAcceptable: string[] = [];
      if (b.correctAnswerText) blankAcceptable.push(b.correctAnswerText);
      if (Array.isArray(b.acceptedAnswers)) {
        for (const a of b.acceptedAnswers) {
          if (a.answerText && !blankAcceptable.includes(a.answerText)) {
            blankAcceptable.push(a.answerText);
          }
        }
      }
      expectedAnswers.push(blankAcceptable[0] || "");
    }

    if (studentAnswer === undefined || studentAnswer === null) {
      allBlanksCorrect = false;
    } else {
      for (let i = 0; i < blanks.length; i++) {
        const b = blanks[i];
        const blankIdx = b.blankIndex; // usually 1-based (1..N)

        // Find acceptable answers for this blank
        const blankAcceptable: string[] = [];
        if (b.correctAnswerText) blankAcceptable.push(b.correctAnswerText);
        if (Array.isArray(b.acceptedAnswers)) {
          for (const a of b.acceptedAnswers) {
            if (a.answerText && !blankAcceptable.includes(a.answerText)) {
              blankAcceptable.push(a.answerText);
            }
          }
        }

        // Extract student input for this blank
        let subAnswer: unknown = undefined;
        if (Array.isArray(studentAnswer)) {
          subAnswer = studentAnswer[i];
        } else if (
          typeof studentAnswer === "object" &&
          studentAnswer !== null
        ) {
          const record = studentAnswer as Record<string, unknown>;
          const partForBlank = question.parts?.[i];
          subAnswer =
            (partForBlank ? record[partForBlank.partId] : undefined) ??
            record[String(blankIdx)] ??
            record[String(i + 1)] ??
            record[String(i)] ??
            record[`blank_${blankIdx}`] ??
            record[b.id];
        } else if (typeof studentAnswer === "string" && blanks.length === 1) {
          subAnswer = studentAnswer;
        }

        if (
          typeof subAnswer !== "string" ||
          !matchesAnyExpected(subAnswer, blankAcceptable)
        ) {
          allBlanksCorrect = false;
        }
      }
    }

    return {
      questionId,
      isCorrect: allBlanksCorrect,
      studentAnswer,
      correctAnswers: expectedAnswers,
      expectedAnswers,
      explanation,
      ruleReference,
    };
  }

  // Case 2: Multi-part question
  if (question.parts && question.parts.length > 0) {
    const parts = question.parts;
    let allPartsCorrect = true;
    const expectedAnswers: string[] = [];

    for (const p of parts) {
      const partAcceptable: string[] = [];
      if (p.correctAnswerText) partAcceptable.push(p.correctAnswerText);
      if (Array.isArray(p.acceptedAnswers)) {
        for (const a of p.acceptedAnswers) {
          if (a.answerText && !partAcceptable.includes(a.answerText)) {
            partAcceptable.push(a.answerText);
          }
        }
      }
      expectedAnswers.push(partAcceptable[0] || "");
    }

    if (studentAnswer === undefined || studentAnswer === null) {
      allPartsCorrect = false;
    } else {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const displayOrder = p.displayOrder; // 1..N

        const partAcceptable: string[] = [];
        if (p.correctAnswerText) partAcceptable.push(p.correctAnswerText);
        if (Array.isArray(p.acceptedAnswers)) {
          for (const a of p.acceptedAnswers) {
            if (a.answerText && !partAcceptable.includes(a.answerText)) {
              partAcceptable.push(a.answerText);
            }
          }
        }

        let subAnswer: unknown = undefined;
        if (Array.isArray(studentAnswer)) {
          subAnswer = studentAnswer[i];
        } else if (
          typeof studentAnswer === "object" &&
          studentAnswer !== null
        ) {
          const record = studentAnswer as Record<string, unknown>;
          subAnswer =
            record[p.partId] ??
            record[String(displayOrder)] ??
            record[String(i + 1)] ??
            record[String(i)] ??
            record[p.id];
        } else if (typeof studentAnswer === "string" && parts.length === 1) {
          subAnswer = studentAnswer;
        }

        if (
          typeof subAnswer !== "string" ||
          !matchesAnyExpected(subAnswer, partAcceptable)
        ) {
          allPartsCorrect = false;
        }
      }
    }

    return {
      questionId,
      isCorrect: allPartsCorrect,
      studentAnswer,
      correctAnswers: expectedAnswers,
      expectedAnswers,
      explanation,
      ruleReference,
    };
  }

  // Case 3: Standard single answer question
  const acceptableList: string[] = [];
  if (question.correctAnswerText) {
    acceptableList.push(question.correctAnswerText);
  }
  if (Array.isArray(question.acceptedAnswers)) {
    for (const a of question.acceptedAnswers) {
      if (a.answerText && !acceptableList.includes(a.answerText)) {
        acceptableList.push(a.answerText);
      }
    }
  }
  if (
    question.isExample &&
    question.exampleAnswer &&
    !acceptableList.includes(question.exampleAnswer)
  ) {
    acceptableList.push(question.exampleAnswer);
  }

  // Cross-match options: if question has options, link optionKey <-> optionText
  if (Array.isArray(question.options) && question.options.length > 0) {
    for (const opt of question.options) {
      const keyMatches = opt.optionKey && matchesAnyExpected(opt.optionKey, acceptableList);
      const textMatches = opt.optionText && matchesAnyExpected(opt.optionText, acceptableList);
      if (keyMatches || textMatches) {
        if (opt.optionKey && !acceptableList.includes(opt.optionKey)) {
          acceptableList.push(opt.optionKey);
        }
        if (opt.optionText && !acceptableList.includes(opt.optionText)) {
          acceptableList.push(opt.optionText);
        }
      }
    }
  }

  let isCorrect = false;
  if (typeof studentAnswer === "string") {
    isCorrect = matchesAnyExpected(studentAnswer, acceptableList);
  } else if (
    Array.isArray(studentAnswer) &&
    studentAnswer.length === 1 &&
    typeof studentAnswer[0] === "string"
  ) {
    isCorrect = matchesAnyExpected(studentAnswer[0], acceptableList);
  }

  return {
    questionId,
    isCorrect,
    studentAnswer,
    correctAnswers: acceptableList,
    expectedAnswers: acceptableList,
    explanation,
    ruleReference,
  };
}
