import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Trophy,
  AlertCircle,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import type {
  AdaptiveQuizSession,
  AdaptiveQuizQuestion,
  DifficultyLevel,
  Question,
  QuestionCheckResult,
  QuestionOption,
} from "../../types/api.types";
import RuleReferenceModal from "../theory/RuleReferenceModal";
import OptionQuestionRenderer from "../exercises/renderers/OptionQuestionRenderer";
import FillBlankQuestionRenderer from "../exercises/renderers/FillBlankQuestionRenderer";
import MultiPartQuestionRenderer from "../exercises/renderers/MultiPartQuestionRenderer";
import SentenceQuestionRenderer from "../exercises/renderers/SentenceQuestionRenderer";
import WordBankBar from "../exercises/WordBankBar";
import {
  isMultiSelectExercise,
  isSplitBlankSlashOptionQuestion,
} from "../exercises/QuestionCard";
import { isEmptyAnswerValue } from "../exercises/ExerciseViewer";

interface AdaptiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProgressUpdated?: () => void;
}

function normalizeAdaptiveOptions(
  rawOptions: AdaptiveQuizQuestion["options"]
): QuestionOption[] {
  if (!rawOptions || rawOptions.length === 0) return [];
  return rawOptions.map((opt: any, idx: number) => ({
    optionKey: opt.optionKey ?? opt.key ?? String.fromCharCode(65 + idx),
    optionText: opt.optionText ?? opt.text ?? "",
    displayOrder: opt.displayOrder ?? idx + 1,
  }));
}

function toAdaptiveRenderableQuestion(q: AdaptiveQuizQuestion): Question {
  return {
    id: q.id || q.questionId,
    questionId: q.questionId,
    questionContent: q.questionContent || q.prompt || "",
    isExample: Boolean(q.isExample),
    hasVisualContext: Boolean(q.hasVisualContext),
    visualContextDescription: q.visualContextDescription ?? null,
    contextClue: q.contextClue ?? null,
    displayOrder: q.displayOrder ?? 1,
    options: normalizeAdaptiveOptions(q.options),
    blanks: q.blanks || [],
    parts: q.parts || [],
  };
}

