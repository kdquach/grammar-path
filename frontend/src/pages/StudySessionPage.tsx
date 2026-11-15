import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Award,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import api from "../api/client";
import { useToast } from "../context/ToastContext";
import type { StudySessionBundle, ExerciseCheckResult } from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";

export const StudySessionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const unitParam = parseInt(searchParams.get("unit") || "1", 10);
  const exerciseParam = searchParams.get("exercise") || undefined;

  const [bundle, setBundle] = useState<StudySessionBundle | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "practice" | "summary">("theory");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Student answers state: questionId -> answer string
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<ExerciseCheckResult | null>(null);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .initStudySession(unitParam, exerciseParam)
      .then((data) => {
        if (isMounted) {
          setBundle(data);
          setStudentAnswers({});
          setGradingResult(null);
          setActiveTab("theory");
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to initialize study session");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [unitParam, exerciseParam]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitExercise = async () => {
    if (!bundle) return;
    try {
      setIsSubmitting(true);
      const answers: Record<string, string> = {};
      bundle.currentExercise.questions.forEach((q) => {
        answers[q.questionId] = studentAnswers[q.id] || studentAnswers[q.questionId] || "";
      });

      const res = await api.checkExerciseAnswers(bundle.currentExercise.exerciseNumber, answers);
      setGradingResult(res);
      setIsSubmitting(false);
      setActiveTab("summary");
      toast.success("Đã chấm điểm thành công!");
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err.message || "Lỗi khi chấm điểm bài tập");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Đang tải buổi học Unit {unitParam}...</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Không thể tải buổi học</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          to="/learning-path"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Lộ Trình</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl mx-auto">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/learning-path"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Quay lại Lộ trình"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 uppercase tracking-wider">
                Unit {bundle.unit.unitNumber}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Bài tập {bundle.currentExercise.exerciseNumber}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate max-w-md sm:max-w-lg">
              {bundle.unit.title}
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab("theory")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "theory"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Lý thuyết
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "practice"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Luyện tập
          </button>
          {gradingResult && (
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === "summary"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Kết quả
            </button>
          )}
        </div>
      </div>

      {/* 2. TAB A: THEORY READING */}
      {activeTab === "theory" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-brand-600 font-extrabold text-sm">
                <BookOpen className="w-5 h-5" />
                <span>Nội dung Lý Thuyết Chuẩn Giáo Trình</span>
              </div>
              {bundle.unit.theoryPage && (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Trang sách: {bundle.unit.theoryPage}
                </span>
              )}
            </div>

            {/* Theory Sections */}
            <div className="space-y-6">
              {bundle.theorySections.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {sec.sectionId}
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {sec.heading}
                    </h3>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-8 whitespace-pre-line bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    {sec.sourceContent}
                  </div>
                </div>
              ))}
            </div>

            {/* Illustrative Examples with Vietnamese Translation */}
            {bundle.textbookExamples.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ví dụ minh họa ngữ pháp (Textbook Examples)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bundle.textbookExamples.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3.5 rounded-2xl border border-slate-200/70 bg-white shadow-2xs space-y-1"
                    >
                      <p className="text-xs font-bold text-slate-900">
                        {ex.originalText}
                      </p>
                      {ex.translationVi && (
                        <p className="text-[11px] text-slate-500 italic">
                          {ex.translationVi}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("practice")}
                className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Chuyển sang Luyện tập ({bundle.currentExercise.exerciseNumber})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB B: PRACTICE EXERCISE */}
      {activeTab === "practice" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                  Bài tập {bundle.currentExercise.exerciseNumber}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {bundle.currentExercise.questions.length} câu hỏi
                </span>
              </div>
              {bundle.currentExercise.instructionText && (
                <p className="text-sm font-bold text-slate-800">
                  {bundle.currentExercise.instructionText}
                </p>
              )}
            </div>

            {/* Word Bank if available */}
            {bundle.currentExercise.wordBank && bundle.currentExercise.wordBank.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Word Bank:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {bundle.currentExercise.wordBank.map((word, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-semibold text-amber-900"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-5">
              {bundle.currentExercise.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700">
                      Câu {idx + 1}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {q.promptText}
                  </p>

                  {/* Options or Input */}
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt.key)}
                          className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                            studentAnswers[q.id] === opt.key
                              ? "border-brand-600 bg-brand-50 text-brand-700 font-bold"
                              : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="font-bold mr-1.5">{opt.key}.</span>
                          <span>{opt.text}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nhập câu trả lời vào đây..."
                      value={studentAnswers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("theory")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Xem lại lý thuyết
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitExercise}
                className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Nộp bài & Chấm điểm</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB C: RESULTS & DETAILED EXPLANATION */}
      {activeTab === "summary" && gradingResult && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-3xl bg-brand-100 text-brand-700 flex items-center justify-center mx-auto shadow-2xs">
                <Award className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Tổng Kết Buổi Học
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Điểm số đã được ghi nhận vào hệ thống phân tích năng lực và chu kỳ ôn tập.
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-black text-slate-900">
                  {gradingResult.correctCount}/{gradingResult.totalQuestions}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Số câu đúng
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-black text-brand-600">
                  {gradingResult.scorePercentage}%
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Độ chính xác
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-black text-emerald-600">
                  +{gradingResult.correctCount}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bằng chứng ghi nhận
                </div>
              </div>
            </div>

            {/* Question Breakdown with Explanations */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chi tiết lời giải & giải thích ngữ pháp
              </h3>

              <div className="space-y-3">
                {gradingResult.results.map((d, i) => {
                  const isCorrect = d.isCorrect;

                  return (
                    <div
                      key={d.questionId}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                        isCorrect
                          ? "bg-emerald-50/40 border-emerald-200/80"
                          : "bg-rose-50/40 border-rose-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800">
                          Câu {i + 1}
                        </span>
                        <span
                          className={`font-bold inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                            isCorrect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {isCorrect ? "Đúng" : "Sai"}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-500 font-medium">Bạn đã trả lời: </span>
                          <span className="font-bold text-slate-900">
                            {String(d.studentAnswer || "(Để trống)")}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="text-emerald-700 font-medium">Đáp án đúng: </span>
                            <span className="font-extrabold text-emerald-800">
                              {d.correctAnswers.join(" / ")}
                            </span>
                          </div>
                        )}
                      </div>

                      {d.explanation && (
                        <div className="p-3 rounded-xl bg-white/80 border border-slate-100 text-xs text-slate-700 space-y-1">
                          <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                            Giải thích chi tiết:
                          </span>
                          <p className="leading-relaxed">{d.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Steps */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => {
                  setStudentAnswers({});
                  setGradingResult(null);
                  setActiveTab("practice");
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm lại bài này</span>
              </button>

              <Link
                to="/learning-path"
                className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs"
              >
                <span>Tiếp tục lộ trình</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default StudySessionPage;
