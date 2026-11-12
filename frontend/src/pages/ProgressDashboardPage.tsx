import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  BookOpen,
  Trophy,
  Target,
  ArrowRight,
  Clock,
  Layers,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  LogIn,
  Zap,
  Compass,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ProgressOverview } from "../types/api.types";
import AuthModal from "../components/auth/AuthModal";
import AdaptiveReviewPanel from "../components/adaptive/AdaptiveReviewPanel";
import AdaptiveQuizModal from "../components/adaptive/AdaptiveQuizModal";

export const ProgressDashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdaptiveQuizOpen, setIsAdaptiveQuizOpen] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const handleRefreshDashboard = () => {
    setRefreshCounter((c) => c + 1);
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getProgressOverview()
      .then((data) => {
        if (isMounted) {
          setOverview(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load learning progress");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading, refreshCounter]);

  // While restoring session from localStorage token
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Authenticating...</p>
      </div>
    );
  }

  // If user is not logged in, display guest sign-in banner
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-100 text-brand-700 flex items-center justify-center shadow-xs">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Sign In to Track Your Progress
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Create an account or sign in to record your exercise attempts, track unit completion, view accuracy statistics, and practice mistakes.
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

  if (isLoading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading your learning dashboard...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Dashboard Unavailable</h3>
        <p className="text-xs text-rose-700">{error || "Failed to load overview data."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-bold bg-white text-rose-700 border border-rose-300 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { units, exercises, questions, recentAttempts } = overview;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Header Section ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Learning Progress Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800">{user.displayName}</strong>. Here is your current progress through the 145 Cambridge English units.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAdaptiveQuizOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-white" />
            <span>⚡ Làm bài Quiz thông minh (Luyện theo điểm yếu)</span>
          </button>
          <Link
            to="/mistakes"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors shadow-2xs"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Review Mistakes</span>
          </Link>
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-bold text-xs hover:bg-brand-100 transition-colors shadow-sm"
          >
            <Compass className="w-4 h-4" />
            <span>Lộ trình TOEIC</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Layers className="w-4 h-4" />
            <span>Unit Catalog</span>
          </Link>
        </div>
      </div>

      {/* ─── 4 KPI Metrics Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Units Completed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Units Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {units.completedCount}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {units.totalUnits} Units
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, units.completionPercentage)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {units.completionPercentage}% of curriculum finished ({units.inProgressCount} in progress)
            </p>
          </div>
        </div>

        {/* KPI 2: Exercises Practiced */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Exercises Practiced
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {exercises.uniqueExercisesAttempted}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {exercises.totalExercises} Exercises
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    exercises.totalExercises > 0
                      ? (exercises.uniqueExercisesAttempted / exercises.totalExercises) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {exercises.totalAttempts} total exercise submissions
            </p>
          </div>
        </div>

        {/* KPI 3: Average Exercise Score */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Average Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  exercises.averageScorePercentage >= 80
                    ? "text-emerald-600"
                    : exercises.averageScorePercentage >= 50
                    ? "text-amber-600"
                    : "text-slate-900"
                }`}
              >
                {exercises.averageScorePercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  exercises.averageScorePercentage >= 80
                    ? "bg-emerald-500"
                    : exercises.averageScorePercentage >= 50
                    ? "bg-amber-500"
                    : "bg-brand-500"
                }`}
                style={{ width: `${Math.min(100, exercises.averageScorePercentage)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Across all evaluated exercise attempts
            </p>
          </div>
        </div>

        {/* KPI 4: Question Accuracy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Question Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {questions.accuracyPercentage}%
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                ({questions.correctUniqueQuestions} unique solved)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, questions.accuracyPercentage)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {questions.totalAnswered} total question attempts answered
            </p>
          </div>
        </div>
      </div>

      {/* ─── Phase 9: Adaptive Review & AI Tutor Engine ───────────────────── */}
      <AdaptiveReviewPanel
        refreshKey={refreshCounter}
        onStartAdaptiveQuiz={() => setIsAdaptiveQuizOpen(true)}
      />

      {/* ─── Recent Attempts Table ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Recent Exercise Attempts
            </h3>
            <p className="text-xs text-slate-500">
              Your latest submitted practice sessions across units
            </p>
          </div>
          <Link
            to="/"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Practice More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              No exercise attempts recorded yet
            </p>
            <p className="text-xs text-slate-400">
              Pick any unit from the Catalog and start practicing exercises!
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition-colors"
              >
                <span>Browse Catalog</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Exercise</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Performance</th>
                  <th className="py-3 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      Exercise {attempt.exerciseNumber}
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        to={`/units/${attempt.unitNumber}`}
                        className="text-brand-600 hover:text-brand-800 font-semibold hover:underline"
                      >
                        Unit {attempt.unitNumber}: {attempt.unitTitle}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {attempt.correctCount} / {attempt.totalQuestions}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          attempt.scorePercentage >= 80
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : attempt.scorePercentage >= 50
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {attempt.scorePercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-right">
                      {new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Phase 9.2: Smart Adaptive Remedial Quiz Modal */}
      <AdaptiveQuizModal
        isOpen={isAdaptiveQuizOpen}
        onClose={() => setIsAdaptiveQuizOpen(false)}
        onProgressUpdated={handleRefreshDashboard}
      />
    </div>
  );
};

export default ProgressDashboardPage;
