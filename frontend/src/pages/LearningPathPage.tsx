import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  ArrowRight,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  LearningPathResponse,
} from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  mastered: { label: "Thành thạo", bg: "bg-emerald-100", text: "text-emerald-800" },
  proficient: { label: "Nhuần nhuyễn", bg: "bg-teal-100", text: "text-teal-800" },
  practicing: { label: "Đang luyện", bg: "bg-blue-100", text: "text-blue-800" },
  developing: { label: "Đang phát triển", bg: "bg-cyan-100", text: "text-cyan-800" },
  needs_review: { label: "Cần ôn lại", bg: "bg-amber-100", text: "text-amber-800" },
  insufficient_data: { label: "Cần thêm dữ liệu", bg: "bg-slate-100", text: "text-slate-600" },
  not_started: { label: "Chưa học", bg: "bg-slate-50", text: "text-slate-400" },
};

export const LearningPathPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<string>("all");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    api
      .getLearningPath()
      .then((data) => {
        if (isMounted) {
          setLearningPath(data);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load learning path");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Đang tải Lộ trình học tập...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-100 text-brand-700 flex items-center justify-center shadow-xs">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">
            Lộ Trình Học Ngữ Pháp Cá Nhân
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Đăng nhập để xem lộ trình tối ưu được cá nhân hóa dựa trên độ thành thạo và chu kỳ ghi nhớ của bạn.
          </p>
        </div>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          Đăng nhập / Đăng ký
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  if (error || !learningPath) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Không thể tải lộ trình</h2>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  const filteredStages =
    selectedStageKey === "all"
      ? learningPath.stages
      : learningPath.stages.filter((s) => s.stageKey === selectedStageKey);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>Lộ trình Murphy 4th Edition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Lộ Trình Học Tập Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hệ thống phân cấp 5 giai đoạn từ Nền tảng tới Luyện thi TOEIC, cập nhật thời gian thực theo bằng chứng bài tập và thuật toán suy giảm trí nhớ Ebbinghaus.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center shrink-0">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xl font-black text-emerald-600">
              {learningPath.masteredCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Thành thạo
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xl font-black text-blue-600">
              {learningPath.practicingCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Đang luyện
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xl font-black text-amber-600">
              {learningPath.needsReviewCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Cần ôn
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedStageKey("all")}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedStageKey === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Tất cả ({learningPath.totalConcepts} khái niệm)
        </button>
        {learningPath.stages.map((stg) => (
          <button
            key={stg.stageKey}
            onClick={() => setSelectedStageKey(stg.stageKey)}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
              selectedStageKey === stg.stageKey
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {stg.titleVi} ({stg.concepts.length})
          </button>
        ))}
      </div>

      {/* 3. Stages & Concepts Cards */}
      <div className="space-y-8">
        {filteredStages.map((stage) => (
          <div key={stage.stageKey} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {stage.titleVi}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {stage.subtitleEn} • {stage.unitRange}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {stage.concepts.length} Khái niệm
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stage.concepts.map((concept) => {
                const badge = STATUS_BADGES[concept.masteryStatus] || STATUS_BADGES.not_started;
                const act = concept.suggestedAction || {
                  type: "progress" as const,
                  labelVi: "Bắt đầu học",
                  priority: 1,
                  targetUnitNumber: 1,
                };

                return (
                  <div
                    key={concept.conceptId}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        {concept.isDue && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider animate-pulse">
                            Đến hạn ôn
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                          {concept.conceptName}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mã: <code className="text-slate-600">{concept.conceptCode}</code>
                        </p>
                      </div>

                      {/* Associated units */}
                      {Array.isArray(concept.units) && concept.units.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="text-slate-400">Bài học:</span>
                          {concept.units.map((u) => (
                            <Link
                              key={u.unitNumber}
                              to={`/units/${u.unitNumber}`}
                              className="font-bold text-brand-600 hover:underline bg-brand-50 px-1.5 py-0.5 rounded"
                            >
                              Unit {u.unitNumber}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            {concept.masteryScore !== null ? `${concept.masteryScore}%` : "—"}
                          </div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">
                            Điểm
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            {Math.round(concept.retentionScore * 100)}%
                          </div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">
                            Trí nhớ
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            {concept.distinctQuestionCount}
                          </div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">
                            Câu độc lập
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={
                        act.type === "review"
                          ? "/reviews"
                          : act.targetUnitNumber
                          ? `/study-session?unit=${act.targetUnitNumber}${
                              act.targetExerciseNumber ? `&exercise=${act.targetExerciseNumber}` : ""
                            }`
                          : `/study-session?unit=1`
                      }
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-brand-600 hover:text-white text-slate-700 font-bold text-xs transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {act.type === "review" ? (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-500 group-hover:text-white" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-brand-500 group-hover:text-white" />
                        )}
                        <span className="truncate">{act.labelVi}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPathPage;
