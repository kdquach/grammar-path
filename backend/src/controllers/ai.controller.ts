import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";

export const explainTheorySchema = z.object({
  sectionId: z.string().trim().min(1, "sectionId cannot be empty"),
  heading: z.string().trim().min(1, "heading cannot be empty"),
  sourceContent: z.string().trim().min(1, "sourceContent cannot be empty"),
  userQuestion: z.string().trim().optional(),
});

export type ExplainTheoryInput = z.infer<typeof explainTheorySchema>;

/**
 * Generates an educational, pedagogical Vietnamese explanation using a structured fallback template
 * tailored to Raymond Murphy's "English Grammar in Use".
 */
export function generateFallbackExplanation(input: ExplainTheoryInput): string {
  const { sectionId, heading, sourceContent, userQuestion } = input;

  const lines = sourceContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sampleLines = lines.slice(0, 4).join("\n> ");

  let customQuestionSection = "";
  if (userQuestion && userQuestion.trim().length > 0) {
    customQuestionSection = `### 💡 Giải đáp thắc mắc của bạn:
> **Câu hỏi:** *"${userQuestion.trim()}"*

**Trả lời:** Đối với chủ điểm **${heading} (Mục ${sectionId})**, bạn cần chú ý ngữ cảnh sử dụng thực tế. Hãy quan sát thời điểm diễn ra hành động và dấu hiệu thời gian trong câu để quyết định cách chia thì hoặc cấu trúc phù hợp. Phần phân tích chi tiết dưới đây sẽ giúp bạn giải tỏa băn khoăn này!

---`;
  }

  return `## 🤖 Gia sư AI GrammarPath — Giải thích Mục ${sectionId}

### 🎯 Điểm cốt lõi: ${heading}
Điểm ngữ pháp trong **Mục ${sectionId}** giúp người học nắm bắt cách diễn đạt tự nhiên chuẩn xác của **${heading}**. Khi học phần này, hãy tập trung vào ngữ cảnh hành động thay vì dịch máy móc từng từ sang tiếng Việt.

${customQuestionSection}

### 📖 Nội dung trích xuất từ sách giáo khoa:
> ${sampleLines}

---

### 🔍 Phân tích cấu trúc & Ý nghĩa chi tiết:
1. **Bản chất ngữ pháp:**
   - Cấu trúc này làm rõ ý nghĩa của hành động hoặc trạng thái gắn liền với tiêu đề *"${heading}"*.
   - Chú ý sự liên kết giữa chủ ngữ, trợ động từ (auxiliary verb) và dạng thức của động từ chính.

2. **Dấu hiệu nhận biết trong câu:**
   - Để ý các phó từ chỉ tần suất, trạng từ chỉ thời gian hoặc ngữ cảnh câu văn để nhận biết thì/cấu trúc tương ứng.
   - Nhận định rõ đối tượng thực hiện hành động để chia đúng dạng số ít/số nhiều.

---

### 📝 Ví dụ minh họa thực tế & Dịch nghĩa:
- **Ví dụ 1 (Khẳng định):**
  - *English:* "She is studying grammar right now."
  - *Tiếng Việt:* "Cô ấy đang học ngữ pháp ngay lúc này." (Hành động đang diễn ra tại thời điểm nói).
- **Ví dụ 2 (Nghi vấn):**
  - *English:* "Are you listening to me?"
  - *Tiếng Việt:* "Bạn có đang lắng nghe tôi nói không?"
- **Ví dụ liên hệ Mục ${sectionId}:**
  - *Áp dụng:* Hãy quan sát các câu đối thoại thực tế trong sách để thấy rõ sự biến chuyển linh hoạt của ngữ pháp.

---

### ⚠️ Lỗi sai người học Việt Nam hay gặp:
- **Thiếu trợ động từ:** Rất hay quên các động từ to-be hoặc trợ động từ đi trước động từ chính.
- **Dịch thô (Word-by-word):** Áp dụng ngữ pháp tiếng Việt trực tiếp khiến câu tiếng Anh mất đi sự tự nhiên.
- **Nhầm lẫn thời điểm hành động:** Cần phân biệt rõ giữa việc mang tính tạm thời và việc mang tính quy luật thường xuyên.

---

### 💡 Mẹo ghi nhớ nhanh:
> **Lời khuyên từ gia sư:** Hãy đọc to thành tiếng các câu ví dụ mẫu. Việc luyện nói cả câu giúp não bộ ghi nhớ ngữ điệu và phản xạ ngữ pháp tự nhiên hơn là chỉ học thuộc lòng công thức!`;
}

/**
 * Calls Gemini API if GEMINI_API_KEY is available, or gracefully falls back to template.
 */
export async function generateAiTheoryExplanation(
  input: ExplainTheoryInput
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return generateFallbackExplanation(input);
  }

  try {
    const promptText = `Bạn là một gia sư tiếng Anh thông thái, thân thiện và giàu kinh nghiệm, chuyên hướng dẫn giáo trình "English Grammar in Use" của Raymond Murphy cho học viên Việt Nam.

Hãy giải thích phần lý thuyết sau một cách sư phạm, dễ hiểu, tự nhiên bằng tiếng Việt:

---
THÔNG TIN PHẦN HỌC:
- Mục (Section): ${input.sectionId}
- Tiêu đề: ${input.heading}
- Nội dung trích từ sách:
${input.sourceContent}
${input.userQuestion ? `\n- Câu hỏi cụ thể của học viên: "${input.userQuestion}"` : ""}
---

Yêu cầu trình bày:
1. ${input.userQuestion ? `Giải đáp trực tiếp câu hỏi của học viên: "${input.userQuestion}".\n2. ` : ""}Giải thích bản chất và công thức/quy tắc của điểm ngữ pháp này bằng tiếng Việt dễ hiểu.
3. Cung cấp 2-3 ví dụ thực tế kèm bản dịch tiếng Việt rõ ràng.
4. Nêu các lỗi sai phổ biến mà người học Việt Nam hay gặp đối với điểm ngữ pháp này.
5. Cung cấp mẹo ghi nhớ nhanh.
6. Sử dụng định dạng Markdown đẹp mắt với tiêu đề, danh sách dấu gạch đầu dòng và in đậm từ khóa.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText && aiText.trim().length > 0) {
        return aiText.trim();
      }
    }

    // Fallback if API returned error or empty response
    return generateFallbackExplanation(input);
  } catch {
    // Fallback gracefully on network error or timeout
    return generateFallbackExplanation(input);
  }
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
    const explanation = await generateAiTheoryExplanation(parsed);

    sendSuccess(res, {
      explanation,
    });
  } catch (error) {
    next(error);
  }
}

