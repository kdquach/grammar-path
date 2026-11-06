import React from "react";
import { Check } from "lucide-react";
import { Question } from "../../../types/api.types";

interface OptionQuestionRendererProps {
  question: Question;
  value: string | undefined;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const OptionQuestionRenderer: React.FC<OptionQuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled = false,
}) => {
  const options = question.options || [];

  return (
    <div className="space-y-3">
      {question.questionContent && (
        <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
          {question.questionContent}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {options.map((opt) => {
          const isSelected =
            value !== undefined &&
            value !== null &&
            value !== "" &&
            (value === opt.optionKey ||
              value === opt.optionText ||
              value.toLowerCase() === opt.optionKey.toLowerCase() ||
              value.toLowerCase() === opt.optionText.toLowerCase());

          return (
            <button
              key={opt.optionKey || opt.displayOrder}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.optionKey)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-brand-50/90 border-brand-500 ring-2 ring-brand-400/40 text-brand-950 font-medium shadow-xs"
                  : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-800 shadow-2xs"
              } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                  isSelected
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-slate-100 border-slate-300 text-slate-700"
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  opt.optionKey
                )}
              </span>

              <span className="text-xs sm:text-sm flex-1 leading-snug">
                {opt.optionText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OptionQuestionRenderer;
