import React from "react";
import { Check } from "lucide-react";
import { Question } from "../../../types/api.types";
import QuestionPromptText from "../QuestionPromptText";

interface OptionQuestionRendererProps {
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  disabled?: boolean;
  allowMultiple?: boolean;
}

export const OptionQuestionRenderer: React.FC<OptionQuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  allowMultiple = false,
}) => {
  const options = question.options || [];

  const selectedValues: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.length > 0)
    : typeof value === "string" && value.length > 0
    ? [value]
    : [];

  const matchesOption = (candidate: string, opt: (typeof options)[number]) =>
    candidate === opt.optionKey ||
    candidate === opt.optionText ||
    candidate.toLowerCase() === opt.optionKey.toLowerCase() ||
    candidate.toLowerCase() === opt.optionText.toLowerCase();

  const handleOptionClick = (clickedOpt: (typeof options)[number]) => {
    if (!allowMultiple) {
      onChange(clickedOpt.optionKey);
      return;
    }

    const activeKeySet = new Set<string>();
    for (const opt of options) {
      if (selectedValues.some((val) => matchesOption(val, opt))) {
        activeKeySet.add(opt.optionKey.toLowerCase());
      }
    }

    const clickedLower = clickedOpt.optionKey.toLowerCase();
    if (activeKeySet.has(clickedLower)) {
      activeKeySet.delete(clickedLower);
    } else {
      activeKeySet.add(clickedLower);
    }

    const nextKeys = options
      .filter((opt) => activeKeySet.has(opt.optionKey.toLowerCase()))
      .map((opt) => opt.optionKey);

    onChange(nextKeys);
  };

  return (
    <div className="space-y-3">
      {question.questionContent && (
        <QuestionPromptText content={question.questionContent} />
      )}

      {allowMultiple && (
        <p className="text-xs font-medium text-brand-700 bg-brand-50/70 border border-brand-200/80 rounded-lg px-2.5 py-1 inline-block">
          Multiple options may be correct — select all that apply.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {options.map((opt) => {
          const isSelected = selectedValues.some((v) => matchesOption(v, opt));

          return (
            <button
              key={opt.optionKey || opt.displayOrder}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => handleOptionClick(opt)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-brand-50/90 border-brand-500 ring-2 ring-brand-400/40 text-brand-950 font-medium shadow-xs"
                  : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-800 shadow-2xs"
              } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 ${
                  allowMultiple ? "rounded-md" : "rounded-lg"
                } flex items-center justify-center text-xs font-bold border transition-colors ${
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

