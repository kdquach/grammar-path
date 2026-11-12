import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkCheck,
  CheckCircle2,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  LogIn,
  Layers,
  BookOpen,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type {
  MistakeItem,
  Question,
  QuestionSolution,
  QuestionCheckResult,
} from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";
import AdaptiveReviewPanel from "../components/adaptive/AdaptiveReviewPanel";
import RuleReferenceModal from "../components/theory/RuleReferenceModal";
import OptionQuestionRenderer from "../components/exercises/renderers/OptionQuestionRenderer";
import FillBlankQuestionRenderer from "../components/exercises/renderers/FillBlankQuestionRenderer";
import MultiPartQuestionRenderer from "../components/exercises/renderers/MultiPartQuestionRenderer";
import SentenceQuestionRenderer from "../components/exercises/renderers/SentenceQuestionRenderer";
import WordBankBar from "../components/exercises/WordBankBar";
import QuestionFeedbackPanel from "../components/exercises/QuestionFeedbackPanel";
import {
  isMultiSelectExercise,
  isSplitBlankSlashOptionQuestion,
} from "../components/exercises/QuestionCard";
import { isEmptyAnswerValue } from "../components/exercises/ExerciseViewer";

function formatStudentAnswerSummary(ans: unknown): string {
  if (ans === null || ans === undefined) return "(empty)";
  if (typeof ans === "string") return ans.trim() ? ans : "(empty)";
  if (Array.isArray(ans)) {
    const clean = ans.map((v) => String(v ?? "").trim()).filter(Boolean);
    return clean.length > 0 ? clean.join(" / ") : "(empty)";
  }
  if (typeof ans === "object") {
    const entries = Object.entries(ans as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v ?? "").trim()}`)
      .filter((s) => !s.endsWith(": "));
    return entries.length > 0 ? entries.join(" | ") : "(empty)";
  }
  return String(ans);
}

function toMistakeRenderableQuestion(item: MistakeItem): Question {
  return {
    id: item.questionId,
    questionId: item.questionId,
    questionContent: item.questionContent,
    isExample: Boolean(item.isExample),
    hasVisualContext: Boolean(item.hasVisualContext),
    visualContextDescription: item.visualContextDescription ?? null,
    contextClue: item.contextClue ?? null,
    displayOrder: item.displayOrder ?? 1,
    options: item.options || [],
    blanks: item.blanks || [],
    parts: item.parts || [],
  };
}

export const MistakeReviewPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Per-mistake state: retry input (polymorphic: string | string[] | Record<string, string>), evaluation result, solution
  const [retryAnswers, setRetryAnswers] = useState<Record<string, unknown>>({});
  const [checkingQuestionId, setCheckingQuestionId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, QuestionCheckResult>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, QuestionSolution>>({});
  const [loadingSolutionId, setLoadingSolutionId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState<number>(0);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);

  const inFlightChecksRef = useRef<Set<string>>(new Set());
  const focusedRetryFieldRef = useRef<
    Record<string, { blankIndex?: number; partId?: string }>
  >({});

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getMistakes()
      .then((data) => {
        if (isMounted) {
          setMistakes(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load mistakes");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  // While restoring session from localStorage token
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-medium">Authenticating...</p>
      </div>
    );
  }

  // Guest view
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
          <BookmarkCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Sign In to Review Your Mistakes
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Log in to your account to review questions you previously answered incorrectly, practice them again, and view in-depth Vietnamese explanations.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-md hover:bg-brand-700 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Create Account</span>
          </button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-medium">Scanning for unresolved mistakes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Failed to Load Mistakes</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-bold bg-white text-rose-700 border border-rose-300 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleRetryAnswerChange = (questionId: string, val: unknown) => {
    setRetryAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  const handleWordBankSelectForMistake = (item: MistakeItem, word: string) => {
    const q = toMistakeRenderableQuestion(item);
    const current = retryAnswers[item.questionId];
    const focus = focusedRetryFieldRef.current[item.questionId];

    if (q.parts && q.parts.length > 0) {
      const prevMap =
        current && typeof current === "object" && !Array.isArray(current)
          ? { ...(current as Record<string, string>) }
          : {};
      const targetPartId =
        focus?.partId ||
        q.parts.find((p, i) => !(prevMap[p.partId || String(i + 1)] || "").trim())
          ?.partId ||
        q.parts[0]?.partId ||
        "1";
      prevMap[targetPartId] = word;
      handleRetryAnswerChange(item.questionId, prevMap);
      return;
    }

    if (q.blanks && q.blanks.length > 1) {
      const arr = Array.isArray(current) ? [...current] : [];
      while (arr.length < q.blanks.length) arr.push("");
      const targetBlankIdx =
        focus?.blankIndex ??
        Math.max(
          0,
          q.blanks.findIndex((_, i) => !String(arr[i] || "").trim())
        );
      arr[targetBlankIdx] = word;
      handleRetryAnswerChange(item.questionId, arr);
      return;
    }

    handleRetryAnswerChange(item.questionId, word);
  };

  const handleRetrySubmit = async (questionId: string) => {
    if (inFlightChecksRef.current.has(questionId)) return;
    const answer = retryAnswers[questionId];
    if (isEmptyAnswerValue(answer)) return;

    const normalizedAnswer =
      typeof answer === "string" ? answer.trim() : answer;

    try {
      inFlightChecksRef.current.add(questionId);
      setCheckingQuestionId(questionId);
      const res = await api.checkQuestionAnswer(questionId, normalizedAnswer);
      setCheckResults((prev) => ({
        ...prev,
        [questionId]: res,
      }));
      setAnalyticsRefreshKey((k) => k + 1);

      if (res.isCorrect) {
        setResolvedIds((prev) => new Set(prev).add(questionId));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to check question correction");
    } finally {
      inFlightChecksRef.current.delete(questionId);
      setCheckingQuestionId(null);
    }
  };

  const handleToggleSolution = async (questionId: string) => {
    if (revealedSolutions[questionId]) {
      const next = { ...revealedSolutions };
      delete next[questionId];
      setRevealedSolutions(next);
      return;
    }

    try {
      setLoadingSolutionId(questionId);
      const sol = await api.getQuestionSolution(questionId);
      setRevealedSolutions((prev) => ({
        ...prev,
        [questionId]: sol,
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load solution");
    } finally {
      setLoadingSolutionId(null);
    }
  };

  // Filter out dismissed mistakes
  const activeMistakes = mistakes.filter((m) => !dismissedIds.has(m.questionId));
  const unresolvedCount = activeMistakes.filter((m) => !resolvedIds.has(m.questionId)).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Interactive Mistake Review
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {unresolvedCount} Unresolved
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Questions where your most recent answer was incorrect. Retrying and answering correctly resolves the mistake automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/progress"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Dashboard</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </Link>
        </div>
      </div>

      {/* ─── Empty State: Zero Unresolved Mistakes ────────────────────────── */}
      {activeMistakes.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">
              All Clear! Zero unresolved mistakes
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              You have no pending mistakes. Great work on your exercises! Continue practicing new units to reinforce your grammar skills.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-colors shadow-xs"
            >
              <span>Explore More Units</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ─── Mistakes List ──────────────────────────────────────────────── */
        <div className="space-y-6">
          {activeMistakes.map((item, index) => {
            const result = checkResults[item.questionId];
            const solution = revealedSolutions[item.questionId];
            const isResolved = resolvedIds.has(item.questionId);
            const renderableQuestion = toMistakeRenderableQuestion(item);
            const retryValue = retryAnswers[item.questionId];
            const hasRetryValue = !isEmptyAnswerValue(retryValue);

            const isSplitSlash = isSplitBlankSlashOptionQuestion(renderableQuestion);
            const hasOptions =
              (renderableQuestion.options?.length || 0) > 0 && !isSplitSlash;
            const hasParts = (renderableQuestion.parts?.length || 0) > 0;
            const hasBlanks = (renderableQuestion.blanks?.length || 0) > 0;
            const allowMultiple = isMultiSelectExercise(
              item.instruction || undefined,
              item.questionId
            );

            return (
              <div
                key={item.questionId}
                className={`bg-white border rounded-2xl p-6 shadow-2xs space-y-5 transition-all ${
                  isResolved
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Meta Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                      {index + 1}
                    </span>
                    <Link
                      to={`/units/${item.unitNumber}`}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Unit {item.unitNumber}: {item.unitTitle}
                    </Link>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-500">
                      Exercise {item.exerciseNumber}
                    </span>
                    {item.ruleReference && (
                      <button
                        type="button"
                        onClick={() => setInspectingRule(item.ruleReference!)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Rule {item.ruleReference}</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {item.questionId}
                  </span>
                </div>

                {/* Instruction & Previous Wrong Attempt */}
                <div className="space-y-2">
                  {item.instruction && (
                    <p className="text-xs text-slate-500 italic">
                      {item.instruction}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold">Your previous answer:</span>
                    <code className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs">
                      {formatStudentAnswerSummary(item.lastStudentAnswer)}
                    </code>
                    <span className="text-slate-400 text-[11px]">
                      ({new Date(item.lastAttemptedAt).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Word Bank if present on the source exercise */}
                {!isResolved && item.wordBankItems && item.wordBankItems.length > 0 && (
                  <WordBankBar
                    items={item.wordBankItems}
                    onSelectWord={(word) => handleWordBankSelectForMistake(item, word)}
                  />
                )}

                {/* Interactive Polymorphic Retry Area */}
                {!isResolved && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    {hasOptions ? (
                      <OptionQuestionRenderer
                        question={renderableQuestion}
                        value={retryValue as string | string[] | undefined}
                        onChange={(val) =>
                          handleRetryAnswerChange(item.questionId, val)
                        }
                        allowMultiple={allowMultiple}
                        disabled={checkingQuestionId === item.questionId}
                      />
                    ) : hasParts ? (
                      <MultiPartQuestionRenderer
                        question={renderableQuestion}
                        value={retryValue as Record<string, string> | undefined}
                        onChange={(val) =>
                          handleRetryAnswerChange(item.questionId, val)
                        }
                        disabled={checkingQuestionId === item.questionId}
                        onFocusField={(partId) => {
                          focusedRetryFieldRef.current[item.questionId] = { partId };
                        }}
                      />
                    ) : hasBlanks ? (
                      <FillBlankQuestionRenderer
                        question={renderableQuestion}
                        value={retryValue as string | string[] | undefined}
                        onChange={(val) =>
                          handleRetryAnswerChange(item.questionId, val)
                        }
                        disabled={checkingQuestionId === item.questionId}
                        onFocusField={(blankIndex) => {
                          focusedRetryFieldRef.current[item.questionId] = { blankIndex };
                        }}
                      />
                    ) : (
                      <SentenceQuestionRenderer
                        question={renderableQuestion}
                        value={(retryValue as string | undefined) ?? ""}
                        onChange={(val) =>
                          handleRetryAnswerChange(item.questionId, val)
                        }
                        disabled={checkingQuestionId === item.questionId}
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRetrySubmit(item.questionId)}
                        disabled={
                          checkingQuestionId === item.questionId || !hasRetryValue
                        }
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {checkingQuestionId === item.questionId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Check Correction</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSolution(item.questionId)}
                        disabled={loadingSolutionId === item.questionId}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {loadingSolutionId === item.questionId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {solution ? "Hide Solution" : "View Solution"}
                        </span>
                      </button>
                    </div>

                    {/* Retry Feedback Banner */}
                    {result && !result.isCorrect && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Still incorrect, try again or inspect the solution!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Resolved Banner */}
                {isResolved && result && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Resolved! Cleared from mistakes list</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedIds((prev) => new Set(prev).add(item.questionId))
                        }
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>

                    <QuestionFeedbackPanel
                      feedback={{
                        isCorrect: result.isCorrect,
                        isOrderedMultiExpected: Boolean(
                          hasParts || (!hasOptions && (renderableQuestion.blanks?.length || 0) > 1)
                        ),
                        partLabelPrefix: hasParts ? "Part #" : "Blank #",
                        studentAnswer: result.studentAnswer,
                        expectedAnswers: result.expectedAnswers,
                        correctAnswers: result.correctAnswers,
                        explanation: result.explanation,
                        ruleReference: result.ruleReference,
                      }}
                      onOpenRuleReference={(secId) => setInspectingRule(secId)}
                    />
                  </div>
                )}

                {/* Revealed Solution & Explanation */}
                {solution && (() => {
                  const solutionChips =
                    solution.parts && solution.parts.length > 0
                      ? solution.parts.map(
                          (p, idx) =>
                            `Part #${idx + 1}: ${
                              p.correctAnswerText || p.acceptedAnswers?.[0] || ""
                            }`
                        )
                      : !hasOptions && solution.blanks && solution.blanks.length > 1
                      ? solution.blanks.map(
                          (b, idx) =>
                            `Blank #${idx + 1}: ${
                              b.correctAnswerText || b.acceptedAnswers?.[0] || ""
                            }`
                        )
                      : solution.acceptedAnswers.length > 0
                      ? solution.acceptedAnswers
                      : solution.correctAnswerText
                      ? [solution.correctAnswerText]
                      : [];

                  return (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                        Pedagogical Solution & Cambridge Answer Key
                      </span>
                      {solution.explanation?.ruleReference && (
                        <button
                          type="button"
                          onClick={() =>
                            setInspectingRule(solution.explanation!.ruleReference!)
                          }
                          className="font-bold bg-amber-200/80 hover:bg-amber-300/80 px-2 py-0.5 rounded text-amber-900 font-mono text-[11px] cursor-pointer"
                        >
                          Rule {solution.explanation.ruleReference}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        {hasParts || (!hasOptions && (solution.blanks?.length || 0) > 1)
                          ? "Expected Answers:"
                          : "Accepted Answers:"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {solutionChips.map((ans, idx) => (
                          <code
                            key={idx}
                            className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono text-slate-900 font-bold"
                          >
                            {ans}
                          </code>
                        ))}
                      </div>
                    </div>

                    {solution.explanation?.aiExplanation && (
                      <div className="space-y-1 pt-1 border-t border-amber-200/60">
                        <span className="font-semibold text-amber-800">
                          Vietnamese Explanation:
                        </span>
                        <p className="text-slate-700 leading-relaxed italic">
                          {solution.explanation.aiExplanation}
                        </p>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Phase 9: Adaptive Error Pattern Analytics & Recommendations ── */}
      <div className="pt-6 border-t border-slate-200">
        <AdaptiveReviewPanel refreshKey={analyticsRefreshKey} />
      </div>

      <RuleReferenceModal
        sectionId={inspectingRule}
        onClose={() => setInspectingRule(null)}
      />
    </div>
  );
};

export default MistakeReviewPage;
