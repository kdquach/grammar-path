import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Loader2,
  Award,
  Lightbulb,
  Zap,
} from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type {
  AdaptiveAnalytics,
  ReviewRecommendation,
} from "../../types/api.types";
import AuthModal from "../auth/AuthModal";
import AdaptiveQuizModal from "./AdaptiveQuizModal";
import RuleReferenceModal from "../theory/RuleReferenceModal";

interface AdaptiveReviewPanelProps {
  onStartAdaptiveQuiz?: () => void;
  refreshKey?: number;
}

export const AdaptiveReviewPanel: React.FC<AdaptiveReviewPanelProps> = ({
  onStartAdaptiveQuiz,
  refreshKey = 0,
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AdaptiveAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<ReviewRecommendation[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isInternalQuizOpen, setIsInternalQuizOpen] = useState<boolean>(false);
  const [inspectingRule, setInspectingRule] = useState<string | null>(null);

  const handleOpenQuiz = () => {
    if (onStartAdaptiveQuiz) {
      onStartAdaptiveQuiz();
    } else {
      setIsInternalQuizOpen(true);
    }
  };

  const loadAdaptiveData = () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    Promise.all([api.getAdaptiveAnalytics(), api.getAdaptiveRecommendations()])
      .then(([analyticsData, recsData]) => {
        setAnalytics(analyticsData);
        setRecommendations(recsData.recommendations || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load adaptive review insights");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (user) {
      loadAdaptiveData();
    }
  }, [user, refreshKey]);

  if (!user) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-brand-50 border border-indigo-100 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Adaptive Learning & AI Tutor Recommendations
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-xl">
                Hệ thống AI tự động phát hiện các dạng bài bạn còn yếu, phân tích lỗi sai và đưa ra lộ trình ôn tập cá nhân hóa. Đăng nhập để kích hoạt tính năng này!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
          >
            Đăng nhập / Tạo tài khoản
          </button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Adaptive Review Engine & AI Tutor
              </h2>
              <p className="text-xs text-slate-500">
                Phân tích mẫu lỗi sai (Error Pattern) và gợi ý bài học cần ôn tập trọng điểm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenQuiz}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Làm bài Quiz thông minh (Luyện theo điểm yếu)</span>
            </button>

            <button
              onClick={loadAdaptiveData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`}
              />
              <span>Làm mới gợi ý</span>
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Đang tổng hợp dữ liệu học tập thích ứng...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && analytics && (
          <div className="space-y-6">
            {/* Quick Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Weakest Question Type Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Dạng bài cần cải thiện</span>
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-base font-black text-slate-900">
                  {analytics.weakestQuestionType ? (
                    <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {analytics.weakestQuestionType}
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Chưa có lỗi sai nổi bật
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {analytics.weakestQuestionType
                    ? "Dạng bài ghi nhận tần suất sai nhiều nhất trong lịch sử làm bài."
                    : "Bạn đang làm bài rất tốt hoặc chưa ghi nhận câu sai!"}
                </p>
              </div>

              {/* Error Count Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Tổng số lỗi sai cần xử lý</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-rose-600">
                  {analytics.totalErrors}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    / {analytics.totalEvaluated} câu đã làm
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Độ chính xác trung bình: <strong>{analytics.accuracyPercentage}%</strong>
                </p>
              </div>

              {/* Weakest Units Count */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Số Unit cần củng cố</span>
                  <Award className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  {analytics.weakestUnits.length}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    Units phát hiện lỗi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {analytics.weakestUnits.length > 0
                    ? `Các Unit: ${analytics.weakestUnits.map((u) => `#${u.unitNumber}`).join(", ")}`
                    : "Chưa có bài học nào bị sai."}
                </p>
              </div>
            </div>

            {/* Error Category Distribution Bar Chart */}
            {analytics.errorDistribution.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Phân bổ lỗi theo dạng câu hỏi (Error Pattern Distribution)</span>
                </h4>
                <div className="space-y-2.5">
                  {analytics.errorDistribution.map((item) => (
                    <div key={item.questionType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 font-mono">
                          {item.questionType}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {item.errorCount} lỗi ({item.errorRatePercentage}% tỷ lệ sai)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            item.errorRatePercentage > 50
                              ? "bg-rose-500"
                              : item.errorRatePercentage > 25
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                          }`}
                          style={{
                            width: `${Math.min(100, item.errorRatePercentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Granular Weak Theory Sub-sections (Weak Theory Rules) */}
            {analytics.weakRules && analytics.weakRules.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tiểu mục lý thuyết hay sai nhất (Weak Theory Rules)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Top {analytics.weakRules.length} quy tắc cần củng cố
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analytics.weakRules.map((rule) => (
                    <div
                      key={rule.ruleReference}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectingRule(rule.ruleReference)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                            title="Nhấn để xem nội dung lý thuyết tiểu mục này"
                          >
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            <span>Quy tắc {rule.ruleReference}</span>
                          </button>
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            {rule.errorCount} lỗi ({rule.accuracyPercentage}% chính xác)
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                          {rule.heading}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                        <span className="truncate max-w-[180px]">
                          Unit {rule.unitNumber}: {rule.unitTitle}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInspectingRule(rule.ruleReference)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                        >
                          Đọc lý thuyết →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalized Recommendations Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lộ trình ôn tập đề xuất (AI Recommendations)</span>
              </h4>

              {recommendations.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    Không có bài học nào cần cảnh báo ôn tập khẩn cấp!
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Hãy tiếp tục làm thêm các bài tập trong Catalog để củng cố phản xạ nhé.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={`${rec.unitNumber}-${idx}`}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center font-black text-sm text-slate-900">
                            Unit {rec.unitNumber}: {rec.unitTitle}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                              rec.priority === "high"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : rec.priority === "medium"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {rec.priority === "high"
                              ? "Ưu tiên cao"
                              : rec.priority === "medium"
                              ? "Cần ôn tập"
                              : "Gợi ý"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {rec.reason}
                        </p>

                        {/* Granular Target Rules Badges */}
                        {rec.targetRules && rec.targetRules.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[11px] font-bold text-slate-500">
                              Trọng điểm:
                            </span>
                            {rec.targetRules.map((rule) => (
                              <button
                                key={rule}
                                type="button"
                                onClick={() => setInspectingRule(rule)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                title={`Xem lý thuyết mục ${rule}`}
                              >
                                <BookOpen className="w-3 h-3 text-indigo-600" />
                                <span>Mục {rule}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {rec.suggestedActions?.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Hành động đề xuất:
                            </span>
                            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                              {rec.suggestedActions.map((act, aIdx) => (
                                <li key={aIdx} className="leading-tight">
                                  {act}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {rec.errorCount > 0
                            ? `${rec.errorCount} câu sai recorded`
                            : "Theo lộ trình học"}
                        </span>
                        <Link
                          to={`/units/${rec.unitNumber}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ôn Unit {rec.unitNumber}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Internal Adaptive Quiz Modal if not controlled by parent */}
        <AdaptiveQuizModal
          isOpen={isInternalQuizOpen}
          onClose={() => setIsInternalQuizOpen(false)}
          onProgressUpdated={loadAdaptiveData}
        />
      </div>

      {/* Rule Reference Modal for inspecting weak theory rules */}
      <RuleReferenceModal
        sectionId={inspectingRule}
        onClose={() => setInspectingRule(null)}
      />
    </>
  );
};

export default AdaptiveReviewPanel;
