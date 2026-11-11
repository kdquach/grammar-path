import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Lightbulb,
  LogIn,
  Loader2,
  Play,
  Award,
  Flame,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  AdaptiveAnalytics,
  LearningStatus,
  ProgressOverview,
  UnitSummary,
} from "../types/api.types";
import {
  DAILY_STUDY_STEPS,
  TOEIC_GOAL_TRACKS,
  TOEIC_PART_MATRIX,
  TOEIC_ROADMAP_STAGES,
  ToeicGoalBand,
  getAllRoadmapUnits,
} from "../data/toeicRoadmap";
import ToeicPracticeModal from "../components/adaptive/ToeicPracticeModal";
import AuthModal from "../components/auth/AuthModal";

const STAGE_ACCENT_STYLES = {
  sky: {
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    bar: "bg-sky-500",
    ring: "border-sky-200",
    softBg: "bg-sky-50/70",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    ring: "border-emerald-200",
    softBg: "bg-emerald-50/70",
  },
  indigo: {
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    bar: "bg-indigo-500",
    ring: "border-indigo-200",
    softBg: "bg-indigo-50/70",
  },
  amber: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    ring: "border-amber-200",
    softBg: "bg-amber-50/70",
  },
  rose: {
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    bar: "bg-rose-500",
    ring: "border-rose-200",
    softBg: "bg-rose-50/70",
  },
} as const;

