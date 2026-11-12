import React from "react";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Eye,
  BookOpen,
  FileText,
  Lightbulb,
} from "lucide-react";

export function isEmptyAnswerValue(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === "string") return val.trim().length === 0;
  if (Array.isArray(val)) {
    return val.every((item) => typeof item !== "string" || item.trim().length === 0);
  }
  if (typeof val === "object") {
    const entries = Object.values(val as Record<string, unknown>);
    return entries.every((item) => typeof item !== "string" || item.trim().length === 0);
  }
  return false;
}

export interface FeedbackData {
  status?: "correct" | "incorrect" | "unanswered";
  isCorrect?: boolean;
  isRevealedSolution?: boolean;
  isOrderedMultiExpected?: boolean;
  partLabelPrefix?: string;
  studentAnswer?: unknown;
  correctAnswers?: string[];
  expectedAnswers?: string[];
  explanation?: string | null;
  ruleReference?: string | null;
  answerKey?: {
    answerText: string | null;
    notes?: string | null;
    sourcePages?: (number | { pageNumber: number })[];
  } | null;
}

interface QuestionFeedbackPanelProps {
  feedback: FeedbackData;
  onOpenRuleReference?: (sectionId: string) => void;
}

export const QuestionFeedbackPanel: React.FC<QuestionFeedbackPanelProps> = ({
  feedback,
  onOpenRuleReference,
}) => {
  const {
    status,
    isCorrect,
    isRevealedSolution,
    isOrderedMultiExpected = false,
    partLabelPrefix = "#",
    expectedAnswers = [],
    correctAnswers = [],
    explanation,
    ruleReference,
    answerKey,
  } = feedback;

  const isUnanswered =
    !isRevealedSolution && !isCorrect && status === "unanswered";

  if (isUnanswered) {
    return (
      <div
        data-feedback-status="unanswered"
        className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 transition-all duration-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold">
            <MinusCircle className="w-5 h-5 text-slate-500" />
            <span className="text-slate-700 text-base">Unanswered</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            No answer was submitted for this question.
          </span>
        </div>
      </div>
    );
  }

  const answersToShow =
    expectedAnswers.length > 0 ? expectedAnswers : correctAnswers;
  const primaryExpected = answersToShow[0] || (answerKey ? answerKey.answerText : null);
  const alternativeAnswers = isOrderedMultiExpected ? [] : answersToShow.slice(1);

  // Normalize source pages if array of objects or numbers
  const sourcePagesList: number[] = (answerKey?.sourcePages || []).map((p) =>
    typeof p === "number" ? p : p.pageNumber
  );

  const hasBodyContent = Boolean(
    (isOrderedMultiExpected && answersToShow.length > 1) ||
      primaryExpected ||
      answerKey ||
      explanation
  );

  return (
    <div
      data-feedback-status={
        isCorrect ? "correct" : isRevealedSolution ? "revealed" : "incorrect"
      }
      className={`mt-4 rounded-xl border p-4 text-sm transition-all duration-200 ${
        isCorrect
          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
          : isRevealedSolution
          ? "bg-amber-50/70 border-amber-200 text-amber-950"
          : "bg-rose-50/70 border-rose-200 text-rose-950"
      }`}
    >
      {/* ─── Status Header ────────────────────────────────────────────── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 ${
          hasBodyContent ? "border-b pb-3 mb-3 border-current/10" : ""
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-800 text-base">Correct!</span>
            </>
          ) : isRevealedSolution ? (
            <>
              <Eye className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 text-base">Solution Revealed</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-rose-600" />
              <span className="text-rose-800 text-base">Incorrect</span>
            </>
          )}
        </div>

        {/* Rule Reference clickable badge */}
        {ruleReference && onOpenRuleReference && (
          <button
            type="button"
            onClick={() => onOpenRuleReference(ruleReference)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 hover:border-brand-400 transition-colors shadow-2xs cursor-pointer"
            title={`View theory rule for Section ${ruleReference}`}
          >
            <BookOpen className="w-3.5 h-3.5 text-brand-600" />
            <span>Rule {ruleReference}</span>
          </button>
        )}
      </div>

      {/* ─── Expected Answers / Variants ──────────────────────────────── */}
      {isOrderedMultiExpected && answersToShow.length > 1 ? (
        <div className="space-y-1.5 mb-3">
          <span className="text-xs uppercase font-bold tracking-wider opacity-75 block">
            Expected Answers:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {answersToShow.map((ans, idx) => (
              <span
                key={idx}
                className="inline-flex items-baseline gap-1 font-semibold text-slate-900 bg-white/80 px-2 py-0.5 rounded border border-current/15 font-mono text-xs sm:text-sm"
              >
                <span className="text-[11px] font-sans font-bold text-slate-500">
                  {partLabelPrefix}
                  {idx + 1}:
                </span>
                <span>{ans || "-"}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        primaryExpected && (
          <div className="space-y-1.5 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                Expected Answer:
              </span>
              <span className="font-semibold text-slate-900 bg-white/80 px-2 py-0.5 rounded border border-current/15 font-mono text-sm">
                {primaryExpected}
              </span>
            </div>

            {alternativeAnswers.length > 0 && (
              <div className="text-xs flex flex-wrap items-center gap-1.5 opacity-90 pl-1">
                <span className="font-medium">Also accepted:</span>
                {alternativeAnswers.map((alt, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-white/70 rounded font-mono text-[11px] border border-current/10"
                  >
                    {alt}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* ─── Cambridge Answer Key Provenance Box ──────────────────────── */}
      {answerKey && (
        <div className="bg-white/90 border border-slate-200 rounded-lg p-3 mb-3 text-xs text-slate-800 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Cambridge Answer Key
            </span>
            {sourcePagesList.length > 0 && (
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                PDF p. {sourcePagesList.join(", ")}
              </span>
            )}
          </div>
          {answerKey.answerText && (
            <p className="font-mono text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-100">
              {answerKey.answerText}
            </p>
          )}
          {answerKey.notes && (
            <p className="text-slate-600 italic">Notes: {answerKey.notes}</p>
          )}
        </div>
      )}

      {/* ─── Vietnamese Grammatical Explanation ──────────────────────── */}
      {explanation && (
        <div className="bg-white/90 border border-brand-100 rounded-lg p-3 text-xs text-slate-800 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-brand-900">
            <Lightbulb className="w-3.5 h-3.5 text-brand-600" />
            <span>Giải thích ngữ pháp (Vietnamese Explanation)</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-sans text-xs sm:text-[13px] whitespace-pre-line">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionFeedbackPanel;

