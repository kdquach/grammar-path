import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  HelpCircle,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  RefreshCw,
  X,
  History,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  MasterySummaryResponse,
  ConceptMasteryDetailResponse,
  MasteryStatus,
} from "../types/api.types";

const STATUS_CONFIG: Record<
  MasteryStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  mastered: {
    label: "Mastered",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <Award className="w-3.5 h-3.5 text-emerald-600" />,
  },
  proficient: {
    label: "Proficient",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
  },
  practicing: {
    label: "Practicing",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    icon: <TrendingUp className="w-3.5 h-3.5 text-sky-600" />,
  },
  developing: {
    label: "Developing",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  },
  needs_review: {
    label: "Needs Review",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: <Clock className="w-3.5 h-3.5 text-rose-600" />,
  },
  insufficient_data: {
    label: "Insufficient Data",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
  not_started: {
    label: "Not Started",
    bg: "bg-slate-50",
    text: "text-slate-400",
    border: "border-slate-200",
    icon: <BookOpen className="w-3.5 h-3.5 text-slate-400" />,
  },
};

export const MasteryPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MasterySummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Explainability modal state
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptDetail, setConceptDetail] = useState<ConceptMasteryDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMasterySummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load mastery summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSummary();
    }
  }, [user]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.recalculateMastery();
      await loadSummary();
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleOpenDetail = async (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setIsDetailLoading(true);
    try {
      const detail = await api.getConceptMasteryDetail(conceptId);
      setConceptDetail(detail);
    } catch (err) {
      console.error("Failed to load concept detail:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedConceptId(null);
    setConceptDetail(null);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Award className="w-12 h-12 text-brand-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Đăng nhập để xem Độ thành thạo</h2>
        <p className="text-sm text-slate-600">
          Theo dõi độ am hiểu từng chủ điểm ngữ pháp, độ ghi nhớ Spaced Repetition và các điểm cần củng cố.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Đang tải bản đồ năng lực ngữ pháp...</p>
      </div>
    );
  }

  const counts = summary?.statusCounts || {
    not_started: 0,
    insufficient_data: 0,
    developing: 0,
    practicing: 0,
    proficient: 0,
    mastered: 0,
    needs_review: 0,
  };

  const filteredMasteries = (summary?.masteries || []).filter((m) => {
    if (filterStatus !== "all" && m.masteryStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.conceptName.toLowerCase().includes(q) ||
        m.conceptCode.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100 mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Learning Mastery Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Độ thành thạo Ngữ pháp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đánh giá minh bạch dựa trên số lượng câu hỏi khác biệt đã làm, độ chính xác có trọng số và độ ghi nhớ ngắt quãng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ôn tập Spaced Repetition ({summary?.dueReviewsCount || 0})</span>
          </Link>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin text-brand-600" : ""}`} />
            <span>Tính lại</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Mastered</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{counts.mastered}</p>
          <p className="text-[11px] text-slate-400">≥5 câu, ≥85% đúng</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Proficient</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600">{counts.proficient}</p>
          <p className="text-[11px] text-slate-400">≥3-4 câu, ≥85% đúng</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Practicing</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600">{counts.practicing}</p>
          <p className="text-[11px] text-slate-400">≥3 câu, 70-84% đúng</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Developing</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{counts.developing}</p>
          <p className="text-[11px] text-slate-400">≥3 câu, &lt;70% đúng</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Needs Review</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{counts.needs_review}</p>
          <p className="text-[11px] text-slate-400">Đến hạn ôn tập</p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Chưa đủ dữ liệu</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700">{counts.insufficient_data}</p>
          <p className="text-[11px] text-slate-400">Mới làm 1-2 câu</p>
        </div>
      </div>

      {/* ─── Filter & Search Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Tất cả" },
            { id: "mastered", label: "Mastered" },
            { id: "proficient", label: "Proficient" },
            { id: "practicing", label: "Practicing" },
            { id: "developing", label: "Developing" },
            { id: "needs_review", label: "Needs Review" },
            { id: "insufficient_data", label: "Chưa đủ dữ liệu" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-brand-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên chủ điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* ─── Concepts List ───────────────────────────────────────────────────── */}
      {filteredMasteries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Không tìm thấy chủ điểm phù hợp</p>
          <p className="text-xs text-slate-500">
            Hãy bắt đầu làm bài tập Unit hoặc thử từ khóa tìm kiếm khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredMasteries.map((m) => {
            const config = STATUS_CONFIG[m.masteryStatus] || STATUS_CONFIG.not_started;
            return (
              <div
                key={m.conceptId}
                onClick={() => handleOpenDetail(m.conceptId)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-brand-300 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {m.conceptCode}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}
                    >
                      {config.icon}
                      <span>{config.label}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {m.conceptName}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.category}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">ĐỘ CHÍNH XÁC</span>
                    <span className="font-bold text-slate-800">
                      {m.masteryScore !== null ? `${m.masteryScore}%` : "—"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">CÂU ĐỘC LẬP</span>
                    <span className="font-bold text-slate-800">{m.distinctQuestionCount} câu</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">GHI NHỚ</span>
                    <span className="font-bold text-slate-800">
                      {Math.round(m.retentionScore * 100)}%
                    </span>
                  </div>

                  <div className="text-brand-600 pl-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Explainability Modal ────────────────────────────────────────────── */}
      {selectedConceptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            {isDetailLoading || !conceptDetail ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto" />
                <p className="text-xs">Đang phân tích căn cứ đánh giá...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {conceptDetail.concept.code}
                      </span>
                      {(() => {
                        const cfg =
                          STATUS_CONFIG[conceptDetail.mastery.status] || STATUS_CONFIG.not_started;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-lg font-black text-slate-900">
                      {conceptDetail.concept.name}
                    </h2>
                    <p className="text-xs text-slate-500">{conceptDetail.concept.category}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Explanation Rationale Box */}
                <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
                    <HelpCircle className="w-4 h-4 text-brand-600" />
                    <span>Căn cứ xác định trạng thái</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {conceptDetail.mastery.explanationVi}
                  </p>
                  <div className="pt-2 border-t border-brand-100/60 text-xs text-brand-900 font-semibold">
                    💡 Khuyến nghị: {conceptDetail.mastery.recommendedActionVi}
                  </div>
                </div>

                {/* Metric Evidence Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">CÂU HỎI ĐỘC LẬP</span>
                    <span className="text-base font-black text-slate-800">
                      {conceptDetail.mastery.distinctQuestionCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">ĐÚNG / SAI</span>
                    <span className="text-base font-black text-slate-800">
                      <span className="text-emerald-600">{conceptDetail.mastery.correctCount}</span> /{" "}
                      <span className="text-rose-600">{conceptDetail.mastery.incorrectCount}</span>
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">LẦN LÀM LẠI</span>
                    <span className="text-base font-black text-slate-800">
                      {conceptDetail.mastery.repeatedAttemptCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">ĐỘ ỔN ĐỊNH TRÍ NHỚ</span>
                    <span className="text-base font-black text-slate-800">
                      {conceptDetail.mastery.stabilityDays} ngày
                    </span>
                  </div>
                </div>

                {/* Related Curriculum Units */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bài học liên quan trong giáo trình
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {conceptDetail.concept.relatedUnits.map((u, i) => (
                      <Link
                        key={i}
                        to={`/units/${u.unitNumber}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-100 text-xs transition-colors"
                      >
                        <span className="font-semibold text-slate-800">
                          Unit {u.unitNumber}: {u.unitTitle} ({u.sectionId})
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Độ tin cậy: {u.confidence}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Event History Timeline */}
                {conceptDetail.historyEvents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lịch sử chuyển đổi trạng thái</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {conceptDetail.historyEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-[11px]"
                        >
                          <span className="font-medium">
                            {ev.previousStatus || "not_started"} →{" "}
                            <span className="font-bold text-brand-700">{ev.newStatus}</span> (
                            {ev.reason})
                          </span>
                          <span className="text-slate-400 font-mono">
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasteryPage;
