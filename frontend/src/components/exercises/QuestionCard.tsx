import React from "react";
import { CheckCircle2, Eye, Sparkles, Loader2, Lock } from "lucide-react";
import { Question } from "../../types/api.types";
import OptionQuestionRenderer from "./renderers/OptionQuestionRenderer";
import MultiPartQuestionRenderer from "./renderers/MultiPartQuestionRenderer";
import FillBlankQuestionRenderer from "./renderers/FillBlankQuestionRenderer";
import SentenceQuestionRenderer from "./renderers/SentenceQuestionRenderer";
import QuestionFeedbackPanel, {
  FeedbackData,
  isEmptyAnswerValue,
} from "./QuestionFeedbackPanel";
import QuestionPromptText from "./QuestionPromptText";
import QuestionVisualContext from "./QuestionVisualContext";

export function isSplitBlankSlashOptionQuestion(question: Question): boolean {
  const options = question.options || [];
  const blanks = question.blanks || [];
  return (
    options.length > 1 &&
    blanks.length > 1 &&
    options.every(
      (opt) => opt.optionText.includes(" / ") && !opt.optionText.includes("...")
    )
  );
}

export function isMultiSelectExercise(
  exerciseInstruction?: string,
  questionId?: string
): boolean {
  if (
    exerciseInstruction &&
    /\btwo alternatives are possible\b|\btick the sentences which are true\b|\bat least one is true\b/i.test(
      exerciseInstruction
    )
  ) {
    return true;
  }
  if (
    questionId &&
    (questionId.startsWith("17.2-") || questionId.startsWith("24.1-"))
  ) {
    return true;
  }
  return false;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  value: any;
  onChange: (val: any) => void;
  result?: any;
  onCheck: () => void;
  onShowSolution: () => void;
  isChecking?: boolean;
  isLoadingSolution?: boolean;
  isSolutionUnlocked?: boolean;
  onOpenRuleReference?: (sectionId: string) => void;
  exerciseInstruction?: string;
  allowMultiple?: boolean;
  onFocusField?: (target?: { blankIndex?: number; partId?: string }) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  value,
  onChange,
  result,
  onCheck,
  onShowSolution,
  isChecking = false,
  isLoadingSolution = false,
  isSolutionUnlocked = true,
  onOpenRuleReference,
  exerciseInstruction,
  allowMultiple,
  onFocusField,
}) => {
  const isSplitSlashOptions = isSplitBlankSlashOptionQuestion(question);
  const hasOptions =
    question.options && question.options.length > 0 && !isSplitSlashOptions;
  const hasParts = question.parts && question.parts.length > 0;
  const hasBlanks = question.blanks && question.blanks.length > 0;
  const isOrderedMultiExpected = Boolean(
    hasParts || (!hasOptions && (question.blanks?.length || 0) > 1)
  );
  const partLabelPrefix = hasParts ? "Part #" : "Blank #";
  const resolvedAllowMultiple =
    allowMultiple !== undefined
      ? allowMultiple
      : isMultiSelectExercise(exerciseInstruction, question.questionId);

  // Convert any result (check result or full solution) to unified FeedbackData
  const feedback: FeedbackData | null = React.useMemo(() => {
    if (!result) return null;
    if ("answerKey" in result || (result.explanation && typeof result.explanation === "object")) {
      const exp = result.explanation;
      const explanationText =
        typeof exp === "string" ? exp : exp?.aiExplanation || null;
      const ruleRef =
        result.ruleReference || (typeof exp === "object" ? exp?.ruleReference : null);

      const orderedFromParts =
        Array.isArray(result.parts) && result.parts.length > 0
          ? result.parts.map(
              (p: any) =>
                p?.correctAnswerText ||
                p?.acceptedAnswers?.[0] ||
                result.correctAnswerText ||
                ""
            )
          : [];
      const orderedFromBlanks =
        !hasOptions && Array.isArray(result.blanks) && result.blanks.length > 1
          ? result.blanks.map(
              (b: any) =>
                b?.correctAnswerText ||
                b?.acceptedAnswers?.[0] ||
                result.correctAnswerText ||
                ""
            )
          : [];

      const expected =
        result.expectedAnswers ||
        (orderedFromParts.some(Boolean)
          ? orderedFromParts
          : orderedFromBlanks.some(Boolean)
          ? orderedFromBlanks
          : result.acceptedAnswers && result.acceptedAnswers.length > 0
          ? result.acceptedAnswers
          : result.correctAnswerText
          ? [result.correctAnswerText]
          : []);

      return {
        isCorrect: result.isCorrect,
        isRevealedSolution: result.isCorrect === undefined,
        isOrderedMultiExpected,
        partLabelPrefix,
        studentAnswer: result.studentAnswer ?? value,
        expectedAnswers: expected,
        correctAnswers: result.correctAnswers || expected,
        explanation: explanationText,
        ruleReference: ruleRef,
        answerKey: result.answerKey || null,
      };
    }

    const resolvedStatus: "correct" | "incorrect" | "unanswered" =
      result.status === "unanswered" ||
      result.status === "correct" ||
      result.status === "incorrect"
        ? result.status
        : result.isCorrect
        ? "correct"
        : result.studentAnswer === null ||
          (result.studentAnswer !== undefined &&
            isEmptyAnswerValue(result.studentAnswer)) ||
          (result.studentAnswer === undefined &&
            isEmptyAnswerValue(value) &&
            !(
              result.expectedAnswers?.length ||
              result.correctAnswers?.length ||
              result.explanation
            ))
        ? "unanswered"
        : "incorrect";

    if (resolvedStatus === "unanswered") {
      return {
        status: "unanswered",
        isCorrect: false,
        isRevealedSolution: false,
        isOrderedMultiExpected,
        partLabelPrefix,
        studentAnswer: null,
        expectedAnswers: [],
        correctAnswers: [],
        explanation: null,
        ruleReference: null,
      };
    }

    return {
      status: resolvedStatus,
      isCorrect: result.isCorrect,
      isRevealedSolution: false,
      isOrderedMultiExpected,
      partLabelPrefix,
      studentAnswer: result.studentAnswer ?? value,
      expectedAnswers: result.expectedAnswers || result.correctAnswers || [],
      correctAnswers: result.correctAnswers || [],
      explanation: result.explanation || null,
      ruleReference: result.ruleReference || null,
    };
  }, [result, value, hasOptions, isOrderedMultiExpected, partLabelPrefix]);

  // ─── 1. Worked Example Card ───────────────────────────────────────────
  if (question.isExample) {
    return (
      <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Worked Example
            </span>
            <span className="text-xs font-semibold text-indigo-900">
              Question {questionNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={onShowSolution}
            disabled={isLoadingSolution}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            {isLoadingSolution ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>View Explanation</span>
          </button>
        </div>

        <div className="space-y-2">
          <QuestionVisualContext
            hasVisualContext={question.hasVisualContext}
            description={question.visualContextDescription}
          />

          {question.questionContent && (
            <QuestionPromptText content={question.questionContent} />
          )}

          {question.contextClue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-semibold">
              {question.contextClue}
            </span>
          )}

          {question.exampleAnswer && (
            <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                Model Demonstration Answer
              </span>
              <p className="text-sm font-semibold text-slate-900 font-mono">
                {question.exampleAnswer}
              </p>
            </div>
          )}
        </div>

        {feedback && (
          <QuestionFeedbackPanel
            feedback={feedback}
            onOpenRuleReference={onOpenRuleReference}
          />
        )}
      </div>
    );
  }

  // ─── 2. Interactive Test Question Card ─────────────────────────────────
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-colors">
      {/* Question Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold flex items-center justify-center font-mono text-xs border border-slate-200">
            {questionNumber}
          </span>
          <span className="font-semibold text-slate-700">
            Question {questionNumber}
          </span>
        </div>

        <span className="font-mono text-[11px] text-slate-400">
          {question.questionId}
        </span>
      </div>

      {/* Polymorphic Question Renderer Body */}
      <div className="pt-1">
        {hasOptions ? (
          <OptionQuestionRenderer
            question={question}
            value={value}
            onChange={onChange}
            allowMultiple={resolvedAllowMultiple}
          />
        ) : hasParts ? (
          <MultiPartQuestionRenderer
            question={question}
            value={value}
            onChange={onChange}
            onFocusField={(partId) => onFocusField?.({ partId })}
          />
        ) : hasBlanks ? (
          <FillBlankQuestionRenderer
            question={question}
            value={value}
            onChange={onChange}
            onFocusField={(blankIndex) => onFocusField?.({ blankIndex })}
          />
        ) : (
          <SentenceQuestionRenderer
            question={question}
            value={value}
            onChange={onChange}
            onFocusField={() => onFocusField?.({})}
          />
        )}
      </div>

      {/* Question Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isChecking}
            onClick={onCheck}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            {isChecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Check Answer</span>
          </button>

          <button
            type="button"
            disabled={isLoadingSolution}
            onClick={onShowSolution}
            title={
              isSolutionUnlocked
                ? "Inspect full solution & explanation"
                : "Sign in and check your answer once to unlock solution"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer ${
              isSolutionUnlocked
                ? "border-slate-200 text-slate-700"
                : "border-slate-200 text-slate-500"
            }`}
          >
            {isLoadingSolution ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSolutionUnlocked ? (
              <Eye className="w-4 h-4 text-slate-500" />
            ) : (
              <Lock className="w-4 h-4 text-amber-500" />
            )}
            <span>Show Solution</span>
          </button>
        </div>
      </div>

      {/* Feedback Panel */}
      {feedback && (
        <QuestionFeedbackPanel
          feedback={feedback}
          onOpenRuleReference={onOpenRuleReference}
        />
      )}
    </div>
  );
};

export default QuestionCard;

