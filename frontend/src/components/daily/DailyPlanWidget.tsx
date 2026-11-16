import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  RotateCcw,
  Compass,
} from "lucide-react";
import type { DailyPlanResponse, DailyPlanItem } from "../../types/api.types";

interface DailyPlanWidgetProps {
  plan: DailyPlanResponse | null;
  onToggleStatus: (itemId: string, currentStatus: string) => void;
  onOpenStudySession?: (unitNumber: number, exerciseNumber?: string) => void;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  spaced_review: <RotateCcw className="w-4 h-4 text-amber-500" />,
  theory_reading: <BookOpen className="w-4 h-4 text-blue-500" />,
  exercise_practice: <Sparkles className="w-4 h-4 text-brand-600" />,
  mistake_review: <CheckCircle2 className="w-4 h-4 text-rose-500" />,
  toeic_practice: <Compass className="w-4 h-4 text-indigo-500" />,
};

export const DailyPlanWidget: React.FC<DailyPlanWidgetProps> = ({
  plan,
  onToggleStatus,
}) => {
  if (!plan) return null;

  const pct =
    plan.targetMinutes > 0
      ? Math.min(100, Math.round((plan.completedMinutes / plan.targetMinutes) * 100))
      : 0;

  const getActionLink = (item: DailyPlanItem): string => {
    if (item.activityType === "spaced_review") return "/reviews";
    if (item.activityType === "mistake_review") return "/mistakes";
    if (item.activityType === "toeic_practice") return "/roadmap";
    if (item.metadata?.unitNumber) {
      return `/units/${item.metadata.unitNumber}${
        item.metadata.exerciseNumber ? "?tab=toeic_checkpoint" : ""
      }`;
    }
    return "/learning-path";
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Kế hoạch học tập hôm nay
            </h2>
            <p className="text-[11px] text-slate-400">
              Mục tiêu: {plan.targetMinutes} phút • Đã hoàn thành: {plan.completedMinutes} phút ({pct}%)
            </p>
          </div>
        </div>

        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            plan.status === "completed"
              ? "bg-emerald-100 text-emerald-800"
              : plan.status === "in_progress"
              ? "bg-brand-100 text-brand-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {plan.status === "completed"
            ? "Hoàn thành"
            : plan.status === "in_progress"
            ? "Đang học"
            : "Chưa bắt đầu"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-brand-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Activity list */}
      <div className="space-y-2.5">
        {plan.items.map((it) => {
          const isDone = it.status === "completed";
          const link = getActionLink(it);

          return (
            <div
              key={it.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isDone
                  ? "bg-slate-50/80 border-slate-200/60 opacity-80"
                  : "bg-white border-slate-200/90 hover:border-brand-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleStatus(it.id, it.status)}
                  className="p-1 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer shrink-0"
                  title={isDone ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ACTIVITY_ICONS[it.activityType] || <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    <span
                      className={`text-xs font-bold truncate ${
                        isDone ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {it.title}
                    </span>
                  </div>
                  {it.description && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {it.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  ~{it.estimatedMinutes}m
                </span>

                <Link
                  to={link}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-600 transition-colors"
                  title="Bắt đầu hoạt động"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyPlanWidget;

