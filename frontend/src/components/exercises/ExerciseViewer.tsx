import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { api } from "../../api/client";
import {
  Exercise,
  Question,
  QuestionSolution,
  UnitProgressDetail,
  UnitProgressAttempt,
} from "../../types/api.types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import WordBankBar from "./WordBankBar";
import QuestionCard, { isSplitBlankSlashOptionQuestion } from "./QuestionCard";
import { isEmptyAnswerValue } from "./QuestionFeedbackPanel";

export { isEmptyAnswerValue };

interface ExerciseViewerProps {
  unitNumber: number;
  unitProgress?: UnitProgressDetail | null;
  onOpenRuleReference?: (sectionId: string) => void;
  onProgressChange?: () => void;
  onOpenAuthModal?: () => void;
}

interface ExerciseScoreSummary {
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
}

interface FocusedInputTarget {
  questionId: string;
  blankIndex?: number;
  partId?: string;
}

export const ExerciseViewer: React.FC<ExerciseViewerProps> = ({
  unitNumber,
  unitProgress,
  onOpenRuleReference,
  onProgressChange,
  onOpenAuthModal,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Student answers keyed by questionId: Record<questionId, any>
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Question evaluation or solution results: Record<questionId, any>
  const [results, setResults] = useState<Record<string, any>>({});

  // Per-exercise score summaries and restored state flags
  const [exerciseScoresById, setExerciseScoresById] = useState<
    Record<string, ExerciseScoreSummary>
  >({});
  const [restoredByExerciseId, setRestoredByExerciseId] = useState<
    Record<string, boolean>
  >({});

  // Loading states + synchronous in-flight guards to block double-submit races
  const [isCheckingExercise, setIsCheckingExercise] = useState<boolean>(false);
  const [isRevealingAll, setIsRevealingAll] = useState<boolean>(false);
  const [checkingQuestionId, setCheckingQuestionId] = useState<string | null>(null);
  const [revealingQuestionId, setRevealingQuestionId] = useState<string | null>(null);
  const [wordBankResetVersion, setWordBankResetVersion] = useState<number>(0);

  const isCheckingExerciseRef = useRef<boolean>(false);
  const checkingQuestionIdsRef = useRef<Set<string>>(new Set());
  const focusedTargetRef = useRef<FocusedInputTarget | null>(null);

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
      .getUnitExercises(unitNumber)
      .then((data) => {
        if (!isMounted) return;
        setExercises(data);
        setActiveExerciseIndex(0);
        setAnswers({});
        setResults({});
        setExerciseScoresById({});
        setRestoredByExerciseId({});
        focusedTargetRef.current = null;
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

  const activeScore = activeExercise
    ? exerciseScoresById[activeExercise.exerciseId] || null
    : null;
  const isRestoredAttempt = activeExercise
    ? Boolean(restoredByExerciseId[activeExercise.exerciseId])
    : false;

  const handleRestorePreviousAnswers = (attemptToRestore?: UnitProgressAttempt | null) => {
    const targetAttempt = attemptToRestore || activePastAttempt;
    if (!targetAttempt || !activeExercise) return;
    const restoredAnswers: Record<string, any> = {};
    const restoredResults: Record<string, any> = {};

    if (targetAttempt.items && targetAttempt.items.length > 0) {
      for (const item of targetAttempt.items) {
        if (item.studentAnswer !== null && item.studentAnswer !== undefined) {
          restoredAnswers[item.questionId] = item.studentAnswer;
          restoredResults[item.questionId] = {
            questionId: item.questionId,
            status: item.isCorrect ? "correct" : "incorrect",
            isCorrect: item.isCorrect,
            studentAnswer: item.studentAnswer,
          };
        } else {
          restoredResults[item.questionId] = {
            questionId: item.questionId,
            status: "unanswered",
            isCorrect: false,
            studentAnswer: null,
            correctAnswers: [],
            expectedAnswers: [],
            explanation: null,
            ruleReference: null,
          };
        }
      }
    }

    setAnswers((prev) => ({ ...prev, ...restoredAnswers }));
    setResults((prev) => ({ ...prev, ...restoredResults }));
    setExerciseScoresById((prev) => ({
      ...prev,
      [activeExercise.exerciseId]: {
        totalQuestions: targetAttempt.totalQuestions,
        correctCount: targetAttempt.correctCount,
        scorePercentage: targetAttempt.scorePercentage,
      },
    }));
    setRestoredByExerciseId((prev) => ({
      ...prev,
      [activeExercise.exerciseId]: true,
    }));
  };

  // Automatically restore previously saved attempt when switching to an exercise with no active unsaved inputs
  useEffect(() => {
    if (!activeExercise) return;
    const past = latestAttemptsByExerciseId.get(activeExercise.exerciseId);
    if (past && past.items && past.items.length > 0) {
      const hasAnyInput = activeExercise.questions.some(
        (q) => !isEmptyAnswerValue(answers[q.questionId])
      );
      if (!hasAnyInput && !exerciseScoresById[activeExercise.exerciseId]) {
        handleRestorePreviousAnswers(past);
      }
    }
  }, [activeExerciseIndex, latestAttemptsByExerciseId, activeExercise?.exerciseId]);

  const handleAnswerChange = (questionId: string, val: any) => {
    if (activeExercise) {
      setRestoredByExerciseId((prev) => ({
        ...prev,
        [activeExercise.exerciseId]: false,
      }));
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  // Click-to-insert from sticky WordBankBar into focused or next empty interactive text field
  const handleSelectWordFromBank = (word: string) => {
    if (!activeExercise) return;
    const bankWords = new Set(
      (activeExercise.wordBankItems || []).map((w) => w.word.toLowerCase())
    );

    const mergeWord = (existing: string): string => {
      const trimmed = existing.trim();
      if (!trimmed || bankWords.has(trimmed.toLowerCase())) {
        return word;
      }
      if (/\s$/.test(existing)) {
        return `${existing}${word}`;
      }
      return `${existing} ${word}`;
    };

    const isTextQuestion = (q: Question): boolean => {
      if (q.isExample) return false;
      const splitSlash = isSplitBlankSlashOptionQuestion(q);
      const hasOptions = (q.options?.length || 0) > 0 && !splitSlash;
      return !hasOptions;
    };

    let target = focusedTargetRef.current;
    const targetQuestion = target
      ? activeExercise.questions.find((q) => q.questionId === target!.questionId)
      : undefined;

    if (!target || !targetQuestion || !isTextQuestion(targetQuestion)) {
      target = null;
      for (const q of activeExercise.questions) {
        if (!isTextQuestion(q)) continue;
        const currentVal = answers[q.questionId];

        if ((q.parts?.length || 0) > 0) {
          const obj =
            currentVal && typeof currentVal === "object" && !Array.isArray(currentVal)
              ? (currentVal as Record<string, string>)
              : {};
          const emptyPart = q.parts.find(
            (p, idx) => !(obj[p.partId || String(idx + 1)] || "").trim()
          );
          if (emptyPart) {
            target = {
              questionId: q.questionId,
              partId: emptyPart.partId || String(q.parts.indexOf(emptyPart) + 1),
            };
            break;
          }
        } else if ((q.blanks?.length || 0) > 1) {
          const arr = Array.isArray(currentVal) ? currentVal : [];
          const emptyIdx = q.blanks.findIndex((_, idx) => !(arr[idx] || "").trim());
          if (emptyIdx !== -1) {
            target = { questionId: q.questionId, blankIndex: emptyIdx };
            break;
          }
        } else {
          const strVal =
            typeof currentVal === "string"
              ? currentVal
              : Array.isArray(currentVal)
              ? currentVal[0] || ""
              : "";
          if (!strVal.trim()) {
            target = { questionId: q.questionId, blankIndex: 0 };
            break;
          }
        }
      }
    }

    if (!target) {
      const firstTextQ = activeExercise.questions.find(isTextQuestion);
      if (!firstTextQ) return;
      target = {
        questionId: firstTextQ.questionId,
        blankIndex: (firstTextQ.blanks?.length || 0) > 1 ? 0 : undefined,
        partId:
          (firstTextQ.parts?.length || 0) > 0
            ? firstTextQ.parts[0].partId || "1"
            : undefined,
      };
    }

    const qObj = activeExercise.questions.find(
      (q) => q.questionId === target!.questionId
    );
    if (!qObj) return;

    const currentVal = answers[qObj.questionId];
    if ((qObj.parts?.length || 0) > 0 && target.partId) {
      const prevMap =
        currentVal && typeof currentVal === "object" && !Array.isArray(currentVal)
          ? { ...(currentVal as Record<string, string>) }
          : {};
      prevMap[target.partId] = mergeWord(prevMap[target.partId] || "");
      handleAnswerChange(qObj.questionId, prevMap);
    } else if ((qObj.blanks?.length || 0) > 1) {
      const blankIdx = target.blankIndex ?? 0;
      const nextArr = Array.isArray(currentVal)
        ? [...currentVal]
        : typeof currentVal === "string" && currentVal.length > 0
        ? [currentVal]
        : [];
      while (nextArr.length < qObj.blanks.length) {
        nextArr.push("");
      }
      nextArr[blankIdx] = mergeWord(String(nextArr[blankIdx] || ""));
      handleAnswerChange(qObj.questionId, nextArr);
    } else {
      const strVal =
        typeof currentVal === "string"
          ? currentVal
          : Array.isArray(currentVal)
          ? String(currentVal[0] || "")
          : "";
      handleAnswerChange(qObj.questionId, mergeWord(strVal));
    }
  };

  const isQuestionSolutionUnlocked = (question: Question): boolean => {
    if (question.isExample) return Boolean(user);
    if (!user) return false;
    const existingResult = results[question.questionId];
    if (existingResult && existingResult.status !== "unanswered") {
      if (existingResult.isCorrect === undefined || "answerKey" in existingResult) {
        return true;
      }
      if (
        existingResult.studentAnswer !== null &&
        !(
          existingResult.studentAnswer !== undefined &&
          isEmptyAnswerValue(existingResult.studentAnswer)
        )
      ) {
        return true;
      }
    }
    return Boolean(
      activePastAttempt?.items?.some(
        (it) =>
          it.questionId === question.questionId &&
          !isEmptyAnswerValue(it.studentAnswer)
      )
    );
  };

  const isExerciseSolutionsUnlocked = (): boolean => {
    if (!user || !activeExercise) return false;
    if (activeScore || activePastAttempt) return true;
    const interactive = activeExercise.questions.filter((q) => !q.isExample);
    return (
      interactive.length > 0 &&
      interactive.every((q) => {
        const r = results[q.questionId];
        return Boolean(r) && r.status !== "unanswered";
      })
    );
  };

  // Single Question Check (with empty guard & double-submit lock)
  const handleCheckQuestion = async (questionId: string) => {
    if (checkingQuestionIdsRef.current.has(questionId)) return;
    const studentAnswer = answers[questionId];
    if (isEmptyAnswerValue(studentAnswer)) {
      toast.warning("Please enter or select an answer before checking.");
      return;
    }

    try {
      checkingQuestionIdsRef.current.add(questionId);
      setCheckingQuestionId(questionId);
      const result = await api.checkQuestionAnswer(questionId, studentAnswer);
      setResults((prev) => ({
        ...prev,
        [questionId]: result,
      }));
      onProgressChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to check answer");
    } finally {
      checkingQuestionIdsRef.current.delete(questionId);
      setCheckingQuestionId(null);
    }
  };

  // Single Question Show Solution (strictly gated by auth + prior attempt)
  const handleShowQuestionSolution = async (question: Question) => {
    if (!user) {
      toast.info("Please sign in and try answering before viewing solutions.");
      onOpenAuthModal?.();
      return;
    }

    if (!isQuestionSolutionUnlocked(question)) {
      toast.info("Check your answer at least once to unlock this solution.");
      return;
    }

    try {
      setRevealingQuestionId(question.questionId);
      const solution = await api.getQuestionSolution(question.questionId);
      setResults((prev) => ({
        ...prev,
        [question.questionId]: solution,
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load solution");
    } finally {
      setRevealingQuestionId(null);
    }
  };

  // Whole Exercise Check (strictly scoped to activeExercise questions)
  const handleCheckEntireExercise = async () => {
    if (!activeExercise || isCheckingExerciseRef.current) return;

    const scopedAnswers: Record<string, unknown> = {};
    for (const q of activeExercise.questions) {
      if (q.isExample) continue;
      const val = answers[q.questionId];
      if (!isEmptyAnswerValue(val)) {
        scopedAnswers[q.questionId] = val;
      }
    }

    if (Object.keys(scopedAnswers).length === 0) {
      toast.warning("Please answer at least one question before checking the exercise.");
      return;
    }

    try {
      isCheckingExerciseRef.current = true;
      setIsCheckingExercise(true);
      const res = await api.checkExerciseAnswers(
        activeExercise.exerciseId,
        scopedAnswers
      );

      setResults((prev) => {
        const nextResults = { ...prev };
        for (const qResult of res.results) {
          nextResults[qResult.questionId] = qResult;
        }
        return nextResults;
      });

      setExerciseScoresById((prev) => ({
        ...prev,
        [activeExercise.exerciseId]: {
          totalQuestions: res.totalQuestions,
          correctCount: res.correctCount,
          scorePercentage: res.scorePercentage,
        },
      }));
      setRestoredByExerciseId((prev) => ({
        ...prev,
        [activeExercise.exerciseId]: false,
      }));
      onProgressChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to grade entire exercise");
    } finally {
      isCheckingExerciseRef.current = false;
      setIsCheckingExercise(false);
    }
  };

  // Whole Exercise Reveal Solutions (strictly gated by auth + prior attempt)
  const handleRevealAllSolutions = async () => {
    if (!activeExercise) return;
    if (!user) {
      toast.info("Please sign in and submit an attempt before viewing solutions.");
      onOpenAuthModal?.();
      return;
    }

    if (!isExerciseSolutionsUnlocked()) {
      toast.info("Submit 'Check Entire Exercise' first to unlock all solutions.");
      return;
    }

    try {
      setIsRevealingAll(true);
      const solutions = await api.getExerciseSolutions(activeExercise.exerciseId);

      const newResults: Record<string, QuestionSolution> = { ...results };
      for (const sol of solutions) {
        newResults[sol.questionId] = sol;
      }
      setResults(newResults);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load exercise solutions");
    } finally {
      setIsRevealingAll(false);
    }
  };

  // Reset active exercise only
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
    setExerciseScoresById((prev) => {
      const next = { ...prev };
      delete next[activeExercise.exerciseId];
      return next;
    });
    setRestoredByExerciseId((prev) => ({
      ...prev,
      [activeExercise.exerciseId]: false,
    }));
    focusedTargetRef.current = null;
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

  const allSolutionsUnlocked = isExerciseSolutionsUnlocked();

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
                focusedTargetRef.current = null;
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

            {/* Visual Context (Pictures/Illustrations) */}
            {activeExercise.hasVisualContext && activeExercise.visualContextDescription && (
              <div
                data-testid="exercise-visual-context"
                className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 space-y-1"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" /> Visual Context
                </span>
                <p className="italic">{activeExercise.visualContextDescription}</p>
              </div>
            )}

            {/* Distinct Context Notes */}
            {activeExercise.contextNotes && activeExercise.contextNotes.trim() && (
              <div
                data-testid="exercise-context-notes"
                className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-950 space-y-1"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" /> Context Notes
                </span>
                <p className="whitespace-pre-line">{activeExercise.contextNotes}</p>
              </div>
            )}
          </section>

          {/* ─── Past Saved Attempt Banner (If not currently showing restored attempt) ── */}
          {activePastAttempt && !isRestoredAttempt && !activeScore && (
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
          {activeScore && (
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
                      {activeScore.correctCount} of {activeScore.totalQuestions}{" "}
                      questions correct
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-2xl font-black ${
                      activeScore.scorePercentage >= 80
                        ? "text-emerald-600"
                        : activeScore.scorePercentage >= 50
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {activeScore.scorePercentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    activeScore.scorePercentage >= 80
                      ? "bg-emerald-500"
                      : activeScore.scorePercentage >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, activeScore.scorePercentage)}%` }}
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
                title={
                  allSolutionsUnlocked
                    ? "Reveal solutions for the exercise"
                    : "Sign in and check the exercise first to unlock solutions"
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isRevealingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : allSolutionsUnlocked ? (
                  <Eye className="w-4 h-4 text-slate-500" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-500" />
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
                onSelectWord={handleSelectWordFromBank}
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
                onShowSolution={() => handleShowQuestionSolution(question)}
                isChecking={checkingQuestionId === question.questionId}
                isLoadingSolution={revealingQuestionId === question.questionId}
                isSolutionUnlocked={isQuestionSolutionUnlocked(question)}
                onOpenRuleReference={onOpenRuleReference}
                exerciseInstruction={activeExercise.instruction}
                onFocusField={(target) => {
                  focusedTargetRef.current = {
                    questionId: question.questionId,
                    blankIndex: target?.blankIndex,
                    partId: target?.partId,
                  };
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseViewer;