export const ToeicRoadmapPage: React.FC = () => {
  const { user } = useAuth();

  const [unitsByNumber, setUnitsByNumber] = useState<Record<number, UnitSummary>>({});
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdaptiveAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGoal, setSelectedGoal] = useState<ToeicGoalBand>(() => {
    try {
      const saved = localStorage.getItem("grammarpath_toeic_goal");
      if (saved === "450+" || saved === "600+" || saved === "750+") {
        return saved;
      }
    } catch {
      // ignore storage failure
    }
    return "600+";
  });

  const [priorityFilter, setPriorityFilter] = useState<"all" | "core">("all");
  const [onlyUnfinished, setOnlyUnfinished] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeGuideTab, setActiveGuideTab] = useState<"none" | "routine" | "matrix">(
    "routine"
  );
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    () => new Set(["stage-1"])
  );

  // Modals state
  const [practiceUnit, setPracticeUnit] = useState<{
    unitNumber: number;
    unitTitle: string;
  } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Persist selected TOEIC target band
  const handleSelectGoal = (goalId: ToeicGoalBand) => {
    setSelectedGoal(goalId);
    try {
      localStorage.setItem("grammarpath_toeic_goal", goalId);
    } catch {
      // ignore
    }
  };

  // Load full curriculum unit summaries
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    api
      .getUnits({ page: 1, limit: 145 })
      .then(({ units }) => {
        if (!isMounted) return;
        const map: Record<number, UnitSummary> = {};
        for (const u of units) {
          map[u.unitNumber] = u;
        }
        setUnitsByNumber(map);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch curriculum units for roadmap:", err);
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Không thể đồng bộ tên bài học từ máy chủ.";
          setLoadError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync learner progress & weak unit analytics when signed in
  useEffect(() => {
    if (!user) {
      setOverview(null);
      setAnalytics(null);
      setOnlyUnfinished(false);
      return;
    }

    let isMounted = true;
    Promise.allSettled([api.getProgressOverview(), api.getAdaptiveAnalytics()]).then(
      ([overviewRes, analyticsRes]) => {
        if (!isMounted) return;
        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value);
        }
        if (analyticsRes.status === "fulfilled") {
          setAnalytics(analyticsRes.value);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [user]);

  const progressMap = useMemo(() => {
    const map: Record<number, LearningStatus> = {};
    if (overview?.unitProgressMap) {
      for (const item of overview.unitProgressMap) {
        map[item.unitNumber] = item.status;
      }
    }
    return map;
  }, [overview]);

  const weakUnitsMap = useMemo(() => {
    const map: Record<
      number,
      { errorCount: number; accuracyPercentage: number }
    > = {};
    if (analytics?.weakestUnits) {
      for (const w of analytics.weakestUnits) {
        if (w.errorCount > 0) {
          map[w.unitNumber] = {
            errorCount: w.errorCount,
            accuracyPercentage: w.accuracyPercentage,
          };
        }
      }
    }
    return map;
  }, [analytics]);

  const activeGoalTrack = useMemo(
    () =>
      TOEIC_GOAL_TRACKS.find((t) => t.id === selectedGoal) ||
      TOEIC_GOAL_TRACKS[1],
    [selectedGoal]
  );

  const allRoadmapUnits = useMemo(() => getAllRoadmapUnits(), []);
  const totalCoreUnitsCount = useMemo(
    () => allRoadmapUnits.filter((u) => u.priority === "core").length,
    [allRoadmapUnits]
  );

  // Compute progress scoped to the chosen TOEIC goal track
  const goalStats = useMemo(() => {
    const targetStages = TOEIC_ROADMAP_STAGES.filter((s) =>
      activeGoalTrack.includedStages.includes(s.stageNumber)
    );
    const unitsInGoal = targetStages.flatMap((s) =>
      s.modules.flatMap((m) => m.units)
    );
    const trackedUnits =
      activeGoalTrack.recommendedMode === "core"
        ? unitsInGoal.filter((u) => u.priority === "core")
        : unitsInGoal;

    const completedInGoal = trackedUnits.filter(
      (u) => progressMap[u.unitNumber] === "completed"
    ).length;
    const totalInGoal = trackedUnits.length;
    const pct =
      totalInGoal > 0 ? Math.round((completedInGoal / totalInGoal) * 100) : 0;

    return {
      completedInGoal,
      totalInGoal,
      percentage: pct,
      totalAllCompleted: overview?.units.completedCount ?? 0,
    };
  }, [activeGoalTrack, progressMap, overview]);

  // Recommend next unit to study today
  const recommendedNext = useMemo(() => {
    const stagesInGoal = TOEIC_ROADMAP_STAGES.filter((s) =>
      activeGoalTrack.includedStages.includes(s.stageNumber)
    );
    const orderedUnits = stagesInGoal.flatMap((stage) =>
      stage.modules.flatMap((mod) =>
        mod.units.map((u) => ({ ...u, stageId: stage.id, stageTitle: stage.titleVi }))
      )
    );

    // 1. Check weak unit first if learner has recorded errors
    const priorityWeak = analytics?.weakestUnits?.find(
      (w) => w.errorCount > 0 && w.accuracyPercentage < 75
    );
    if (priorityWeak) {
      const matched = orderedUnits.find(
        (u) => u.unitNumber === priorityWeak.unitNumber
      );
      if (matched) {
        return {
          ...matched,
          reason: `Cần củng cố lại (${priorityWeak.errorCount} lỗi gần đây, độ chính xác ${priorityWeak.accuracyPercentage}%)`,
          isWeakReview: true,
        };
      }
    }

    // 2. Otherwise pick first uncompleted Core unit in the learner's goal track
    const nextCore = orderedUnits.find(
      (u) => u.priority === "core" && progressMap[u.unitNumber] !== "completed"
    );
    if (nextCore) {
      return {
        ...nextCore,
        reason: `Bước trọng tâm tiếp theo trong mục tiêu TOEIC ${selectedGoal}`,
        isWeakReview: false,
      };
    }

    // 3. Fallback: first uncompleted unit in track, or celebration if goal completed
    const nextAny = orderedUnits.find(
      (u) => progressMap[u.unitNumber] !== "completed"
    );
    if (nextAny) {
      return {
        ...nextAny,
        reason: `Mở rộng tiếp theo cho mục tiêu TOEIC ${selectedGoal}`,
        isWeakReview: false,
      };
    }

    const allGoalCompleted =
      orderedUnits.length > 0 &&
      orderedUnits.every((u) => progressMap[u.unitNumber] === "completed");

    return {
      ...orderedUnits[0],
      reason: allGoalCompleted
        ? `Xuất sắc! Bạn đã hoàn thành toàn bộ lộ trình mục tiêu TOEIC ${selectedGoal} — chọn đề TOEIC để ôn tập hoặc nâng lên mục tiêu tiếp theo`
        : "Khởi động lộ trình từ bài nền tảng đầu tiên",
      isWeakReview: false,
    };
  }, [activeGoalTrack, analytics, progressMap, selectedGoal]);

  // Auto-open the stage containing the learner's recommended unit on initial data ready
  useEffect(() => {
    if (user && recommendedNext?.stageId) {
      setExpandedStages((prev) => {
        if (prev.has(recommendedNext.stageId)) return prev;
        const next = new Set(prev);
        next.add(recommendedNext.stageId);
        return next;
      });
    }
  }, [user, recommendedNext?.stageId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      setExpandedStages(new Set(TOEIC_ROADMAP_STAGES.map((s) => s.id)));
    }
  };

  const handlePriorityChange = (mode: "all" | "core") => {
    setPriorityFilter(mode);
    if (mode === "core") {
      setExpandedStages(new Set(TOEIC_ROADMAP_STAGES.map((s) => s.id)));
    }
  };

  const handleToggleUnfinished = () => {
    setOnlyUnfinished((prev) => {
      const next = !prev;
      if (next) {
        setExpandedStages(new Set(TOEIC_ROADMAP_STAGES.map((s) => s.id)));
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setOnlyUnfinished(false);
    setExpandedStages(new Set(["stage-1"]));
  };

  const filteredStages = useMemo(() => {
    return TOEIC_ROADMAP_STAGES.map((stage) => {
      const filteredModules = stage.modules
        .map((mod) => {
          const matchingUnits = mod.units.filter((u) => {
            if (priorityFilter === "core" && u.priority !== "core") {
              return false;
            }
            if (onlyUnfinished && progressMap[u.unitNumber] === "completed") {
              return false;
            }
            if (normalizedQuery.length > 0) {
              const dbTitle = unitsByNumber[u.unitNumber]?.title || "";
              const haystack = [
                `unit ${u.unitNumber}`,
                `${u.unitNumber}`,
                dbTitle,
                u.toeicTag,
                u.noteVi,
                mod.titleVi,
                mod.subtitleEn,
                ...u.toeicParts,
              ]
                .join(" ")
                .toLowerCase();
              if (!haystack.includes(normalizedQuery)) {
                return false;
              }
            }
            return true;
          });
          return { ...mod, units: matchingUnits };
        })
        .filter((mod) => mod.units.length > 0);

      // Compute full stage progress from all stage units (not filtered subset)
      const allStageUnits = stage.modules.flatMap((m) => m.units);
      const completedInStage = allStageUnits.filter(
        (u) => progressMap[u.unitNumber] === "completed"
      ).length;
      const coreInStage = allStageUnits.filter((u) => u.priority === "core").length;

      return {
        ...stage,
        modules: filteredModules,
        totalUnitsCount: allStageUnits.length,
        coreUnitsCount: coreInStage,
        completedCount: completedInStage,
      };
    }).filter((stage) => stage.modules.length > 0);
  }, [priorityFilter, onlyUnfinished, normalizedQuery, progressMap, unitsByNumber]);

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedStages(new Set(TOEIC_ROADMAP_STAGES.map((s) => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedStages(new Set());
  };

  const handleOpenToeicPractice = (unitNumber: number) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const unitTitle =
      unitsByNumber[unitNumber]?.title || `Unit ${unitNumber}`;
    setPracticeUnit({ unitNumber, unitTitle });
  };

  const getRecommendedUnitTitle = () => {
    if (!recommendedNext) return "";
    return (
      unitsByNumber[recommendedNext.unitNumber]?.title ||
      `Unit ${recommendedNext.unitNumber}`
    );
  };

  return (
    <div className="space-y-8">
      {/* ─── 1. Hero & Goal Track Selector ─────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-brand-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/30 border border-brand-400/30 text-brand-100 text-xs font-bold">
              <Compass className="w-3.5 h-3.5 text-brand-300" />
              <span>Lộ trình Toàn diện cho Người mất gốc • Chuẩn TOEIC</span>
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Lộ trình Luyện Ngữ Pháp TOEIC Từ Mất Gốc → 750+
            </h1>
            <p className="text-xs sm:text-sm text-brand-100/90 leading-relaxed">
              Sắp xếp lại toàn bộ <strong>145 Units Murphy</strong> theo đúng thứ tự tư duy thi TOEIC:
              xây <strong>Khung câu &amp; Từ loại</strong> trước, làm chủ <strong>12 Thì &amp; Bị động</strong>,
              rồi mở rộng sang <strong>Mệnh đề phức &amp; Collocation</strong> — thay vì học dàn trải dễ nản.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 text-center">
            <div>
              <strong className="text-xl sm:text-2xl font-black text-white block">
                5
              </strong>
              <span className="text-[11px] text-brand-200">Giai đoạn</span>
            </div>
            <div className="border-x border-white/15 px-3">
              <strong className="text-xl sm:text-2xl font-black text-emerald-300 block">
                {totalCoreUnitsCount}
              </strong>
              <span className="text-[11px] text-brand-200">Unit Cốt lõi</span>
            </div>
            <div>
              <strong className="text-xl sm:text-2xl font-black text-white block">
                145
              </strong>
              <span className="text-[11px] text-brand-200">Tổng Units</span>
            </div>
          </div>
        </div>

        {/* 3 Target Goal Track Cards */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-200">
            Chọn mục tiêu điểm TOEIC của bạn:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TOEIC_GOAL_TRACKS.map((track) => {
              const isSelected = selectedGoal === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectGoal(track.id)}
                  aria-pressed={isSelected}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-brand-300"
                      : "bg-white/10 hover:bg-white/15 text-white border-white/15"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${
                          isSelected
                            ? "bg-brand-600 text-white"
                            : "bg-white/20 text-brand-100"
                        }`}
                      >
                        {track.targetBadge}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isSelected ? "text-slate-500" : "text-brand-200"
                        }`}
                      >
                        {track.weeklyPaceVi}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-extrabold">
                      {track.titleVi}
                    </h2>
                    <p
                      className={`text-xs leading-relaxed ${
                        isSelected ? "text-slate-600" : "text-brand-100/85"
                      }`}
                    >
                      {track.descriptionVi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 2. Personal Readiness & Recommended Next Unit Card ────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Readiness card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                Mục tiêu {selectedGoal}
              </span>
              <h2 className="text-base font-black text-slate-900 mt-2">
                {user
                  ? `Tiến độ sẵn sàng của ${user.displayName}`
                  : "Theo dõi tiến độ & Điểm yếu cá nhân"}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-slate-600">
                  <strong className="text-2xl font-black text-slate-900">
                    {goalStats.completedInGoal}
                  </strong>{" "}
                  / {goalStats.totalInGoal}{" "}
                  {activeGoalTrack.recommendedMode === "core"
                    ? "Unit Cốt lõi"
                    : "Units"}
                </div>
                <span className="text-lg font-black text-emerald-600">
                  {goalStats.percentage}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-2.5 bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, goalStats.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  Tổng toàn khóa:{" "}
                  <strong className="text-slate-800">
                    {goalStats.totalAllCompleted} / 145
                  </strong>{" "}
                  Units
                </span>
                <Link
                  to="/progress"
                  className="font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  <span>Xem Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Đăng nhập để hệ thống tự động đánh dấu các Unit bạn đã học xong, cảnh báo điểm yếu hay sai và mở đề luyện TOEIC Part 5 bằng AI cho từng Unit.
              </p>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập để đồng bộ lộ trình</span>
              </button>
            </div>
          )}
        </div>

        {/* Smart Recommended Next Step Card */}
        {recommendedNext && (
          <div
            className={`lg:col-span-7 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 ${
              recommendedNext.isWeakReview
                ? "bg-amber-50/80 border-amber-200"
                : "bg-gradient-to-br from-brand-50/70 via-white to-indigo-50/60 border-brand-200"
            }`}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    recommendedNext.isWeakReview
                      ? "bg-amber-200 text-amber-950"
                      : "bg-brand-600 text-white"
                  }`}
                >
                  {recommendedNext.isWeakReview ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {recommendedNext.isWeakReview
                      ? "Ưu tiên vá lỗ hổng ngay"
                      : "Gợi ý học tiếp hôm nay"}
                  </span>
                </span>

                <span className="text-xs font-semibold text-slate-500">
                  {recommendedNext.toeicParts.join(" • ")}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Unit {recommendedNext.unitNumber}: {getRecommendedUnitTitle()}
                </h3>
                <p className="text-xs font-semibold text-brand-700 mt-0.5">
                  {recommendedNext.reason}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                  {recommendedNext.noteVi}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                to={`/units/${recommendedNext.unitNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Học Unit {recommendedNext.unitNumber} ngay</span>
              </Link>

              <button
                type="button"
                onClick={() => handleOpenToeicPractice(recommendedNext.unitNumber)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Luyện 5 câu TOEIC Part 5</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─── 3. Study Method & TOEIC Part Matrix Switcher ──────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Cẩm nang ôn thi cho người mất gốc
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveGuideTab((prev) =>
                  prev === "routine" ? "none" : "routine"
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                activeGuideTab === "routine"
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Chu trình 30 phút/ngày
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveGuideTab((prev) =>
                  prev === "matrix" ? "none" : "matrix"
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                activeGuideTab === "matrix"
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Tra cứu theo Part 1–7 TOEIC
            </button>
          </div>
        </div>

        {activeGuideTab === "routine" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {DAILY_STUDY_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-brand-600 text-white text-xs font-black">
                    {s.step}
                  </span>
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                    {s.minutes}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {s.titleVi}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.descriptionVi}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeGuideTab === "matrix" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {TOEIC_PART_MATRIX.map((row) => (
              <div
                key={row.part}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-black">
                      {row.part}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {row.titleVi}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {row.weightVi}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {row.keyTopicsVi}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {row.unitNumbers.map((uNum) => (
                    <Link
                      key={uNum}
                      to={`/units/${uNum}`}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-300 hover:border-brand-500 hover:text-brand-700 text-[11px] font-bold text-slate-700 transition-colors"
                      title={unitsByNumber[uNum]?.title || `Unit ${uNum}`}
                    >
                      Unit {uNum}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── 4. Roadmap Filter Toolbar ─────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm chủ điểm (vd: 'bị động', 'word form', 'Part 5', '97', 'relative')..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              Mở tất cả 5 giai đoạn
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              Thu gọn hết
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-500 font-semibold pr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Chế độ xem:</span>
          </span>

          <button
            type="button"
            onClick={() => handlePriorityChange("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              priorityFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toàn bộ lộ trình (145 Units)
          </button>

          <button
            type="button"
            onClick={() => handlePriorityChange("core")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              priorityFilter === "core"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chỉ Unit Trọng tâm TOEIC ({totalCoreUnitsCount})</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={handleToggleUnfinished}
              aria-pressed={onlyUnfinished}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                onlyUnfinished
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Ẩn Unit đã hoàn thành
            </button>
          )}
        </div>
      </section>

      {loadError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <span>
            Lưu ý: Đang hiển thị lộ trình chuẩn ngoại tuyến ({loadError}). Bạn vẫn có thể mở chi tiết từng Unit bình thường.
          </span>
        </div>
      )}

      {/* ─── 5. 5-Stage Progressive Roadmap Timeline ────────────────────────── */}
      {loading && Object.keys(unitsByNumber).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Đang tải dữ liệu lộ trình 145 Units...</p>
        </div>
      ) : filteredStages.length === 0 ? (
        <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center text-slate-500 space-y-3">
          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">
            Không tìm thấy Unit nào khớp bộ lọc hiện tại
          </p>
          <p className="text-xs text-slate-400">
            Thử xóa từ khóa tìm kiếm hoặc chuyển sang chế độ xem Toàn bộ lộ trình.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredStages.map((stage) => {
            const accent = STAGE_ACCENT_STYLES[stage.accent];
            const isExpanded = expandedStages.has(stage.id);
            const isInSelectedGoal = activeGoalTrack.includedStages.includes(
              stage.stageNumber
            );
            const stagePercent =
              stage.totalUnitsCount > 0
                ? Math.round(
                    (stage.completedCount / stage.totalUnitsCount) * 100
                  )
                : 0;

            return (
              <section
                key={stage.id}
                data-testid={`roadmap-stage-${stage.stageNumber}`}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-colors ${accent.ring}`}
              >
                {/* Stage Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-5 sm:p-6 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase border ${accent.badge}`}
                      >
                        Giai đoạn {stage.stageNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold">
                        {stage.targetBand}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                        {stage.durationEstimate}
                      </span>
                      {isInSelectedGoal && (
                        <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 text-[11px] font-bold">
                          Trong mục tiêu {selectedGoal}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {stage.titleVi}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                      {stage.summaryVi}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end lg:self-center">
                    <div className="text-right min-w-[130px] space-y-1">
                      <div className="text-xs font-bold text-slate-800">
                        {user
                          ? `${stage.completedCount} / ${stage.totalUnitsCount} hoàn thành`
                          : `${stage.totalUnitsCount} Units (${stage.coreUnitsCount} cốt lõi)`}
                      </div>
                      {user && (
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${accent.bar}`}
                            style={{ width: `${stagePercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Stage Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 sm:p-6 space-y-6 bg-slate-50/40">
                    {/* Beginner Why & Outcome Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className={`p-4 rounded-xl border ${accent.ring} ${accent.softBg} space-y-1`}>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                          Tại sao người mất gốc cần chặng này?
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {stage.whyForBeginnersVi}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                          Kết quả đạt được sau chặng
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {stage.outcomeVi}
                        </p>
                      </div>
                    </div>

                    {/* Modules List */}
                    <div className="space-y-6">
                      {stage.modules.map((mod) => (
                        <div
                          key={mod.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-xs font-black font-mono">
                                  Chuyên đề {mod.code}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                  {mod.subtitleEn}
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                {mod.titleVi}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                                {mod.descriptionVi}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              {mod.toeicParts.map((part) => (
                                <span
                                  key={part}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold"
                                >
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Common TOEIC Trap Callout */}
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Mẹo tránh bẫy TOEIC: </strong>
                              <span>{mod.trapTipVi}</span>
                            </div>
                          </div>

                          {/* Units Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {mod.units.map((unitItem) => {
                              const dbUnit = unitsByNumber[unitItem.unitNumber];
                              const unitStatus =
                                progressMap[unitItem.unitNumber] || "not_started";
                              const weakInfo = weakUnitsMap[unitItem.unitNumber];
                              const isCompleted = unitStatus === "completed";
                              const isInProgress = unitStatus === "in_progress";

                              return (
                                <div
                                  key={unitItem.unitNumber}
                                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                                    isCompleted
                                      ? "bg-emerald-50/40 border-emerald-200"
                                      : weakInfo
                                      ? "bg-amber-50/30 border-amber-300"
                                      : "bg-slate-50/50 border-slate-200 hover:border-brand-300 hover:bg-white"
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <Link
                                          to={`/units/${unitItem.unitNumber}`}
                                          className="px-2.5 py-0.5 rounded-md bg-brand-100 text-brand-800 hover:bg-brand-600 hover:text-white text-xs font-extrabold transition-colors"
                                        >
                                          Unit {unitItem.unitNumber}
                                        </Link>

                                        {unitItem.priority === "core" ? (
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase">
                                            Trọng tâm
                                          </span>
                                        ) : unitItem.priority === "recommended" ? (
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                            Nên học
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                            Mở rộng 750+
                                          </span>
                                        )}

                                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold">
                                          {unitItem.toeicTag}
                                        </span>
                                      </div>

                                      {user && (
                                        <div className="flex items-center gap-1.5">
                                          {isCompleted && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span>Đã xong</span>
                                            </span>
                                          )}
                                          {!isCompleted && isInProgress && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                              <Clock className="w-3 h-3" />
                                              <span>Đang học</span>
                                            </span>
                                          )}
                                          {weakInfo && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                              <AlertTriangle className="w-3 h-3" />
                                              <span>{weakInfo.errorCount} lỗi</span>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                      {dbUnit?.title || `Grammar Unit ${unitItem.unitNumber}`}
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                      {unitItem.noteVi}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      {dbUnit
                                        ? `${dbUnit.counts.theorySections} lý thuyết • ${dbUnit.counts.exercises} bài tập • ${dbUnit.counts.questions} câu`
                                        : unitItem.toeicParts.join(" • ")}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenToeicPractice(unitItem.unitNumber)
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
                                        title={`Làm thử 5 câu TOEIC Part 5 cho Unit ${unitItem.unitNumber}`}
                                      >
                                        <Target className="w-3 h-3" />
                                        <span>Đề TOEIC</span>
                                      </button>

                                      <Link
                                        to={`/units/${unitItem.unitNumber}`}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold transition-colors"
                                      >
                                        <BookOpen className="w-3 h-3" />
                                        <span>Vào học</span>
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* TOEIC Part 5 Practice Modal launched right from Roadmap */}
      {practiceUnit && (
        <ToeicPracticeModal
          isOpen={true}
          onClose={() => setPracticeUnit(null)}
          unitNumber={practiceUnit.unitNumber}
          unitTitle={practiceUnit.unitTitle}
        />
      )}

      {/* Sign-in Modal for guests wanting AI TOEIC practice */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default ToeicRoadmapPage;
