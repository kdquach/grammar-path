import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { generateGeminiTextDetailed } from "../lib/gemini";
import { AppError } from "../middleware/error-handler";

export const explainTheorySchema = z.object({
  sectionId: z
    .string()
    .trim()
    .min(1, "sectionId cannot be empty")
    .max(20, "sectionId must be 20 characters or less"),
  heading: z
    .string()
    .trim()
    .min(1, "heading cannot be empty")
    .max(300, "heading must be 300 characters or less"),
  sourceContent: z
    .string()
    .trim()
    .min(1, "sourceContent cannot be empty")
    .max(12000, "sourceContent exceeds maximum allowed length of 12000 characters"),
  userQuestion: z
    .string()
    .trim()
    .max(1000, "userQuestion must be 1000 characters or less")
    .optional(),
});

export type ExplainTheoryInput = z.infer<typeof explainTheorySchema>;

export interface AiTheoryExplanationResult {
  explanation: string;
  source: "ai" | "fallback";
  model?: string;
}

/**
 * Generates an educational Vietnamese summary using the actual textbook section content
 * when live Gemini AI generation is unavailable.
 */
export function generateFallbackExplanation(input: ExplainTheoryInput): string {
  const { sectionId, heading, sourceContent, userQuestion } = input;

  const lines = sourceContent
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  const bulletPoints = lines
    .slice(0, 8)
    .map((line) => `- ${line}`)
    .join("\n");

  const pitfallMatches = Array.from(
    new Set(sourceContent.match(/\((?:not|never)\s+[^)]+\)/gi) || [])
  ).slice(0, 5);

  const pitfallSection =
    pitfallMatches.length > 0
      ? pitfallMatches
          .map((p) => `- Tránh cách dùng sai như **${p}** được lưu ý trong sách.`)
          .join("\n")
      : `- Đọc kỹ từng cấu trúc và từ khóa trong **Mục ${sectionId}** để tránh nhầm lẫn khi áp dụng vào ngữ cảnh thực tế.`;

  let customQuestionSection = "";
  if (userQuestion && userQuestion.trim().length > 0) {
    customQuestionSection = `### 💡 Giải đáp thắc mắc của bạn:
> **Câu hỏi:** *"${userQuestion.trim()}"*

**Gợi ý theo nội dung Mục ${sectionId} (${heading}):** Hãy đối chiếu câu hỏi của bạn với các quy tắc và ví dụ trực tiếp trong phần sách giáo khoa dưới đây để nắm đúng cách dùng chuẩn xác.

---`;
  }

  return `## 🤖 Gia sư AI GrammarPath — Tóm tắt Mục ${sectionId}

### 🎯 Điểm cốt lõi: ${heading}
Phần **Mục ${sectionId}** tập trung vào chủ điểm **${heading}**. Dưới đây là tổng hợp các điểm ngữ pháp và ví dụ trực tiếp từ giáo trình *English Grammar in Use*:

${customQuestionSection}

### 📖 Quy tắc & Ví dụ trọng tâm từ sách:
${bulletPoints || `> ${sourceContent}`}

---

### ⚠️ Lưu ý tránh lỗi sai phổ biến:
${pitfallSection}

---

### 💡 Mẹo ghi nhớ nhanh:
> **Lời khuyên:** Đọc to từng ví dụ mẫu trong **Mục ${sectionId}** và tự đặt 2 câu tương tự gắn với tình huống quen thuộc để nhớ tự nhiên hơn.

*(Lưu ý: Hệ thống AI trực tuyến tạm thời chưa phản hồi nên đang hiển thị bản tóm tắt ngoại tuyến từ nội dung sách.)*`;
}

/**
 * Calls Gemini API if GEMINI_API_KEY is available, or gracefully falls back to template.
 */
