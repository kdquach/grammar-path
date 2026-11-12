import React from "react";
import { Question } from "../../../types/api.types";
import QuestionPromptText from "../QuestionPromptText";
import QuestionVisualContext from "../QuestionVisualContext";

interface SentenceQuestionRendererProps {
  question: Question;
  value: string | undefined;
  onChange: (val: string) => void;
  disabled?: boolean;
  onFocusField?: () => void;
}

export const SentenceQuestionRenderer: React.FC<SentenceQuestionRendererProps> = ({
  question,
  value = "",
  onChange,
  disabled = false,
  onFocusField,
}) => {
  return (
    <div className="space-y-3">
      {/* Visual Context Callout */}
      <QuestionVisualContext
        hasVisualContext={question.hasVisualContext}
        description={question.visualContextDescription}
      />

      {/* Prompt and Context Clue */}
      <div className="flex flex-wrap items-baseline gap-2">
        {question.questionContent && (
          <QuestionPromptText content={question.questionContent} />
        )}

        {question.contextClue && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold">
            {question.contextClue}
          </span>
        )}
      </div>

      {/* Full-width sentence input */}
      <input
        type="text"
        disabled={disabled}
        value={value}
        onFocus={() => onFocusField?.()}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type full sentence or missing phrase..."
        className={`w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors placeholder:text-slate-400 ${
          disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
};

export default SentenceQuestionRenderer;

