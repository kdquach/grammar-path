import React from "react";
import { Question } from "../../../types/api.types";
import QuestionPromptText from "../QuestionPromptText";

interface MultiPartQuestionRendererProps {
  question: Question;
  value: Record<string, string> | undefined;
  onChange: (val: Record<string, string>) => void;
  disabled?: boolean;
}

export const MultiPartQuestionRenderer: React.FC<MultiPartQuestionRendererProps> = ({
  question,
  value = {},
  onChange,
  disabled = false,
}) => {
  const parts = question.parts || [];

  const handlePartChange = (partId: string, text: string) => {
    onChange({
      ...value,
      [partId]: text,
    });
  };

  return (
    <div className="space-y-4">
      {question.questionContent && (
        <QuestionPromptText content={question.questionContent} />
      )}

      {question.contextClue && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono">
          <span className="font-bold">Clue:</span>
          <span>{question.contextClue}</span>
        </div>
      )}

      <div className="space-y-3 pt-1">
        {parts.map((part, index) => {
          const partId = part.partId || String(index + 1);
          const currentVal = value[partId] || "";

          return (
            <div
              key={partId}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold font-mono">
                  {index + 1}
                </span>
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  {part.questionContent}
                </span>
              </div>

              <input
                type="text"
                disabled={disabled}
                value={currentVal}
                onChange={(e) => handlePartChange(partId, e.target.value)}
                placeholder={`Answer for part ${index + 1}...`}
                className={`w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors placeholder:text-slate-400 ${
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

export default MultiPartQuestionRenderer;

