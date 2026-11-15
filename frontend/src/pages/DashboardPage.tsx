import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckCircle2,
  Target,
  Activity,
  ArrowRight,
  BookmarkCheck,
  Layers,
  Loader2,
  AlertCircle,
  LogIn,
  Play,
  SkipForward,
  Info,
  Award,
  Clock,
  Flame,
  Settings,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  DashboardSummary,
  MasterySummaryResponse,
  RecommendationItem,
  DailyPlanResponse,
  EngagementSummaryResponse,
} from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";
import DailyPlanWidget from "../components/daily/DailyPlanWidget";
import OnboardingModal from "../components/onboarding/OnboardingModal";

const SOURCE_LABELS: Record<string, string> = {
  exercise_submission: "Exercise Check",
  single_check: "Quick Check",
  mistake_retry: "Mistake Retry",
  adaptive_quiz: "Adaptive Quiz",
  legacy_unknown: "Prior History",
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [mastery, setMastery] = useState<MasterySummaryResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationItem | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [engagement, setEngagement] = useState<EngagementSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);

  const loadData = () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      api.getDashboardSummary(),
      (api.getMasterySummary ? api.getMasterySummary() : Promise.resolve(null)).catch(() => null),
      (api.getNextRecommendation ? api.getNextRecommendation().then((r) => r.nextAction) : Promise.resolve(null)).catch(() => null),
      (api.getDailyPlan ? api.getDailyPlan() : Promise.resolve(null)).catch(() => null),
      (api.getEngagementSummary ? api.getEngagementSummary() : Promise.resolve(null)).catch(() => null),
    ])
      .then(([dashData, masteryData, nextAction, planData, engageData]) => {
        setSummary(dashData);
        setMastery(masteryData);
        setRecommendation(nextAction);
        setDailyPlan(planData);
        setEngagement(engageData);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard summary"
        );
        setIsLoading(false);
      });
  };

  const handleTogglePlanItem = async (itemId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "completed" ? "not_started" : "completed";
      const updated = await api.updateDailyPlanItemStatus(itemId, nextStatus);
      setDailyPlan(updated);
    } catch (err: any) {
      console.error("Failed to update daily plan item:", err);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-100 text-brand-700 flex items-center justify-center shadow-xs">
          <LayoutDashboard className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">
            Learning Dashboard
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Sign in or create an account to see your curriculum completion, answered accuracy, recent activity, unresolved mistakes, and TOEIC grammar practice summary.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-md hover:bg-brand-700 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Create Account</span>
          </button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading your learning dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-rose-900">
          Dashboard Unavailable
        </h2>
        <p className="text-xs text-rose-700">
          {error || "Unable to fetch dashboard summary."}
        </p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 text-xs font-bold bg-white text-rose-700 border border-rose-300 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    completion,
    accuracy,
    activity,
    resumeUnit,
    mistakes,
    weakUnits,
    toeic,
    masteryStatus,
  } = summary;

  const maxDailyVolume = Math.max(
    1,
    ...activity.dailyLast14.map((d) => d.answeredCount + d.toeicItemsAnswered)
  );
  const nonZeroSources = Object.entries(accuracy.sourceBreakdown || {}).filter(
    ([, count]) => count > 0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header & Quick Navigation ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100 mb-2">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Learning Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {user.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Clear view of your unit completion, evaluated question accuracy, and recent study cadence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/mastery"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60 font-bold text-xs hover:bg-brand-100 transition-colors shadow-2xs"
          >
            <Award className="w-3.5 h-3.5 text-brand-600" />
            <span>Độ thành thạo ({mastery?.statusCounts.mastered ?? 0})</span>
          </Link>
          <Link
            to="/reviews"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-xs hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Ôn tập ({mastery?.dueReviewsCount ?? 0})</span>
          </Link>
          <Link
            to="/mistakes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors shadow-2xs"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-rose-300" />
            <span>Mistakes ({mistakes.unresolvedCount})</span>
          </Link>
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Cài đặt mục tiêu học tập"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Top Priority Recommendation Banner (Phase 3.2) ─────────────── */}
      {recommendation && (
        <section
          data-testid="personalized-recommendation-card"
          className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                🎯 Khuyến nghị học tập cá nhân hóa
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                Ưu tiên cao nhất
              </span>
            </div>
            <h2 className="text-lg font-black text-white">
              {recommendation.conceptName} — Unit {recommendation.unitNumber}
            </h2>
            <p className="text-xs text-white/90 leading-relaxed">
              {recommendation.reasonVi}
            </p>
          </div>
          <Link
            to={
              recommendation.actionUrl ||
              (recommendation.type === "review"
                ? "/reviews"
                : `/units/${recommendation.unitNumber}`)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-brand-50 text-brand-700 font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            <span>{recommendation.type === "review" ? "Ôn tập ngay" : `Bắt đầu Unit ${recommendation.unitNumber}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* ─── Active Streak Counter & Quick Lộ Trình (Phase 3.3) ─────────────── */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-base font-black text-amber-900 leading-tight">
              {engagement?.currentStreak ?? 0} ngày liên tục
            </div>
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Chuỗi học tập (Kỷ lục: {engagement?.longestStreak ?? 0} ngày)
            </div>
          </div>
        </div>
        <Link
          to="/learning-path"
          className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1"
        >
          <span>Xem lộ trình cá nhân</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── Daily Learning Plan Widget (Phase 3.3) ─────────────────────── */}
      {dailyPlan && (
        <DailyPlanWidget
          plan={dailyPlan}
          onToggleStatus={handleTogglePlanItem}
        />
      )}

      {/* ─── Continue / Resume Banner ─────────────────────────────────────── */}
      {resumeUnit && (
        <section
          data-testid="dashboard-resume-card"
          className="bg-gradient-to-r from-brand-50 via-white to-indigo-50 border border-brand-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-600 text-white">
                {resumeUnit.reason === "in_progress"
                  ? "Resume Learning"
                  : resumeUnit.reason === "all_completed"
                  ? "Curriculum Complete"
                  : "Recommended Next Unit"}
              </span>
              {resumeUnit.toeicTag && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {resumeUnit.toeicTag}
                </span>
              )}
              {resumeUnit.priority && (
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {resumeUnit.priority}
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Unit {resumeUnit.unitNumber}: {resumeUnit.title}
            </h2>
            <p className="text-xs text-slate-500">
              {resumeUnit.lastAccessedAt
                ? `Last studied on ${new Date(resumeUnit.lastAccessedAt).toLocaleDateString()}`
                : "Start with theory overview and interactive textbook exercises."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/units/${resumeUnit.unitNumber}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {resumeUnit.reason === "in_progress"
                  ? `Continue Unit ${resumeUnit.unitNumber}`
                  : `Start Unit ${resumeUnit.unitNumber}`}
              </span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </Link>
          </div>
        </section>
      )}

      {/* ─── Three Distinct Pillars: Completion | Answered Accuracy | Activity ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Completion Card */}
        <div
          data-testid="dashboard-completion-card"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Curriculum Completion
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {completion.completedCount}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {completion.totalUnits} Units Completed ({completion.completionPercentage}%)
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, completion.completionPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-sm font-black text-slate-900 block">
                  {completion.openedCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Opened
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="text-sm font-black text-amber-700 block">
                  {completion.inProgressCount}
                </span>
                <span className="text-[10px] font-semibold text-amber-700">
                  In Progress
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-sm font-black text-slate-600 block">
                  {completion.notStartedCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Remaining
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Exercises practiced:{" "}
              <strong className="text-slate-800">
                {completion.uniqueExercisesAttempted} / {completion.totalExercises}
              </strong>
            </span>
            <span>
              Avg score:{" "}
              <strong className="text-slate-800">
                {completion.averageExerciseScorePercentage !== null
                  ? `${completion.averageExerciseScorePercentage}%`
                  : "—"}
              </strong>
            </span>
          </div>
        </div>

        {/* 2. Answered Accuracy Card */}
        <div
          data-testid="dashboard-accuracy-card"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Answered Accuracy
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black ${
                  accuracy.accuracyPercentage === null
                    ? "text-slate-400"
                    : "text-slate-900"
                }`}
              >
                {accuracy.accuracyPercentage !== null
                  ? `${accuracy.accuracyPercentage}%`
                  : "—"}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {accuracy.totalQuestionsAnswered > 0
                  ? `${accuracy.totalCorrect} / ${accuracy.totalQuestionsAnswered} evaluated`
                  : "No evaluated answers yet"}
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, accuracy.accuracyPercentage ?? 0)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-sm font-black text-emerald-700 block">
                  {accuracy.totalCorrect}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  Correct
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-sm font-black text-rose-700 block">
                  {accuracy.totalIncorrect}
                </span>
                <span className="text-[10px] font-semibold text-rose-700">
                  Incorrect
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm font-black text-slate-700 block flex items-center justify-center gap-1">
                  <SkipForward className="w-3 h-3 text-slate-400" />
                  {accuracy.totalUnansweredSkipped}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Skipped
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] text-slate-500">
              Unanswered skipped blanks are tracked separately and excluded from accuracy and error counts.
            </p>
            {nonZeroSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {nonZeroSources.map(([src, count]) => (
                  <span
                    key={src}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    {SOURCE_LABELS[src] || src}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Learning Activity Card + 14-day SVG Bar Chart */}
        <div
          data-testid="dashboard-activity-card"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Learning Activity
              </span>
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {activity.activeDaysLast7}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                active days in last 7 days ({activity.activeDaysLast30} in 30d)
              </span>
            </div>

            {/* 14-Day Activity Chart */}
            <div className="pt-1">
              <svg
                viewBox="0 0 280 56"
                className="w-full h-14 overflow-visible"
                role="img"
                aria-label="14-day study activity bar chart"
              >
                {activity.dailyLast14.map((day, idx) => {
                  const total = day.answeredCount + day.toeicItemsAnswered;
                  const height = total > 0 ? Math.max(6, Math.round((total / maxDailyVolume) * 44)) : 3;
                  const x = idx * 20 + 2;
                  const y = 48 - height;
                  return (
                    <g key={day.date}>
                      <rect
                        x={x}
                        y={y}
                        width={14}
                        height={height}
                        rx={3}
                        className={total > 0 ? "fill-brand-500" : "fill-slate-200"}
                      >
                        <title>
                          {day.date}: {day.answeredCount} grammar, {day.toeicItemsAnswered} TOEIC items
                        </title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>14 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Last active:</span>
            <strong className="text-slate-700">
              {activity.lastActivityAt
                ? new Date(activity.lastActivityAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No study activity yet"}
            </strong>
          </div>
        </div>
      </section>

      {/* ─── Mistakes Preview + Weak Units + TOEIC Grammar Summary ─────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unresolved Mistakes Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-rose-500" />
                <span>Unresolved Mistakes</span>
              </h2>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {mistakes.unresolvedCount}
              </span>
            </div>

            {mistakes.recentItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                No unresolved mistakes right now. Skipped questions do not create mistakes.
              </p>
            ) : (
              <ul className="space-y-2">
                {mistakes.recentItems.map((m) => (
                  <li
                    key={m.questionId}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>
                        Unit {m.unitNumber} • Ex {m.exerciseNumber}
                      </span>
                      {m.ruleReference && (
                        <span className="font-mono text-indigo-600">
                          {m.ruleReference}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-medium line-clamp-1">
                      {m.questionContent}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/mistakes"
            className="inline-flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-brand-600 hover:text-brand-700"
          >
            <span>Open Mistake Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Weak Units Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Units Needing Review
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                Evaluated only
              </span>
            </div>

            {weakUnits.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                No weak units detected yet. Answer exercise items to surface topic patterns.
              </p>
            ) : (
              <ul className="space-y-2">
                {weakUnits.map((u) => (
                  <li
                    key={u.unitNumber}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/units/${u.unitNumber}`}
                        className="font-bold text-slate-800 hover:text-brand-600 truncate block"
                      >
                        Unit {u.unitNumber}: {u.unitTitle}
                      </Link>
                      <span className="text-[11px] text-slate-500">
                        {u.errorCount} errors across {u.evaluatedCount} answered
                      </span>
                    </div>
                    <span className="font-black text-rose-600 shrink-0">
                      {u.accuracyPercentage !== null
                        ? `${u.accuracyPercentage}%`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/progress"
            className="inline-flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-brand-600 hover:text-brand-700"
          >
            <span>See Error Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* TOEIC Grammar Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>TOEIC Grammar Practice</span>
              </h2>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Adapted Drills
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-lg font-black text-indigo-700 block">
                  {toeic.totalSessions}
                </span>
                <span className="text-[10px] font-semibold text-indigo-700">
                  Sessions
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg font-black text-slate-900 block">
                  {toeic.itemsAnswered}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Answered
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg font-black text-slate-900 block">
                  {toeic.accuracyPercentage !== null
                    ? `${toeic.accuracyPercentage}%`
                    : "—"}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Accuracy
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {toeic.scopeDisclaimer}
            </p>
          </div>

          <Link
            to="/roadmap"
            className="inline-flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>Open TOEIC Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ─── Recent Activity Feed ─────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Recent Activity Feed
            </h2>
            <p className="text-xs text-slate-500">
              Latest submitted textbook exercises and TOEIC grammar drills
            </p>
          </div>
          <Link
            to="/"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            <span>Practice More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activity.recentActivity.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            No recent exercise or TOEIC activity recorded yet. Start any unit to see your timeline here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activity.recentActivity.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        item.type === "toeic_practice"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-brand-50 text-brand-700 border border-brand-200"
                      }`}
                    >
                      {item.type === "toeic_practice"
                        ? "TOEIC Drill"
                        : `Ex ${item.exerciseNumber}`}
                    </span>
                    <Link
                      to={`/units/${item.unitNumber}`}
                      className="font-bold text-slate-900 hover:text-brand-600"
                    >
                      Unit {item.unitNumber}
                      {item.unitTitle ? `: ${item.unitTitle}` : ""}
                    </Link>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {item.correctCount} correct / {item.answeredCount} answered
                    {typeof item.unansweredCount === "number" && item.unansweredCount > 0
                      ? ` (${item.unansweredCount} skipped)`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  {typeof item.scorePercentage === "number" && (
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                      {item.scorePercentage}%
                    </span>
                  )}
                  {item.accuracyPercentage !== undefined &&
                    item.accuracyPercentage !== null && (
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {item.accuracyPercentage}%
                      </span>
                    )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.occurredAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Phase Scope Transparency Note ────────────────────────────────── */}
      <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>{masteryStatus.note}</p>
      </section>
      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onCompleted={() => {
          loadData();
          navigate("/learning-path");
        }}
      />
    </div>
  );
};

export default DashboardPage;

