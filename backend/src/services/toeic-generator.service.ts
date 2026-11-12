import { generateGeminiText } from "../lib/gemini";
import { AppError } from "../middleware/error-handler";

export type DifficultyLevel = "easy" | "medium" | "hard";
export type ToeicQuestionSource = "curated" | "dynamic" | "fallback";
export type ToeicSessionSource = "curated" | "dynamic" | "fallback" | "mixed";

export interface ToeicOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ToeicQuestion {
  prompt: string;
  options: ToeicOption[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: DifficultyLevel;
  ruleReference: string;
  source: ToeicQuestionSource;
}

export interface CanonicalUnitQuestionInput {
  questionId: string;
  questionContent: string;
  isExample?: boolean;
  correctAnswerText?: string | null;
  acceptedAnswers?: Array<{ answerText: string }>;
  options?: Array<{ optionKey: string; optionText: string }>;
  blanks?: Array<{
    blankIndex: number;
    correctAnswerText?: string | null;
    acceptedAnswers?: Array<{ answerText: string }>;
  }>;
  parts?: Array<{ partId: string }>;
  explanation?: { aiExplanation?: string | null; ruleReference?: string | null } | null;
  exercise?: { exerciseId?: string; questionType?: string; instruction?: string | null } | null;
}

export interface GenerateToeicOptions {
  unitNumber: number;
  title: string;
  theorySections?: Array<{ sectionId: string; heading: string; sourceContent: string }>;
  textbookExamples?: Array<{ originalText: string; translationVi?: string | null }>;
  unitQuestions?: CanonicalUnitQuestionInput[];
  count?: number;
  difficulty?: DifficultyLevel;
}

export interface GeneratedToeicResult {
  questions: ToeicQuestion[];
  source: ToeicSessionSource;
  isOfficialToeic: false;
  sourceNotice: string;
}

const OPTION_KEYS: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

let geminiCooldownUntil = 0;
const GEMINI_COOLDOWN_MS = 60_000;

/**
 * Re-orders a 4-option question so options are evenly distributed across A/B/C/D
 * instead of retaining any positional bias (such as always placing the answer at "A").
 */
export function rebalanceToeicQuestionOptions(
  question: ToeicQuestion,
  desiredKeyIndex?: number
): ToeicQuestion {
  const cleanOptions = question.options.slice(0, 4);
  if (cleanOptions.length !== 4) return question;

  const correctEntry = cleanOptions.find((o) => o.key === question.correctAnswer) || cleanOptions[0];
  const distractors = cleanOptions.filter((o) => o !== correctEntry);

  // Shuffle distractors randomly using Fisher-Yates
  const shuffledDistractors = [...distractors];
  for (let i = shuffledDistractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDistractors[i], shuffledDistractors[j]] = [
      shuffledDistractors[j],
      shuffledDistractors[i],
    ];
  }

  const targetIdx =
    desiredKeyIndex !== undefined
      ? ((desiredKeyIndex % 4) + 4) % 4
      : Math.floor(Math.random() * 4);

  const arranged: Array<{ text: string }> = [];
  let distractorCursor = 0;
  for (let i = 0; i < 4; i++) {
    if (i === targetIdx) {
      arranged.push({ text: correctEntry.text });
    } else {
      arranged.push({ text: shuffledDistractors[distractorCursor++]?.text ?? "" });
    }
  }

  return {
    ...question,
    options: OPTION_KEYS.map((key, idx) => ({
      key,
      text: arranged[idx].text,
    })),
    correctAnswer: OPTION_KEYS[targetIdx],
  };
}

export function rebalanceBatchOptionDistribution(
  items: ToeicQuestion[]
): ToeicQuestion[] {
  // Choose a random starting key offset per generation, then rotate through shuffled slots
  const baseOffset = Math.floor(Math.random() * 4);
  const slotSequence = items.map((_, i) => (baseOffset + i) % 4);
  for (let i = slotSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slotSequence[i], slotSequence[j]] = [slotSequence[j], slotSequence[i]];
  }
  return items.map((q, idx) => rebalanceToeicQuestionOptions(q, slotSequence[idx]));
}

type CuratedSeedQuestion = Omit<ToeicQuestion, "source">;

// ─── Curated Unit-Specific Question Bank for Core Units 1–4 ─────────────────
const CURATED_TOEIC_UNIT_QUESTIONS: Record<
  number,
  Record<DifficultyLevel, CuratedSeedQuestion[]>
