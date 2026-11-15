import React, { useState } from "react";
import {
  X,
  Target,
  Sparkles,
  ArrowRight,
  Loader2,
  BookOpen,
  Award,
} from "lucide-react";
import api from "../../api/client";
import type {
  StartDiagnosticResponse,
  DiagnosticResultResponse,
  UpdatePreferencesInput,
} from "../../types/api.types";
import { useToast } from "../../context/ToastContext";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const toast = useToast();
  const [step, setStep] = useState<"preferences" | "choose_diagnostic" | "running_diagnostic" | "results">("preferences");

  // Form states
  const [confidence, setConfidence] = useState<"beginner" | "elementary" | "intermediate" | "advanced">("elementary");
  const [objective, setObjective] = useState<"foundation" | "toeic_prep" | "speaking_writing" | "review">("foundation");
  const [minutes, setMinutes] = useState<number>(20);
  const [targetToeic, setTargetToeic] = useState<number>(650);

  // Diagnostic states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [diagnosticData, setDiagnosticData] = useState<StartDiagnosticResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResultResponse | null>(null);

  if (!isOpen) return null;

  const handleSavePreferences = async (proceedToDiagnosticChoice: boolean) => {
    try {
      setIsSubmitting(true);
      const input: UpdatePreferencesInput = {
        grammarConfidence: confidence,
        learningObjective: objective,
        dailyStudyMinutes: minutes,
        targetToeicScore: objective === "toeic_prep" ? targetToeic : null,
      };
      await api.updatePreferences(input);
      setIsSubmitting(false);

      if (proceedToDiagnosticChoice) {
        setStep("choose_diagnostic");
      } else {
        toast.success("Đã lưu cài đặt lộ trình cá nhân!");
        if (onCompleted) onCompleted();
        onClose();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err.message || "Lỗi khi lưu tùy chọn học tập");
    }
  };

  const handleStartDiagnostic = async () => {
    try {
      setIsSubmitting(true);
      const diag = await api.startDiagnostic();
      setDiagnosticData(diag);
      setAnswers({});
      setIsSubmitting(false);
      setStep("running_diagnostic");
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err.message || "Lỗi tải bài đánh giá");
    }
  };

  const handleSubmitDiagnostic = async () => {
    if (!diagnosticData) return;
    try {
      setIsSubmitting(true);
      const res = await api.submitDiagnostic(diagnosticData.assessmentId, answers);
      setDiagnosticResult(res);
      setIsSubmitting(false);
      setStep("results");
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err.message || "Lỗi khi gửi kết quả đánh giá");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 sm:p-8 space-y-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: PREFERENCES */}
        {step === "preferences" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Thiết lập Kế hoạch Học tập
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Tùy chỉnh lộ trình phù hợp với thời gian và mục tiêu của bạn.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Mục tiêu học tập chính
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "foundation", label: "Xây gốc từ đầu (Cơ bản)" },
                    { id: "toeic_prep", label: "Luyện thi TOEIC (Part 5 & 6)" },
                    { id: "speaking_writing", label: "Giao tiếp & Viết chuẩn" },
                    { id: "review", label: "Ôn tập & Bổ khuyết ngữ pháp" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObjective(opt.id as any)}
                      className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                        objective === opt.id
                          ? "border-brand-600 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  2. Mức độ tự tin hiện tại
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: "beginner", label: "Mất gốc" },
                    { id: "elementary", label: "Sơ cấp" },
                    { id: "intermediate", label: "Trung cấp" },
                    { id: "advanced", label: "Khá / Giỏi" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfidence(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                        confidence === opt.id
                          ? "border-brand-600 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  3. Thời gian học mỗi ngày: <span className="text-brand-600 font-extrabold">{minutes} phút</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>10 phút (Nhẹ nhàng)</span>
                  <span>20-30 phút (Khuyến nghị)</span>
                  <span>60 phút (Chuyên sâu)</span>
                </div>
              </div>

              {objective === "toeic_prep" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Mục tiêu điểm TOEIC: <span className="text-amber-600 font-extrabold">{targetToeic}+</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[500, 650, 750, 850].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setTargetToeic(sc)}
                        className={`p-2 rounded-xl border text-center font-bold ${
                          targetToeic === sc
                            ? "border-amber-500 bg-amber-50 text-amber-800"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {sc}+
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSavePreferences(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                Bỏ qua đánh giá & Lưu
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSavePreferences(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE DIAGNOSTIC */}
        {step === "choose_diagnostic" && (
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Đánh giá Sơ bộ Ngữ pháp?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Làm bài kiểm tra ngắn (6 câu hỏi chuẩn Murphy) để hệ thống gợi ý bài học xuất phát tối ưu nhất cho bạn.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div
                onClick={handleStartDiagnostic}
                className="p-5 rounded-2xl border-2 border-brand-500 bg-brand-50/40 hover:bg-brand-50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                    Khuyến nghị
                  </span>
                  <Sparkles className="w-4 h-4 text-brand-600" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Làm bài đánh giá 5 phút
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  6 câu hỏi kiểm tra thì cơ bản, quá khứ, hiện tại hoàn thành và modal verbs.
                </p>
              </div>

              <div
                onClick={() => {
                  toast.success("Đã thiết lập lộ trình bắt đầu từ Unit 1!");
                  if (onCompleted) onCompleted();
                  onClose();
                }}
                className="p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all space-y-2"
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tuần tự
                </span>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Bắt đầu từ Unit 1
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bắt đầu học ngữ pháp bài bản từ thì Hiện tại tiếp diễn (Present Continuous).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RUNNING DIAGNOSTIC */}
        {step === "running_diagnostic" && diagnosticData && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bài Đánh giá Sơ bộ
                </h2>
                <p className="text-xs text-slate-500">
                  {diagnosticData.totalQuestions} câu hỏi • Chọn hoặc điền câu trả lời đúng
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">
                {Object.keys(answers).length} / {diagnosticData.totalQuestions} đã làm
              </span>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {diagnosticData.questions.map((q, idx) => {
                const qKey = q.questionId || q.id || String(idx);
                return (
                  <div
                    key={qKey}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-600">
                        Câu {idx + 1} • Unit {q.unitNumber}
                      </span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                        {q.concept?.name || q.unitTitle}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {q.promptText}
                    </p>

                    {/* Multiple Choice Options if available */}
                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setAnswers({ ...answers, [qKey]: opt.key })}
                            className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                              answers[qKey] === opt.key
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
                      /* Text input for blank */
                      <input
                        type="text"
                        placeholder="Nhập câu trả lời..."
                        value={answers[qKey] || ""}
                        onChange={(e) => setAnswers({ ...answers, [qKey]: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitDiagnostic}
                className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Nộp bài & Xem kết quả</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === "results" && diagnosticResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                <Award className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Kết Quả Đánh Giá
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {diagnosticResult.summaryVi}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-black text-slate-900">
                  {diagnosticResult.correctCount}/{diagnosticResult.totalQuestions}
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase">
                  Số câu đúng
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-black text-brand-600">
                  {diagnosticResult.scorePercentage}%
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase">
                  Điểm số
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-black text-emerald-600 capitalize">
                  {diagnosticResult.estimatedLevel}
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase">
                  Trình độ ước tính
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-800">
                <BookOpen className="w-4 h-4" />
                <span>Khuyến nghị điểm xuất phát:</span>
              </div>
              <p className="text-sm font-extrabold text-slate-900">
                Unit {diagnosticResult.recommendedUnit.unitNumber}: {diagnosticResult.recommendedUnit.title}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center">
              {diagnosticResult.disclaimerVi}
            </p>

            <button
              type="button"
              onClick={() => {
                if (onCompleted) onCompleted();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Vào Lộ Trình Học Tập Cá Nhân
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
