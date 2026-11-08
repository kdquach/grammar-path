import React, { useState, useMemo } from "react";
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ArrowLeftRight,
  Lightbulb,
  PlusCircle,
  Bookmark,
  Zap,
  MessageSquare,
} from "lucide-react";

interface FormattedTheoryContentProps {
  content: string;
  sectionId?: string;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization: safely add clean breaks to text that lacks newlines
// ─────────────────────────────────────────────────────────────────────────────
function normalizeTheoryText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();

  // 1. Break before known callout/section triggers if stuck to previous sentence
  text = text.replace(/([.?!]|\))\s+(This means:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Remember:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Note:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Compare:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Also:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(For example:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Some more examples:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Examples:)/gi, "$1\n\n$2");
  text = text.replace(/([.?!]|\))\s+(Do not use\s+[^:\n]+:)/gi, "$1\n\n$2");

  // 2. Break before grammar definitions that were stuck to sentences
  // e.g. 'Am/is/are + -ing is the present continuous:'
  text = text.replace(
    /([.?!]|\))\s+((?:[A-Z][a-z/()]+\s+\+\s+-[a-z]+|[A-Z][a-z/()]+\s+etc\.)\s+is the [^:\n]+:)/g,
    "$1\n\n$2"
  );
  // e.g. Unit 2A: '(He is asleep.) but He drives a bus. (He is a bus driver.) Drive(s)/work(s)/do(es) etc. is the present simple:'
  text = text.replace(/(\))\s+(but He drives a bus)/gi, "$1\n$2");
  text = text.replace(/(\))\s+(Drive\(s\)\/[^:]+:)/gi, "$1\n\n$2");

  // 3. Break after colons that directly precede pronoun conjugation tables or lists
  // e.g. ': I/we/you/they' -> ':\nI/we/you/they'
  // e.g. 'order:\n1 how big?' -> 'order:\n\n1 how big?'
  text = text.replace(
    /:\s+(I\/we\/you\/they|am \(=I'm\)|do I\/we\/you\/they)/gi,
    ":\n$1"
  );
  text = text.replace(/:\s*\n(?=\d+[\.\)]?\s+|[-•*]\s+)/g, ":\n\n");

  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Tokenizer: highlights pitfalls (not ...), meanings (= ...), etc.
// ─────────────────────────────────────────────────────────────────────────────
export const renderInlineTokens = (text: string): React.ReactNode => {
  // Regex captures:
  // 1. Pitfall mistakes: (not ...) or (never ...)
  // 2. Meaning equivalents: (= ...)
  const tokenRegex = /(\((?:not|never)\s+[^)]+\)|\(=[^)]+\))/gi;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Pitfall / Mistake (not ...)
    const pitfallMatch = part.match(/^\((?:not|never)\s+([^)]+)\)$/i);
    if (pitfallMatch) {
      const wrongText = pitfallMatch[1];
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs align-middle"
          title="Lỗi sai phổ biến cần tránh"
        >
          <span className="line-through decoration-rose-400 font-normal">
            not {wrongText}
          </span>
          <span className="text-[10px] px-1 py-0.2 bg-rose-100 text-rose-600 rounded font-bold uppercase tracking-wider">
            Sai
          </span>
        </span>
      );
    }

    // Meaning / Equivalence (= ...)
    const meaningMatch = part.match(/^\(=([^)]+)\)$/);
    if (meaningMatch) {
      const meaningText = meaningMatch[1];
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 align-middle"
          title="Giải thích ý nghĩa tương đương"
        >
          <span className="text-sky-600 font-bold">💡 =</span>
          <span>{meaningText}</span>
        </span>
      );
    }

    // Plain text
    return <span key={idx}>{part}</span>;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Block Types & Parser
// ─────────────────────────────────────────────────────────────────────────────
interface TheoryBlock {
  type:
    | "callout"
    | "formula"
    | "numbered-list"
    | "bullet-list"
    | "dialogue"
    | "standard";
  calloutType?: "remember" | "note" | "compare" | "meaning" | "example" | "also" | "warning";
  calloutTitle?: string;
  lines: string[];
}

