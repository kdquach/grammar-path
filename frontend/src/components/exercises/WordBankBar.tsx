import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Pin,
  PinOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { WordBankItem } from "../../types/api.types";

interface WordBankBarProps {
  items: WordBankItem[];
  onSelectWord?: (word: string) => void;
  sticky?: boolean;
  resetVersion?: number;
}

export const WordBankBar: React.FC<WordBankBarProps> = ({
  items,
  onSelectWord,
  sticky = false,
  resetVersion = 0,
}) => {
  const [usedItemKeys, setUsedItemKeys] = useState<Set<string>>(new Set());
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(sticky);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isStuck, setIsStuck] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsPinned(sticky);
  }, [sticky]);

  useEffect(() => {
    if (resetVersion > 0) {
      setUsedItemKeys(new Set());
      setCopiedWord(null);
    }
  }, [resetVersion]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sticky || !isPinned) {
      setIsStuck(false);
      return;
    }

    const updateStuckState = () => {
      if (!containerRef.current || window.scrollY <= 0) {
        setIsStuck(false);
        return;
      }
      const threshold = window.innerWidth >= 768 ? 13 : 57;
      const top = containerRef.current.getBoundingClientRect().top;
      setIsStuck(top <= threshold);
    };

    updateStuckState();
    window.addEventListener("scroll", updateStuckState, { passive: true });
    window.addEventListener("resize", updateStuckState, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateStuckState);
      window.removeEventListener("resize", updateStuckState);
    };
  }, [sticky, isPinned]);

  if (!items || items.length === 0) {
    return null;
  }

  const getItemKey = (item: WordBankItem, index: number) =>
    item.id ? `${item.id}-${index}` : `word-${index}-${item.word}`;

  const handleWordClick = (itemKey: string, word: string) => {
    // Toggle crossed-out / used state per chip instance (handles duplicate words independently)
    setUsedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });

    // Try copying to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(word).catch(() => {});
      setCopiedWord(word);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopiedWord(null), 1500);
    }

    if (onSelectWord) {
      onSelectWord(word);
    }
  };

  const handleReset = () => {
    setUsedItemKeys(new Set());
  };

  const remainingCount = Math.max(0, items.length - usedItemKeys.size);

  return (
    <div
      ref={containerRef}
      data-testid="word-bank-bar"
      className={`rounded-2xl border p-3.5 transition-shadow ${
        sticky && isPinned ? "sticky top-14 md:top-3 z-20" : ""
      } ${
        isStuck
          ? "bg-white/95 backdrop-blur-md border-brand-300 shadow-lg ring-1 ring-brand-500/15"
          : "bg-slate-50/95 backdrop-blur-md border-slate-200 shadow-sm"
      } ${isCollapsed ? "space-y-0" : "space-y-2.5"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span className="uppercase tracking-wider text-[11px] font-bold text-slate-500">
            Word Bank
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
            {items.length} words
          </span>
          {usedItemKeys.size > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-mono">
              {remainingCount} left
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {copiedWord && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <Check className="w-3 h-3" /> Copied "{copiedWord}"!
            </span>
          )}

          {usedItemKeys.size > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors cursor-pointer"
              title="Reset crossed-out words"
            >
              <RotateCcw className="w-3 h-3" />
              Reset marks ({usedItemKeys.size})
            </button>
          )}

          <div
            className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-400"
            title="Click a word to copy or toggle crossed-out state"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Click to mark/copy</span>
          </div>

          {sticky && (
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              aria-pressed={isPinned}
              title={
                isPinned
                  ? "Unpin Word Bank from top while scrolling"
                  : "Pin Word Bank at top while scrolling"
              }
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                isPinned
                  ? "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isPinned ? (
                <>
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </>
              ) : (
                <>
                  <PinOff className="w-3 h-3" />
                  <span>Pin</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Show Word Bank words" : "Hide Word Bank words"}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-32 sm:max-h-40 overflow-y-auto pt-0.5 pr-0.5">
          {items.map((item, index) => {
            const itemKey = getItemKey(item, index);
            const isUsed = usedItemKeys.has(itemKey);
            return (
              <button
                key={itemKey}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleWordClick(itemKey, item.word)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isUsed
                    ? "bg-slate-200/70 border-slate-300 text-slate-400 line-through opacity-75 shadow-none"
                    : "bg-white border-slate-300 text-slate-800 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50/30 shadow-sm"
                }`}
              >
                <span>{item.word}</span>
                <Copy className="w-2.5 h-2.5 opacity-40" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WordBankBar;

