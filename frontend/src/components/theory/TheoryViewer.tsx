import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Languages,
  Eye,
  EyeOff,
  FileText,
  Bookmark,
  Sparkles,
  X,
  Loader2,
  Send,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import type { TheorySection, TextbookExample } from "../../types/api.types";
import api from "../../api/client";
import { FormattedTheoryContent } from "./FormattedTheoryContent";

interface TheoryViewerProps {
  theorySections: TheorySection[];
  textbookExamples: TextbookExample[];
  onOpenRuleModal?: (sectionId: string) => void;
  onRequireAuth?: () => void;
}

export const TheoryViewer: React.FC<TheoryViewerProps> = ({
  theorySections,
  textbookExamples,
  onOpenRuleModal,
  onRequireAuth,
}) => {
  // Global translation visibility state
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(true);

  // Individual toggle overrides: map of exampleId -> boolean
  const [revealedTranslations, setRevealedTranslations] = useState<
    Record<string, boolean>
  >({});

  // AI Explainer Drawer / Modal State
  const [activeAiSection, setActiveAiSection] = useState<TheorySection | null>(
    null
  );
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"ai" | "fallback" | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAiModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAiModalOpen]);

  const toggleAllTranslations = () => {
    const nextState = !showAllTranslations;
    setShowAllTranslations(nextState);
    setRevealedTranslations({});
  };

  const toggleExampleTranslation = (exampleId: string) => {
    setRevealedTranslations((prev) => {
      const current = prev[exampleId] ?? showAllTranslations;
      return { ...prev, [exampleId]: !current };
    });
  };

  const handleOpenAiModal = (section: TheorySection) => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }

    setActiveAiSection(section);
    setIsAiModalOpen(true);
    setUserQuestion("");
    setAiExplanation(null);
    setAiSource(null);
    setAiModel(null);
    setAiError(null);

    // Automatically trigger initial explanation
    fetchAiExplanation(section);
  };

  const fetchAiExplanation = (section: TheorySection, customQuestion?: string) => {
    setIsAiLoading(true);
    setAiError(null);

    api
      .explainTheory({
        sectionId: section.sectionId,
        heading: section.heading,
        sourceContent: section.sourceContent,
        userQuestion: customQuestion && customQuestion.trim().length > 0 ? customQuestion.trim() : undefined,
      })
      .then((res) => {
        setAiExplanation(res.explanation);
        setAiSource(res.source || null);
        setAiModel(res.model || null);
        setIsAiLoading(false);
      })
      .catch((err) => {
        if (err?.code === "UNAUTHORIZED") {
          setAiError(
            "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập để sử dụng Gia sư AI."
          );
        } else if (err?.code === "AI_PROVIDER_UNAVAILABLE") {
          setAiError(
            "Dịch vụ Gia sư AI hiện đang tạm gián đoạn. Vui lòng thử lại sau."
          );
        } else if (err?.code === "RATE_LIMIT_EXCEEDED") {
          setAiError(
            "Bạn đã gửi quá nhiều yêu cầu AI trong thời gian ngắn. Vui lòng đợi một lát rồi thử lại."
          );
        } else {
          setAiError(
            err?.message || "Không thể tải giải thích từ AI lúc này. Vui lòng thử lại!"
          );
        }
        setIsAiLoading(false);
      });
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAiSection) return;
    fetchAiExplanation(activeAiSection, userQuestion);
  };

  const handlePromptChipClick = (promptText: string) => {
    setUserQuestion(promptText);
    if (activeAiSection) {
      fetchAiExplanation(activeAiSection, promptText);
    }
  };

  const aiModalNode =
    isAiModalOpen && activeAiSection ? (
      <div
        className="fixed inset-0 z-50 m-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tutor-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsAiModalOpen(false);
          }
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] my-auto flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 to-brand-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3
                  id="ai-tutor-modal-title"
                  className="text-base font-extrabold text-slate-900 leading-tight"
                >
                  Gia sư AI — Mục {activeAiSection.sectionId}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-md">
                  {activeAiSection.heading}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              aria-label="Close AI explanation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Optional Custom Question Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hỏi AI về phần lý thuyết này (tùy chọn):</span>
              </label>
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="VD: Khi nào không dùng thì này / cấu trúc này? Người Việt hay nhầm chỗ nào?..."
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isAiLoading}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Hỏi AI</span>
                </button>
              </form>

              {/* Prompt suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Gợi ý câu hỏi:</span>
                <button
                  type="button"
                  onClick={() => handlePromptChipClick("Cho thêm ví dụ giao tiếp thông dụng hàng ngày")}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  + Ví dụ giao tiếp
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptChipClick("Những lỗi sai phổ biến mà người Việt hay gặp là gì?")}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  + Lỗi người Việt hay gặp
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptChipClick("Tóm tắt công thức ngắn gọn và mẹo ghi nhớ nhanh")}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  + Tóm tắt & mẹo nhớ
                </button>
              </div>
            </div>

            {/* Explanation Content Box */}
            {isAiLoading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-medium text-slate-600">
                  Đang triệu hồi AI gia sư phân tích và giải thích bài học...
                </p>
              </div>
            )}

            {aiError && !isAiLoading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAiExplanation(activeAiSection, userQuestion)}
                  className="px-3 py-1 bg-white border border-rose-300 rounded font-bold hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                >
                  Thử lại
                </button>
              </div>
            )}

            {aiExplanation && !isAiLoading && (
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      aiSource === "fallback"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {aiSource === "fallback"
                      ? "Tóm tắt ngoại tuyến"
                      : aiModel
                      ? `AI trực tiếp (${aiModel})`
                      : "AI Gia sư"}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchAiExplanation(activeAiSection, userQuestion)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    title="Tạo lời giải thích mới"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Giảng lại mới</span>
                  </button>
                </div>
                {renderFormattedMarkdown(aiExplanation)}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              GrammarPath Adaptive AI Explainer Engine
            </span>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
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
              {/* Header with Section ID badge, quick lookup, and PDF page */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm rounded-lg shadow-xs">
                    Section {section.sectionId}
                  </span>
                  {onOpenRuleModal && (
                    <button
                      onClick={() => onOpenRuleModal(section.sectionId)}
                      className="text-xs text-brand-600 hover:text-brand-800 underline font-medium cursor-pointer"
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
              <FormattedTheoryContent
                content={section.sourceContent}
                sectionId={section.sectionId}
              />

              {/* AI Explainer Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-slate-400">
                  Cần giải thích dễ hiểu hơn bằng tiếng Việt?
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenAiModal(section)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🤖 AI giảng lại bằng tiếng Việt</span>
                </button>
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
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 shadow-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer"
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
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleExampleTranslation(ex.exampleId)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline py-1 cursor-pointer"
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

      {/* ─── Part 3: Interactive AI Explainer Modal (Portaled to document.body) ── */}
      {aiModalNode &&
        (typeof document !== "undefined"
          ? createPortal(aiModalNode, document.body)
          : aiModalNode)}
    </>
  );
};

/**
 * Lightweight helper to render formatted markdown explanation nicely with headings, quotes, and bullets.
 */
function renderFormattedMarkdown(markdown: string) {
  const lines = markdown.split("\n");

  return (
    <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={idx}
              className="font-bold text-xs sm:text-sm text-indigo-900 mt-2.5 mb-1"
            >
              {renderFormattedText(trimmed.slice(5))}
            </h5>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="font-extrabold text-xs sm:text-sm text-indigo-950 mt-3 mb-1 flex items-center gap-1.5"
            >
              <span>{renderFormattedText(trimmed.slice(4))}</span>
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="font-black text-sm sm:text-base text-slate-900 mt-4 mb-2 pb-1 border-b border-indigo-100"
            >
              {renderFormattedText(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="font-black text-base text-slate-900 mt-3 mb-2 pb-1 border-b border-indigo-200"
            >
              {renderFormattedText(trimmed.slice(2))}
            </h2>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="border-l-3 border-indigo-500 bg-indigo-50/70 p-2.5 rounded-r-lg text-slate-700 italic my-2 text-[11px] sm:text-xs"
            >
              {renderFormattedText(trimmed.slice(2))}
            </blockquote>
          );
        }
        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, "");
          const indentClass = leadingSpaces >= 2 ? "ml-6" : "ml-2";
          return (
            <div key={idx} className={`flex items-start gap-2 ${indentClass}`}>
              <span className="text-indigo-600 font-bold select-none">
                {leadingSpaces >= 2 ? "◦" : "•"}
              </span>
              <div className="flex-1">{renderFormattedText(content)}</div>
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const spaceIdx = trimmed.indexOf(" ");
          const numberPart = trimmed.slice(0, spaceIdx + 1);
          const restPart = trimmed.slice(spaceIdx + 1);
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-indigo-600 font-bold select-none">{numberPart}</span>
              <div className="flex-1">{renderFormattedText(restPart)}</div>
            </div>
          );
        }
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={idx} className="my-3 border-slate-200" />;
        }
        return <p key={idx}>{renderFormattedText(trimmed)}</p>;
      })}
    </div>
  );
}

function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {renderFormattedText(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-100 font-mono text-[11px] sm:text-xs font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default TheoryViewer;
