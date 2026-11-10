import React from "react";

/**
 * Detects textbook sub-item labels at the start of a question prompt
 * (e.g. "4 a I was in a hurry..." -> itemLabel: "4a", body: "I was in a hurry...")
 * so the sub-item letter isn't mistaken for an option answer key behind the number.
 */
export function parseTextbookSubItemPrefix(content: string): {
  itemLabel: string | null;
  body: string;
} {
  const trimmed = content.trim();
  const match = trimmed.match(/^(\d+)\s+([a-d])\s+(.+)$/s);
  if (match && /^[A-Z"'\[(]/.test(match[3])) {
    return {
      itemLabel: `${match[1]}${match[2]}`,
      body: match[3],
    };
  }
  return { itemLabel: null, body: content };
}

interface QuestionPromptTextProps {
  content: string;
  className?: string;
}

export const QuestionPromptText: React.FC<QuestionPromptTextProps> = ({
  content,
  className = "text-sm sm:text-base text-slate-800 font-medium leading-relaxed",
}) => {
  const { itemLabel, body } = parseTextbookSubItemPrefix(content);

  return (
    <p className={className}>
      {itemLabel && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 mr-2 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-bold align-baseline"
          title={`Mục ${itemLabel} trong sách giáo khoa`}
        >
          {itemLabel}
        </span>
      )}
      {body}
    </p>
  );
};

export default QuestionPromptText;

