import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUpRight,
  Compass,
  ArrowRight,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  Book,
  UnitSummary,
  PaginationMeta,
  ProgressOverview,
  LearningStatus,
} from "../types/api.types";

const RANGE_FILTERS = [
  { label: "All Units (1–145)", from: undefined, to: undefined },
  { label: "Units 1–30", from: 1, to: 30 },
  { label: "Units 31–60", from: 31, to: 60 },
  { label: "Units 61–90", from: 61, to: 90 },
  { label: "Units 91–120", from: 91, to: 120 },
  { label: "Units 121–145", from: 121, to: 145 },
];

const PAGE_SIZE = 20;
const ALL_UNITS_LIMIT = 145;

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data state
  const [book, setBook] = useState<Book | null>(null);
  const [units, setUnits] = useState<UnitSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });

  // User progress overview
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | LearningStatus>("all");

  // Filter state
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [activeRange, setActiveRange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isStatusFiltered = Boolean(user && statusFilter !== "all");
  const requestPage = isStatusFiltered ? 1 : page;
  const requestLimit = isStatusFiltered ? ALL_UNITS_LIMIT : PAGE_SIZE;

  // Fetch book metadata on mount
  useEffect(() => {
    api
      .getBook()
      .then(setBook)
      .catch((err) => console.error("Failed to load book:", err));
  }, []);

  // Fetch user progress overview if authenticated
  useEffect(() => {
    if (!user) {
      setOverview(null);
      return;
    }
    api
      .getProgressOverview()
      .then(setOverview)
      .catch((err) => console.error("Failed to load progress overview:", err));
  }, [user]);

  useEffect(() => {
    if (!user && statusFilter !== "all") {
      setStatusFilter("all");
      setPage(1);
    }
  }, [user, statusFilter]);

  // Fetch units when page, status mode, search, or range filter changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const range = RANGE_FILTERS[activeRange];
    const params = {
      page: requestPage,
      limit: requestLimit,
      search: search.trim() || undefined,
      fromUnit: range.from,
      toUnit: range.to,
    };

    api
      .getUnits(params)
      .then(({ units, meta }) => {
        if (isMounted) {
          setUnits(units);
          setMeta(meta);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load units");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestPage, requestLimit, search, activeRange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to page 1 on new search query
  };

  const handleRangeSelect = (index: number) => {
    setActiveRange(index);
    setPage(1);
  };

  const handleStatusSelect = (nextStatus: "all" | LearningStatus) => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  // Map unit progress status by unitNumber
  const progressMap = useMemo(() => {
    const map: Record<number, LearningStatus> = {};
    if (overview?.unitProgressMap) {
      for (const item of overview.unitProgressMap) {
        map[item.unitNumber] = item.status;
      }
    }
    return map;
  }, [overview]);

  // Filter all matching units by user status when a status filter is active
  const filteredUnits = useMemo(() => {
    if (!isStatusFiltered) return units;
    return units.filter((u) => {
      const status = progressMap[u.unitNumber] || "not_started";
      return status === statusFilter;
    });
  }, [units, isStatusFiltered, statusFilter, progressMap]);

  // Recompute pagination over the status-filtered set instead of raw server pagination
  const effectiveMeta = useMemo<PaginationMeta>(() => {
    if (!isStatusFiltered) return meta;
    const totalItems = filteredUnits.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    return {
      page: safePage,
      limit: PAGE_SIZE,
      totalItems,
      totalPages,
    };
  }, [isStatusFiltered, meta, filteredUnits.length, page]);

  const displayedUnits = useMemo(() => {
    if (!isStatusFiltered) return units;
    const start = (effectiveMeta.page - 1) * PAGE_SIZE;
    return filteredUnits.slice(start, start + PAGE_SIZE);
  }, [isStatusFiltered, units, filteredUnits, effectiveMeta.page]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Personal Progress Summary Strip (Authenticated) ──────────────── */}
      {user && overview && (
        <section className="bg-gradient-to-r from-emerald-950 via-slate-900 to-brand-950 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Personal Progress Strip
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {user.displayName}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                Completed:{" "}
                <span className="text-emerald-400">
                  {overview.units.completedCount} / {overview.units.totalUnits} Units
                </span>{" "}
                ({overview.units.completionPercentage}%)
                <span className="text-slate-500 font-normal mx-2">•</span>
                <span className="text-slate-300 font-medium">
                  In Progress: {overview.units.inProgressCount}
                </span>
                <span className="text-slate-500 font-normal mx-2">•</span>
                <span className="text-slate-300 font-medium">
                  Average Score: {overview.exercises.averageScorePercentage}%
                </span>
              </p>
            </div>
          </div>

          <Link
            to="/progress"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/20 whitespace-nowrap self-end md:self-auto cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* ─── Hero / Curriculum Overview ──────────────────────────────────── */}
      {book && (
        <section className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/30 text-brand-200 border border-brand-400/30 rounded-full text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              <span>Cambridge University Press • 4th Edition</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {book.title}
            </h1>
            <p className="text-sm sm:text-base text-brand-100 font-normal leading-relaxed">
              Complete master curriculum by {book.author}. Navigate all 145
              thematic grammar units, read comprehensive theory sections, study
              model sentences with Vietnamese translations, and solve exercise sets.
            </p>

            {/* Micro stats counter */}
            <div className="pt-3 flex flex-wrap gap-4 sm:gap-6 text-xs text-brand-200">
              <div>
                <strong className="text-lg font-bold text-white block">
                  {book.totalUnits}
                </strong>
                <span>Grammar Units</span>
              </div>
              <div>
                <strong className="text-lg font-bold text-white block">
                  {book.totalTheorySections}
                </strong>
                <span>Theory Sections</span>
              </div>
              <div>
                <strong className="text-lg font-bold text-white block">
                  {book.totalTextbookExamples}
                </strong>
                <span>Model Examples</span>
              </div>
              <div>
                <strong className="text-lg font-bold text-white block">
                  {book.totalExercises}
                </strong>
                <span>Exercise Sets</span>
              </div>
              <div>
                <strong className="text-lg font-bold text-white block">
                  {book.totalQuestions.toLocaleString()}
                </strong>
                <span>Practice Questions</span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <Link
                to="/roadmap"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Người mất gốc? Xem Lộ trình Luyện TOEIC (5 giai đoạn)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Search & Range Filter Bar ───────────────────────────────────── */}
      <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by unit title (e.g. 'Present continuous') or unit number (e.g. '1')..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Result count badge */}
          <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
            Showing{" "}
            <strong className="text-slate-800">
              {effectiveMeta.totalItems > displayedUnits.length
                ? `${displayedUnits.length} of ${effectiveMeta.totalItems}`
                : displayedUnits.length}
            </strong>{" "}
            matching units
          </div>
        </div>

        {/* Range filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 pr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Range:</span>
          </span>
          {RANGE_FILTERS.map((filter, index) => {
            const isActive = activeRange === index;
            return (
              <button
                key={filter.label}
                onClick={() => handleRangeSelect(index)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Status filter pills (Available when logged in) */}
        {user && overview && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium pr-1">
              <span>Status:</span>
            </span>
            {[
              { label: "All Statuses", value: "all" },
              {
                label: `Completed (${overview.units.completedCount})`,
                value: "completed",
              },
              {
                label: `In Progress (${overview.units.inProgressCount})`,
                value: "in_progress",
              },
              {
                label: `Not Started (${overview.units.notStartedCount})`,
                value: "not_started",
              },
            ].map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => handleStatusSelect(pill.value as "all" | LearningStatus)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === pill.value
                    ? "bg-slate-800 text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── Units Grid / Catalog ────────────────────────────────────────── */}
      <section className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Loading curriculum units...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-700 space-y-2">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => setPage(1)}
              className="text-xs font-medium px-3 py-1.5 bg-rose-100 rounded-md hover:bg-rose-200 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : displayedUnits.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No units found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search query, status filter, or range selector.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedUnits.map((unit) => {
              const unitStatus = progressMap[unit.unitNumber] || "not_started";

              return (
                <div
                  key={unit.id || unit.unitNumber}
                  onClick={() => navigate(`/units/${unit.unitNumber}`)}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Top Bar: Unit Number Badge, Status Badge & PDF pages */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-extrabold text-brand-800 bg-brand-100 rounded-md group-hover:bg-brand-600 group-hover:text-white transition-colors">
                          Unit {unit.unitNumber}
                        </span>

                        {user && (
                          <div>
                            {unitStatus === "completed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            ) : unitStatus === "in_progress" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">
                                <span>Not Started</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {unit.theoryPdfPage && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            Theory p.{unit.theoryPdfPage}
                          </span>
                        )}
                        {unit.exercisePdfPage && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            Ex p.{unit.exercisePdfPage}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unit Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
                      {unit.title}
                    </h3>
                  </div>

                  {/* Bottom Counts Badge */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span title="Theory sections">
                        <strong className="text-slate-800 font-semibold">
                          {unit.counts.theorySections}
                        </strong>{" "}
                        theories
                      </span>
                      <span>•</span>
                      <span title="Exercises">
                        <strong className="text-slate-800 font-semibold">
                          {unit.counts.exercises}
                        </strong>{" "}
                        exercises
                      </span>
                      <span>•</span>
                      <span title="Questions">
                        <strong className="text-slate-800 font-semibold">
                          {unit.counts.questions}
                        </strong>{" "}
                        questions
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Pagination Controls ───────────────────────────────────────── */}
        {effectiveMeta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={effectiveMeta.page <= 1}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-medium text-slate-500">
              Page <strong className="text-slate-800">{effectiveMeta.page}</strong> of{" "}
              <strong className="text-slate-800">{effectiveMeta.totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(effectiveMeta.totalPages, p + 1))
              }
              disabled={effectiveMeta.page >= effectiveMeta.totalPages}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default CatalogPage;
