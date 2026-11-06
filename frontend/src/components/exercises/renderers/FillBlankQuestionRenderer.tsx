import React from "react";
import { Question } from "../../../types/api.types";

interface FillBlankQuestionRendererProps {
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  disabled?: boolean;
}

export const FillBlankQuestionRenderer: React.FC<FillBlankQuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled = false,
}) => {
  const blanks = question.blanks || [];
  const isMultiBlank = blanks.length > 1;

  // Single blank case
  if (!isMultiBlank) {
    const singleVal =
      typeof value === "string"
        ? value
        : Array.isArray(value)
        ? value[0] || ""
        : "";

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {question.questionContent && (
            <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              {question.questionContent}
            </p>
          )}

          {question.contextClue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-semibold">
              {question.contextClue}
            </span>
          )}
        </div>

        <input
          type="text"
          disabled={disabled}
          value={singleVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className={`w-full max-w-lg px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors placeholder:text-slate-400 ${
            disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
          }`}
        />
      </div>
    );
  }

  // Multi-blank case (blanks.length > 1)
  const currentArray: string[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value.length > 0
    ? [value]
    : [];

  const handleBlankChange = (index: number, text: string) => {
    const next = [...currentArray];
    while (next.length < blanks.length) {
      next.push("");
    }
    next[index] = text;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        {question.questionContent && (
          <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
            {question.questionContent}
          </p>
        )}

        {question.contextClue && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-semibold">
            {question.contextClue}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {blanks.map((blank, index) => {
          const val = currentArray[index] || "";

          return (
            <div
              key={blank.blankIndex ?? index}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5"
            >
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Blank #{blank.blankIndex ?? index + 1}
              </label>
              <input
                type="text"
                disabled={disabled}
                value={val}
                onChange={(e) => handleBlankChange(index, e.target.value)}
                placeholder={`Answer for blank #${blank.blankIndex ?? index + 1}...`}
                className={`w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors placeholder:text-slate-400 ${
                  disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FillBlankQuestionRenderer;
