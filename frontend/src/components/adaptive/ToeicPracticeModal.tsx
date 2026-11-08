import React, { useEffect, useState } from "react";
import {
  X,
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Trophy,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../api/client";
import type {
  ToeicPracticeSession,
  ToeicQuestion,
  DifficultyLevel,
} from "../../types/api.types";
import RuleReferenceModal from "../theory/RuleReferenceModal";

interface ToeicPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitNumber: number;
  unitTitle: string;
}

export const ToeicPracticeModal: React.FC<ToeicPracticeModalProps> = ({
  isOpen,
  onClose,
  unitNumber,
  unitTitle,
}) => {
  const [session, setSession] = useState<ToeicPracticeSession | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);

  const loadToeicQuestions = async (targetDifficulty: DifficultyLevel = difficulty) => {
    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});
    setCheckedQuestions({});
    setCurrentIndex(0);

    try {
      const data = await api.generateToeicPractice(unitNumber, 5, targetDifficulty);
      setSession(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải bộ câu hỏi luyện thi TOEIC.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDifficultyChange = (newDifficulty: DifficultyLevel) => {
    if (newDifficulty === difficulty && session) return;
    setDifficulty(newDifficulty);
    loadToeicQuestions(newDifficulty);
  };

  useEffect(() => {
    if (isOpen) {
      loadToeicQuestions(difficulty);
    }
  }, [isOpen, unitNumber]);

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

  const questions: ToeicQuestion[] = session?.questions || [];
  const currentQ: ToeicQuestion | undefined = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    if (checkedQuestions[currentIndex]) return; // locked after checking
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: key }));
  };

  const handleCheckCurrent = () => {
    if (!selectedAnswers[currentIndex]) return;
    setCheckedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
  };

  const totalChecked = Object.keys(checkedQuestions).length;
  const correctCount = questions.reduce((count, q, idx) => {
    return checkedQuestions[idx] && selectedAnswers[idx] === q.correctAnswer
      ? count + 1
      : count;
  }, 0);

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
          {/* Modal Header */}
          <div className="bg-indigo-600 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase bg-white/25 px-2 py-0.5 rounded-full">
                    TOEIC Part 5 Format
                  </span>
                  <span className="text-xs text-white/90 font-medium">
                    Unit {unitNumber}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 line-clamp-1">
                  Luyện tập TOEIC: {unitTitle}
                </h2>
              </div>
            </div>

            {/* Prominent Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              title="Đóng cửa sổ luyện thi TOEIC (Esc)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer border border-white/30 shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>

          {/* 3-Tier Difficulty Selector Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cấp độ đề:</span>
            </div>
            <div className="inline-flex rounded-xl p-1 bg-slate-200/80 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => handleDifficultyChange("easy")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "easy"
                    ? "bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dễ (Cơ bản)
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("medium")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "medium"
                    ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Trung bình (TOEIC Chuẩn)
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("hard")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === "hard"
                    ? "bg-white text-rose-700 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Khó (Bẫy TOEIC 700+)
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto grow space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Gia sư AI đang tạo đề thi TOEIC Part 5 ({difficulty === "easy" ? "Cơ bản" : difficulty === "hard" ? "Bẫy 700+" : "TOEIC Chuẩn"})...
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Thiết kế các câu hỏi tình huống công sở chuẩn hóa theo ngữ pháp Unit {unitNumber}.
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
                <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold text-rose-800">{error}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => loadToeicQuestions(difficulty)}
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
                {/* Question Stepper Navigation Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {questions.map((q, idx) => {
                      const isChecked = checkedQuestions[idx];
                      const isCorrect = isChecked && selectedAnswers[idx] === q.correctAnswer;
                      const isCurrent = idx === currentIndex;

                      let bgClass = "bg-slate-100 text-slate-600 border-slate-200";
                      if (isChecked) {
                        bgClass = isCorrect
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                          : "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                      } else if (selectedAnswers[idx]) {
                        bgClass = "bg-brand-50 text-brand-700 border-brand-200 font-semibold";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${bgClass} ${
                            isCurrent ? "ring-2 ring-brand-500 ring-offset-1 font-black" : ""
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

                {/* Incomplete Sentence Prompt */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>TOEIC Part 5 • Incomplete Sentence</span>
                    </div>
                    {currentQ.difficulty && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          currentQ.difficulty === "easy"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : currentQ.difficulty === "hard"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        }`}
                      >
                        {currentQ.difficulty === "easy"
                          ? "Dễ - Cơ bản"
                          : currentQ.difficulty === "hard"
                          ? "Khó - Bẫy 700+"
                          : "TOEIC Chuẩn"}
                      </span>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                    {currentQ.prompt.split("_______").map((part, index, array) => (
                      <React.Fragment key={index}>
                        {part}
                        {index < array.length - 1 && (
                          <span className="inline-block px-3 py-0.5 mx-1 font-mono font-bold bg-indigo-100 text-indigo-800 rounded border border-indigo-200 underline decoration-indigo-400">
                            {selectedAnswers[currentIndex]
                              ? currentQ.options.find(
                                  (o) => o.key === selectedAnswers[currentIndex]
                                )?.text
                              : "_______"}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </p>
                </div>

                {/* Multiple Choice Options Grid */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Chọn đáp án chính xác:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentQ.options.map((option) => {
                      const isSelected = selectedAnswers[currentIndex] === option.key;
                      const isChecked = checkedQuestions[currentIndex];
                      const isCorrectAnswer = option.key === currentQ.correctAnswer;

                      let optionStyle =
                        "border-slate-200 hover:border-brand-400 hover:bg-slate-50 text-slate-800";

                      if (isChecked) {
                        if (isCorrectAnswer) {
                          optionStyle =
                            "border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold ring-1 ring-emerald-500";
                        } else if (isSelected) {
                          optionStyle =
                            "border-rose-400 bg-rose-50/70 text-rose-900 line-through ring-1 ring-rose-400";
                        } else {
                          optionStyle = "opacity-40 border-slate-200 bg-slate-50 text-slate-500";
                        }
                      } else if (isSelected) {
                        optionStyle =
                          "border-brand-600 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500";
                      }

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => handleSelectOption(option.key)}
                          disabled={isChecked}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all cursor-pointer ${optionStyle}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border transition-colors ${
                              isChecked && isCorrectAnswer
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : isChecked && isSelected
                                ? "bg-rose-600 text-white border-rose-600"
                                : isSelected
                                ? "bg-brand-600 text-white border-brand-600"
                                : "bg-white text-slate-700 border-slate-300"
                            }`}
                          >
                            {option.key}
                          </span>
                          <span className="grow font-medium">{option.text}</span>
                          {isChecked && isCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isChecked && isSelected && !isCorrectAnswer && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Checked Question Feedback & Explanation */}
                {checkedQuestions[currentIndex] && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 animate-fade-in ${
                      selectedAnswers[currentIndex] === currentQ.correctAnswer
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-xs">
                      {selectedAnswers[currentIndex] === currentQ.correctAnswer ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Chính xác! Đáp án đúng là ({currentQ.correctAnswer})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-800">
                          <HelpCircle className="w-4 h-4" />
                          Chưa chính xác! Đáp án đúng là ({currentQ.correctAnswer})
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
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      {currentQ.explanation}
                    </p>
                  </div>
                )}

                {/* Completion Banner */}
                {isCompleted && (
                  <div className="bg-emerald-50 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Hoàn thành bộ đề TOEIC Unit {unitNumber} ({difficulty === "easy" ? "Cơ bản" : difficulty === "hard" ? "Bẫy 700+" : "TOEIC Chuẩn"})!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Bạn đã đạt{" "}
                        <strong className="text-emerald-700 font-bold">
                          {correctCount} / {totalQuestions}
                        </strong>{" "}
                        câu chính xác (
                        {Math.round((correctCount / totalQuestions) * 100)}%).
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => loadToeicQuestions(difficulty)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
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

          {/* Modal Footer Controls */}
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
                    disabled={!selectedAnswers[currentIndex]}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Kiểm tra đáp án
                  </button>
                ) : currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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

export default ToeicPracticeModal;
