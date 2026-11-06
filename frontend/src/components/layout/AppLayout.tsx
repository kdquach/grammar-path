import React, { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Layers,
  ArrowRight,
} from "lucide-react";

interface AppLayoutProps {
  totalUnits?: number;
  totalExercises?: number;
  totalQuestions?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  totalUnits = 145,
  totalExercises = 549,
  totalQuestions = 4414,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jumpUnit, setJumpUnit] = useState<string>("");

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpUnit.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 145) {
      navigate(`/units/${num}`);
      setJumpUnit("");
    }
  };

  const isCatalog = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* ─── Academic Navigation Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo and Book Title */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-slate-900 group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-xs group-hover:bg-brand-700 transition-colors">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      GrammarPath
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                      4th Ed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-xs md:max-w-md">
                    English Grammar in Use — Raymond Murphy
                  </p>
                </div>
              </Link>
            </div>

            {/* Global Stats Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100/80 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <strong className="text-slate-900">{totalUnits}</strong> Units
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-900">
                  {totalExercises.toLocaleString()}
                </strong>{" "}
                Exercises
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-900">
                  {totalQuestions.toLocaleString()}
                </strong>{" "}
                Questions
              </span>
            </div>

            {/* Actions: Jump to Unit & Catalog link */}
            <div className="flex items-center gap-2.5">
              {!isCatalog && (
                <Link
                  to="/"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Catalog</span>
                </Link>
              )}

              {/* Jump to unit form */}
              <form onSubmit={handleJump} className="flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="145"
                    placeholder="Unit (1-145)"
                    value={jumpUnit}
                    onChange={(e) => setJumpUnit(e.target.value)}
                    className="w-28 sm:w-32 pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800"
                  />
                  <button
                    type="submit"
                    title="Jump to unit"
                    className="absolute right-1 p-1 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content Outlet ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ─── Subtle Academic Footer ──────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            GrammarPath Interactive English Learning Platform • Based on Raymond
            Murphy's <em>English Grammar in Use</em> (4th Edition).
          </p>
          <p className="text-[11px] text-slate-400">
            Phase 6 Application — Real-time Cambridge Curriculum & Pedagogical
            Solutions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
