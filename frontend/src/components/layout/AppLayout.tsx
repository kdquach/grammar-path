import React, { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Layers,
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../auth/AuthModal";

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
  const { user, logout } = useAuth();

  const [jumpUnit, setJumpUnit] = useState<string>("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpUnit.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 145) {
      navigate(`/units/${num}`);
      setJumpUnit("");
    }
  };

  const isCatalog = location.pathname === "/";
  const isProgress = location.pathname === "/progress";
  const isMistakes = location.pathname === "/mistakes";

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

            {/* Navigation Links for Authenticated Users / Quick Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isCatalog
                    ? "bg-slate-100 text-brand-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Catalog</span>
              </Link>

              {user && (
                <>
                  <Link
                    to="/progress"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isProgress
                        ? "bg-slate-100 text-brand-700 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>My Progress</span>
                  </Link>

                  <Link
                    to="/mistakes"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isMistakes
                        ? "bg-slate-100 text-brand-700 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Review Mistakes</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Global Stats Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100/80 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
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

            {/* Actions: Auth button, Jump to Unit */}
            <div className="flex items-center gap-2.5">
              {/* User Authentication state */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-brand-800"
                    title={`Logged in as ${user.email}`}
                  >
                    <User className="w-3.5 h-3.5 text-brand-600" />
                    <span className="max-w-[100px] truncate">{user.displayName}</span>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </button>
              )}

              {/* Jump to unit form */}
              <form onSubmit={handleJump} className="hidden sm:flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="145"
                    placeholder="Unit (1-145)"
                    value={jumpUnit}
                    onChange={(e) => setJumpUnit(e.target.value)}
                    className="w-24 sm:w-28 pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800"
                  />
                  <button
                    type="submit"
                    title="Jump to unit"
                    className="absolute right-1 p-1 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer"
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
            Phase 7 Application — User Accounts, Learning Progress & Mistake Review.
          </p>
        </div>
      </footer>

      {/* ─── Auth Modal ──────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default AppLayout;