> = {
  1: {
    easy: [
      {
        prompt: "Please be quiet. I _______ to finish this quarterly report right now.",
        options: [
          { key: "A", text: "try" },
          { key: "B", text: "am trying" },
          { key: "C", text: "tried" },
          { key: "D", text: "was trying" },
        ],
        correctAnswer: "B",
        explanation:
          "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói. Vì vậy, ta chia động từ ở thì Hiện tại tiếp diễn: 'am trying'.",
        difficulty: "easy",
        ruleReference: "1B",
      },
      {
        prompt: "Look! The marketing director _______ the main conference hall with our new client.",
        options: [
          { key: "A", text: "is entering" },
          { key: "B", text: "enters" },
          { key: "C", text: "entered" },
          { key: "D", text: "enter" },
        ],
        correctAnswer: "A",
        explanation:
          "Mệnh lệnh 'Look!' báo hiệu một sự việc đang diễn ra ngay trước mắt người nói, dùng thì Hiện tại tiếp diễn 'is entering'.",
        difficulty: "easy",
        ruleReference: "1A",
      },
      {
        prompt: "The IT technician is not at his desk because he _______ the server hardware in Room 3.",
        options: [
          { key: "A", text: "repairs" },
          { key: "B", text: "is repairing" },
          { key: "C", text: "repaired" },
          { key: "D", text: "repair" },
        ],
        correctAnswer: "B",
        explanation:
          "Hành động sửa chữa đang diễn ra ở thời điểm hiện tại khiến nhân viên kỹ thuật vắng mặt, dùng 'is repairing'.",
        difficulty: "easy",
        ruleReference: "1A",
      },
      {
        prompt: "Listen! Our team leader _______ the new safety protocols in the auditorium.",
        options: [
          { key: "A", text: "explains" },
          { key: "B", text: "is explaining" },
          { key: "C", text: "explained" },
          { key: "D", text: "explain" },
        ],
        correctAnswer: "B",
        explanation:
          "Mệnh lệnh 'Listen!' báo hiệu hành động đang tiếp diễn tại thời điểm nói: 'is explaining'.",
        difficulty: "easy",
        ruleReference: "1B",
      },
      {
        prompt: "Why _______ you _______ the project schedule today?",
        options: [
          { key: "A", text: "are / updating" },
          { key: "B", text: "do / update" },
          { key: "C", text: "did / update" },
          { key: "D", text: "have / updated" },
        ],
        correctAnswer: "A",
        explanation:
          "Dấu hiệu 'today' thể hiện một hoạt động tạm thời đang diễn ra trong ngày hôm nay: 'are ... updating'.",
        difficulty: "easy",
        ruleReference: "1C",
      },
    ],
    medium: [
      {
        prompt:
          "Ms. Patterson _______ a comprehensive quarterly financial review in Conference Room B right now.",
        options: [
          { key: "A", text: "conducts" },
          { key: "B", text: "is conducting" },
          { key: "C", text: "conducted" },
          { key: "D", text: "has conducted" },
        ],
        correctAnswer: "B",
        explanation:
          "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói, dùng thì Hiện tại tiếp diễn: 'is conducting'.",
        difficulty: "medium",
        ruleReference: "1A",
      },
      {
        prompt:
          "Please speak quietly in the lobby because the marketing director _______ an important client on the phone.",
        options: [
          { key: "A", text: "is calling" },
          { key: "B", text: "calls" },
          { key: "C", text: "called" },
          { key: "D", text: "was calling" },
        ],
        correctAnswer: "A",
        explanation:
          "Mệnh lệnh 'Please speak quietly' báo hiệu tình huống đang diễn ra tại hiện tại, cần dùng thì Hiện tại tiếp diễn 'is calling'.",
        difficulty: "medium",
        ruleReference: "1B",
      },
      {
        prompt:
          "The IT support team _______ a new cybersecurity protocol across all company computers this week.",
        options: [
          { key: "A", text: "is installing" },
          { key: "B", text: "installed" },
          { key: "C", text: "installs" },
          { key: "D", text: "install" },
        ],
        correctAnswer: "A",
        explanation:
          "Trạng ngữ 'this week' diễn tả một tiến trình tạm thời đang diễn ra xung quanh hiện tại: 'is installing'.",
        difficulty: "medium",
        ruleReference: "1C",
      },
      {
        prompt:
          "Why _______ so many employees _______ over the recent changes to the annual leave policy today?",
        options: [
          { key: "A", text: "do / debate" },
          { key: "B", text: "are / debating" },
          { key: "C", text: "have / debated" },
          { key: "D", text: "were / debating" },
        ],
        correctAnswer: "B",
        explanation:
          "Dấu hiệu 'today' mô tả hành động đang diễn ra với chủ ngữ số nhiều 'so many employees': 'are ... debating'.",
        difficulty: "medium",
        ruleReference: "1C",
      },
      {
        prompt:
          "According to the corporate announcement, our international market share _______ steadily this quarter.",
        options: [
          { key: "A", text: "grew" },
          { key: "B", text: "grows" },
          { key: "C", text: "is growing" },
          { key: "D", text: "was grown" },
        ],
        correctAnswer: "C",
        explanation:
          "Thì Hiện tại tiếp diễn dùng để miêu tả xu hướng đang thay đổi hoặc phát triển: 'is growing steadily this quarter'.",
        difficulty: "medium",
        ruleReference: "1E",
      },
    ],
    hard: [
      {
        prompt:
          "Although the regional director usually _______ conservative investments, she is currently considering higher-yield instruments.",
        options: [
          { key: "A", text: "prefers" },
          { key: "B", text: "is preferring" },
          { key: "C", text: "preferred" },
          { key: "D", text: "prefer" },
        ],
        correctAnswer: "A",
        explanation:
          "Động từ trạng thái 'prefer' không chia ở thì tiếp diễn dù có vế tương phản hiện tại. Chọn thì Hiện tại đơn 'prefers'.",
        difficulty: "hard",
        ruleReference: "1D",
      },
      {
        prompt:
          "Our executive committee _______ foreign representatives all afternoon to negotiate the cross-border merger terms.",
        options: [
          { key: "A", text: "meets" },
          { key: "B", text: "is meeting" },
          { key: "C", text: "has met" },
          { key: "D", text: "meet" },
        ],
        correctAnswer: "B",
        explanation:
          "'meet' khi diễn tả cuộc gặp đã được thu xếp trong hiện tại/tương lai gần dùng thì Hiện tại tiếp diễn: 'is meeting'.",
        difficulty: "hard",
        ruleReference: "1C",
      },
      {
        prompt:
          "Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly.",
        options: [
          { key: "A", text: "incorporates" },
          { key: "B", text: "is incorporating" },
          { key: "C", text: "has incorporated" },
          { key: "D", text: "incorporate" },
        ],
        correctAnswer: "B",
        explanation:
          "Cấu trúc xu hướng thay đổi dần dần với 'more and more' yêu cầu thì Hiện tại tiếp diễn: 'is incorporating'.",
        difficulty: "hard",
        ruleReference: "1E",
      },
      {
        prompt:
          "Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty.",
        options: [
          { key: "A", text: "experience" },
          { key: "B", text: "are experiencing" },
          { key: "C", text: "experienced" },
          { key: "D", text: "experiences" },
        ],
        correctAnswer: "B",
        explanation:
          "Cụm 'these weeks' diễn tả tình trạng tạm thời đang diễn ra quanh hiện tại: 'are experiencing'.",
        difficulty: "hard",
        ruleReference: "1B",
      },
    ],
  },
  2: {
    easy: [
      {
        prompt: "The mail courier always _______ packages to the reception desk before 10 A.M.",
        options: [
          { key: "A", text: "delivers" },
          { key: "B", text: "is delivering" },
          { key: "C", text: "delivered" },
          { key: "D", text: "delivering" },
        ],
        correctAnswer: "A",
        explanation:
          "Trạng từ chỉ tần suất 'always' diễn tả thói quen lặp lại, chia thì Hiện tại đơn với chủ ngữ số ít: 'delivers'.",
        difficulty: "easy",
        ruleReference: "2A",
      },
      {
        prompt: "Our office _______ at 8:00 A.M. and closes at 6:00 P.M. every Monday through Friday.",
        options: [
          { key: "A", text: "opens" },
          { key: "B", text: "is opening" },
          { key: "C", text: "opened" },
          { key: "D", text: "open" },
        ],
        correctAnswer: "A",
        explanation: "Lịch làm việc cố định dùng thì Hiện tại đơn: 'opens'.",
        difficulty: "easy",
        ruleReference: "2B",
      },
      {
        prompt: "Most software developers in our branch _______ in modern open-space cubicles.",
        options: [
          { key: "A", text: "works" },
          { key: "B", text: "work" },
          { key: "C", text: "is working" },
          { key: "D", text: "working" },
        ],
        correctAnswer: "B",
        explanation: "Chủ ngữ số nhiều 'Most software developers' đi kèm động từ nguyên thể 'work'.",
        difficulty: "easy",
        ruleReference: "2A",
      },
    ],
    medium: [
      {
        prompt:
          "The human resources manager usually _______ employment verification letters within two business days.",
        options: [
          { key: "A", text: "issues" },
          { key: "B", text: "is issuing" },
          { key: "C", text: "issued" },
          { key: "D", text: "has been issuing" },
        ],
        correctAnswer: "A",
        explanation: "Phó từ tần suất 'usually' kết hợp chủ ngữ số ít dùng thì Hiện tại đơn: 'issues'.",
        difficulty: "medium",
        ruleReference: "2A",
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
        explanation: "Lịch trình cố định ('every thirty minutes') dùng thì Hiện tại đơn 'departs'.",
        difficulty: "medium",
        ruleReference: "2B",
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
        explanation: "Dạng phủ định Hiện tại đơn với chủ ngữ số ít dùng 'does not approve'.",
        difficulty: "medium",
        ruleReference: "2C",
      },
    ],
    hard: [
      {
        prompt:
          "Seldom _______ the senior partner endorse investments without conducting thorough due diligence.",
        options: [
          { key: "A", text: "does" },
          { key: "B", text: "is" },
          { key: "C", text: "do" },
          { key: "D", text: "has" },
        ],
        correctAnswer: "A",
        explanation:
          "Đảo ngữ với phó từ phủ định 'Seldom' đảo trợ động từ 'does' lên trước chủ ngữ số ít.",
        difficulty: "hard",
        ruleReference: "2C",
      },
      {
        prompt:
          "The chief economist emphasizes that currency volatility _______ directly to fluctuating crude oil pricing.",
        options: [
          { key: "A", text: "relates" },
          { key: "B", text: "is relating" },
          { key: "C", text: "related" },
          { key: "D", text: "relate" },
        ],
        correctAnswer: "A",
        explanation:
          "Động từ 'relate to' diễn tả chân lý kinh tế cố định, chủ ngữ không đếm được chia 'relates'.",
        difficulty: "hard",
        ruleReference: "2B",
      },
    ],
  },
  3: {
    easy: [
      {
        prompt: "Last Friday, the board members _______ to approve the proposed budget.",
        options: [
          { key: "A", text: "vote" },
          { key: "B", text: "voted" },
          { key: "C", text: "were voting" },
          { key: "D", text: "are voting" },
        ],
        correctAnswer: "B",
        explanation: "Dấu hiệu 'Last Friday' chỉ thời điểm quá khứ hoàn tất, chia 'voted'.",
        difficulty: "easy",
        ruleReference: "3A",
      },
    ],
    medium: [
      {
        prompt:
          "While the project coordinator _______ the contract terms, the client asked for clarification on payment schedules.",
        options: [
          { key: "A", text: "reviewed" },
          { key: "B", text: "was reviewing" },
          { key: "C", text: "has reviewed" },
          { key: "D", text: "is reviewing" },
        ],
        correctAnswer: "B",
        explanation:
          "Cấu trúc 'While + Past Continuous': hành động đang diễn ra trong quá khứ ('was reviewing') thì hành động khác xen vào ('asked').",
        difficulty: "medium",
        ruleReference: "3B",
      },
      {
        prompt:
          "Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout the building.",
        options: [
          { key: "A", text: "worked" },
          { key: "B", text: "was working" },
          { key: "C", text: "works" },
          { key: "D", text: "has worked" },
        ],
        correctAnswer: "B",
        explanation: "Hành động đang diễn ra trong quá khứ ('was working') bị gián đoạn.",
        difficulty: "medium",
        ruleReference: "3B",
      },
    ],
    hard: [
      {
        prompt:
          "Had the compliance inspector _______ the discrepancy earlier, the company would not have faced regulatory fines.",
        options: [
          { key: "A", text: "noticed" },
          { key: "B", text: "notice" },
          { key: "C", text: "noticing" },
          { key: "D", text: "was noticing" },
        ],
        correctAnswer: "A",
        explanation: "Đảo ngữ điều kiện loại 3: 'Had + S + V3/ed' -> 'noticed'.",
        difficulty: "hard",
        ruleReference: "3B",
      },
    ],
  },
  4: {
    easy: [
      {
        prompt: "Listen to the speaker; she _______ the summary of today's meeting.",
        options: [
          { key: "A", text: "is giving" },
          { key: "B", text: "gives" },
          { key: "C", text: "gave" },
          { key: "D", text: "give" },
        ],
        correctAnswer: "A",
        explanation: "Mệnh lệnh 'Listen...' báo hiệu hành động đang diễn ra: 'is giving'.",
        difficulty: "easy",
        ruleReference: "4A",
      },
    ],
    medium: [
      {
        prompt:
          "Listen to the CEO's keynote address; she _______ the company's visionary five-year expansion plan.",
        options: [
          { key: "A", text: "is explaining" },
          { key: "B", text: "explains" },
          { key: "C", text: "explained" },
          { key: "D", text: "has explained" },
        ],
        correctAnswer: "A",
        explanation: "Mệnh lệnh 'Listen to...' chỉ hành động đang diễn ra lúc nói: 'is explaining'.",
        difficulty: "medium",
        ruleReference: "4A",
      },
      {
        prompt:
          "Dr. Evans _______ three medical research articles every year for the international cardiology journal.",
        options: [
          { key: "A", text: "publishes" },
          { key: "B", text: "is publishing" },
          { key: "C", text: "publish" },
          { key: "D", text: "has published" },
        ],
        correctAnswer: "A",
        explanation: "Cụm 'every year' diễn tả thói quen định kỳ, dùng Hiện tại đơn 'publishes'.",
        difficulty: "medium",
        ruleReference: "4B",
      },
    ],
    hard: [
      {
        prompt:
          "The chief scientist _______ whether the synthesized compound remains chemically stable under extreme pressure.",
        options: [
          { key: "A", text: "doubts" },
          { key: "B", text: "is doubting" },
          { key: "C", text: "doubted" },
          { key: "D", text: "doubt" },
        ],
        correctAnswer: "A",
        explanation: "Động từ trạng thái 'doubt' không chia thì tiếp diễn -> 'doubts'.",
        difficulty: "hard",
        ruleReference: "4C",
      },
    ],
  },
};

