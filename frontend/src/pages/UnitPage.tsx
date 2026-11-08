import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PenTool,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  UnitDetail,
  UnitTheory,
  UnitProgressDetail,
  LearningStatus,
} from "../types/api.types";
import TheoryViewer from "../components/theory/TheoryViewer";
import RuleReferenceModal from "../components/theory/RuleReferenceModal";
import ExerciseViewer from "../components/exercises/ExerciseViewer";
import ToeicPracticeModal from "../components/adaptive/ToeicPracticeModal";
import AuthModal from "../components/auth/AuthModal";

export const UnitPage: React.FC = () => {
  const { unitNumber: unitNumberParam } = useParams<{ unitNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const unitNumber = parseInt(unitNumberParam || "1", 10);

  // Data state
  const [unitDetail, setUnitDetail] = useState<UnitDetail | null>(null);
  const [unitTheory, setUnitTheory] = useState<UnitTheory | null>(null);
  const [unitProgress, setUnitProgress] = useState<UnitProgressDetail | null>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"theory" | "exercises">("theory");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isToeicModalOpen, setIsToeicModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isNaN(unitNumber) || unitNumber < 1 || unitNumber > 145) {
      setError("Invalid unit number. Units range from 1 to 145.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([api.getUnitDetail(unitNumber), api.getUnitTheory(unitNumber)])
      .then(([detail, theory]) => {
        if (isMounted) {
          setUnitDetail(detail);
          setUnitTheory(theory);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load unit details");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [unitNumber]);

  // Fetch unit progress for authenticated user
  useEffect(() => {
    if (!user || isNaN(unitNumber) || unitNumber < 1 || unitNumber > 145) {
      setUnitProgress(null);
      return;
    }

    let isMounted = true;
    api
      .getUnitProgress(unitNumber)
      .then((progress) => {
        if (isMounted) {
          setUnitProgress(progress);
        }
      })
      .catch((err) => {
        console.error("Failed to load unit progress:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [user, unitNumber]);

  const handleToggleUnitStatus = async () => {
    if (!user) return;
    const nextStatus: LearningStatus =
      unitProgress?.status === "completed" ? "in_progress" : "completed";

    try {
      setIsUpdatingProgress(true);
      const updated = await api.updateUnitProgress(unitNumber, nextStatus);
      setUnitProgress(updated);
    } catch (err: any) {
      alert(err.message || "Failed to update unit progress");
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleRefreshProgress = () => {
    if (user) {
      api.getUnitProgress(unitNumber).then(setUnitProgress).catch(console.error);
    }
  };

  const hasPrev = unitNumber > 1;
  const hasNext = unitNumber < 145;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Breadcrumb & Unit Stepper ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Unit Catalog</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-800">
            Unit {unitNumber}
          </span>
        </div>

        {/* Stepper buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/units/${unitNumber - 1}`)}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Unit {unitNumber - 1}</span>
          </button>
          <button
            onClick={() => navigate(`/units/${unitNumber + 1}`)}
            disabled={!hasNext}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          >
            <span>Unit {unitNumber + 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading Unit {unitNumber}...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-50 transition-colors"
          >
            Return to Catalog
          </Link>
        </div>
      ) : unitDetail && unitTheory ? (
        <>
          {/* ─── Unit Title Header ────────────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-brand-100 text-brand-800">
                  Unit {unitDetail.unitNumber}
                </span>

                {/* Authenticated Unit Progress Badge & Toggle Button */}
                {user && (
                  <div className="flex items-center gap-2">
                    {unitProgress?.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    ) : unitProgress?.status === "in_progress" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>In Progress</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <span>Not Started</span>
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isUpdatingProgress}
                      onClick={handleToggleUnitStatus}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                        unitProgress?.status === "completed"
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {isUpdatingProgress
                        ? "Updating..."
                        : unitProgress?.status === "completed"
                        ? "Mark as In Progress"
                        : "Mark as Completed"}
                    </button>
                  </div>
                )}
              </div>

              {/* Source page badges */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {unitDetail.theoryPdfPage && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                    Theory p.{unitDetail.theoryPdfPage}
                  </span>
                )}
                {unitDetail.exercisePdfPage && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                    Exercise p.{unitDetail.exercisePdfPage}
                  </span>
                )}
                {unitDetail.bookAnswerKeyPage && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                    Answer Key p.{unitDetail.bookAnswerKeyPage}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {unitDetail.title}
              </h1>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsToeicModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto border border-indigo-500/30"
              >
                <Target className="w-4 h-4 text-white shrink-0" />
                <span>🎯 Luyện tập thêm dạng đề TOEIC</span>
              </button>
            </div>
          </section>

          {/* ─── Tab Switcher ─────────────────────────────────────── */}
          <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("theory")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "theory"
                  ? "border-brand-600 text-brand-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Theory & Examples</span>
              <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-full font-mono">
                {unitTheory.theorySections.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("exercises")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "exercises"
                  ? "border-brand-600 text-brand-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Exercises Overview</span>
              <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-full font-mono">
                {unitDetail.exercises.length}
              </span>
            </button>
          </div>

          {/* ─── Tab Content ──────────────────────────────────────────────── */}
          {activeTab === "theory" ? (
            <TheoryViewer
              theorySections={unitTheory.theorySections}
              textbookExamples={unitTheory.textbookExamples}
              onOpenRuleModal={(ruleId) => setSelectedRuleId(ruleId)}
            />
          ) : (
            <ExerciseViewer
              unitNumber={unitDetail.unitNumber}
              unitProgress={unitProgress}
              onOpenRuleReference={(ruleId) => setSelectedRuleId(ruleId)}
              onProgressChange={handleRefreshProgress}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {/* TOEIC Part 5 Practice Generator Modal */}
          <ToeicPracticeModal
            isOpen={isToeicModalOpen}
            onClose={() => setIsToeicModalOpen(false)}
            unitNumber={unitDetail.unitNumber}
            unitTitle={unitDetail.title}
          />

          {/* Guest Sign-in Modal if unauthenticated user clicks TOEIC practice */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          {/* Quick Rule Reference Lookup Modal */}
          <RuleReferenceModal
            sectionId={selectedRuleId}
            onClose={() => setSelectedRuleId(null)}
          />
        </>
      ) : null}
    </div>
  );
};

export default UnitPage;