export async function generateAiTheoryExplanationWithMeta(
  input: ExplainTheoryInput
): Promise<AiTheoryExplanationResult> {
  const promptText = `Bạn là một gia sư tiếng Anh thông thái, thân thiện và giàu kinh nghiệm, chuyên hướng dẫn giáo trình "English Grammar in Use" của Raymond Murphy cho học viên Việt Nam.

Hãy giải thích CHÍNH XÁC phần lý thuyết dưới đây một cách sư phạm, dễ hiểu, tự nhiên bằng tiếng Việt:

---
THÔNG TIN PHẦN HỌC:
- Mục (Section): ${input.sectionId}
- Tiêu đề: ${input.heading}
- Nội dung trích từ sách:
${input.sourceContent}
${input.userQuestion ? `\n- Câu hỏi cụ thể của học viên: "${input.userQuestion}"` : ""}
---

Yêu cầu bắt buộc:
1. Bắt đầu bằng tiêu đề Markdown có chứa đúng mã mục: \`## 🤖 Gia sư AI GrammarPath — Giải thích Mục ${input.sectionId}\` và nêu rõ chủ đề "${input.heading}".
2. ${input.userQuestion ? `Giải đáp trực tiếp và chi tiết câu hỏi của học viên ("${input.userQuestion}"), nhắc lại các từ khóa quan trọng trong câu hỏi.\n3. ` : ""}Chỉ giải thích đúng điểm ngữ pháp trong Mục ${input.sectionId} (${input.heading}) dựa trên nội dung trích từ sách, TUYỆT ĐỐI không lấy ví dụ hay quy tắc của thì/chủ điểm khác không liên quan.
${input.userQuestion ? "4" : "3"}. Phân tích rõ bản chất, quy tắc sử dụng và những điểm dễ gây nhầm lẫn với tư duy tiếng Việt.
${input.userQuestion ? "5" : "4"}. Cung cấp 3 ví dụ thực tế sinh động sát với Mục ${input.sectionId} kèm bản dịch tiếng Việt tự nhiên.
${input.userQuestion ? "6" : "5"}. Nêu 2-3 lỗi sai phổ biến mà người Việt hay mắc phải riêng đối với điểm ngữ pháp "${input.heading}" và cách sửa đúng.
${input.userQuestion ? "7" : "6"}. Kết thúc bằng 1 mẹo ghi nhớ nhanh súc tích.
${input.userQuestion ? "8" : "7"}. Trình bày bằng Markdown sạch đẹp với tiêu đề \`###\`, danh sách \`-\`, in đậm \`**...**\` và dùng \`...\` cho các từ/cụm tiếng Anh minh họa.`;

  const aiResult = await generateGeminiTextDetailed({
    prompt: promptText,
    timeoutMs: 5000,
    temperature: 0.7,
  });

  if (aiResult.ok && aiResult.text.length > 0) {
    let explanation = aiResult.text;
    if (!explanation.includes(input.sectionId)) {
      explanation = `## 🤖 Gia sư AI GrammarPath — Giải thích Mục ${input.sectionId}\n\n${explanation}`;
    }
    return {
      explanation,
      source: "ai",
      model: aiResult.model,
    };
  }

  throw AppError.serviceUnavailable(
    "AI explanation provider is currently unavailable. Please try again later.",
    "AI_PROVIDER_UNAVAILABLE"
  );
}

/**
 * Calls Gemini API if GEMINI_API_KEY is available, or gracefully falls back to template.
 */
export async function generateAiTheoryExplanation(
  input: ExplainTheoryInput
): Promise<string> {
  const result = await generateAiTheoryExplanationWithMeta(input);
  return result.explanation;
}

/**
 * Controller for POST /api/v1/theory/explain-theory
 */
export async function explainTheoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = explainTheorySchema.parse(req.body);
    const result = await generateAiTheoryExplanationWithMeta(parsed);

    sendSuccess(res, {
      explanation: result.explanation,
      source: result.source,
      ...(result.model ? { model: result.model } : {}),
    });
  } catch (error) {
    next(error);
  }
}

