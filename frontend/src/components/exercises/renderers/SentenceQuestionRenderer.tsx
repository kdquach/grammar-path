import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { Question } from "../../../types/api.types";

interface SentenceQuestionRendererProps {
  question: Question;
  value: string | undefined;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const SentenceQuestionRenderer: React.FC<SentenceQuestionRendererProps> = ({
  question,
  value = "",
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Visual Context Callout */}
      {question.hasVisualContext && question.visualContextDescription && (
        <div className="flex items-start gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
          <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Visual context: </span>
            <span className="italic">{question.visualContextDescription}</span>
          </div>
        </div>
      )}

      {/* Prompt and Context Clue */}
      <div className="flex flex-wrap items-baseline gap-2">
        {question.questionContent && (
          <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
            {question.questionContent}
          </p>
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

