import React, { useState } from "react";
import { Copy, Check, RotateCcw, HelpCircle } from "lucide-react";
import { WordBankItem } from "../../types/api.types";

interface WordBankBarProps {
  items: WordBankItem[];
  onSelectWord?: (word: string) => void;
}

export const WordBankBar: React.FC<WordBankBarProps> = ({ items, onSelectWord }) => {
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const handleWordClick = (word: string) => {
    // Toggle crossed-out / used state
    setUsedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });

    // Try copying to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(word).catch(() => {});
      setCopiedWord(word);
      setTimeout(() => setCopiedWord(null), 1500);
    }

    if (onSelectWord) {
      onSelectWord(word);
    }
  };

  const handleReset = () => {
    setUsedWords(new Set());
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span className="uppercase tracking-wider text-[11px] font-bold text-slate-500">
            Word Bank
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
            {items.length} words
          </span>
        </div>

        <div className="flex items-center gap-3">
          {copiedWord && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <Check className="w-3 h-3" /> Copied "{copiedWord}"!
            </span>
          )}

          {usedWords.size > 0 && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
              title="Reset crossed-out words"
            >
              <RotateCcw className="w-3 h-3" />
              Reset marks ({usedWords.size})
            </button>
          )}

          <div
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400"
            title="Click a word to copy or toggle crossed-out state"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Click to mark/copy</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isUsed = usedWords.has(item.word);
          return (
            <button
              key={item.id || item.word}
              type="button"
              onClick={() => handleWordClick(item.word)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                isUsed
                  ? "bg-slate-200/70 border-slate-300 text-slate-400 line-through opacity-75 shadow-none"
                  : "bg-white border-slate-300 text-slate-800 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50/30 shadow-2xs"
              }`}
            >
              <span>{item.word}</span>
              <Copy className="w-2.5 h-2.5 opacity-40" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WordBankBar;
