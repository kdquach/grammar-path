import React, { useEffect, useState, useMemo } from "react";
import {
  CheckCheck,
  Eye,
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Sparkles,
  LogIn,
} from "lucide-react";
import { api } from "../../api/client";
import {
  Exercise,
  QuestionSolution,
  UnitProgressDetail,
  UnitProgressAttempt,
} from "../../types/api.types";
import { useAuth } from "../../context/AuthContext";
import WordBankBar from "./WordBankBar";
import QuestionCard from "./QuestionCard";

interface ExerciseViewerProps {
  unitNumber: number;
  unitProgress?: UnitProgressDetail | null;
  onOpenRuleReference?: (sectionId: string) => void;
  onProgressChange?: () => void;
  onOpenAuthModal?: () => void;
}

export const ExerciseViewer: React.FC<ExerciseViewerProps> = ({
  unitNumber,
  unitProgress,
  onOpenRuleReference,
  onProgressChange,
  onOpenAuthModal,
}) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Student answers keyed by questionId: Record<questionId, any>
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Question evaluation or solution results: Record<questionId, any>
  const [results, setResults] = useState<Record<string, any>>({});

  // Score summary for whole exercise evaluation
  const [exerciseScore, setExerciseScore] = useState<{
    totalQuestions: number;
    correctCount: number;
    scorePercentage: number;
  } | null>(null);

  // Tracks if current view is showing restored previous attempt
  const [isRestoredAttempt, setIsRestoredAttempt] = useState<boolean>(false);

  // Loading states
  const [isCheckingExercise, setIsCheckingExercise] = useState<boolean>(false);
  const [isRevealingAll, setIsRevealingAll] = useState<boolean>(false);
  const [checkingQuestionId, setCheckingQuestionId] = useState<string | null>(null);
  const [revealingQuestionId, setRevealingQuestionId] = useState<string | null>(null);
  const [wordBankResetVersion, setWordBankResetVersion] = useState<number>(0);

  // Build map of latest attempts for each exercise in this unit
  const latestAttemptsByExerciseId = useMemo(() => {
    if (!unitProgress?.attempts || unitProgress.attempts.length === 0) {
      return new Map<string, UnitProgressAttempt>();
    }
    const map = new Map<string, UnitProgressAttempt>();
    for (const att of unitProgress.attempts) {
      if (!map.has(att.exerciseId)) {
        map.set(att.exerciseId, att);
      }
    }
    return map;
  }, [unitProgress]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getUnitExercises(unitNumber, false)
      .then((data) => {
        if (!isMounted) return;
        setExercises(data);
        setActiveExerciseIndex(0);
        setAnswers({});
        setResults({});
        setExerciseScore(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load exercises for this unit");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [unitNumber]);

  const activeExercise = exercises[activeExerciseIndex] || null;

  const activePastAttempt = useMemo(() => {
    if (!activeExercise) return null;
    return latestAttemptsByExerciseId.get(activeExercise.exerciseId) || null;
  }, [activeExercise, latestAttemptsByExerciseId]);

  const handleRestorePreviousAnswers = (attemptToRestore?: UnitProgressAttempt | null) => {
    const targetAttempt = attemptToRestore || activePastAttempt;
    if (!targetAttempt || !activeExercise) return;
    const restoredAnswers: Record<string, any> = {};
    const restoredResults: Record<string, any> = {};

    if (targetAttempt.items && targetAttempt.items.length > 0) {
      for (const item of targetAttempt.items) {
        if (item.studentAnswer !== null && item.studentAnswer !== undefined) {
          restoredAnswers[item.questionId] = item.studentAnswer;
        }
        restoredResults[item.questionId] = {
          questionId: item.questionId,
          isCorrect: item.isCorrect,
          studentAnswer: item.studentAnswer,
        };
      }
    }

    setAnswers((prev) => ({ ...prev, ...restoredAnswers }));
    setResults((prev) => ({ ...prev, ...restoredResults }));
    setExerciseScore({
      totalQuestions: targetAttempt.totalQuestions,
      correctCount: targetAttempt.correctCount,
      scorePercentage: targetAttempt.scorePercentage,
    });
    setIsRestoredAttempt(true);
  };

  // Automatically restore previously saved attempt when switching to an exercise that has no active unsaved inputs
  useEffect(() => {
    if (!activeExercise) return;
    const past = latestAttemptsByExerciseId.get(activeExercise.exerciseId);
    if (past && past.items && past.items.length > 0) {
      const hasAnyInput = activeExercise.questions.some(
        (q) => answers[q.questionId] !== undefined
      );
      if (!hasAnyInput && !exerciseScore) {
        handleRestorePreviousAnswers(past);
      }
    }
  }, [activeExerciseIndex, latestAttemptsByExerciseId]);

  const handleAnswerChange = (questionId: string, val: any) => {
    setIsRestoredAttempt(false);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  // Single Question Check
  const handleCheckQuestion = async (questionId: string) => {
    try {
      setCheckingQuestionId(questionId);
      const studentAnswer = answers[questionId];
      const result = await api.checkQuestionAnswer(questionId, studentAnswer);
      setResults((prev) => ({
        ...prev,
        [questionId]: result,
      }));
      onProgressChange?.();
    } catch (err: any) {
      alert(err.message || "Failed to check answer");
    } finally {
      setCheckingQuestionId(null);
    }
  };

  // Single Question Show Solution
  const handleShowQuestionSolution = async (questionId: string) => {
    try {
      setRevealingQuestionId(questionId);
      const solution = await api.getQuestionSolution(questionId);
      setResults((prev) => ({
        ...prev,
        [questionId]: solution,
      }));
    } catch (err: any) {
      alert(err.message || "Failed to load solution");
    } finally {
      setRevealingQuestionId(null);
    }
  };

  // Whole Exercise Check
  const handleCheckEntireExercise = async () => {
    if (!activeExercise) return;
    try {
      setIsCheckingExercise(true);
      const res = await api.checkExerciseAnswers(activeExercise.exerciseId, answers);

      // Map question results
      const newResults: Record<string, any> = { ...results };
      for (const qResult of res.results) {
        newResults[qResult.questionId] = qResult;
      }
      setResults(newResults);

      setExerciseScore({
        totalQuestions: res.totalQuestions,
        correctCount: res.correctCount,
        scorePercentage: res.scorePercentage,
      });
      onProgressChange?.();
    } catch (err: any) {
      alert(err.message || "Failed to grade entire exercise");
    } finally {
      setIsCheckingExercise(false);
    }
  };

  // Whole Exercise Reveal Solutions
  const handleRevealAllSolutions = async () => {
    if (!activeExercise) return;
    try {
      setIsRevealingAll(true);
      const solutions = await api.getExerciseSolutions(activeExercise.exerciseId);

      const newResults: Record<string, QuestionSolution> = { ...results };
      for (const sol of solutions) {
        newResults[sol.questionId] = sol;
      }
      setResults(newResults);
    } catch (err: any) {
      alert(err.message || "Failed to load exercise solutions");
    } finally {
      setIsRevealingAll(false);
    }
  };

  // Reset Exercise
  const handleResetExercise = () => {
    if (!activeExercise) return;
    const nextAnswers = { ...answers };
    const nextResults = { ...results };

    for (const q of activeExercise.questions) {
      delete nextAnswers[q.questionId];
      delete nextResults[q.questionId];
    }

    setAnswers(nextAnswers);
    setResults(nextResults);
    setExerciseScore(null);
    setIsRestoredAttempt(false);
    setWordBankResetVersion((v) => v + 1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading exercises for Unit {unitNumber}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
        <div>
          <h4 className="font-bold">Error loading exercises</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-600 text-sm">
        No exercises found for Unit {unitNumber}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Guest Mode Warning Pill ─────────────────────────────────────────── */}
      {!user && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold uppercase text-[10px]">
              Chế độ Khách
            </span>
            <span>Bạn chưa đăng nhập. Tiến trình và điểm số bài tập sẽ không được lưu vào tài khoản.</span>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập để lưu</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Exercise Switcher Tabs with Score Badges ────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {exercises.map((ex, idx) => {
          const isActive = idx === activeExerciseIndex;
          const pastAttempt = latestAttemptsByExerciseId.get(ex.exerciseId);
          return (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() => {
                setActiveExerciseIndex(idx);
                setExerciseScore(null);
                setIsRestoredAttempt(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <span>Exercise {ex.exerciseNumber}</span>
              {pastAttempt && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    pastAttempt.scorePercentage >= 80
                      ? isActive
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : pastAttempt.scorePercentage >= 50
                      ? isActive
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                      : isActive
                      ? "bg-rose-500 text-white"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  ✓ {pastAttempt.scorePercentage}%
                </span>
              )}
              <span className="opacity-75 font-normal text-xs">
                ({ex.questions.length})
              </span>
            </button>
          );
        })}
      </div>

      {activeExercise && (
        <div className="space-y-6">
          {/* ─── Exercise Header & Instructions ────────────────────────────── */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-xs font-black uppercase tracking-wider">
                  Exercise {activeExercise.exerciseNumber}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold capitalize">
                  {activeExercise.questionType.replace(/_/g, " ")}
                </span>
                {activePastAttempt && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã hoàn thành ({activePastAttempt.scorePercentage}%)</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {activeExercise.questions.length} Questions
              </div>
            </div>

            <p className="text-sm sm:text-base font-semibold text-slate-800 italic leading-relaxed">
              "{activeExercise.instruction}"
            </p>

            {/* Visual Context or Context Notes */}
            {activeExercise.hasVisualContext && activeExercise.visualContextDescription && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" /> Context Notes
                </span>
                <p className="italic">{activeExercise.visualContextDescription}</p>
              </div>
            )}
          </section>

          {/* ─── Past Saved Attempt Banner (If not currently showing restored attempt) ── */}
          {activePastAttempt && !isRestoredAttempt && !exerciseScore && (
            <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950">
                      Tiến trình đã lưu:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        activePastAttempt.scorePercentage >= 80
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {activePastAttempt.scorePercentage}% ({activePastAttempt.correctCount}/{activePastAttempt.totalQuestions} câu đúng)
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700/80 mt-0.5">
                    Nộp lần gần nhất: {new Date(activePastAttempt.submittedAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRestorePreviousAnswers(activePastAttempt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xem lại bài đã làm</span>
              </button>
            </div>
          )}

          {/* ─── Score Summary Banner (Shown when exercise evaluated or restored) ── */}
          {exerciseScore && (
            <div className="bg-white border-2 border-brand-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Exercise Evaluation Summary
                      </h4>
                      {isRestoredAttempt && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> Đã khôi phục từ lần làm trước
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {exerciseScore.correctCount} of {exerciseScore.totalQuestions}{" "}
                      questions correct
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-2xl font-black ${
                      exerciseScore.scorePercentage >= 80
                        ? "text-emerald-600"
                        : exerciseScore.scorePercentage >= 50
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {exerciseScore.scorePercentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    exerciseScore.scorePercentage >= 80
                      ? "bg-emerald-500"
                      : exerciseScore.scorePercentage >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, exerciseScore.scorePercentage)}%` }}
                />
              </div>
            </div>
          )}

          {/* ─── Exercise Global Action Bar ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isCheckingExercise}
                onClick={handleCheckEntireExercise}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              >
                {isCheckingExercise ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                <span>Check Entire Exercise</span>
              </button>

              <button
                type="button"
                disabled={isRevealingAll}
                onClick={handleRevealAllSolutions}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isRevealingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500" />
                )}
                <span>Reveal All Solutions</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetExercise}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Exercise</span>
            </button>
          </div>

          {/* ─── Questions List (with Sticky Word Bank Dock) ─────────────────────── */}
          <div className="space-y-4">
            {activeExercise.wordBankItems && activeExercise.wordBankItems.length > 0 && (
              <WordBankBar
                key={activeExercise.exerciseId}
                items={activeExercise.wordBankItems}
                sticky
                resetVersion={wordBankResetVersion}
              />
            )}

            {activeExercise.questions.map((question, qIdx) => (
              <QuestionCard
                key={question.questionId}
                question={question}
                questionNumber={qIdx + 1}
                value={answers[question.questionId]}
                onChange={(val) => handleAnswerChange(question.questionId, val)}
                result={results[question.questionId]}
                onCheck={() => handleCheckQuestion(question.questionId)}
                onShowSolution={() => handleShowQuestionSolution(question.questionId)}
                isChecking={checkingQuestionId === question.questionId}
                isLoadingSolution={revealingQuestionId === question.questionId}
                onOpenRuleReference={onOpenRuleReference}
                exerciseInstruction={activeExercise.instruction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseViewer;

