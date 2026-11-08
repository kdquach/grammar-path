import React, { useEffect, useState } from "react";
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
import type {
  AdaptiveQuizSession,
  AdaptiveQuizQuestion,
  DifficultyLevel,
} from "../../types/api.types";
import RuleReferenceModal from "../theory/RuleReferenceModal";

interface AdaptiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdaptiveQuizModal: React.FC<AdaptiveQuizModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [session, setSession] = useState<AdaptiveQuizSession | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [isCorrectMap, setIsCorrectMap] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);

  const loadAdaptiveQuiz = async (targetDifficulty: DifficultyLevel = difficulty) => {
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setCheckedQuestions({});
    setIsCorrectMap({});
    setCurrentIndex(0);

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
  const totalQuestions = questions.length;

  const handleAnswerChange = (val: string) => {
    if (checkedQuestions[currentIndex]) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: val }));
  };

  const normalize = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[\s.?!,;:'"’]/g, "");

  const handleCheckCurrent = () => {
    const studentAns = answers[currentIndex] || "";
    if (!studentAns.trim()) return;

    let correct = false;
    if (currentQ?.options && currentQ.options.length > 0) {
      // Multiple choice option key check or text check
      const opt = currentQ.options.find(
        (o) =>
          o.key.toLowerCase() === studentAns.toLowerCase() ||
          normalize(o.text) === normalize(studentAns)
      );
      if (opt && currentQ.correctAnswer) {
        correct =
          opt.key.toLowerCase() === currentQ.correctAnswer.toLowerCase() ||
          normalize(opt.text) === normalize(currentQ.correctAnswer);
      }
    } else if (currentQ?.correctAnswer) {
      // Text or blank check
      correct = normalize(studentAns) === normalize(currentQ.correctAnswer);
    }

    setCheckedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
    setIsCorrectMap((prev) => ({ ...prev, [currentIndex]: correct }));
  };

  const totalChecked = Object.keys(checkedQuestions).length;
  const correctCount = Object.values(isCorrectMap).filter(Boolean).length;
  const isCompleted = totalQuestions > 0 && totalChecked === totalQuestions;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
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
                    Hệ thống AI đang tổng hợp các câu hỏi khắc phục nhược điểm từ các Unit bạn hay làm sai.
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
            ) : currentQ ? (
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
                      const isChecked = checkedQuestions[idx];
                      const isCorrect = isCorrectMap[idx];
                      const isCurrent = idx === currentIndex;

                      let bgClass = "bg-slate-100 text-slate-600 border-slate-200";
                      if (isChecked) {
                        bgClass = isCorrect
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                          : "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                      } else if (answers[idx]) {
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

                {/* Question Content */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
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

                  <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                    {currentQ.prompt}
                  </p>

                  {currentQ.contextClue && (
                    <p className="text-xs font-medium text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200">
                      💡 Gợi ý: {currentQ.contextClue}
                    </p>
                  )}
                </div>

                {/* Options (if multiple choice) or text input */}
                {currentQ.options && currentQ.options.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Chọn đáp án:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentQ.options.map((option) => {
                        const isSelected = answers[currentIndex] === option.key;
                        const isChecked = checkedQuestions[currentIndex];
                        const isCorrectAnswer =
                          option.key.toLowerCase() ===
                            (currentQ.correctAnswer || "").toLowerCase() ||
                          normalize(option.text) ===
                            normalize(currentQ.correctAnswer || "");

                        let style =
                          "border-slate-200 hover:border-amber-400 hover:bg-slate-50 text-slate-800";

                        if (isChecked) {
                          if (isCorrectAnswer) {
                            style =
                              "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500";
                          } else if (isSelected) {
                            style =
                              "border-rose-400 bg-rose-50 text-rose-900 line-through ring-1 ring-rose-400";
                          } else {
                            style = "opacity-40 border-slate-200 bg-slate-50 text-slate-500";
                          }
                        } else if (isSelected) {
                          style =
                            "border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400";
                        }

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => handleAnswerChange(option.key)}
                            disabled={isChecked}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all cursor-pointer ${style}`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-white text-slate-700 border-slate-300"
                              }`}
                            >
                              {option.key}
                            </span>
                            <span className="grow font-medium">{option.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Nhập câu trả lời:
                    </label>
                    <input
                      type="text"
                      value={answers[currentIndex] || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      disabled={checkedQuestions[currentIndex]}
                      placeholder="Nhập đáp án để kiểm tra..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !checkedQuestions[currentIndex]) {
                          handleCheckCurrent();
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                    />
                  </div>
                )}

                {/* Checked Feedback Panel */}
                {checkedQuestions[currentIndex] && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 animate-fade-in ${
                      isCorrectMap[currentIndex]
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-xs">
                      {isCorrectMap[currentIndex] ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Chính xác! Đáp án chuẩn: {currentQ.correctAnswer}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-700">
                          <XCircle className="w-4 h-4" />
                          Chưa chính xác! Đáp án đúng:{" "}
                          <strong className="underline">{currentQ.correctAnswer}</strong>
                        </span>
                      )}

                      {/* Rule Reference Clickable Badge */}
                      {currentQ.ruleReference && (
                        <button
                          type="button"
                          onClick={() => setInspectingRule(currentQ.ruleReference!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors cursor-pointer"
                          title="Nhấn để xem lại lý thuyết mục này"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Quy tắc {currentQ.ruleReference}</span>
                        </button>
                      )}
                    </div>
                    {currentQ.explanation && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {currentQ.explanation}
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
                {!checkedQuestions[currentIndex] ? (
                  <button
                    type="button"
                    onClick={handleCheckCurrent}
                    disabled={!answers[currentIndex]?.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Kiểm tra đáp án
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
};

export default AdaptiveQuizModal;
