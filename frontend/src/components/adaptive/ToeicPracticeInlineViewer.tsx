import React, { useEffect, useRef, useState } from "react";
import {
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Trophy,
  BookOpen,
  ArrowRight,
  Check,
  X as CloseIcon,
  LogIn,
} from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type {
  ToeicPracticeSession,
  ToeicQuestion,
  ToeicPracticeCheckResult,
  DifficultyLevel,
} from "../../types/api.types";
import RuleReferenceModal from "../theory/RuleReferenceModal";

interface ToeicPracticeInlineViewerProps {
  unitNumber: number;
  unitTitle?: string;
  onUnitCompleted?: (accuracy: number) => void;
  onGoToNextUnit?: () => void;
  onGoToTheory?: () => void;
  onRequireAuth?: () => void;
}

export const ToeicPracticeInlineViewer: React.FC<ToeicPracticeInlineViewerProps> = ({
  unitNumber,
  unitTitle,
  onUnitCompleted,
  onGoToNextUnit,
  onGoToTheory,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [session, setSession] = useState<ToeicPracticeSession | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [questionCount] = useState<number>(10);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [checkResults, setCheckResults] = useState<
    Record<number, ToeicPracticeCheckResult>
  >({});
  const [isCheckingIndex, setIsCheckingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);
  const [hasTriggeredCompletion, setHasTriggeredCompletion] = useState<boolean>(false);

  const inFlightIndicesRef = useRef<Set<number>>(new Set());

  const loadToeicQuestions = async (
    targetDifficulty: DifficultyLevel = difficulty,
    targetCount: number = questionCount
  ) => {
    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});
    setCheckResults({});
    setCurrentIndex(0);
    setIsCheckingIndex(null);
    setHasTriggeredCompletion(false);
    inFlightIndicesRef.current.clear();

    try {
      const data = await api.generateToeicPractice(
        unitNumber,
        targetCount,
        targetDifficulty
      );
      setSession(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải bộ câu hỏi luyện thi TOEIC.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadToeicQuestions(difficulty, questionCount);
  }, [unitNumber]);

  const questions: ToeicQuestion[] = session?.questions || [];
  const currentQ: ToeicQuestion | undefined = questions[currentIndex];
  const currentResult = checkResults[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(checkResults).length;
  const isFinished = totalQuestions > 0 && answeredCount === totalQuestions;

  const correctCount = Object.values(checkResults).filter((r) => r.isCorrect).length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isPassed = isFinished && scorePercent >= 80;

  // Auto trigger unit completion when user passes the test
  useEffect(() => {
    if (isFinished && isPassed && !hasTriggeredCompletion && user) {
      setHasTriggeredCompletion(true);
      onUnitCompleted?.(scorePercent);
    }
  }, [isFinished, isPassed, hasTriggeredCompletion, user]);

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    if (checkResults[currentIndex] || isCheckingIndex === currentIndex) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: key }));
  };

  const handleCheckCurrent = async () => {
    if (!session || !currentQ || checkResults[currentIndex]) return;
    if (inFlightIndicesRef.current.has(currentIndex)) return;

    const studentAnswer = selectedAnswers[currentIndex];
    if (!studentAnswer) {
      toast.warning("Vui lòng chọn một phương án A, B, C hoặc D trước khi nộp.");
      return;
    }

    const idxToGrade = currentIndex;
    const submissionId = `toeic-${session.sessionId}-${currentQ.itemId}-${Date.now()}`;

    try {
      inFlightIndicesRef.current.add(idxToGrade);
      setIsCheckingIndex(idxToGrade);
      const graded = await api.checkToeicPracticeAnswer({
        sessionId: session.sessionId,
        itemId: currentQ.itemId,
        studentAnswer,
        submissionId,
      });

      setCheckResults((prev) => ({
        ...prev,
        [idxToGrade]: graded,
      }));
    } catch (err: any) {
      toast.error(err.message || "Không thể kiểm tra đáp án.");
    } finally {
      inFlightIndicesRef.current.delete(idxToGrade);
      setIsCheckingIndex(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">
          Đang tạo bộ câu hỏi trắc nghiệm TOEIC Part 5 cho Unit {unitNumber}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3 text-rose-800">
        <p className="font-semibold text-sm">{error}</p>
        <button
          type="button"
          onClick={() => loadToeicQuestions(difficulty, questionCount)}
          className="px-4 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <LogIn className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Bạn đang làm bài với tư cách khách. <strong>Đăng nhập</strong> để hệ thống tự động lưu kết quả tốt nghiệp Unit và lên lịch Ôn tập ngắt quãng (SRS).
            </span>
          </div>
          {onRequireAuth && (
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Đăng nhập ngay
            </button>
          )}
        </div>
      )}

      {/* Session Controls Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>TOEIC Part 5 Checkpoint</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Đạt $\ge 80\%$ (ít nhất 8/10 câu) để tốt nghiệp Unit
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Bài kiểm tra trắc nghiệm tốt nghiệp — Unit {unitNumber}{unitTitle ? `: ${unitTitle}` : ""}
          </h2>
        </div>

        {/* Filters: Difficulty & Question count */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <select
            value={difficulty}
            disabled={isFinished || Boolean(currentResult)}
            onChange={(e) => {
              const diff = e.target.value as DifficultyLevel;
              setDifficulty(diff);
              loadToeicQuestions(diff, questionCount);
            }}
            className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
          >
            <option value="easy">Độ khó: Dễ</option>
            <option value="medium">Độ khó: Tiêu chuẩn</option>
            <option value="hard">Độ khó: Nâng cao</option>
          </select>

          <button
            type="button"
            onClick={() => loadToeicQuestions(difficulty, questionCount)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Đổi bộ câu hỏi khác"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đề khác</span>
          </button>
        </div>
      </div>

      {/* Main Practice Area or Finished Celebration */}
      {isFinished ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          <div
            className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md ${
              isPassed
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {isPassed ? <Trophy className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isPassed
                ? `🎉 Xuất sắc! Bạn đã tốt nghiệp Unit ${unitNumber}!`
                : `Bạn đã đạt ${scorePercent}% — Cần thêm một chút cố gắng!`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isPassed
                ? `Bạn đã trả lời đúng ${correctCount}/${totalQuestions} câu (${scorePercent}%). Unit ${unitNumber} đã được chính thức đánh dấu HOÀN THÀNH và nạp vào lịch Ôn tập ngắt quãng (Review Center).`
                : `Bạn trả lời đúng ${correctCount}/${totalQuestions} câu. Để hoàn thành Unit, hãy đạt từ 80% trở lên (ít nhất 8/10 câu đúng). Bạn có thể xem lại lý thuyết hoặc tạo bộ đề mới để thử lại ngay!`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loadToeicQuestions(difficulty, questionCount)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại bộ đề mới</span>
            </button>

            {isPassed && onGoToNextUnit && (
              <button
                type="button"
                onClick={onGoToNextUnit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Học tiếp Unit {unitNumber + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!isPassed && onGoToTheory && (
              <button
                type="button"
                onClick={onGoToTheory}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Xem lại lý thuyết</span>
              </button>
            )}
          </div>
        </div>
      ) : currentQ ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Progress Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs">
                Câu {currentIndex + 1} / {totalQuestions}
              </span>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                Part 5 Format
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {questions.map((_, idx) => {
                const res = checkResults[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                      currentIndex === idx
                        ? "ring-2 ring-indigo-500 font-black"
                        : ""
                    } ${
                      res
                        ? res.isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                        : selectedAnswers[idx]
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Prompt */}
          <div className="space-y-3">
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.prompt}
            </p>
          </div>

          {/* Options Grid (4 options A, B, C, D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options.map((opt) => {
              const isSelected = selectedAnswers[currentIndex] === opt.key;
              const isChecked = Boolean(currentResult);
              const isCorrectOption = currentResult?.correctAnswer === opt.key;
              const isUserWrongChoice = isChecked && isSelected && !currentResult?.isCorrect;

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={isChecked || isCheckingIndex === currentIndex}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isChecked
                      ? isCorrectOption
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/40 text-emerald-950 font-bold"
                        : isUserWrongChoice
                        ? "bg-rose-50 border-rose-400 text-rose-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                      : isSelected
                      ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-400/40 text-indigo-950 font-semibold shadow-xs"
                      : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800 shadow-2xs"
                  }`}
                >
                  <span
                    className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold border transition-colors ${
                      isChecked
                        ? isCorrectOption
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : isUserWrongChoice
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "bg-slate-100 border-slate-200 text-slate-400"
                        : isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-100 border-slate-300 text-slate-700"
                    }`}
                  >
                    {isChecked ? (
                      isCorrectOption ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isUserWrongChoice ? (
                        <CloseIcon className="w-4 h-4 stroke-[3]" />
                      ) : (
                        opt.key
                      )
                    ) : isSelected ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      opt.key
                    )}
                  </span>
                  <span className="text-xs sm:text-sm font-medium leading-snug">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback Card after checking */}
          {currentResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-fade-in ${
                currentResult.isCorrect
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/90 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold">
                  {currentResult.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Chính xác!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Chưa chính xác!</span>
                    </>
                  )}
                </span>

                {currentResult.ruleReference && (
                  <button
                    type="button"
                    onClick={() => setInspectingRule(currentResult.ruleReference)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Xem lý thuyết mục {currentResult.ruleReference}</span>
                  </button>
                )}
              </div>

              {!currentResult.isCorrect && (
                <p className="text-xs text-rose-800 font-bold">
                  Đáp án đúng: <span className="font-mono text-sm">[{currentResult.correctAnswer}]</span>
                </p>
              )}

              {currentResult.explanation && (
                <div className="mt-1 p-2.5 rounded-xl bg-white/80 border border-slate-200/70 text-slate-700 text-xs leading-relaxed">
                  <span className="font-bold text-indigo-700">💡 Giải thích & Bẫy thi: </span>
                  {currentResult.explanation}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <div className="flex items-center gap-2">
              {!currentResult ? (
                <button
                  type="button"
                  disabled={!selectedAnswers[currentIndex] || isCheckingIndex === currentIndex}
                  onClick={handleCheckCurrent}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {isCheckingIndex === currentIndex && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Kiểm tra đáp án</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>{currentIndex < totalQuestions - 1 ? "Câu tiếp theo" : "Xem tổng kết điểm"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={currentIndex === totalQuestions - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Rule Reference Modal */}
      <RuleReferenceModal
        sectionId={inspectingRule}
        onClose={() => setInspectingRule(null)}
      />
    </div>
  );
};

export default ToeicPracticeInlineViewer;
