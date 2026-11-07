export interface ToeicOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ToeicQuestion {
  prompt: string;
  options: ToeicOption[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface GenerateToeicOptions {
  unitNumber: number;
  title: string;
  theorySections?: Array<{ sectionId: string; heading: string; sourceContent: string }>;
  textbookExamples?: Array<{ originalText: string; translationVi?: string | null }>;
  count?: number;
}

// ─── Curated Fallback Question Banks for Core Grammar Units ───────────────────
const CURATED_TOEIC_UNIT_QUESTIONS: Record<number, ToeicQuestion[]> = {
  1: [
    {
      prompt: "Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now.",
      options: [
        { key: "A", text: "conducts" },
        { key: "B", text: "is conducting" },
        { key: "C", text: "conducted" },
        { key: "D", text: "has conducted" },
      ],
      correctAnswer: "B",
      explanation: "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói. Vì vậy, ta chia động từ ở thì Hiện tại tiếp diễn (Present Continuous): 'is conducting'.",
    },
    {
      prompt: "Please speak quietly in the lobby because the marketing director _______ an important client on the phone.",
      options: [
        { key: "A", text: "is calling" },
        { key: "B", text: "calls" },
        { key: "C", text: "called" },
        { key: "D", text: "was calling" },
      ],
      correctAnswer: "A",
      explanation: "Mệnh lệnh 'Please speak quietly' báo hiệu một tình huống đang diễn ra tại hiện tại, do đó cần dùng thì Hiện tại tiếp diễn 'is calling'.",
    },
    {
      prompt: "The IT support team _______ a new cybersecurity protocol across all company computers this week.",
      options: [
        { key: "A", text: "is installing" },
        { key: "B", text: "installed" },
        { key: "C", text: "installs" },
        { key: "D", text: "install" },
      ],
      correctAnswer: "A",
      explanation: "Trạng ngữ 'this week' diễn tả một tiến trình hoặc dự án tạm thời đang diễn ra xung quanh thời điểm hiện tại, do đó dùng thì Hiện tại tiếp diễn 'is installing'.",
    },
    {
      prompt: "Why _______ so many employees _______ over the recent changes to the annual leave policy today?",
      options: [
        { key: "A", text: "do / debate" },
        { key: "B", text: "are / debating" },
        { key: "C", text: "have / debated" },
        { key: "D", text: "were / debating" },
      ],
      correctAnswer: "B",
      explanation: "Dấu hiệu 'today' trong ngữ cảnh hiện tại mô tả hành động đang diễn ra trong ngày hôm nay. Cấu trúc câu hỏi thì Hiện tại tiếp diễn với chủ ngữ số nhiều (so many employees) là 'are ... debating'.",
    },
    {
      prompt: "According to the corporate announcement, our international market share _______ steadily this quarter.",
      options: [
        { key: "A", text: "grew" },
        { key: "B", text: "grows" },
        { key: "C", text: "is growing" },
        { key: "D", text: "was grown" },
      ],
      correctAnswer: "C",
      explanation: "Thì Hiện tại tiếp diễn được sử dụng để miêu tả một xu hướng thay đổi hoặc phát triển đang diễn ra ('is growing steadily this quarter').",
    },
    {
      prompt: "Mr. Yamamoto cannot attend the budget meeting because he _______ an urgent proposal for the board.",
      options: [
        { key: "A", text: "prepares" },
        { key: "B", text: "is preparing" },
        { key: "C", text: "prepared" },
        { key: "D", text: "has prepared" },
      ],
      correctAnswer: "B",
      explanation: "Lý do anh Yamamoto không thể tham dự cuộc họp là vì anh ấy đang bận soạn thảo đề xuất ngay lúc này, dùng thì Hiện tại tiếp diễn 'is preparing'.",
    },
  ],
  2: [
    {
      prompt: "The human resources manager usually _______ employment verification letters within two business days.",
      options: [
        { key: "A", text: "issues" },
        { key: "B", text: "is issuing" },
        { key: "C", text: "issued" },
        { key: "D", text: "has been issuing" },
      ],
      correctAnswer: "A",
      explanation: "Phó từ chỉ tần suất 'usually' diễn tả thói quen hoặc quy trình làm việc thường xuyên, chia thì Hiện tại đơn (Present Simple) với chủ ngữ số ít: 'issues'.",
    },
    {
      prompt: "Our regional express shuttle _______ from the central station every thirty minutes.",
      options: [
        { key: "A", text: "departing" },
        { key: "B", text: "departs" },
        { key: "C", text: "is departing" },
        { key: "D", text: "has departed" },
      ],
      correctAnswer: "B",
      explanation: "Diễn tả lịch trình, thời khóa biểu cố định của phương tiện giao thông ('every thirty minutes'), dùng thì Hiện tại đơn 'departs'.",
    },
    {
      prompt: "Modern financial analysts _______ vast amounts of data to evaluate potential investment risks.",
      options: [
        { key: "A", text: "collects" },
        { key: "B", text: "collect" },
        { key: "C", text: "is collecting" },
        { key: "D", text: "was collected" },
      ],
      correctAnswer: "B",
      explanation: "Diễn tả sự thật hiển nhiên hoặc công việc chuyên môn thường lệ với chủ ngữ số nhiều ('analysts'), dùng động từ nguyên mẫu thì Hiện tại đơn: 'collect'.",
    },
    {
      prompt: "The legal department _______ contracts that contain ambiguous termination clauses.",
      options: [
        { key: "A", text: "does not approve" },
        { key: "B", text: "do not approve" },
        { key: "C", text: "is not approved" },
        { key: "D", text: "not approving" },
      ],
      correctAnswer: "A",
      explanation: "Dạng phủ định thì Hiện tại đơn với chủ ngữ số ít 'The legal department' sử dụng trợ động từ 'does not approve'.",
    },
    {
      prompt: "How often _______ the facility maintenance crew inspect the backup generators?",
      options: [
        { key: "A", text: "do" },
        { key: "B", text: "does" },
        { key: "C", text: "is" },
        { key: "D", text: "are" },
      ],
      correctAnswer: "B",
      explanation: "Câu hỏi tần suất 'How often' thì Hiện tại đơn với danh từ tập hợp/số ít 'the crew' mượn trợ động từ 'does'.",
    },
  ],
  3: [
    {
      prompt: "While the project coordinator _______ the contract terms, the client asked for clarification on payment schedules.",
      options: [
        { key: "A", text: "reviewed" },
        { key: "B", text: "was reviewing" },
        { key: "C", text: "has reviewed" },
        { key: "D", text: "is reviewing" },
      ],
      correctAnswer: "B",
      explanation: "Cấu trúc 'While + Past Continuous': một hành động đang diễn ra trong quá khứ ('was reviewing') thì một hành động khác xen vào ('asked').",
    },
    {
      prompt: "Last Friday, the board members _______ to approve the proposed merger with Zenith Corp.",
      options: [
        { key: "A", text: "vote" },
        { key: "B", text: "voted" },
        { key: "C", text: "were voting" },
        { key: "D", text: "are voting" },
      ],
      correctAnswer: "B",
      explanation: "Dấu hiệu thời gian đã chấm dứt trong quá khứ 'Last Friday' đòi hỏi thì Quá khứ đơn (Past Simple): 'voted'.",
    },
    {
      prompt: "Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout the building.",
      options: [
        { key: "A", text: "worked" },
        { key: "B", text: "was working" },
        { key: "C", text: "works" },
        { key: "D", text: "has worked" },
      ],
      correctAnswer: "B",
      explanation: "Hành động đang diễn ra trong quá khứ ('was working') bị gián đoạn bởi một hành động khác ('sounded').",
    },
    {
      prompt: "The supplier _______ all outstanding invoices before the fiscal audit began yesterday.",
      options: [
        { key: "A", text: "had settled" },
        { key: "B", text: "settles" },
        { key: "C", text: "is settling" },
        { key: "D", text: "has settled" },
      ],
      correctAnswer: "A",
      explanation: "Hành động xảy ra và hoàn tất trước một thời điểm hoặc hành động khác trong quá khứ ('before the audit began'), dùng thì Quá khứ hoàn thành (Past Perfect) 'had settled'.",
    },
    {
      prompt: "We _______ several technical difficulties during yesterday's video conference with the European branch.",
      options: [
        { key: "A", text: "encounter" },
        { key: "B", text: "encountered" },
        { key: "C", text: "were encountering" },
        { key: "D", text: "have encountered" },
      ],
      correctAnswer: "B",
      explanation: "Sự việc đã xảy ra và kết thúc hoàn toàn trong quá khứ ('yesterday's video conference'), chia thì Quá khứ đơn 'encountered'.",
    },
  ],
  4: [
    {
      prompt: "Listen to the CEO's keynote address; she _______ the company's visionary five-year expansion plan.",
      options: [
        { key: "A", text: "is explaining" },
        { key: "B", text: "explains" },
        { key: "C", text: "explained" },
        { key: "D", text: "has explained" },
      ],
      correctAnswer: "A",
      explanation: "Mệnh lệnh 'Listen to...' chỉ sự việc đang diễn ra ngay lúc nói, chọn thì Hiện tại tiếp diễn 'is explaining'.",
    },
    {
      prompt: "Dr. Evans _______ three medical research articles every year for the international cardiology journal.",
      options: [
        { key: "A", text: "publishes" },
        { key: "B", text: "is publishing" },
        { key: "C", text: "publish" },
        { key: "D", text: "has published" },
      ],
      correctAnswer: "A",
      explanation: "Cụm 'every year' diễn tả thói quen định kỳ, chọn thì Hiện tại đơn 'publishes'.",
    },
    {
      prompt: "Water _______ at 100 degrees Celsius under standard atmospheric pressure.",
      options: [
        { key: "A", text: "is boiling" },
        { key: "B", text: "boils" },
        { key: "C", text: "boiled" },
        { key: "D", text: "will boil" },
      ],
      correctAnswer: "B",
      explanation: "Chân lý khoa học / sự thật hiển nhiên luôn được chia ở thì Hiện tại đơn: 'boils'.",
    },
    {
      prompt: "At present, our logistics team _______ alternative shipping routes to avoid port congestion.",
      options: [
        { key: "A", text: "evaluates" },
        { key: "B", text: "is evaluating" },
        { key: "C", text: "evaluated" },
        { key: "D", text: "has evaluated" },
      ],
      correctAnswer: "B",
      explanation: "Cụm 'At present' biểu thị hành động đang diễn ra tại thời điểm hiện tại, dùng thì Hiện tại tiếp diễn: 'is evaluating'.",
    },
    {
      prompt: "Mr. Tanaka usually drives to the plant, but today he _______ the commuter train due to heavy snowfall.",
      options: [
        { key: "A", text: "takes" },
        { key: "B", text: "is taking" },
        { key: "C", text: "took" },
        { key: "D", text: "has taken" },
      ],
      correctAnswer: "B",
      explanation: "Tương phản giữa thói quen thường ngày ('usually drives') và tình huống khác thường tạm thời trong ngày hôm nay ('today he is taking').",
    },
  ],
};

/**
 * Generates dynamic fallback TOEIC Part 5 questions for any unit based on its title and grammar topic.
 */
export function generateDynamicFallbackToeicQuestions(
  unitNumber: number,
  title: string,
  count: number = 5
): ToeicQuestion[] {
  // If we have curated questions for this unit, return them
  if (CURATED_TOEIC_UNIT_QUESTIONS[unitNumber]) {
    const curated = CURATED_TOEIC_UNIT_QUESTIONS[unitNumber];
    if (curated.length >= count) {
      return curated.slice(0, count);
    }
  }

  // Otherwise, synthesize contextual TOEIC Part 5 questions tailored to the grammar title
  const questions: ToeicQuestion[] = [];
  const baseTitle = title.replace(/\([^)]*\)/g, "").trim();

  // Template 1: Management / Announcement Scenario
  questions.push({
    prompt: `The executive committee announced that all department heads _______ to align departmental targets with "${baseTitle}" guidelines.`,
    options: [
      { key: "A", text: "are required" },
      { key: "B", text: "requires" },
      { key: "C", text: "requiring" },
      { key: "D", text: "requirement" },
    ],
    correctAnswer: "A",
    explanation: `Trong câu thông báo của ban điều hành, cấu trúc bị động thể hiện yêu cầu bắt buộc: 'be required to do something' nhằm tuân thủ quy tắc của chủ điểm ${baseTitle}.`,
  });

  // Template 2: Quality / Compliance Scenario
  questions.push({
    prompt: `All newly hired technicians must demonstrate that they _______ adhere to safety protocols during field inspections.`,
    options: [
      { key: "A", text: "can" },
      { key: "B", text: "ability" },
      { key: "C", text: "could have" },
      { key: "D", text: "able" },
    ],
    correctAnswer: "A",
    explanation: `Vị trí sau chủ ngữ 'they' và trước động từ nguyên mẫu 'adhere' cần một trợ động từ khuyết thiếu (modal verb) chỉ năng lực thực hiện theo chủ điểm ngữ pháp Unit ${unitNumber}.`,
  });

  // Template 3: Time / Deadline Scenario
  questions.push({
    prompt: `By the time the annual shareholders' conference concludes, the financial director _______ all strategic questions regarding "${baseTitle}".`,
    options: [
      { key: "A", text: "will have addressed" },
      { key: "B", text: "addressed" },
      { key: "C", text: "is addressing" },
      { key: "D", text: "addresses" },
    ],
    correctAnswer: "A",
    explanation: `Mệnh đề chỉ thời gian trong tương lai 'By the time ... concludes' đòi hỏi mệnh đề chính sử dụng thì Tương lai hoàn thành ('will have addressed') để chỉ hành động hoàn tất trước một mốc tương lai.`,
  });

  // Template 4: Marketing / Customer Feedback Scenario
  questions.push({
    prompt: `Customer survey results indicate that clients are _______ satisfied with our updated digital consultation services.`,
    options: [
      { key: "A", text: "highly" },
      { key: "B", text: "high" },
      { key: "C", text: "highest" },
      { key: "D", text: "higher" },
    ],
    correctAnswer: "A",
    explanation: `Đứng trước tính từ 'satisfied' để bổ nghĩa cho mức độ hài lòng, cần dùng trạng từ chỉ mức độ 'highly' (rất / hết sức hài lòng).`,
  });

  // Template 5: Legal / Vendor Contract Scenario
  questions.push({
    prompt: `Unless the supplier delivers the replacement components by Friday, the procurement team _______ the contract.`,
    options: [
      { key: "A", text: "will terminate" },
      { key: "B", text: "terminated" },
      { key: "C", text: "terminates" },
      { key: "D", text: "terminating" },
    ],
    correctAnswer: "A",
    explanation: `Câu điều kiện / liên từ 'Unless' (trừ khi) ở hiện tại: mệnh đề chính diễn tả kết quả trong tương lai với 'will + V-infinitive' ('will terminate').`,
  });

  // Template 6: Logistics / Inspection Scenario
  questions.push({
    prompt: `The facility manager requested that everyone in the manufacturing plant _______ protective eyewear at all times.`,
    options: [
      { key: "A", text: "wear" },
      { key: "B", text: "wears" },
      { key: "C", text: "wore" },
      { key: "D", text: "wearing" },
    ],
    correctAnswer: "A",
    explanation: `Cấu trúc giả định thức (Subjunctive) sau động từ yêu cầu 'request that + S + (should) + V nguyên thể không chia', do đó chọn 'wear'.`,
  });

  return questions.slice(0, count);
}

/**
 * Calls Gemini API if available to generate TOEIC Part 5 items, or falls back to template.
 */
export async function generateToeicQuestionsForUnit(
  options: GenerateToeicOptions
): Promise<ToeicQuestion[]> {
  const { unitNumber, title, theorySections = [], textbookExamples = [], count = 5 } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return generateDynamicFallbackToeicQuestions(unitNumber, title, count);
  }

  try {
    const theorySummary = theorySections
      .slice(0, 5)
      .map((s) => `Section ${s.sectionId} - ${s.heading}: ${s.sourceContent.slice(0, 150)}...`)
      .join("\n");

    const examplesSummary = textbookExamples
      .slice(0, 5)
      .map((e) => `- ${e.originalText} ${e.translationVi ? `(${e.translationVi})` : ""}`)
      .join("\n");

    const promptText = `You are a certified TOEIC test item writer and English grammar specialist.
Generate exactly ${count} authentic TOEIC Part 5 (Incomplete Sentences) multiple-choice questions focusing specifically on the target grammar of Unit ${unitNumber}: "${title}".

CONTEXT FROM TEXTBOOK:
${theorySummary}
${examplesSummary ? `\nEXAMPLES:\n${examplesSummary}` : ""}

STRICT REQUIREMENTS FOR EACH QUESTION:
1. Sentence must be a professional workplace/business context (corporate, office, finance, logistics, customer service, meetings).
2. The sentence has exactly one blank indicated by "_______".
3. Provide 4 answer options with keys "A", "B", "C", "D".
4. The target grammar tested in the blank MUST be the rule taught in Unit ${unitNumber} ("${title}").
5. Exactly one option is correct. The distractors must be realistic common mistakes.
6. Provide a clear pedagogical explanation in Vietnamese ("explanation") explaining why the correct option is right and the grammatical clue in the sentence.
7. Return ONLY a valid JSON object matching the following structure without markdown code fences or backticks:
{
  "questions": [
    {
      "prompt": "Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now.",
      "options": [
        { "key": "A", "text": "conducts" },
        { "key": "B", "text": "is conducting" },
        { "key": "C", "text": "conducted" },
        { "key": "D", "text": "has conducted" }
      ],
      "correctAnswer": "B",
      "explanation": "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói. Vì vậy, ta chia động từ ở thì Hiện tại tiếp diễn: 'is conducting'."
    }
  ]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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

      const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawAiText && rawAiText.trim().length > 0) {
        // Strip markdown backticks if returned (e.g. ```json ... ```)
        const cleanedJson = rawAiText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const parsed = JSON.parse(cleanedJson) as { questions?: ToeicQuestion[] };
        if (
          parsed &&
          Array.isArray(parsed.questions) &&
          parsed.questions.length >= count &&
          parsed.questions.every(
            (q) =>
              q.prompt &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              ["A", "B", "C", "D"].includes(q.correctAnswer) &&
              q.explanation
          )
        ) {
          return parsed.questions.slice(0, count);
        }
      }
    }

    // If Gemini response fails or schema doesn't match, fallback safely
    return generateDynamicFallbackToeicQuestions(unitNumber, title, count);
  } catch {
    // If network fails or timeout occurs, fallback safely
    return generateDynamicFallbackToeicQuestions(unitNumber, title, count);
  }
}