// ─── Plausible Grammatical Distractor Synthesizer ─────────────────────────────

const GRAMMAR_CONFUSABLE_GROUPS: string[][] = [
  ["in", "on", "at", "by", "for", "with", "from", "to"],
  ["although", "despite", "because", "unless", "whereas", "while", "since"],
  ["who", "whom", "whose", "which", "that", "where", "when"],
  ["a", "an", "the", "some", "any", "every", "much", "many"],
  ["can", "could", "may", "might", "must", "should", "will", "would"],
  ["is", "are", "was", "were", "has been", "have been", "will be", "being"],
  ["do", "does", "did", "done", "doing", "am", "is", "are"],
  ["have", "has", "had", "having", "will have", "would have"],
  ["more", "most", "much", "less", "fewer", "as", "than"],
  ["each", "every", "both", "either", "neither", "all", "none"],
  ["already", "yet", "still", "just", "ever", "never", "always"],
  ["good", "well", "better", "best", "quickly", "quick"],
  ["too", "enough", "so", "such", "very", "quite"],
];

const IRREGULAR_PAST_HINTS: Record<string, string> = {
  go: "went",
  went: "go",
  make: "made",
  made: "make",
  take: "took",
  took: "take",
  see: "saw",
  saw: "see",
  come: "came",
  came: "come",
  have: "had",
  had: "has",
  do: "did",
  did: "does",
  write: "wrote",
  wrote: "writing",
  speak: "spoke",
  spoke: "speaking",
  eat: "ate",
  ate: "eating",
  give: "gave",
  gave: "giving",
  find: "found",
  found: "finding",
  tell: "told",
  told: "telling",
  think: "thought",
  thought: "thinking",
  know: "knew",
  knew: "knowing",
  buy: "bought",
  bought: "buying",
  leave: "left",
  left: "leaving",
  read: "reading",
  drive: "drove",
  drove: "driving",
  work: "worked",
};

