import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { GraduationCap, Menu, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../auth/AuthModal";
import Sidebar from "./Sidebar";

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
  const { user, logout } = useAuth();

  const [jumpUnit, setJumpUnit] = useState<string>("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("grammarpath_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("grammarpath_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpUnit.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 145) {
      navigate(`/units/${num}`);
      setJumpUnit("");
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      {/* ─── Desktop Sticky Collapsible Sidebar ──────────────────────────── */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30 shadow-2xs transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:w-20" : "md:w-64 lg:w-72"
        }`}
      >
        <Sidebar
          user={user}
          logout={logout}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          jumpUnit={jumpUnit}
          setJumpUnit={setJumpUnit}
          onJump={handleJump}
          totalUnits={totalUnits}
          totalExercises={totalExercises}
          totalQuestions={totalQuestions}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* ─── Mobile Slim Topbar ──────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 text-slate-900">
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-900">
                GrammarPath
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 px-1 py-0.2 rounded">
                4th Ed
              </span>
            </div>
          </Link>
        </div>

        <div>
          {user ? (
            <div
              className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shadow-2xs"
              title={`Logged in as ${user.displayName}`}
              aria-label="User profile"
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Mobile Slide-out Drawer ─────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50">
            <Sidebar
              user={user}
              logout={logout}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              jumpUnit={jumpUnit}
              setJumpUnit={setJumpUnit}
              onJump={handleJump}
              onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              totalUnits={totalUnits}
              totalExercises={totalExercises}
              totalQuestions={totalQuestions}
              isCollapsed={false}
            />
          </div>
        </div>
      )}

      {/* ─── Main Content Canvas ─────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:pl-20" : "md:pl-64 lg:pl-72"
        }`}
      >
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>

        {/* ─── Subtle Academic Footer ────────────────────────────────────── */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
          <div className="max-w-7xl mx-auto px-4 space-y-1">
            <p>
              GrammarPath Interactive English Learning Platform • Based on Raymond
              Murphy's <em>English Grammar in Use</em> (4th Edition).
            </p>
            <p className="text-[11px] text-slate-400">
              User Accounts, Learning Progress & Mistake Review.
            </p>
          </div>
        </footer>
      </div>

      {/* ─── Auth Modal ──────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default AppLayout;