export const AdaptiveQuizModal: React.FC<AdaptiveQuizModalProps> = ({
  isOpen,
  onClose,
  onProgressUpdated,
}) => {
  const toast = useToast();
  const [session, setSession] = useState<AdaptiveQuizSession | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [checkResults, setCheckResults] = useState<
    Record<number, QuestionCheckResult & { sessionId?: string | null }>
  >({});
  const [isCheckingIndex, setIsCheckingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);

  const inFlightIndicesRef = useRef<Set<number>>(new Set());
  const focusedTargetRef = useRef<
    Record<number, { blankIndex?: number; partId?: string }>
  >({});

  const loadAdaptiveQuiz = async (targetDifficulty: DifficultyLevel = difficulty) => {
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setCheckResults({});
    setCurrentIndex(0);
    setIsCheckingIndex(null);
    inFlightIndicesRef.current.clear();
    focusedTargetRef.current = {};

    try {
      const data = await api.generateAdaptiveQuiz(5, targetDifficulty);
      setSession(data);
    } catch (err: any) {
      setError(err.message || "Không thể khởi tạo bài Quiz thông minh.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDifficultyChange = (newDifficulty: DifficultyLevel) => {
    if (newDifficulty === difficulty && session) return;
    setDifficulty(newDifficulty);
    loadAdaptiveQuiz(newDifficulty);
  };

  useEffect(() => {
    if (isOpen) {
      loadAdaptiveQuiz(difficulty);
    }
  }, [isOpen]);

  // Support pressing Escape to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inspectingRule) {
          setInspectingRule(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, inspectingRule]);

  if (!isOpen) return null;

  const questions: AdaptiveQuizQuestion[] = session?.questions || [];
  const currentQ: AdaptiveQuizQuestion | undefined = questions[currentIndex];
  const currentRenderableQ = currentQ ? toAdaptiveRenderableQuestion(currentQ) : null;
  const currentResult = checkResults[currentIndex];
  const totalQuestions = questions.length;

  const handleAnswerChange = (val: unknown) => {
    if (checkResults[currentIndex]) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: val }));
  };

  const handleWordBankSelect = (word: string) => {
    if (!currentRenderableQ || checkResults[currentIndex]) return;
    const current = answers[currentIndex];
    const focus = focusedTargetRef.current[currentIndex];

    if (currentRenderableQ.parts && currentRenderableQ.parts.length > 0) {
      const prevMap =
        current && typeof current === "object" && !Array.isArray(current)
          ? { ...(current as Record<string, string>) }
          : {};
      const targetPartId =
        focus?.partId ||
        currentRenderableQ.parts.find(
          (p, i) => !(prevMap[p.partId || String(i + 1)] || "").trim()
        )?.partId ||
        currentRenderableQ.parts[0]?.partId ||
        "1";
      prevMap[targetPartId] = word;
      handleAnswerChange(prevMap);
      return;
    }

    if (currentRenderableQ.blanks && currentRenderableQ.blanks.length > 1) {
      const arr = Array.isArray(current) ? [...current] : [];
      while (arr.length < currentRenderableQ.blanks.length) arr.push("");
      const idx =
        focus?.blankIndex ??
        Math.max(
          0,
          currentRenderableQ.blanks.findIndex((_, i) => !String(arr[i] || "").trim())
        );
      arr[idx] = word;
      handleAnswerChange(arr);
      return;
    }

    handleAnswerChange(word);
  };

  const handleCheckCurrent = async () => {
    if (!currentQ || checkResults[currentIndex]) return;
    if (inFlightIndicesRef.current.has(currentIndex)) return;

    const studentAnswer = answers[currentIndex];
    if (isEmptyAnswerValue(studentAnswer)) return;

    const normalizedAnswer =
      typeof studentAnswer === "string" ? studentAnswer.trim() : studentAnswer;

    const idxToGrade = currentIndex;
    const submissionId = `aq-${session?.sessionId || "s"}-${currentQ.questionId}-${Date.now()}`;

    try {
      inFlightIndicesRef.current.add(idxToGrade);
      setIsCheckingIndex(idxToGrade);
      const graded = await api.checkAdaptiveQuizAnswer({
        sessionId: session?.sessionId,
        questionId: currentQ.questionId,
        studentAnswer: normalizedAnswer,
        submissionId,
      });

      setCheckResults((prev) => ({
        ...prev,
        [idxToGrade]: graded,
      }));
      onProgressUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Không thể chấm đáp án trên máy chủ.");
    } finally {
      inFlightIndicesRef.current.delete(idxToGrade);
      setIsCheckingIndex((prev) => (prev === idxToGrade ? null : prev));
    }
  };

  const totalChecked = Object.keys(checkResults).length;
  const correctCount = Object.values(checkResults).filter((r) => r.isCorrect).length;
  const isCompleted = totalQuestions > 0 && totalChecked === totalQuestions;

  const hasCurrentValue = !isEmptyAnswerValue(answers[currentIndex]);
  const isCurrentChecking = isCheckingIndex === currentIndex;

  const isSplitSlash = currentRenderableQ
    ? isSplitBlankSlashOptionQuestion(currentRenderableQ)
    : false;
  const hasOptions = Boolean(
    currentRenderableQ &&
      (currentRenderableQ.options?.length || 0) > 0 &&
      !isSplitSlash
  );
  const hasParts = Boolean(
    currentRenderableQ && (currentRenderableQ.parts?.length || 0) > 0
  );
  const hasBlanks = Boolean(
    currentRenderableQ && (currentRenderableQ.blanks?.length || 0) > 0
  );
  const allowMultiple = currentQ
    ? isMultiSelectExercise(currentQ.instruction, currentQ.questionId)
    : false;

  const expectedLabel = currentResult
    ? (currentResult.expectedAnswers?.length
        ? currentResult.expectedAnswers
        : currentResult.correctAnswers || []
      ).join(" / ")
    : "";

  const effectiveRuleRef =
    currentResult?.ruleReference || currentQ?.ruleReference || null;

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-50 m-0 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-amber-600 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase bg-white/25 px-2 py-0.5 rounded-full">
                    Adaptive Learning Engine
                  </span>
                  <span className="text-xs text-white/90 font-medium">
                    Trọng điểm ôn tập
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 line-clamp-1">
                  Quiz Thông Minh — Luyện Theo Điểm Yếu
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              title="Đóng cửa sổ quiz (Esc)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer border border-white/30 shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>

          {/* 3-Tier Difficulty Selector Bar */}
          <div className="bg-amber-50/50 border-b border-amber-200/70 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Cấp độ đề:</span>
            </div>
            <div className="inline-flex rounded-xl p-1 bg-amber-100/80 border border-amber-200 shadow-2xs">
              <button
                type="button"
                onClick={() => handleDifficultyChange("easy")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "easy"
                    ? "bg-white text-emerald-700 shadow-xs ring-1 ring-amber-200"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                Dễ (Cơ bản)
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("medium")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "medium"
                    ? "bg-white text-amber-800 shadow-xs ring-1 ring-amber-200"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                Trung bình (TOEIC Chuẩn)
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("hard")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "hard"
                    ? "bg-white text-rose-700 shadow-xs ring-1 ring-amber-200"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                Khó (Bẫy TOEIC 700+)
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto grow space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Đang chuẩn bị đề Quiz ({difficulty === "easy" ? "Cơ bản" : difficulty === "hard" ? "Bẫy 700+" : "TOEIC Chuẩn"})...
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Hệ thống đang tổng hợp các câu hỏi khắc phục nhược điểm từ các Unit bạn hay làm sai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Hủy / Đóng
                </button>
              </div>
            ) : error ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold text-rose-800">{error}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => loadAdaptiveQuiz(difficulty)}
                    className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Thử lại
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : currentQ && currentRenderableQ ? (
              <>
                {/* Target Units Banner */}
                {session?.targetUnits && session.targetUnits.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold flex-wrap">
                      <span className="font-bold text-amber-800">🎯 Mục tiêu ôn tập:</span>
                      {session.targetUnits.map((u) => (
                        <span
                          key={u.unitNumber}
                          className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-slate-700 font-medium"
                        >
                          Unit {u.unitNumber}{" "}
                          {u.errorCount > 0 && (
                            <span className="text-rose-600 font-bold">
                              ({u.errorCount} lỗi)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Stepper Navigation Bar */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {questions.map((_, idx) => {
                      const qRes = checkResults[idx];
                      const isCurrent = idx === currentIndex;
                      const hasAns = !isEmptyAnswerValue(answers[idx]);

                      let bgClass = "bg-slate-100 text-slate-600 border-slate-200";
                      if (qRes) {
                        bgClass = qRes.isCorrect
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                          : "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                      } else if (hasAns) {
                        bgClass = "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${bgClass} ${
                            isCurrent ? "ring-2 ring-amber-500 ring-offset-1 font-black" : ""
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs font-semibold text-slate-500 shrink-0">
                    Câu <strong className="text-slate-800">{currentIndex + 1}</strong> /{" "}
                    {totalQuestions}
                  </div>
                </div>

                {/* Question Meta & Instruction Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md">
                      <BookOpen className="w-3.5 h-3.5" />
                      Unit {currentQ.unitNumber}: {currentQ.unitTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentQ.difficulty && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            currentQ.difficulty === "easy"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : currentQ.difficulty === "hard"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {currentQ.difficulty === "easy"
                            ? "Dễ"
                            : currentQ.difficulty === "hard"
                            ? "Khó (700+)"
                            : "Trung bình"}
                        </span>
                      )}
                      <span className="font-mono text-slate-400 text-[11px]">
                        Ex {currentQ.exerciseNumber} ({currentQ.questionType})
                      </span>
                    </div>
                  </div>

                  {currentQ.instruction && (
                    <p className="text-xs text-slate-500 italic">
                      {currentQ.instruction}
                    </p>
                  )}

                  {currentQ.wordBankItems && currentQ.wordBankItems.length > 0 && (
                    <WordBankBar
                      items={currentQ.wordBankItems}
                      onSelectWord={handleWordBankSelect}
                    />
                  )}

                  {/* Polymorphic Input Body */}
                  {hasOptions ? (
                    <OptionQuestionRenderer
                      question={currentRenderableQ}
                      value={answers[currentIndex] as string | string[] | undefined}
                      onChange={(val) => handleAnswerChange(val)}
                      allowMultiple={allowMultiple}
                      disabled={Boolean(currentResult) || isCurrentChecking}
                    />
                  ) : hasParts ? (
                    <MultiPartQuestionRenderer
                      question={currentRenderableQ}
                      value={answers[currentIndex] as Record<string, string> | undefined}
                      onChange={(val) => handleAnswerChange(val)}
                      disabled={Boolean(currentResult) || isCurrentChecking}
                      onFocusField={(partId) => {
                        focusedTargetRef.current[currentIndex] = { partId };
                      }}
                    />
                  ) : hasBlanks ? (
                    <FillBlankQuestionRenderer
                      question={currentRenderableQ}
                      value={answers[currentIndex] as string | string[] | undefined}
                      onChange={(val) => handleAnswerChange(val)}
                      disabled={Boolean(currentResult) || isCurrentChecking}
                      onFocusField={(blankIndex) => {
                        focusedTargetRef.current[currentIndex] = { blankIndex };
                      }}
                    />
                  ) : (
                    <SentenceQuestionRenderer
                      question={currentRenderableQ}
                      value={(answers[currentIndex] as string | undefined) ?? ""}
                      onChange={(val) => handleAnswerChange(val)}
                      disabled={Boolean(currentResult) || isCurrentChecking}
                    />
                  )}
                </div>

                {/* Server-Graded Checked Feedback Panel */}
                {currentResult && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 animate-fade-in ${
                      currentResult.isCorrect
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-xs">
                      {currentResult.isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Chính xác! Đáp án chuẩn: {expectedLabel}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-700">
                          <XCircle className="w-4 h-4" />
                          Chưa chính xác! Đáp án đúng:{" "}
                          <strong className="underline">{expectedLabel}</strong>
                        </span>
                      )}

                      {/* Rule Reference Clickable Badge */}
                      {effectiveRuleRef && (
                        <button
                          type="button"
                          onClick={() => setInspectingRule(effectiveRuleRef)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors cursor-pointer"
                          title="Nhấn để xem lại lý thuyết mục này"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Quy tắc {effectiveRuleRef}</span>
                        </button>
                      )}
                    </div>
                    {currentResult.explanation && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {currentResult.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Completion Banner */}
                {isCompleted && (
                  <div className="bg-amber-50 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Hoàn thành bài Quiz Thích Ứng ({difficulty === "easy" ? "Cơ bản" : difficulty === "hard" ? "Bẫy 700+" : "TOEIC Chuẩn"})!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Kết quả khắc phục lỗi:{" "}
                        <strong className="text-amber-700 font-bold">
                          {correctCount} / {totalQuestions}
                        </strong>{" "}
                        câu chính xác (
                        {Math.round((correctCount / totalQuestions) * 100)}%).
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => loadAdaptiveQuiz(difficulty)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tạo bộ câu hỏi mới</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Đóng</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          {currentQ && !isLoading && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!currentResult ? (
                  <button
                    type="button"
                    onClick={handleCheckCurrent}
                    disabled={!hasCurrentValue || isCurrentChecking}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {isCurrentChecking && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Kiểm tra đáp án</span>
                  </button>
                ) : currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Câu kế tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                }
                disabled={currentIndex === totalQuestions - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Câu sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Theory Rule Inspector Modal */}
      <RuleReferenceModal
        sectionId={inspectingRule}
        onClose={() => setInspectingRule(null)}
      />
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default AdaptiveQuizModal;
