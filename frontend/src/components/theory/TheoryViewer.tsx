import React, { useState } from "react";
import {
  BookOpen,
  Languages,
  Eye,
  EyeOff,
  FileText,
  Bookmark,
} from "lucide-react";
import type { TheorySection, TextbookExample } from "../../types/api.types";

interface TheoryViewerProps {
  theorySections: TheorySection[];
  textbookExamples: TextbookExample[];
  onOpenRuleModal?: (sectionId: string) => void;
}

export const TheoryViewer: React.FC<TheoryViewerProps> = ({
  theorySections,
  textbookExamples,
  onOpenRuleModal,
}) => {
  // Global translation visibility state
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(true);

  // Individual toggle overrides: map of exampleId -> boolean
  const [revealedTranslations, setRevealedTranslations] = useState<
    Record<string, boolean>
  >({});

  const toggleAllTranslations = () => {
    const nextState = !showAllTranslations;
    setShowAllTranslations(nextState);
    // Reset individual overrides when toggling globally
    setRevealedTranslations({});
  };

  const toggleExampleTranslation = (exampleId: string) => {
    setRevealedTranslations((prev) => {
      const current = prev[exampleId] ?? showAllTranslations;
      return { ...prev, [exampleId]: !current };
    });
  };

  return (
    <div className="space-y-10">
      {/* ─── Part 1: Theory Sections ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Grammar Theory & Rules
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            {theorySections.length} Section{theorySections.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid gap-6">
          {theorySections.map((section) => (
            <div
              key={section.id || section.sectionId}
              id={`section-${section.sectionId}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-colors"
            >
              {/* Header with Section ID badge and PDF page */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm rounded-lg shadow-xs">
                    Section {section.sectionId}
                  </span>
                  {onOpenRuleModal && (
                    <button
                      onClick={() => onOpenRuleModal(section.sectionId)}
                      className="text-xs text-brand-600 hover:text-brand-800 underline font-medium"
                    >
                      Quick lookup
                    </button>
                  )}
                </div>

                {section.sourcePages?.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF p. {section.sourcePages.join(", ")}</span>
                  </span>
                )}
              </div>

              {/* Heading */}
              <h3 className="text-lg font-bold text-slate-900 mb-4 leading-snug">
                {section.heading}
              </h3>

              {/* Formatted source content */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {section.sourceContent}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Part 2: Illustrative Textbook Examples ──────────────────────── */}
      {textbookExamples.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Textbook Illustrative Examples
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {textbookExamples.length} Model Sentence{textbookExamples.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Global Vietnamese Translation Toggle Button */}
            <button
              onClick={toggleAllTranslations}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 shadow-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
              aria-label={
                showAllTranslations
                  ? "Hide all Vietnamese translations"
                  : "Show all Vietnamese translations"
              }
            >
              {showAllTranslations ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-500" />
                  <span>Hide Vietnamese Translations</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Show Vietnamese Translations</span>
                </>
              )}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {textbookExamples.map((ex, index) => {
              const isRevealed =
                revealedTranslations[ex.exampleId] ?? showAllTranslations;

              return (
                <div
                  key={ex.id || ex.exampleId || index}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 flex flex-col justify-between transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Bookmark className="w-3.5 h-3.5 text-brand-500" />
                        <span>Example #{index + 1}</span>
                      </div>
                      {ex.sourcePages?.length > 0 && (
                        <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          p. {ex.sourcePages.join(", ")}
                        </span>
                      )}
                    </div>

                    {/* Original English sentence */}
                    <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                      {ex.originalText}
                    </p>
                  </div>

                  {/* Vietnamese translation toggle & container */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {ex.translationVi ? (
                      <div>
                        {isRevealed ? (
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-emerald-800 font-medium leading-relaxed bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100/80 flex-1">
                              <span className="text-xs uppercase font-bold text-emerald-700 block mb-0.5 tracking-wider">
                                Tiếng Việt:
                              </span>
                              {ex.translationVi}
                            </p>
                            <button
                              onClick={() => toggleExampleTranslation(ex.exampleId)}
                              title="Hide translation"
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleExampleTranslation(ex.exampleId)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline py-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Reveal Vietnamese translation</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No translation available
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default TheoryViewer;
