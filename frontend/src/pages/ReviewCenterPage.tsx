import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  Calendar,
  Play,
  RotateCcw,
  ArrowRight,
  Loader2,
  Check,
  X as CloseIcon,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  DueReviewItem,
  AllReviewsResponse,
  CompleteReviewResponse,
} from "../types/api.types";

export const ReviewCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [dueItems, setDueItems] = useState<DueReviewItem[]>([]);
  const [allReviews, setAllReviews] = useState<AllReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReview, setActiveReview] = useState<DueReviewItem | null>(null);

  // Review drill form state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<CompleteReviewResponse | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dueData, allData] = await Promise.all([
        api.getDueReviews(),
        api.getAllReviews(),
      ]);
      setDueItems(dueData.items);
      setAllReviews(allData);
    } catch (err) {
      console.error("Failed to load review center data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleStartReview = (item: DueReviewItem) => {
    setActiveReview(item);
    setAnswers({});
    setReviewResult(null);
  };

  const handleAnswerChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSubmitReview = async () => {
    if (!activeReview) return;
    setIsSubmitting(true);

    try {
      // Server-authoritative: submit student answers directly without calculating correctness on client
      const res = await api.completeReview(activeReview.conceptId, {
        answers,
        scheduleId: activeReview.scheduleId,
      });

      setReviewResult(res);
      await loadData();
    } catch (err: any) {
      console.error("Failed to complete review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseReview = () => {
    setActiveReview(null);
    setReviewResult(null);
    setAnswers({});
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Clock className="w-12 h-12 text-brand-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Đăng nhập để vào Trung tâm Ôn tập</h2>
        <p className="text-sm text-slate-600">
          Hệ thống Spaced Repetition tự động lập lịch củng cố kiến thức trước khi bạn quên.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Đang tải lịch ôn tập ngắt quãng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Spaced Repetition Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Trung tâm Ôn tập Ngắt quãng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dựa trên đường cong quên lãng Ebbinghaus: ôn lại đúng lúc để chuyển kiến thức vào trí nhớ dài hạn.
          </p>
        </div>

        <Link
          to="/mastery"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          <span>Xem bản đồ thành thạo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── Due Reviews Section ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Chủ điểm cần ôn tập ngay</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold">
              {dueItems.length}
            </span>
          </h2>
        </div>

        {dueItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Không có chủ điểm nào đến hạn ôn tập hôm nay! 🎉
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Trí nhớ của bạn đang ở trạng thái tối ưu. Hãy tiếp tục học các bài học mới hoặc làm thêm bài tập TOEIC.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueItems.map((item) => (
              <div
                key={item.scheduleId}
                className="bg-white rounded-2xl border border-rose-200 hover:border-brand-400 p-5 shadow-2xs space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {item.conceptCode}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Đến hạn
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.conceptName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.unitNumber ? `Unit ${item.unitNumber}: ${item.unitTitle}` : item.category}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    <span>Độ ổn định: </span>
                    <span className="font-bold text-slate-800">{item.stabilityDays} ngày</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartReview(item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Ôn tập ngay ({item.practiceQuestions.length} câu)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Upcoming Schedules Timeline ─────────────────────────────────────── */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Lịch ôn tập sắp tới</span>
        </h2>

        {allReviews?.reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
            Chưa có lịch ôn tập nào được lên kế hoạch. Làm bài tập để bắt đầu.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
            {allReviews?.reviews.map((r) => {
              const due = new Date(r.dueAt);
              return (
                <div
                  key={r.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {r.conceptCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{r.conceptName}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Chu kỳ lặp: {r.intervalDays} ngày • Đã ôn: {r.reviewCount} lần
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`font-semibold ${
                        r.isDue ? "text-rose-600 font-bold" : "text-slate-500"
                      }`}
                    >
                      {r.isDue ? "Hôm nay" : due.toLocaleDateString("vi-VN")}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border ${
                        r.isDue
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {r.reviewState}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Interactive Review Modal ────────────────────────────────────────── */}
      {activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-brand-600 uppercase">
                  Spaced Repetition Drill
                </span>
                <h2 className="text-lg font-black text-slate-900">{activeReview.conceptName}</h2>
                <p className="text-xs text-slate-500">
                  {activeReview.unitTitle ? `Unit ${activeReview.unitNumber}: ${activeReview.unitTitle}` : activeReview.category}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseReview}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reviewResult ? (
              <div className="py-6 text-center space-y-4 animate-fade-in">
                <div
                  className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                    reviewResult.status === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {reviewResult.status === "success" ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <RotateCcw className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">
                    {reviewResult.status === "success"
                      ? "Hoàn thành xuất sắc!"
                      : "Đã hoàn thành buổi ôn tập!"}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                    {reviewResult.messageVi}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs mx-auto text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Độ ổn định trí nhớ:</span>
                    <span className="font-bold text-slate-800">{reviewResult.stabilityDays} ngày</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Lần ôn tập kế tiếp:</span>
                    <span className="font-bold text-brand-700">Sau {reviewResult.intervalDays} ngày</span>
                  </div>
                </div>

                {reviewResult.results && reviewResult.results.length > 0 && (
                  <div className="space-y-3 max-w-lg mx-auto text-left mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Chi tiết kết quả ({reviewResult.correctCount ?? 0}/{reviewResult.totalCount ?? reviewResult.results.length} câu đúng)
                    </h4>
                    {reviewResult.results.map((res, i) => {
                      const q = activeReview.practiceQuestions.find(
                        (item) => item.id === res.questionId || item.questionId === res.questionId
                      ) || activeReview.practiceQuestions[i];

                      return (
                        <div
                          key={res.questionId || i}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                            res.isCorrect
                              ? "bg-emerald-50/80 border-emerald-200 text-slate-800"
                              : res.status === "unanswered"
                              ? "bg-slate-50 border-slate-200 text-slate-500"
                              : "bg-rose-50/80 border-rose-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>Câu {i + 1}</span>
                            <span
                              className={`flex items-center gap-1 font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-full ${
                                res.isCorrect
                                  ? "bg-emerald-200 text-emerald-800"
                                  : res.status === "unanswered"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-rose-200 text-rose-800"
                              }`}
                            >
                              {res.isCorrect ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Đúng</span>
                                </>
                              ) : res.status === "unanswered" ? (
                                <span>Chưa trả lời</span>
                              ) : (
                                <>
                                  <CloseIcon className="w-3 h-3 stroke-[3]" />
                                  <span>Chưa đúng</span>
                                </>
                              )}
                            </span>
                          </div>

                          {q && (
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {q.questionContent}
                            </p>
                          )}

                          <div className="pt-1 text-[11px] space-y-1">
                            {res.studentAnswer !== null && res.studentAnswer !== undefined && (
                              <p className="text-slate-600">
                                Lựa chọn của bạn:{" "}
                                <span className="font-mono font-bold text-slate-900">
                                  {typeof res.studentAnswer === "object"
                                    ? JSON.stringify(res.studentAnswer)
                                    : String(res.studentAnswer)}
                                </span>
                              </p>
                            )}
                            {!res.isCorrect && res.expectedAnswers && res.expectedAnswers.length > 0 && (
                              <p className="text-rose-700 font-bold">
                                Đáp án đúng:{" "}
                                <span className="font-mono">{res.expectedAnswers.join(" / ")}</span>
                              </p>
                            )}
                            {res.explanation && (
                              <div className="mt-1.5 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 text-slate-700 text-[11px] leading-relaxed">
                                <span className="font-bold text-brand-700">💡 Giải thích: </span>
                                {res.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloseReview}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-colors shadow-xs cursor-pointer"
                >
                  Xác nhận & Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {activeReview.practiceQuestions.map((q, idx) => {
                    const hasOptions = q.options && q.options.length > 0;
                    return (
                      <div key={q.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px]">
                              Câu {idx + 1}
                            </span>
                            {hasOptions && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                TOEIC Part 5
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {q.exercise.exerciseNumber ? q.exercise.exerciseNumber : ""}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                          {q.questionContent}
                        </p>

                        {hasOptions ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {q.options.map((opt) => {
                              const isSelected = answers[q.id] === opt.optionKey;
                              return (
                                <button
                                  key={opt.optionKey}
                                  type="button"
                                  onClick={() => handleAnswerChange(q.id, opt.optionKey)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-brand-50/90 border-brand-500 ring-2 ring-brand-400/40 text-brand-950 font-semibold shadow-xs"
                                      : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50/80 text-slate-800 shadow-2xs"
                                  }`}
                                >
                                  <span
                                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                                      isSelected
                                        ? "bg-brand-600 border-brand-600 text-white"
                                        : "bg-slate-100 border-slate-300 text-slate-700"
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : opt.optionKey}
                                  </span>
                                  <span className="text-xs sm:text-sm leading-snug">{opt.optionText}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời của bạn..."
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    Đã chọn:{" "}
                    <strong className="text-slate-800">
                      {Object.keys(answers).filter((k) => answers[k]?.trim()).length} /{" "}
                      {activeReview.practiceQuestions.length}
                    </strong>{" "}
                    câu
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseReview}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Nộp bài & Cập nhật lịch</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCenterPage;
