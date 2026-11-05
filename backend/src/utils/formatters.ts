export function formatQuestion(q: any, includeAnswers: boolean) {
  const base: any = {
    id: q.id,
    questionId: q.questionId,
    questionContent: q.questionContent,
    isExample: q.isExample,
    hasVisualContext: q.hasVisualContext,
    visualContextDescription: q.visualContextDescription,
    contextClue: q.contextClue,
    displayOrder: q.displayOrder,
    options: (q.options || []).map((o: any) => ({
      optionKey: o.optionKey,
      optionText: o.optionText,
      displayOrder: o.displayOrder,
    })),
    blanks: (q.blanks || []).map((b: any) => {
      const blank: any = {
        blankIndex: b.blankIndex,
      };
      if (includeAnswers) {
        blank.correctAnswerType = b.correctAnswerType;
        blank.correctAnswerText = b.correctAnswerText;
        blank.correctAnswerArray = b.correctAnswerArray;
        blank.acceptedAnswers = (b.acceptedAnswers || []).map(
          (a: any) => a.answerText
        );
      }
      return blank;
    }),
    parts: (q.parts || []).map((p: any) => {
      const part: any = {
        partId: p.partId,
        questionContent: p.questionContent,
        displayOrder: p.displayOrder,
      };
      if (includeAnswers) {
        part.correctAnswerType = p.correctAnswerType;
        part.correctAnswerText = p.correctAnswerText;
        part.correctAnswerArray = p.correctAnswerArray;
        part.acceptedAnswers = (p.acceptedAnswers || []).map(
          (a: any) => a.answerText
        );
      }
      return part;
    }),
  };

  // If question is an example, include exampleAnswer
  if (q.isExample) {
    base.exampleAnswer = q.exampleAnswer;
  }

  // Anti-Spoiler Guard: If includeAnswers is true, include correct answer & accepted answers
  if (includeAnswers) {
    base.correctAnswerType = q.correctAnswerType;
    base.correctAnswerText = q.correctAnswerText;
    base.correctAnswerArray = q.correctAnswerArray;
    base.acceptedAnswers = (q.acceptedAnswers || []).map(
      (a: any) => a.answerText
    );
  }

  return base;
}

export function formatExercise(ex: any, includeAnswers: boolean) {
  return {
    id: ex.id,
    exerciseId: ex.exerciseId,
    exerciseNumber: ex.exerciseNumber,
    questionType: ex.questionType,
    instruction: ex.instruction,
    hasVisualContext: ex.hasVisualContext,
    visualContextDescription: ex.visualContextDescription,
    contextNotes: ex.contextNotes,
    displayOrder: ex.displayOrder,
    wordBankItems: (ex.wordBankItems || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      displayOrder: w.displayOrder,
    })),
    questions: (ex.questions || []).map((q: any) =>
      formatQuestion(q, includeAnswers)
    ),
  };
}

export function formatQuestionDetail(q: any, includeAnswers: boolean) {
  const baseQuestion = formatQuestion(q, includeAnswers);
  return {
    ...baseQuestion,
    sourcePages: (q.sourcePages || []).map((sp: any) => sp.pageNumber),
    exercise: q.exercise
      ? {
          id: q.exercise.id,
          exerciseId: q.exercise.exerciseId,
          exerciseNumber: q.exercise.exerciseNumber,
          questionType: q.exercise.questionType,
          instruction: q.exercise.instruction,
          unitId: q.exercise.unitId,
          unit: q.exercise.unit
            ? {
                unitNumber: q.exercise.unit.unitNumber,
                title: q.exercise.unit.title,
              }
            : undefined,
        }
      : undefined,
  };
}

export function formatQuestionSolution(
  q: any,
  linkedSection?: { sectionId: string; heading: string } | null
) {
  return {
    id: q.id,
    questionId: q.questionId,
    questionContent: q.questionContent,
    isExample: q.isExample,
    exampleAnswer: q.exampleAnswer,
    hasVisualContext: q.hasVisualContext,
    visualContextDescription: q.visualContextDescription,
    contextClue: q.contextClue,
    displayOrder: q.displayOrder,
    correctAnswerType: q.correctAnswerType,
    correctAnswerText: q.correctAnswerText,
    correctAnswerArray: q.correctAnswerArray,
    acceptedAnswers: (q.acceptedAnswers || []).map((a: any) => a.answerText),
    blanks: (q.blanks || []).map((b: any) => ({
      blankIndex: b.blankIndex,
      correctAnswerType: b.correctAnswerType,
      correctAnswerText: b.correctAnswerText,
      correctAnswerArray: b.correctAnswerArray,
      acceptedAnswers: (b.acceptedAnswers || []).map((a: any) => a.answerText),
      blankAcceptedAnswers: (b.acceptedAnswers || []).map(
        (a: any) => a.answerText
      ),
    })),
    parts: (q.parts || []).map((p: any) => ({
      partId: p.partId,
      questionContent: p.questionContent,
      displayOrder: p.displayOrder,
      correctAnswerType: p.correctAnswerType,
      correctAnswerText: p.correctAnswerText,
      correctAnswerArray: p.correctAnswerArray,
      acceptedAnswers: (p.acceptedAnswers || []).map((a: any) => a.answerText),
      partAcceptedAnswers: (p.acceptedAnswers || []).map(
        (a: any) => a.answerText
      ),
    })),
    answerKey: q.answerKey
      ? {
          exerciseNumber: q.answerKey.exerciseNumber,
          answerType: q.answerKey.answerType,
          answerText: q.answerKey.answerText,
          answerArray: q.answerKey.answerArray,
          notes: q.answerKey.notes,
          verificationStatus: q.answerKey.verificationStatus,
          contentOrigin: q.answerKey.contentOrigin,
          sourcePages: (q.answerKey.sourcePages || []).map(
            (sp: any) => sp.pageNumber
          ),
        }
      : null,
    explanation: q.explanation
      ? {
          aiExplanation: q.explanation.aiExplanation,
          explanationLanguage: q.explanation.explanationLanguage,
          ruleReference: q.explanation.ruleReference,
          basedOnSource: q.explanation.basedOnSource,
          contentOrigin: q.explanation.contentOrigin,
          theorySection: linkedSection || null,
        }
      : null,
  };
}
