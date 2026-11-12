export interface EvaluatedQuestionResult {
  questionId: string;
  status?: "correct" | "incorrect" | "unanswered";
  isCorrect: boolean;
  studentAnswer: unknown;
  correctAnswers: string[];
  expectedAnswers: string[];
  explanation: string | null;
  ruleReference: string | null;
}

/**
 * Determines whether a submitted student answer is completely empty/unattempted.
 * Used to reject empty-probe answer harvesting and redact unattempted items.
 */
export function isEmptyStudentAnswer(answer: unknown): boolean {
  if (answer === undefined || answer === null) {
    return true;
  }
  if (typeof answer === "string") {
    return answer.trim().length === 0;
  }
  if (Array.isArray(answer)) {
    return (
      answer.length === 0 ||
      answer.every(
        (item) => typeof item !== "string" || item.trim().length === 0
      )
    );
  }
  if (typeof answer === "object") {
    const values = Object.values(answer as Record<string, unknown>);
    return (
      values.length === 0 ||
      values.every(
        (val) => typeof val !== "string" || val.trim().length === 0
      )
    );
  }
  return true;
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
 * Detects anomalous questions whose `options` hold per-blank slash hints
 * (e.g. 86.4-q9: blanks=["No-one", "anyone"], options=["No-one / Anyone", "no-one / anyone"])
 * rather than mutually exclusive candidate answers (such as 32.1-q7 "must ... mustn't").
 */
export function isSplitBlankSlashOptionQuestion(question: any): boolean {
  const options = Array.isArray(question?.options) ? question.options : [];
  const blanks = Array.isArray(question?.blanks) ? question.blanks : [];

  if (options.length <= 1 || blanks.length <= 1) {
    return false;
  }

  const allLookLikePerBlankSlashPairs = options.every(
    (opt: any) =>
      typeof opt?.optionText === "string" &&
      opt.optionText.includes(" / ") &&
      !opt.optionText.includes("...")
  );
  if (!allLookLikePerBlankSlashPairs) {
    return false;
  }

  const topLevelAcceptable: string[] = [];
  if (question.correctAnswerText) topLevelAcceptable.push(question.correctAnswerText);
  if (Array.isArray(question.acceptedAnswers)) {
    for (const a of question.acceptedAnswers) {
      if (a?.answerText) topLevelAcceptable.push(a.answerText);
    }
  }

  const anyOptionMatchesExpected = options.some(
    (opt: any) =>
      (opt?.optionKey && matchesAnyExpected(opt.optionKey, topLevelAcceptable)) ||
      (opt?.optionText && matchesAnyExpected(opt.optionText, topLevelAcceptable))
  );

  return !anyOptionMatchesExpected;
}

/**
 * Resolves an answer token against option keys or option texts, returning normalized lower-case key.
 */
function resolveOptionKey(token: string, options: any[]): string | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  for (const opt of options) {
    if (opt?.optionKey && areStringsEquivalent(trimmed, opt.optionKey)) {
      return opt.optionKey.trim().toLowerCase();
    }
  }

  const textMatches = options.filter(
    (opt: any) => opt?.optionText && areStringsEquivalent(trimmed, opt.optionText)
  );
  if (textMatches.length === 1 && textMatches[0]?.optionKey) {
    return textMatches[0].optionKey.trim().toLowerCase();
  }

  return null;
}

/**
 * Parses compound option expectations such as "A and C", "A or C", "A orC",
 * "c and d are true", "a, c", or "is or are" into canonical normalized optionKey sets.
 */
function parseCompoundOptionKeys(raw: string, options: any[]): Set<string> | null {
  if (typeof raw !== "string" || !options.length) return null;

  const cleaned = raw
    .trim()
    .replace(/\s+(?:are|is)\s+true\.?$/i, "")
    .replace(/\.+$/, "")
    .replace(/\b(and|or)([A-Z])\b/g, "$1 $2")
    .trim();

  if (!cleaned || !/,|&|\band\b|\bor\b/i.test(cleaned)) {
    return null;
  }

  const tokens = cleaned
    .split(/\s*(?:,|&|\band\b|\bor\b)\s*/i)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return null;
  }

  const resolvedKeys = new Set<string>();
  for (const tok of tokens) {
    const key = resolveOptionKey(tok, options);
    if (!key) {
      return null;
    }
    resolvedKeys.add(key);
  }

  return resolvedKeys.size >= 2 ? resolvedKeys : null;
}

function areKeySetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function pushUniqueAnswer(target: string[], candidate: string | null | undefined): void {
  if (candidate && typeof candidate === "string" && !target.includes(candidate)) {
    target.push(candidate);
  }
}

function pushUniqueAcceptedAnswer(
  target: string[],
  candidate: string | null | undefined
): void {
  if (typeof candidate === "string" && !target.includes(candidate)) {
    target.push(candidate);
  }
}

function pickPrimaryDisplayAnswer(acceptable: string[]): string {
  const nonEmpty = acceptable.find((item) => item.trim().length > 0);
  if (nonEmpty !== undefined) return nonEmpty;
  return acceptable[0] ?? "";
}

/**
 * Evaluates a single question against a student's submitted answer.
 * Follows the same structural precedence as QuestionCard:
 * 1. Option / Multiple-Choice questions (except split-blank slash hints like 86.4-q9)
 * 2. Multi-part questions (merging equal-length blank variants if present)
 * 3. Blank fill questions (single & multi-blank)
 * 4. Standard single-answer sentence questions
 */
export function evaluateQuestion(
  question: any,
  studentAnswer: unknown
): EvaluatedQuestionResult {
  const questionId = question.questionId;
  const explanation = question.explanation?.aiExplanation || null;
  const ruleReference = question.explanation?.ruleReference || null;

  const hasOptions = Array.isArray(question.options) && question.options.length > 0;
  const isSplitSlashOptions = isSplitBlankSlashOptionQuestion(question);

  // Case 1: Option / Multiple-Choice / Matching question (including questions with auxiliary blanks)
  if (hasOptions && !isSplitSlashOptions) {
    const acceptableList: string[] = [];
    pushUniqueAnswer(acceptableList, question.correctAnswerText);

    if (Array.isArray(question.acceptedAnswers)) {
      for (const a of question.acceptedAnswers) {
        pushUniqueAcceptedAnswer(acceptableList, a?.answerText);
      }
    }

    if (question.isExample && question.exampleAnswer) {
      pushUniqueAnswer(acceptableList, question.exampleAnswer);
    }

    // Many option questions (e.g. 70.1, 22.1, 24.1, 36.3, 50.1) also carry a single blank record
    if (Array.isArray(question.blanks) && question.blanks.length === 1) {
      const b = question.blanks[0];
      pushUniqueAnswer(acceptableList, b?.correctAnswerText);
      if (Array.isArray(b?.acceptedAnswers)) {
        for (const a of b.acceptedAnswers) {
          pushUniqueAcceptedAnswer(acceptableList, a?.answerText);
        }
      }
    } else if (
      acceptableList.length === 0 &&
      Array.isArray(question.blanks) &&
      question.blanks.length > 1
    ) {
      const joined = question.blanks
        .map((b: any) => b?.correctAnswerText)
        .filter(Boolean)
        .join(" ... ");
      pushUniqueAnswer(acceptableList, joined);
    }

    // Cross-match options: link optionKey <-> optionText bidirectionally
    for (const opt of question.options) {
      const keyMatches = opt.optionKey && matchesAnyExpected(opt.optionKey, acceptableList);
      const textMatches = opt.optionText && matchesAnyExpected(opt.optionText, acceptableList);
      if (keyMatches || textMatches) {
        pushUniqueAnswer(acceptableList, opt.optionKey);
        pushUniqueAnswer(acceptableList, opt.optionText);
      }
    }

    // Parse compound option expectations (e.g. "A and C", "a and c are true", "a, c")
    const compoundKeySets: Set<string>[] = [];
    for (const expected of acceptableList) {
      const parsed = parseCompoundOptionKeys(expected, question.options);
      if (parsed && !compoundKeySets.some((s) => areKeySetsEqual(s, parsed))) {
        compoundKeySets.push(parsed);
      }
    }

    let isCorrect = false;
    if (typeof studentAnswer === "string") {
      isCorrect = matchesAnyExpected(studentAnswer, acceptableList);
      if (!isCorrect && compoundKeySets.length > 0) {
        const parsedStudent = parseCompoundOptionKeys(studentAnswer, question.options);
        if (parsedStudent) {
          isCorrect = compoundKeySets.some((s) => areKeySetsEqual(s, parsedStudent));
        }
      }
    } else if (Array.isArray(studentAnswer)) {
      if (
        compoundKeySets.length > 0 &&
        studentAnswer.length >= 2 &&
        studentAnswer.every((item) => typeof item === "string")
      ) {
        const submittedKeys = new Set<string>();
        let allResolved = true;
        for (const item of studentAnswer) {
          const resolved = resolveOptionKey(item, question.options);
          if (!resolved) {
            allResolved = false;
            break;
          }
          submittedKeys.add(resolved);
        }
        if (allResolved && submittedKeys.size === studentAnswer.length) {
          isCorrect = compoundKeySets.some((s) => areKeySetsEqual(s, submittedKeys));
        }
      }

      if (
        !isCorrect &&
        studentAnswer.length === 1 &&
        typeof studentAnswer[0] === "string"
      ) {
        isCorrect = matchesAnyExpected(studentAnswer[0], acceptableList);
      }

      // Allow API callers submitting separate blank arrays for combined multi-blank options (e.g. 32.1-q7, 98.2-q10)
      if (
        !isCorrect &&
        compoundKeySets.length === 0 &&
        Array.isArray(question.blanks) &&
        question.blanks.length > 1 &&
        studentAnswer.length === question.blanks.length
      ) {
        isCorrect = question.blanks.every((b: any, idx: number) => {
          const sub = studentAnswer[idx];
          if (typeof sub !== "string") return false;
          const blankAcceptable: string[] = [];
          pushUniqueAnswer(blankAcceptable, b?.correctAnswerText);
          if (Array.isArray(b?.acceptedAnswers)) {
            for (const a of b.acceptedAnswers) {
              pushUniqueAcceptedAnswer(blankAcceptable, a?.answerText);
            }
          }
          return matchesAnyExpected(sub, blankAcceptable);
        });
      }
    }

    return {
      questionId,
      status: isCorrect ? "correct" : "incorrect",
      isCorrect,
      studentAnswer,
      correctAnswers: acceptableList,
      expectedAnswers: acceptableList,
      explanation,
      ruleReference,
    };
  }

  // Case 2: Multi-part question (evaluated before blanks so parts[i] UI answers align cleanly)
  if (Array.isArray(question.parts) && question.parts.length > 0) {
    const parts = question.parts;
    const hasEqualBlanks =
      Array.isArray(question.blanks) && question.blanks.length === parts.length;
    let allPartsCorrect = true;
    const expectedAnswers: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const partAcceptable: string[] = [];
      pushUniqueAnswer(partAcceptable, p.correctAnswerText);
      if (Array.isArray(p.acceptedAnswers)) {
        for (const a of p.acceptedAnswers) {
          pushUniqueAcceptedAnswer(partAcceptable, a?.answerText);
        }
      }
      if (hasEqualBlanks) {
        const b = question.blanks[i];
        pushUniqueAnswer(partAcceptable, b?.correctAnswerText);
        if (Array.isArray(b?.acceptedAnswers)) {
          for (const a of b.acceptedAnswers) {
            pushUniqueAcceptedAnswer(partAcceptable, a?.answerText);
          }
        }
      }
      expectedAnswers.push(pickPrimaryDisplayAnswer(partAcceptable));
    }

    if (studentAnswer === undefined || studentAnswer === null) {
      allPartsCorrect = false;
    } else {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const displayOrder = p.displayOrder; // 1..N

        const partAcceptable: string[] = [];
        pushUniqueAnswer(partAcceptable, p.correctAnswerText);
        if (Array.isArray(p.acceptedAnswers)) {
          for (const a of p.acceptedAnswers) {
            pushUniqueAcceptedAnswer(partAcceptable, a?.answerText);
          }
        }
        if (hasEqualBlanks) {
          const b = question.blanks[i];
          pushUniqueAnswer(partAcceptable, b?.correctAnswerText);
          if (Array.isArray(b?.acceptedAnswers)) {
            for (const a of b.acceptedAnswers) {
              pushUniqueAcceptedAnswer(partAcceptable, a?.answerText);
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
          const b = hasEqualBlanks ? question.blanks[i] : undefined;
          subAnswer =
            record[p.partId] ??
            record[String(displayOrder)] ??
            record[String(i + 1)] ??
            record[String(i)] ??
            record[p.id] ??
            (b ? record[`blank_${b.blankIndex}`] ?? record[b.id] : undefined);
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
      status: allPartsCorrect ? "correct" : "incorrect",
      isCorrect: allPartsCorrect,
      studentAnswer,
      correctAnswers: expectedAnswers,
      expectedAnswers,
      explanation,
      ruleReference,
    };
  }

  // Case 3: Blank question (single-blank or multi-blank)
  if (Array.isArray(question.blanks) && question.blanks.length > 0) {
    const blanks = question.blanks;
    let allBlanksCorrect = true;
    const expectedAnswers: string[] = [];

    // Collect expected answers per blank
    for (const b of blanks) {
      const blankAcceptable: string[] = [];
      pushUniqueAnswer(blankAcceptable, b.correctAnswerText);
      if (Array.isArray(b.acceptedAnswers)) {
        for (const a of b.acceptedAnswers) {
          pushUniqueAcceptedAnswer(blankAcceptable, a?.answerText);
        }
      }
      expectedAnswers.push(pickPrimaryDisplayAnswer(blankAcceptable));
    }

    // Allow compound string (e.g. "No-one ... anyone") on multi-blank questions with string retry input
    let resolvedStringSegments: string[] | null = null;
    if (typeof studentAnswer === "string" && blanks.length > 1) {
      const topLevelAcceptable: string[] = [];
      pushUniqueAnswer(topLevelAcceptable, question.correctAnswerText);
      if (Array.isArray(question.acceptedAnswers)) {
        for (const a of question.acceptedAnswers) {
          pushUniqueAcceptedAnswer(topLevelAcceptable, a?.answerText);
        }
      }
      if (matchesAnyExpected(studentAnswer, topLevelAcceptable)) {
        return {
          questionId,
          isCorrect: true,
          studentAnswer,
          correctAnswers: expectedAnswers,
          expectedAnswers,
          explanation,
          ruleReference,
        };
      }
      if (studentAnswer.includes("...")) {
        resolvedStringSegments = studentAnswer.split(/\s*\.\.\.\s*/);
      }
    }

    if (studentAnswer === undefined || studentAnswer === null) {
      allBlanksCorrect = false;
    } else {
      for (let i = 0; i < blanks.length; i++) {
        const b = blanks[i];
        const blankIdx = b.blankIndex; // usually 1-based (1..N)

        // Find acceptable answers for this blank
        const blankAcceptable: string[] = [];
        pushUniqueAnswer(blankAcceptable, b.correctAnswerText);
        if (Array.isArray(b.acceptedAnswers)) {
          for (const a of b.acceptedAnswers) {
            pushUniqueAcceptedAnswer(blankAcceptable, a?.answerText);
          }
        }

        // Extract student input for this blank
        let subAnswer: unknown = undefined;
        if (Array.isArray(studentAnswer)) {
          subAnswer = studentAnswer[i];
        } else if (resolvedStringSegments) {
          subAnswer = resolvedStringSegments[i];
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
      status: allBlanksCorrect ? "correct" : "incorrect",
      isCorrect: allBlanksCorrect,
      studentAnswer,
      correctAnswers: expectedAnswers,
      expectedAnswers,
      explanation,
      ruleReference,
    };
  }

  // Case 4: Standard single answer question
  const acceptableList: string[] = [];
  pushUniqueAnswer(acceptableList, question.correctAnswerText);
  if (Array.isArray(question.acceptedAnswers)) {
    for (const a of question.acceptedAnswers) {
      pushUniqueAcceptedAnswer(acceptableList, a?.answerText);
    }
  }
  if (question.isExample && question.exampleAnswer) {
    pushUniqueAnswer(acceptableList, question.exampleAnswer);
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
    status: isCorrect ? "correct" : "incorrect",
    isCorrect,
    studentAnswer,
    correctAnswers: acceptableList,
    expectedAnswers: acceptableList,
    explanation,
    ruleReference,
  };
}