const NON_GERUND_ING_WORDS = new Set([
  "during",
  "morning",
  "evening",
  "something",
  "anything",
  "nothing",
  "everything",
  "thing",
  "bring",
  "sing",
  "ring",
  "king",
  "wing",
  "spring",
  "string",
]);

const NON_PLURAL_S_WORDS = new Set([
  "this",
  "his",
  "its",
  "yes",
  "always",
  "perhaps",
  "sometimes",
  "across",
  "besides",
  "towards",
  "unless",
]);

function generateStructuredGrammarVariants(answer: string): string[] {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();
  const candidates = new Set<string>();

  // 1. Confusable closed-class grammar sets (prepositions, modals, articles, etc.)
  for (const group of GRAMMAR_CONFUSABLE_GROUPS) {
    if (group.includes(lower)) {
      for (const alt of group) {
        if (alt !== lower) candidates.add(alt);
      }
    }
  }

  // 2. Multi-word verb/auxiliary phrase variants ("is driving", "doesn't work", "have been")
  if (lower.startsWith("is ")) {
    const rest = trimmed.slice(3).trim();
    candidates.add(`are ${rest}`);
    candidates.add(`was ${rest}`);
    candidates.add(`has been ${rest}`);
    if (rest.endsWith("ing") && rest.length > 5 && !NON_GERUND_ING_WORDS.has(rest.toLowerCase())) {
      candidates.add(rest.slice(0, -3));
    }
  } else if (lower.startsWith("are ")) {
    const rest = trimmed.slice(4).trim();
    candidates.add(`is ${rest}`);
    candidates.add(`were ${rest}`);
    candidates.add(`have been ${rest}`);
  } else if (lower.startsWith("was ")) {
    const rest = trimmed.slice(4).trim();
    candidates.add(`is ${rest}`);
    candidates.add(`were ${rest}`);
    candidates.add(`had been ${rest}`);
  } else if (lower.startsWith("were ")) {
    const rest = trimmed.slice(5).trim();
    candidates.add(`are ${rest}`);
    candidates.add(`was ${rest}`);
    candidates.add(`have been ${rest}`);
  } else if (lower.startsWith("has ")) {
    const rest = trimmed.slice(4).trim();
    candidates.add(`have ${rest}`);
    candidates.add(`had ${rest}`);
    candidates.add(`is ${rest}`);
  } else if (lower.startsWith("have ")) {
    const rest = trimmed.slice(5).trim();
    candidates.add(`has ${rest}`);
    candidates.add(`had ${rest}`);
    candidates.add(`are ${rest}`);
  } else if (lower.startsWith("don't ") || lower.startsWith("do not ")) {
    const rest = trimmed.replace(/^(don't|do not)\s+/i, "");
    candidates.add(`doesn't ${rest}`);
    candidates.add(`didn't ${rest}`);
    candidates.add(`won't ${rest}`);
  } else if (lower.startsWith("doesn't ") || lower.startsWith("does not ")) {
    const rest = trimmed.replace(/^(doesn't|does not)\s+/i, "");
    candidates.add(`don't ${rest}`);
    candidates.add(`didn't ${rest}`);
    candidates.add(`isn't ${rest}`);
  } else if (lower.startsWith("didn't ") || lower.startsWith("did not ")) {
    const rest = trimmed.replace(/^(didn't|did not)\s+/i, "");
    candidates.add(`doesn't ${rest}`);
    candidates.add(`don't ${rest}`);
    candidates.add(`wasn't ${rest}`);
  } else if (lower.startsWith("will ")) {
    const rest = trimmed.slice(5).trim();
    candidates.add(`would ${rest}`);
    candidates.add(`is going to ${rest}`);
    candidates.add(rest);
  } else if (lower.startsWith("would ")) {
    const rest = trimmed.slice(6).trim();
    candidates.add(`will ${rest}`);
    candidates.add(`could ${rest}`);
    candidates.add(`should ${rest}`);
  } else if (lower.startsWith("to ")) {
    const rest = trimmed.slice(3).trim();
    candidates.add(rest);
    if (!rest.endsWith("ing")) candidates.add(`${rest}ing`);
    candidates.add(`for ${rest}ing`);
  }

  // 3. Irregular past tense pairs
  if (!trimmed.includes(" ") && IRREGULAR_PAST_HINTS[lower]) {
    candidates.add(IRREGULAR_PAST_HINTS[lower]);
  }

  const filtered: string[] = [];
  const seen = new Set<string>([lower]);
  for (const c of candidates) {
    const clean = c.trim();
    const key = clean.toLowerCase();
    if (clean.length > 0 && !seen.has(key)) {
      seen.add(key);
      filtered.push(clean);
    }
  }
  return filtered;
}

function generateMorphologicalVariants(answer: string): string[] {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();
  const candidates = new Set<string>();

  if (!trimmed.includes(" ") && /^[a-zA-Z'-]+$/.test(trimmed)) {
    if (lower.endsWith("ly") && lower.length > 4) {
      candidates.add(lower.slice(0, -2));
      candidates.add(`${lower.slice(0, -2)}ness`);
    } else if (
      lower.endsWith("ing") &&
      lower.length > 5 &&
      !NON_GERUND_ING_WORDS.has(lower)
    ) {
      const stem = lower.slice(0, -3);
      candidates.add(`${stem}ed`);
      // Handle silent-e adjectives/verbs cleanly (exciting->excited, confusing->confused, boring->bored)
      if (/[cszrgmnpv]$/.test(stem) && !/(?:st|rt|rk|rm|rn|ss|ll|ck)$/.test(stem)) {
        candidates.add(`${stem}e`);
        candidates.add(`${stem}es`);
        candidates.add(`to ${stem}e`);
      } else {
        candidates.add(stem);
        candidates.add(`${stem}s`);
        candidates.add(`to ${stem}`);
      }
    } else if (lower.endsWith("ed") && lower.length > 4) {
      const stem = lower.slice(0, -2);
      candidates.add(`${stem}ing`);
      if (/[cszrgmnpv]$/.test(stem) && !/(?:st|rt|rk|rm|rn|ss|ll|ck)$/.test(stem)) {
        candidates.add(`${stem}e`);
        candidates.add(`have ${lower}`);
      } else {
        candidates.add(stem);
        candidates.add(`have ${lower}`);
      }
    } else if (
      lower.endsWith("s") &&
      lower.length > 3 &&
      !lower.endsWith("ss") &&
      !NON_PLURAL_S_WORDS.has(lower)
    ) {
      const stem = lower.slice(0, -1);
      candidates.add(stem);
      candidates.add(`${stem}ing`);
      candidates.add(`${stem}ed`);
    } else if (lower.length >= 3) {
      candidates.add(`${lower}s`);
      candidates.add(`${lower}ed`);
      candidates.add(`${lower}ing`);
      candidates.add(`to ${lower}`);
    }
  }

  const filtered: string[] = [];
  const seen = new Set<string>([lower]);
  for (const c of candidates) {
    const clean = c.trim();
    const key = clean.toLowerCase();
    if (clean.length > 0 && !seen.has(key)) {
      seen.add(key);
      filtered.push(clean);
    }
  }
  return filtered;
}

function generateGrammaticalVariants(answer: string): string[] {
  const structured = generateStructuredGrammarVariants(answer);
  const morph = generateMorphologicalVariants(answer);
  const seen = new Set<string>([answer.trim().toLowerCase()]);
  const out: string[] = [];
  for (const item of [...structured, ...morph]) {
    const key = item.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function isCleanToeicOptionText(text: string): boolean {
  const clean = text.trim();
  if (!clean || clean.length > 60) return false;
  if (/^(ok|right|wrong|yes|no|true|false)$/i.test(clean)) return false;
  // Reject bare option-key letters such as "B", "C", "D" (allowing only single-letter words "a" / "I")
  if (/^[a-z]$/i.test(clean) && !/^(a|i)$/i.test(clean)) return false;
  if (
    clean.includes("...") ||
    clean.includes("/") ||
    /\(\s*no\b/i.test(clean) ||
    clean.includes(";")
  ) {
    return false;
  }
  if (
    /^(?:[a-z']{1,15}\s+(?:or|and)\s+[a-z']{1,15})$/i.test(clean) ||
    /\b(?:are|is)\s+true\b/i.test(clean)
  ) {
    return false;
  }
  if (clean.split(/\s+/).length > 5) return false;
  return true;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildOptionsForTarget(
  correctText: string,
  preferredDistractors: string[],
  forbiddenDistractors?: Set<string>
): { options: ToeicOption[]; correctAnswer: "A" | "B" | "C" | "D" } | null {
  const cleanCorrect = correctText.trim();
  if (!cleanCorrect || !isCleanToeicOptionText(cleanCorrect)) return null;

  const seen = new Set<string>([cleanCorrect.toLowerCase()]);
  const distractorPool: string[] = [];

  const pushIfUnique = (val: string | null | undefined) => {
    if (!val || typeof val !== "string") return;
    const clean = val.trim();
    const norm = clean.toLowerCase();
    if (
      clean.length > 0 &&
      isCleanToeicOptionText(clean) &&
      !seen.has(norm) &&
      !forbiddenDistractors?.has(norm)
    ) {
      seen.add(norm);
      distractorPool.push(clean);
    }
  };

  for (const d of preferredDistractors) {
    pushIfUnique(d);
  }
  for (const v of generateGrammaticalVariants(cleanCorrect)) {
    if (distractorPool.length >= 3) break;
    pushIfUnique(v);
  }

  if (distractorPool.length < 3) {
    return null;
  }

  const chosen = distractorPool.slice(0, 3);
  const startsWithCapital = /^[A-Z]/.test(cleanCorrect);
  const matchCase = (text: string) =>
    startsWithCapital && /^[a-z]/.test(text)
      ? `${text[0].toUpperCase()}${text.slice(1)}`
      : text;

  return {
    options: [
      { key: "A", text: cleanCorrect },
      { key: "B", text: matchCase(chosen[0]) },
      { key: "C", text: matchCase(chosen[1]) },
      { key: "D", text: matchCase(chosen[2]) },
    ],
    correctAnswer: "A",
  };
}

function normalizePromptWithBlank(
  rawPrompt: string,
  allowAppendFallback = false
): string | null {
  // Preserve textbook parenthetical word stem cues like "(exhaust...)" as "(exhaust)" so ellipsis replacement creates only real blanks
  const trimmed = rawPrompt.trim().replace(/\(([a-zA-Z-]+)\.{3,}\)/g, "($1)");

  // Reject multi-line embedded option stems like "2 At 8.15:\na he'll be leaving...\nb he'll have left..."
  if (/\n\s*[a-d]\s+\S+/i.test(trimmed) || /\ba\s+[^/\n]+\s*\/\s*b\s+\S+/i.test(trimmed)) {
    return null;
  }

  // Reject numbered multi-sub-blank stems like "(1) ... (2) ..."
  if (/\(\s*1\s*\)[\s\S]*\(\s*2\s*\)/.test(trimmed)) {
    return null;
  }

  if (trimmed.includes("_______")) {
    const count = (trimmed.match(/_______/g) || []).length;
    return count === 1 ? trimmed : null;
  }

  // Replace canonical blank markers such as {blank}, {blank:1}, [...], [blank], _____, or .... / ...
  const replacedMarkers = trimmed
    .replace(/\{[^\}]*blank[^\}]*\}/gi, "_______")
    .replace(/\{_{2,}\}/g, "_______")
    .replace(/\[[^\]]*blank[^\]]*\]/gi, "_______")
    .replace(/\[_{2,}\]/g, "_______")
    .replace(/_{3,}/g, "_______")
    .replace(/\.{3,}/g, "_______");

  if (replacedMarkers.includes("_______")) {
    const count = (replacedMarkers.match(/_______/g) || []).length;
    return count === 1 ? replacedMarkers : null;
  }

  // Replace [opt1 / opt2] inline brackets with _______
  const slashBracketReplaced = trimmed.replace(
    /\[[^\]\n]{1,60}\/[^\]\n]{1,60}\]/g,
    "_______"
  );
  if (slashBracketReplaced.includes("_______")) {
    const count = (slashBracketReplaced.match(/_______/g) || []).length;
    return count === 1 ? slashBracketReplaced : null;
  }

  if (!allowAppendFallback) {
    return null;
  }

  const cleanStem = trimmed.replace(/[.:]+$/, "");
  return `${cleanStem} _______`;
}

function maskSentenceForCloze(
  sentence: string,
  ruleHeading: string
): { prompt: string; answer: string } | null {
  const clean = sentence.trim().replace(/\s+/g, " ");
  if (clean.length < 15 || clean.length > 220) return null;
  if (/\(\s*not\b|\(=|\.{3,}|\[|\{/i.test(clean)) return null;

  const targetPatterns: RegExp[] = [
    /\b((?:is|are|was|were|have|has|had|will|would|can|could|should|must|might)\s+(?:not\s+)?(?:been\s+)?[a-z]{3,16}(?:ing|ed|en)?)\b/i,
    /\b(doesn't|don't|didn't|isn't|aren't|wasn't|weren't|haven't|hasn't|won't|wouldn't|can't|couldn't|shouldn't|mustn't)\b/i,
    /\b(although|despite|because|unless|whereas|while|since|before|after|until|whether|which|whose|whom|who)\b/i,
    /\b(between|among|through|during|without|against|into|onto|across|behind|under|about|for|with|from|at|on|in|by|to)\b/i,
    /\b(already|still|yet|always|never|usually|often|sometimes|rarely|more|most|much|many|fewer|less|too|enough)\b/i,
    /\b([a-z]{3,14}(?:ing|ed|ly))\b/i,
  ];

  for (const regex of targetPatterns) {
    const match = regex.exec(clean);
    if (match && match[1] && typeof match.index === "number") {
      const answer = match[1].trim();
      if (answer.length < 2) continue;
      // Compute exact word offset for capturing group 1 inside match[0]
      const offsetInFullMatch = match[0].indexOf(answer);
      const idx = match.index + Math.max(0, offsetInFullMatch);
      const before = clean.slice(0, idx);
      const after = clean.slice(idx + answer.length);
      const masked = `${before}_______${after}`;
      if ((masked.match(/_______/g) || []).length === 1) {
        return { prompt: masked, answer };
      }
    }
  }

  return null;
}

function collectForbiddenDistractors(uq: CanonicalUnitQuestionInput): Set<string> {
  const forbidden = new Set<string>();
  const addRaw = (raw: string | null | undefined) => {
    if (!raw || typeof raw !== "string") return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    forbidden.add(trimmed.toLowerCase());
    if (trimmed.includes(" / ")) {
      for (const seg of trimmed.split(/\s*\/\s*/)) {
        const s = seg.trim().toLowerCase();
        if (s) forbidden.add(s);
      }
    }
  };
  addRaw(uq.correctAnswerText);
  for (const a of uq.acceptedAnswers || []) addRaw(a?.answerText);
  for (const b of uq.blanks || []) {
    addRaw(b?.correctAnswerText);
    for (const a of b?.acceptedAnswers || []) addRaw(a?.answerText);
  }
  return forbidden;
}

/**
 * Dynamically builds unit-grounded 4-option Part 5 drills directly from the unit's
 * canonical questions, textbook examples, and theory sections stored in PostgreSQL.
 */
export function buildUnitGroundedDynamicQuestions(
  options: GenerateToeicOptions
): ToeicQuestion[] {
  const {
    unitNumber,
    title,
    theorySections = [],
    textbookExamples = [],
    unitQuestions = [],
    difficulty = "medium",
  } = options;

  const fallbackRuleRef = theorySections[0]?.sectionId || `${unitNumber}A`;
  const sectionHeadingMap = new Map(
    theorySections.map((s) => [s.sectionId.toUpperCase(), s.heading])
  );

  // Build clean same-unit sibling distractor pool only from valid single-slot non-meta answers
  // Tag each with source exerciseId and whether it ends in terminal punctuation so short phrases stay with phrases
  const siblingEntries: Array<{ text: string; exerciseId?: string; isSentence: boolean }> = [];
  const seenSibling = new Set<string>();
  for (const q of unitQuestions) {
    if (q.isExample) continue;
    if ((q.parts?.length ?? 0) > 0 || (q.blanks?.length ?? 0) > 1) continue;
    const qType = q.exercise?.questionType;
    if (qType === "sentence_correction" || qType === "matching") continue;
    // Only harvest answers from questions that actually use explicit single blanks or explicit option texts
    let raw = (q.correctAnswerText || q.blanks?.[0]?.correctAnswerText || "").trim();
    if (q.options && q.options.length > 0) {
      const matchedOpt = q.options.find(
        (o) =>
          o.optionKey.trim().toLowerCase() === raw.toLowerCase() ||
          o.optionText.trim().toLowerCase() === raw.toLowerCase()
      );
      if (!matchedOpt) continue;
      raw = matchedOpt.optionText.trim();
    } else if (!normalizePromptWithBlank(q.questionContent, false)) {
      continue;
    }

    const parts = raw.includes(" / ") ? raw.split(/\s*\/\s*/) : [raw];
    for (const p of parts) {
      const clean = p.trim();
      const key = clean.toLowerCase();
      if (isCleanToeicOptionText(clean) && !seenSibling.has(key)) {
        seenSibling.add(key);
        siblingEntries.push({
          text: clean,
          exerciseId: q.exercise?.exerciseId,
          isSentence: /[.?!]$/.test(clean),
        });
      }
    }
  }

  const pickCompatibleSiblings = (
    targetText: string,
    exerciseId: string | undefined,
    forbidden: Set<string>
  ): string[] => {
    const targetIsSentence = /[.?!]$/.test(targetText.trim());
    const compatible = siblingEntries.filter(
      (e) => e.isSentence === targetIsSentence && !forbidden.has(e.text.toLowerCase())
    );
    const sameExercise = compatible
      .filter((e) => exerciseId && e.exerciseId === exerciseId)
      .map((e) => e.text);
    const otherExercise = compatible
      .filter((e) => !exerciseId || e.exerciseId !== exerciseId)
      .map((e) => e.text);
    return [...sameExercise, ...otherExercise];
  };

  const candidates: ToeicQuestion[] = [];
  const seenPrompts = new Set<string>();

  const tryPush = (q: ToeicQuestion) => {
    const key = q.prompt.toLowerCase().replace(/\s+/g, " ").trim();
    if (
      !seenPrompts.has(key) &&
      q.options.length === 4 &&
      (q.prompt.match(/_______/g) || []).length === 1
    ) {
      seenPrompts.add(key);
      candidates.push(q);
    }
  };

  // Pass 1 & 2: Transform clean single-slot canonical DB questions for this exact unit
  for (const uq of unitQuestions) {
    if (uq.isExample) continue;
    if ((uq.parts?.length ?? 0) > 0 || (uq.blanks?.length ?? 0) > 1) continue;
    const qType = uq.exercise?.questionType;
    if (qType === "sentence_correction" || qType === "matching") continue;

    const ruleRef = uq.explanation?.ruleReference?.trim() || fallbackRuleRef;
    const ruleHeading = sectionHeadingMap.get(ruleRef.toUpperCase()) || title;
    const dbExplanation =
      uq.explanation?.aiExplanation?.trim() ||
      `Áp dụng quy tắc "${ruleHeading}" trong Unit ${unitNumber} (${title}).`;
    const forbidden = collectForbiddenDistractors(uq);

    // Case A: Canonical question carries explicit candidate options
    if (uq.options && uq.options.length >= 2) {
      const rawExpectedTokens = [
        uq.correctAnswerText,
        uq.blanks?.[0]?.correctAnswerText,
        ...(uq.acceptedAnswers || []).map((a) => a.answerText),
      ]
        .filter((t): t is string => Boolean(t && t.trim()))
        .map((t) => t.trim());

      // Reject compound multi-select expectations (e.g. "a or b", "a and c", "b is true")
      const isCompoundMultiSelect = rawExpectedTokens.some((tok) =>
        /\b(?:and|or)\b|,|&|\b(?:is|are)\s+true\b/i.test(tok)
      );
      if (isCompoundMultiSelect) continue;

      // Require exact unambiguous match to ONE option (never blindly fall back to options[0])
      const matchedOptions = uq.options.filter((o) => {
        const keyLower = o.optionKey.trim().toLowerCase();
        const textLower = o.optionText.trim().toLowerCase();
        return rawExpectedTokens.some(
          (tok) => tok.toLowerCase() === keyLower || tok.toLowerCase() === textLower
        );
      });
      if (matchedOptions.length !== 1) continue;

      const correctOpt = matchedOptions[0];
      if (!isCleanToeicOptionText(correctOpt.optionText)) continue;

      // Build clean single-blank prompt: first try standard blank markers, then inline "optA / optB" masking for 2-option stems (e.g. 98.2)
      let prompt = normalizePromptWithBlank(uq.questionContent, false);
      if (!prompt && uq.options.length === 2) {
        const t0 = escapeRegExp(uq.options[0].optionText.trim());
        const t1 = escapeRegExp(uq.options[1].optionText.trim());
        const slashRe = new RegExp(`(?:${t0}\\s*/\\s*${t1}|${t1}\\s*/\\s*${t0})`, "i");
        if (slashRe.test(uq.questionContent)) {
          prompt = normalizePromptWithBlank(
            uq.questionContent.replace(slashRe, "_______"),
            false
          );
        }
      }
      if (!prompt) continue;

      const otherOptTexts = uq.options
        .filter((o) => o !== correctOpt)
        .map((o) => o.optionText.trim());
      const sameExDistractors = pickCompatibleSiblings(
        correctOpt.optionText,
        uq.exercise?.exerciseId,
        forbidden
      );

      const built = buildOptionsForTarget(
        correctOpt.optionText,
        [
          ...otherOptTexts,
          ...generateStructuredGrammarVariants(correctOpt.optionText),
          ...sameExDistractors,
        ],
        forbidden
      );
      if (built) {
        tryPush({
          prompt,
          options: built.options,
          correctAnswer: built.correctAnswer,
          explanation: dbExplanation,
          difficulty,
          ruleReference: ruleRef,
          source: "dynamic",
        });
      }
      continue;
    }

    // Case B: Canonical question has a single explicit blank
    const prompt = normalizePromptWithBlank(uq.questionContent, false);
    if (!prompt) continue;

    const rawTarget = (
      uq.correctAnswerText?.trim() ||
      uq.blanks?.[0]?.correctAnswerText?.trim() ||
      ""
    ).trim();
    if (!rawTarget) continue;

    // Pick first clean single variant when canonical text holds slash-separated alternatives (e.g. "be away / have gone away")
    let targetAnswer = rawTarget;
    if (!isCleanToeicOptionText(rawTarget)) {
      const candidateFromAccepted = (uq.acceptedAnswers || [])
        .map((a) => a.answerText.trim())
        .find((a) => isCleanToeicOptionText(a));
      if (candidateFromAccepted) {
        targetAnswer = candidateFromAccepted;
      } else if (rawTarget.includes(" / ")) {
        const firstSeg = rawTarget.split(/\s*\/\s*/)[0]?.trim() || "";
        if (isCleanToeicOptionText(firstSeg)) {
          targetAnswer = firstSeg;
        }
      }
    }
    if (!isCleanToeicOptionText(targetAnswer)) continue;

    const sameUnitDistractors = pickCompatibleSiblings(
      targetAnswer,
      uq.exercise?.exerciseId,
      forbidden
    );

    const built = buildOptionsForTarget(
      targetAnswer,
      [
        ...generateStructuredGrammarVariants(targetAnswer),
        ...sameUnitDistractors,
      ],
      forbidden
    );

    if (built) {
      tryPush({
        prompt,
        options: built.options,
        correctAnswer: built.correctAnswer,
        explanation: dbExplanation,
        difficulty,
        ruleReference: ruleRef,
        source: "dynamic",
      });
    }
  }

  // Pass 3: Convert canonical textbook examples for this unit into cloze drills
  for (let idx = 0; idx < textbookExamples.length; idx++) {
    const ex = textbookExamples[idx];
    const section = theorySections[idx % Math.max(1, theorySections.length)];
    const ruleRef = section?.sectionId || fallbackRuleRef;
    const cloze = maskSentenceForCloze(ex.originalText, section?.heading || title);
    if (!cloze) continue;

    const built = buildOptionsForTarget(cloze.answer, generateGrammaticalVariants(cloze.answer));
    if (!built) continue;

    tryPush({
      prompt: cloze.prompt,
      options: built.options,
      correctAnswer: built.correctAnswer,
      explanation: ex.translationVi
        ? `Dựa trên ví dụ chuẩn Unit ${unitNumber} ("${ex.translationVi}") và quy tắc mục ${ruleRef}: chọn "${cloze.answer}".`
        : `Dựa trên cấu trúc ngữ pháp Unit ${unitNumber} (${section?.heading || title}), đáp án đúng là "${cloze.answer}".`,
      difficulty,
      ruleReference: ruleRef,
      source: "dynamic",
    });
  }

  // Pass 4: Extract clean illustrative sentences directly from theorySections.sourceContent of this unit
  for (const sec of theorySections) {
    const rawLines = sec.sourceContent
      .split(/\n+|(?<=[.?!])\s+(?=[A-Z'])/)
      .map((line) =>
        line
          .replace(/^[-•*\d.)\s]+/, "")
          .replace(/^(?:[A-Z]|Sarah|Mark|Kate|Lisa|Dave|Sue|Paul|Tom):\s+/, "")
          .trim()
      )
      .filter(
        (line) =>
          line.length >= 20 &&
          line.length <= 180 &&
          /[.?!]$/.test(line) &&
          !/\b(?:present continuous|present simple|past simple|present perfect|past continuous|infinitive|compare:|remember:|note:|for example|we use|you can use|do not use|section|unit \d|means|normally|in english)\b/i.test(
            line
          )
      );

    for (const line of rawLines) {
      const cloze = maskSentenceForCloze(line, sec.heading);
      if (!cloze) continue;
      const built = buildOptionsForTarget(
        cloze.answer,
        generateGrammaticalVariants(cloze.answer)
      );
      if (!built) continue;

      tryPush({
        prompt: cloze.prompt,
        options: built.options,
        correctAnswer: built.correctAnswer,
        explanation: `Trích dẫn từ lý thuyết Unit ${unitNumber} — Mục ${sec.sectionId} (${sec.heading}): chọn "${cloze.answer}".`,
        difficulty,
        ruleReference: sec.sectionId,
        source: "dynamic",
      });
    }
  }

  return candidates;
}

/**
 * Generates TOEIC Part 5 practice drills strictly grounded in the requested unit.
 * - Combines curated unit questions (for units with curated banks) and/or dynamic
 *   AI / canonical unit-grounded DB drills.
 * - Eliminates hardcoded 'A' answer bias via batch option key rebalancing.
 * - Respects requested `count` (1..20) or raises an explicit 422 INSUFFICIENT_CONTENT error.
 */
export async function generateToeicQuestionsForUnit(
  options: GenerateToeicOptions
): Promise<GeneratedToeicResult> {
  const {
    unitNumber,
    title,
    theorySections = [],
    textbookExamples = [],
    unitQuestions = [],
    count = 5,
    difficulty = "medium",
  } = options;

  const curatedPool: ToeicQuestion[] = [];
  if (CURATED_TOEIC_UNIT_QUESTIONS[unitNumber]) {
    const byTier = CURATED_TOEIC_UNIT_QUESTIONS[unitNumber][difficulty] || [];
    for (const item of byTier) {
      curatedPool.push({ ...item, source: "curated" });
    }
  }

  // If Gemini is configured (and not in temporary failure cooldown) and curated alone does not satisfy requested count, try AI generation
  let aiDynamicPool: ToeicQuestion[] = [];
  const remainingAfterCurated = Math.max(0, count - curatedPool.length);

  if (
    remainingAfterCurated > 0 &&
    process.env.GEMINI_API_KEY?.trim() &&
    Date.now() >= geminiCooldownUntil
  ) {
    try {
      const theorySummary = theorySections
        .slice(0, 5)
        .map(
          (s) =>
            `Section ${s.sectionId} - ${s.heading}: ${s.sourceContent.slice(0, 150)}...`
        )
        .join("\n");

      const examplesSummary = textbookExamples
        .slice(0, 5)
        .map(
          (e) =>
            `- ${e.originalText} ${e.translationVi ? `(${e.translationVi})` : ""}`
        )
        .join("\n");

      const difficultyPromptGuidance = {
        easy: "DIFFICULTY TIER: EASY. Focus on basic formula recognition and foundational grammar patterns in clear business contexts.",
        medium:
          "DIFFICULTY TIER: MEDIUM. Authentic standard TOEIC Part 5 business/workplace sentences with realistic grammatical distractors.",
        hard: "DIFFICULTY TIER: HARD (TOEIC 700+). Advanced sentence structures, subtle traps, exceptions, and confusable distractors.",
      }[difficulty];

      const promptText = `You are an English grammar & TOEIC Part 5 specialist.
Generate exactly ${remainingAfterCurated} original TOEIC Part 5 multiple-choice questions focusing specifically on Unit ${unitNumber}: "${title}".

${difficultyPromptGuidance}

CONTEXT FROM TEXTBOOK:
${theorySummary}
${examplesSummary ? `\nEXAMPLES:\n${examplesSummary}` : ""}

Return ONLY valid JSON:
{
  "questions": [
    {
      "prompt": "Sentence containing _______.",
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." }
      ],
      "correctAnswer": "B",
      "explanation": "Vietnamese explanation citing the rule.",
      "difficulty": "${difficulty}",
      "ruleReference": "${theorySections[0]?.sectionId || `${unitNumber}A`}"
    }
  ]
}`;

      const aiResult = await generateGeminiText({
        prompt: promptText,
        timeoutMs: 4000,
        responseMimeType: "application/json",
        temperature: 0.7,
      });

      const rawAiText = aiResult?.text;
      if (!rawAiText || rawAiText.length === 0) {
        geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
      }
      if (rawAiText && rawAiText.length > 0) {
        const cleanedJson = rawAiText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(cleanedJson) as { questions?: CuratedSeedQuestion[] };
        if (parsed && Array.isArray(parsed.questions)) {
          aiDynamicPool = parsed.questions
            .filter(
              (q) =>
                q.prompt &&
                q.prompt.includes("_______") &&
                Array.isArray(q.options) &&
                q.options.length === 4 &&
                ["A", "B", "C", "D"].includes(q.correctAnswer) &&
                Boolean(q.explanation)
            )
            .map((q, idx) => ({
              prompt: q.prompt,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty,
              ruleReference:
                q.ruleReference ||
                theorySections[idx % Math.max(1, theorySections.length)]?.sectionId ||
                `${unitNumber}A`,
              source: "dynamic" as const,
            }));
        }
      }
    } catch {
      // Fall through cleanly to canonical DB unit-grounded dynamic builder and apply brief cooldown
      geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
      aiDynamicPool = [];
    }
  }

  // Deduplicate & assemble in precedence order: Curated -> AI Dynamic -> Canonical DB Unit Dynamic
  const seenPrompts = new Set<string>();
  const combined: ToeicQuestion[] = [];

  const appendUnique = (items: ToeicQuestion[]) => {
    for (const item of items) {
      if (combined.length >= count) break;
      const key = item.prompt.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seenPrompts.has(key)) {
        seenPrompts.add(key);
        combined.push(item);
      }
    }
  };

  appendUnique(curatedPool);
  appendUnique(aiDynamicPool);

  if (combined.length < count) {
    const unitDynamicPool = buildUnitGroundedDynamicQuestions(options);
    appendUnique(unitDynamicPool);
  }

  if (combined.length < count) {
    throw new AppError(
      422,
      "INSUFFICIENT_CONTENT",
      `Unit ${unitNumber} ("${title}") only yielded ${combined.length} distinct unit-grounded practice items, which is fewer than the requested count (${count}).`
    );
  }

  const balanced = rebalanceBatchOptionDistribution(combined.slice(0, count));

  const distinctSources = new Set(balanced.map((q) => q.source));
  const sessionSource: ToeicSessionSource =
    distinctSources.size > 1
      ? "mixed"
      : (balanced[0]?.source ?? "dynamic");

  const sourceNotice =
    sessionSource === "curated"
      ? `Câu hỏi luyện tập dạng TOEIC Part 5 được biên soạn riêng cho Unit ${unitNumber} (không phải đề thi chính thức của ETS).`
      : sessionSource === "mixed"
      ? `Kết hợp câu hỏi biên soạn cho Unit ${unitNumber} và bài tập chuyển thể từ ngân hàng câu hỏi chuẩn của Unit ${unitNumber} (không phải đề thi chính thức của ETS).`
      : `Bài tập trắc nghiệm luyện ngữ pháp được tổng hợp động từ câu hỏi & ví dụ chuẩn của Unit ${unitNumber} (không phải đề thi chính thức của ETS).`;

  return {
    questions: balanced,
    source: sessionSource,
    isOfficialToeic: false,
    sourceNotice,
  };
}
