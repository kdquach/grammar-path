import React from "react";
import {
  Target,
  AlertTriangle,
  Zap,
  ArrowRight,
  BookmarkCheck,
} from "lucide-react";
import type { UnitDetail } from "../../types/api.types";

interface ToeicSpotlightCardProps {
  unitDetail: UnitDetail;
  onGoToToeicPractice: () => void;
}

export const ToeicSpotlightCard: React.FC<ToeicSpotlightCardProps> = ({
  unitDetail,
  onGoToToeicPractice,
}) => {
  const meta = unitDetail.toeicMetadata;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-500/30 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black shadow-sm shrink-0">
            <Target className="w-5 h-5 text-indigo-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                TOEIC Exam Spotlight
              </span>
              {meta?.priority && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {meta.priority.toUpperCase()} FOCUS
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Trọng tâm đề thi TOEIC — Unit {unitDetail.unitNumber}
            </h3>
          </div>
        </div>

        {meta?.toeicParts && Array.isArray(meta.toeicParts) && meta.toeicParts.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <span className="text-xs text-indigo-200 font-medium">Xuất hiện ở:</span>
            {meta.toeicParts.map((part) => (
              <span
                key={part}
                className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-600/60 text-white border border-indigo-400/40"
              >
                {part}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Core Grammar Focus & Clues */}
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>Điểm ngữ pháp ăn điểm:</span>
          </div>
          <p className="text-slate-200 leading-relaxed font-medium">
            {meta?.grammarFocus || unitDetail.title}
          </p>
          <p className="text-slate-400 text-[11px] pt-1">
            {meta?.noteVi ||
              "Tập trung nhận diện nhanh dạng động từ và trạng từ thời gian đặc trưng trong bài đọc Part 5 & Part 6."}
          </p>
        </div>

        {/* Common Traps in TOEIC */}
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-300 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Bẫy đề thi ETS thường gài:</span>
          </div>
          <ul className="text-slate-300 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
            <li>Lừa chia sai thì do chủ ngữ dài có cụm giới từ chen giữa.</li>
            <li>Gài các phương án nhiễu (distractors) có từ loại tương tự nhưng sai chức năng ngữ pháp.</li>
            <li>Bẫy các động từ không chia tiếp diễn (Stative Verbs) hoặc bẫy thì hoàn thành vs quá khứ.</li>
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-indigo-200">
          <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Làm bài kiểm tra trắc nghiệm 10 câu đạt $\ge 80\%$ để chính thức hoàn thành Unit này.</span>
        </div>

        <button
          type="button"
          onClick={onGoToToeicPractice}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span>Làm bài kiểm tra TOEIC Part 5 ngay</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default ToeicSpotlightCard;
