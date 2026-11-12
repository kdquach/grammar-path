import React from "react";
import { Image as ImageIcon } from "lucide-react";

interface QuestionVisualContextProps {
  hasVisualContext?: boolean;
  description?: string | null;
}

export const QuestionVisualContext: React.FC<QuestionVisualContextProps> = ({
  hasVisualContext,
  description,
}) => {
  const cleanDescription = description?.trim();
  if (!hasVisualContext || !cleanDescription) {
    return null;
  }

  return (
    <div
      data-testid="question-visual-context"
      className="flex items-start gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900"
    >
      <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-bold">Visual context: </span>
        <span className="italic">{cleanDescription}</span>
      </div>
    </div>
  );
};

export default QuestionVisualContext;

