import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Layers,
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  LogOut,
  LogIn,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AuthUser } from "../../types/api.types";

interface SidebarProps {
  user: AuthUser | null;
  logout: () => void;
  onOpenAuthModal: () => void;
  jumpUnit: string;
  setJumpUnit: (val: string) => void;
  onJump: (e: React.FormEvent) => void;
  onCloseMobileMenu?: () => void;
  totalUnits?: number;
  totalExercises?: number;
  totalQuestions?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  logout,
  onOpenAuthModal,
  jumpUnit,
  setJumpUnit,
  onJump,
  onCloseMobileMenu,
  totalUnits = 145,
  totalExercises = 549,
  totalQuestions = 4414,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();

  const isCatalog = location.pathname === "/";
  const isProgress = location.pathname === "/progress";
  const isMistakes = location.pathname === "/mistakes";

  // When rendered inside mobile drawer, force expanded display
  const collapsed = isCollapsed && !onCloseMobileMenu;

  return (
    <div
      className={`flex flex-col h-full bg-white select-none transition-all duration-300 ${
        collapsed ? "w-20" : "w-full"
      }`}
    >
      {/* ─── 1. Brand Header ─────────────────────────────────────────────── */}
      <div
        className={`border-b border-slate-100 flex items-center shrink-0 ${
          collapsed
            ? "flex-col p-3 gap-2.5 justify-center"
            : "p-4 sm:p-5 justify-between"
        }`}
      >
        <Link
          to="/"
          onClick={onCloseMobileMenu}
          className="flex items-center gap-2.5 text-slate-900 group"
          title="GrammarPath - English Grammar in Use"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs group-hover:bg-brand-700 transition-colors shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  GrammarPath
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                  4th Ed
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                Murphy's English Grammar
              </p>
            </div>
          )}
        </Link>

        {/* Toggle Collapse/Expand Button (Desktop) */}
        {onToggleCollapse && !onCloseMobileMenu && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={collapsed ? "Mở rộng thanh bên (Expand)" : "Thu nhỏ thanh bên (Collapse)"}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu nhỏ thanh bên"}
            data-testid="sidebar-toggle-button"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-brand-600" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Close button (Mobile Drawer only) */}
        {onCloseMobileMenu && (
          <button
            type="button"
            onClick={onCloseMobileMenu}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── 2. User Account Section ─────────────────────────────────────── */}
      <div className={`border-b border-slate-100 shrink-0 ${collapsed ? "p-2.5" : "p-4"}`}>
        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs"
                title={`${user.displayName} (${user.email})`}
              >
                {user.displayName.charAt(0).toUpperCase()}
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
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div
                    className="font-bold text-xs text-slate-900 truncate"
                    title={user.displayName}
                  >
                    {user.displayName}
                  </div>
                  <div
                    className="text-[11px] text-slate-400 truncate"
                    title={user.email}
                  >
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  if (onCloseMobileMenu) onCloseMobileMenu();
                }}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )
        ) : collapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors shadow-2xs cursor-pointer"
              title="Sign In / Register"
              aria-label="Sign in or register"
            >
              <LogIn className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenAuthModal();
                if (onCloseMobileMenu) onCloseMobileMenu();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Save attempts & track learning
            </p>
          </div>
        )}
      </div>

      {/* ─── 3. Quick Jump to Unit ───────────────────────────────────────── */}
      <div className={`border-b border-slate-100 shrink-0 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
        {!collapsed && (
          <label
            htmlFor="sidebar-jump-unit"
            className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block"
          >
            Quick Jump
          </label>
        )}
        <form onSubmit={onJump} className="relative flex items-center justify-center">
          <input
            id="sidebar-jump-unit"
            type="number"
            min="1"
            max="145"
            placeholder={collapsed ? "#" : "Unit (1 - 145)"}
            value={jumpUnit}
            onChange={(e) => setJumpUnit(e.target.value)}
            title="Chuyển nhanh đến Unit (1 - 145)"
            className={`${
              collapsed
                ? "w-11 text-center py-1.5 px-1 text-xs font-semibold rounded-lg"
                : "w-full pl-3 pr-8 py-2 text-xs rounded-xl"
            } border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800`}
          />
          {!collapsed && (
            <button
              type="submit"
              title="Jump to unit"
              aria-label="Jump to unit"
              className="absolute right-1.5 p-1 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* ─── 4. Navigation Links ─────────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto space-y-1.5 ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        {!collapsed && (
          <div className="px-3 pb-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Curriculum
          </div>
        )}

        {/* Catalog */}
        <Link
          to="/"
          onClick={onCloseMobileMenu}
          title="Catalog (145 Units)"
          className={`flex items-center transition-all ${
            collapsed
              ? "w-11 h-11 mx-auto justify-center rounded-xl"
              : "justify-between px-3 py-2.5 text-xs font-semibold rounded-xl"
          } ${
            isCatalog
              ? "bg-brand-50 text-brand-700 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers
              className={`w-4 h-4 shrink-0 ${isCatalog ? "text-brand-600" : "text-slate-400"}`}
            />
            {!collapsed && <span>Catalog</span>}
          </div>
          {!collapsed && (
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md">
              145
            </span>
          )}
        </Link>

        {/* Authenticated Links */}
        {user && (
          <>
            {!collapsed && (
              <div className="pt-4 px-3 pb-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Personal Learning
              </div>
            )}

            <Link
              to="/progress"
              onClick={onCloseMobileMenu}
              title="My Progress"
              className={`flex items-center transition-all ${
                collapsed
                  ? "w-11 h-11 mx-auto justify-center rounded-xl"
                  : "gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl"
              } ${
                isProgress
                  ? "bg-brand-50 text-brand-700 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <BarChart3
                className={`w-4 h-4 shrink-0 ${isProgress ? "text-brand-600" : "text-slate-400"}`}
              />
              {!collapsed && <span>My Progress</span>}
            </Link>

            <Link
              to="/mistakes"
              onClick={onCloseMobileMenu}
              title="Review Mistakes"
              className={`flex items-center transition-all ${
                collapsed
                  ? "w-11 h-11 mx-auto justify-center rounded-xl"
                  : "gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl"
              } ${
                isMistakes
                  ? "bg-brand-50 text-brand-700 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <BookmarkCheck
                className={`w-4 h-4 shrink-0 ${isMistakes ? "text-brand-600" : "text-slate-400"}`}
              />
              {!collapsed && <span>Review Mistakes</span>}
            </Link>
          </>
        )}
      </nav>

      {/* ─── 5. Curriculum Summary Card / Footer ─────────────────────────── */}
      <div className={`border-t border-slate-100 bg-slate-50/50 shrink-0 ${collapsed ? "p-2" : "p-4 space-y-3"}`}>
        {!collapsed ? (
          <>
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Curriculum</span>
                <span className="font-bold text-slate-800">{totalUnits} Units</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Exercises</span>
                <span className="font-bold text-slate-800">
                  {totalExercises.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Questions</span>
                <span className="font-bold text-slate-800">
                  {totalQuestions.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center leading-relaxed">
              Murphy's <strong className="text-slate-600">English Grammar in Use</strong>
              <br />
              4th Edition • Cambridge
            </div>

            {/* Quick collapse footer button */}
            {onToggleCollapse && !onCloseMobileMenu && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Thu nhỏ thanh bên"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Thu nhỏ</span>
              </button>
            )}
          </>
        ) : (
          onToggleCollapse && !onCloseMobileMenu && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                title="Mở rộng thanh bên (Expand)"
                aria-label="Mở rộng thanh bên"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Sidebar;