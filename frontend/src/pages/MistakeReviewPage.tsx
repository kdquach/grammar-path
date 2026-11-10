import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { MistakeItem, QuestionSolution, QuestionCheckResult } from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";
import AdaptiveReviewPanel from "../components/adaptive/AdaptiveReviewPanel";
import QuestionPromptText from "../components/exercises/QuestionPromptText";

export const MistakeReviewPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Per-mistake state: retry input, evaluation result, solution
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});
  const [checkingQuestionId, setCheckingQuestionId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, QuestionCheckResult>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, QuestionSolution>>({});
  const [loadingSolutionId, setLoadingSolutionId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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

  const handleRetrySubmit = async (questionId: string) => {
    const answer = retryAnswers[questionId];
    if (!answer || !answer.trim()) return;

    try {
      setCheckingQuestionId(questionId);
      const res = await api.checkQuestionAnswer(questionId, answer.trim());
      setCheckResults((prev) => ({
        ...prev,
        [questionId]: res,
      }));

      if (res.isCorrect) {
        setResolvedIds((prev) => new Set(prev).add(questionId));
      }
    } catch (err: any) {
      alert(err.message || "Failed to check question correction");
    } finally {
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
      alert(err.message || "Failed to load solution");
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
                  <div className="flex items-center gap-2">
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
                  </div>

                  <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {item.questionId}
                  </span>
                </div>

                {/* Question Content */}
                <div className="space-y-2">
                  <QuestionPromptText
                    content={item.questionContent}
                    className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold">Your previous answer:</span>
                    <code className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs">
                      {typeof item.lastStudentAnswer === "object"
                        ? JSON.stringify(item.lastStudentAnswer)
                        : String(item.lastStudentAnswer || "(empty)")}
                    </code>
                    <span className="text-slate-400 text-[11px]">
                      ({new Date(item.lastAttemptedAt).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Interactive Retry Area */}
                {!isResolved && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type your correction..."
                        value={retryAnswers[item.questionId] || ""}
                        onChange={(e) =>
                          setRetryAnswers((prev) => ({
                            ...prev,
                            [item.questionId]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRetrySubmit(item.questionId);
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                        disabled={checkingQuestionId === item.questionId}
                      />
                      <button
                        type="button"
                        onClick={() => handleRetrySubmit(item.questionId)}
                        disabled={
                          checkingQuestionId === item.questionId ||
                          !retryAnswers[item.questionId]?.trim()
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
                {isResolved && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
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
                    {result?.explanation && (
                      <p className="text-xs text-emerald-900 pl-7 leading-relaxed">
                        {result.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Revealed Solution & Explanation */}
                {solution && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                        Pedagogical Solution & Cambridge Answer Key
                      </span>
                      {solution.explanation?.ruleReference && (
                        <span className="font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-mono text-[11px]">
                          Rule {solution.explanation.ruleReference}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        Accepted Answers:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {solution.acceptedAnswers.map((ans, idx) => (
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Phase 9: Adaptive Error Pattern Analytics & Recommendations ── */}
      <div className="pt-6 border-t border-slate-200">
        <AdaptiveReviewPanel />
      </div>
    </div>
  );
};

export default MistakeReviewPage;