function parseBlocks(raw: string): TheoryBlock[] {
  const normalized = normalizeTheoryText(raw);
  const paragraphs = normalized.split(/\n\s*\n+/);
  const blocks: TheoryBlock[] = [];

  for (const para of paragraphs) {
    const rawLines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!rawLines.length) continue;

    const first = rawLines[0];

    // 1. Callouts
    const calloutMatch = first.match(
      /^(Remember|Note|Compare|This means|Also|For example|Examples|Some more examples|Do not use)[^:]*:\s*(.*)$/i
    );
    if (calloutMatch) {
      const keyword = calloutMatch[1].toLowerCase();
      let calloutType: TheoryBlock["calloutType"] = "note";
      let calloutTitle = "Ghi chú";

      if (keyword.includes("remember")) {
        calloutType = "remember";
        calloutTitle = "Lưu ý quan trọng (Remember)";
      } else if (keyword.includes("compare")) {
        calloutType = "compare";
        calloutTitle = "So sánh đối chiếu (Compare)";
      } else if (keyword.includes("means")) {
        calloutType = "meaning";
        calloutTitle = "Giải thích ý nghĩa (This means)";
      } else if (keyword.includes("example")) {
        calloutType = "example";
        calloutTitle = "Ví dụ minh họa (Examples)";
      } else if (keyword.includes("also")) {
        calloutType = "also";
        calloutTitle = "Bổ sung (Also)";
      } else if (keyword.includes("do not use")) {
        calloutType = "warning";
        calloutTitle = "Không sử dụng (Warning)";
      }

      blocks.push({
        type: "callout",
        calloutType,
        calloutTitle,
        lines: rawLines,
      });
      continue;
    }

    // 2. Numbered list
    const isNumbered = rawLines.every((l) => /^\d+[\.\)]?\s+/.test(l));
    if (isNumbered) {
      blocks.push({
        type: "numbered-list",
        lines: rawLines,
      });
      continue;
    }

    // 3. Bullet list
    const isBullet = rawLines.every((l) => /^[-•*]\s+/.test(l));
    if (isBullet) {
      blocks.push({
        type: "bullet-list",
        lines: rawLines,
      });
      continue;
    }

    // 4. Formula block
    const isFormula = rawLines.some(
      (l) =>
        l.includes(" + ") ||
        /is the present (?:simple|continuous)/i.test(l) ||
        /\b(I\/we\/you\/they|he\/she\/it|do\/does|am\/is\/are)\s+[a-z/]+/i.test(l)
    );
    if (isFormula && rawLines.length <= 4) {
      blocks.push({
        type: "formula",
        lines: rawLines,
      });
      continue;
    }

    // 5. Dialogue block
    const isDialogue = rawLines.every(
      (l) =>
        /^[A-Z]{1,8}:\s+/.test(l) ||
        (/^'[^']+'/.test(l) && /'[^']+'$/.test(l))
    );
    if (isDialogue && rawLines.length >= 2) {
      blocks.push({
        type: "dialogue",
        lines: rawLines,
      });
      continue;
    }

    // 6. Standard paragraph / mixed lines
    blocks.push({
      type: "standard",
      lines: rawLines,
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: FormattedTheoryContent
// ─────────────────────────────────────────────────────────────────────────────
export const FormattedTheoryContent: React.FC<FormattedTheoryContentProps> = ({
  content,
  sectionId,
  className = "",
}) => {
  const [isRawView, setIsRawView] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const blocks = useMemo(() => parseBlocks(content), [content]);

  const handleCopy = () => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={`space-y-3 ${className}`}
      data-section-id={sectionId}
    >
      {/* Top Utility Toolbar */}
      <div className="flex items-center justify-between text-xs pb-1 text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsRawView(false)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              !isRawView
                ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
            title="Hiển thị dạng định dạng thông minh, dễ đọc"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Trình bày dễ đọc</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRawView(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              isRawView
                ? "bg-slate-200 text-slate-800 border border-slate-300 font-semibold"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
            title="Hiển thị văn bản gốc nguyên bản"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Nguyên bản</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Sao chép nội dung lý thuyết"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-medium">Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Raw View Mode */}
      {isRawView ? (
        <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {content}
        </div>
      ) : (
        /* Smart Structured View Mode */
        <div className="space-y-4 text-slate-800 font-sans text-sm sm:text-base leading-relaxed">
          {blocks.map((block, bIdx) => {
            // ── 1. Callout Card ──
            if (block.type === "callout") {
              const theme = getCalloutTheme(block.calloutType);
              const IconComponent = theme.icon;

              return (
                <div
                  key={bIdx}
                  className={`rounded-xl border p-4 shadow-2xs space-y-2 ${theme.containerClass}`}
                >
                  <div className="flex items-center gap-2">
                    <IconComponent className={`w-4 h-4 ${theme.iconClass}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${theme.titleClass}`}>
                      {block.calloutTitle}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-6 text-sm sm:text-[15px]">
                    {block.lines.map((line, lIdx) => {
                      // Strip callout prefix on line 0 if it exists
                      const cleanLine =
                        lIdx === 0
                          ? line.replace(
                              /^(Remember|Note|Compare|This means|Also|For example|Examples|Some more examples|Do not use)[^:]*:\s*/i,
                              ""
                            )
                          : line;
                      if (!cleanLine.trim()) return null;
                      return (
                        <p key={lIdx} className="leading-relaxed">
                          {renderInlineTokens(cleanLine)}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ── 2. Formula Box ──
            if (block.type === "formula") {
              return (
                <div
                  key={bIdx}
                  className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-xl p-4 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold uppercase tracking-wide">
                    <Zap className="w-4 h-4 text-brand-600" />
                    <span>Cấu trúc / Công thức ngữ pháp</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-xs sm:text-sm text-slate-900 bg-white/80 p-3 rounded-lg border border-blue-100 shadow-2xs overflow-x-auto leading-relaxed">
                    {block.lines.map((line, lIdx) => (
                      <div key={lIdx} className="whitespace-pre-wrap">
                        {renderInlineTokens(line)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // ── 3. Numbered List ──
            if (block.type === "numbered-list") {
              return (
                <div key={bIdx} className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/80">
                  {block.lines.map((line, lIdx) => {
                    const match = line.match(/^(\d+)[\.\)]?\s+(.*)$/);
                    const num = match ? match[1] : `${lIdx + 1}`;
                    const text = match ? match[2] : line;

                    return (
                      <div key={lIdx} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center mt-0.5">
                          {num}
                        </span>
                        <div className="flex-1 leading-relaxed text-slate-800">
                          {renderInlineTokens(text)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // ── 4. Bullet List ──
            if (block.type === "bullet-list") {
              return (
                <ul key={bIdx} className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200/70">
                  {block.lines.map((line, lIdx) => {
                    const clean = line.replace(/^[-•*]\s+/, "");
                    return (
                      <li key={lIdx} className="flex items-start gap-2 text-sm sm:text-[15px] text-slate-800">
                        <span className="text-brand-500 font-bold select-none leading-none mt-1">
                          •
                        </span>
                        <div className="flex-1 leading-relaxed">
                          {renderInlineTokens(clean)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            }

            // ── 5. Dialogue Exchanges ──
            if (block.type === "dialogue") {
              return (
                <div key={bIdx} className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Hội thoại mẫu (Dialogue)</span>
                  </div>
                  {block.lines.map((line, lIdx) => {
                    const speakerMatch = line.match(/^([A-Z]{1,8}):\s+(.*)$/);
                    if (speakerMatch) {
                      const speaker = speakerMatch[1];
                      const spoken = speakerMatch[2];
                      const isSpeakerA = speaker === "A" || speaker === "DAVE";

                      return (
                        <div key={lIdx} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-xs flex-shrink-0 ${
                              isSpeakerA
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {speaker}
                          </span>
                          <span className="text-slate-800 font-medium">
                            {renderInlineTokens(spoken)}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={lIdx} className="text-sm sm:text-[15px] italic text-slate-700 pl-4 border-l-2 border-slate-300">
                        {renderInlineTokens(line)}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // ── 6. Standard Paragraph / Sentences ──
            return (
              <div key={bIdx} className="space-y-2">
                {block.lines.map((line, lIdx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;

                  // Subheading ending with colon
                  if (trimmed.endsWith(":") && trimmed.length < 120) {
                    return (
                      <h5
                        key={lIdx}
                        className="font-bold text-slate-900 text-sm sm:text-base mt-2 mb-1 leading-snug flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                        <span>{renderInlineTokens(trimmed)}</span>
                      </h5>
                    );
                  }

                  // Single dialogue line like 'What do you do?' 'I work in a shop.'
                  if (/^'[^']+'\s+'[^']+'/.test(trimmed)) {
                    return (
                      <div
                        key={lIdx}
                        className="bg-slate-50/70 border-l-2 border-brand-400 pl-3 py-1.5 my-1 text-sm sm:text-[15px] text-slate-800 rounded-r-md"
                      >
                        {renderInlineTokens(trimmed)}
                      </div>
                    );
                  }

                  // Bullet line within standard block
                  if (/^[-•*]\s+/.test(trimmed)) {
                    const clean = trimmed.replace(/^[-•*]\s+/, "");
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-2 text-sm sm:text-[15px] text-slate-800">
                        <span className="text-brand-500 font-bold select-none leading-none mt-1">
                          •
                        </span>
                        <div className="flex-1 leading-relaxed">
                          {renderInlineTokens(clean)}
                        </div>
                      </div>
                    );
                  }

                  // Numbered line within standard block
                  if (/^\d+[\.\)]?\s+/.test(trimmed)) {
                    const match = trimmed.match(/^(\d+)[\.\)]?\s+(.*)$/);
                    const num = match ? match[1] : "";
                    const text = match ? match[2] : trimmed;
                    return (
                      <div key={lIdx} className="flex items-start gap-2.5 pl-1 my-1 text-sm sm:text-[15px]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center mt-0.5">
                          {num}
                        </span>
                        <div className="flex-1 leading-relaxed text-slate-800">
                          {renderInlineTokens(text)}
                        </div>
                      </div>
                    );
                  }

                  // Regular sentence / statement with breathing room
                  return (
                    <p
                      key={lIdx}
                      className="text-slate-800 text-sm sm:text-[15px] leading-relaxed"
                    >
                      {renderInlineTokens(trimmed)}
                    </p>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: Callout themes and icons
// ─────────────────────────────────────────────────────────────────────────────
function getCalloutTheme(type?: string) {
  switch (type) {
    case "remember":
      return {
        icon: AlertTriangle,
        containerClass: "bg-amber-50/80 border-amber-200 text-amber-950",
        iconClass: "text-amber-600",
        titleClass: "text-amber-800",
      };
    case "compare":
      return {
        icon: ArrowLeftRight,
        containerClass: "bg-purple-50/80 border-purple-200 text-purple-950",
        iconClass: "text-purple-600",
        titleClass: "text-purple-800",
      };
    case "meaning":
      return {
        icon: Lightbulb,
        containerClass: "bg-sky-50/80 border-sky-200 text-sky-950",
        iconClass: "text-sky-600",
        titleClass: "text-sky-800",
      };
    case "example":
      return {
        icon: Bookmark,
        containerClass: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
        iconClass: "text-emerald-600",
        titleClass: "text-emerald-800",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        containerClass: "bg-rose-50/80 border-rose-200 text-rose-950",
        iconClass: "text-rose-600",
        titleClass: "text-rose-800",
      };
    case "also":
      return {
        icon: PlusCircle,
        containerClass: "bg-slate-100/90 border-slate-200 text-slate-900",
        iconClass: "text-slate-600",
        titleClass: "text-slate-700",
      };
    case "note":
    default:
      return {
        icon: Info,
        containerClass: "bg-amber-50/70 border-amber-200 text-amber-950",
        iconClass: "text-amber-600",
        titleClass: "text-amber-800",
      };
  }
}

export default FormattedTheoryContent;
