export type DifficultyLevel = "easy" | "medium" | "hard";

export interface ToeicOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ToeicQuestion {
  prompt: string;
  options: ToeicOption[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty?: DifficultyLevel;
  ruleReference?: string;
}

export interface GenerateToeicOptions {
  unitNumber: number;
  title: string;
  theorySections?: Array<{ sectionId: string; heading: string; sourceContent: string }>;
  textbookExamples?: Array<{ originalText: string; translationVi?: string | null }>;
  count?: number;
  difficulty?: DifficultyLevel;
}

// ─── Curated Fallback Question Banks for Core Grammar Units (by Difficulty) ───
const CURATED_TOEIC_UNIT_QUESTIONS: Record<
  number,
  Record<DifficultyLevel, ToeicQuestion[]>
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
        explanation: "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói. Vì vậy, ta chia động từ ở thì Hiện tại tiếp diễn: 'am trying'.",
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
        explanation: "Mệnh lệnh 'Look!' báo hiệu một sự việc đang diễn ra ngay trước mắt người nói, dùng thì Hiện tại tiếp diễn 'is entering'.",
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
        explanation: "Hành động sửa chữa đang diễn ra ở thời điểm hiện tại khiến nhân viên kỹ thuật vắng mặt, dùng 'is repairing'.",
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
        explanation: "Mệnh lệnh 'Listen!' báo hiệu hành động đang phát ra âm thanh và tiếp diễn tại thời điểm nói: 'is explaining'.",
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
        explanation: "Dấu hiệu 'today' thể hiện một hoạt động tạm thời đang diễn ra trong ngày hôm nay: 'are ... updating'.",
        difficulty: "easy",
        ruleReference: "1C",
      },
    ],
    medium: [
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
        difficulty: "medium",
        ruleReference: "1A",
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
        difficulty: "medium",
        ruleReference: "1B",
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
        difficulty: "medium",
        ruleReference: "1C",
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
        difficulty: "medium",
        ruleReference: "1C",
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
        difficulty: "medium",
        ruleReference: "1E",
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
        difficulty: "medium",
        ruleReference: "1B",
      },
    ],
    hard: [
      {
        prompt: "Although the regional director usually _______ conservative investments, she is currently considering higher-yield instruments.",
        options: [
          { key: "A", text: "prefers" },
          { key: "B", text: "is preferring" },
          { key: "C", text: "preferred" },
          { key: "D", text: "prefer" },
        ],
        correctAnswer: "A",
        explanation: "Bẫy TOEIC 700+: Động từ chỉ nhận thức/sở thích (state verb) 'prefer' không chia ở dạng tiếp diễn dù có vế tương phản hiện tại. Chọn thì Hiện tại đơn 'prefers'.",
        difficulty: "hard",
        ruleReference: "1D",
      },
      {
        prompt: "Our executive committee _______ foreign representatives all afternoon to negotiate the cross-border merger terms.",
        options: [
          { key: "A", text: "meets" },
          { key: "B", text: "is meeting" },
          { key: "C", text: "has met" },
          { key: "D", text: "meet" },
        ],
        correctAnswer: "B",
        explanation: "Bẫy TOEIC 700+: 'meet' khi mang nghĩa có buổi gặp gỡ đã thu xếp trước (planned arrangement) dùng thì Hiện tại tiếp diễn: 'is meeting'.",
        difficulty: "hard",
        ruleReference: "1C",
      },
      {
        prompt: "Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly.",
        options: [
          { key: "A", text: "incorporates" },
          { key: "B", text: "is incorporating" },
          { key: "C", text: "has incorporated" },
          { key: "D", text: "incorporate" },
        ],
        correctAnswer: "B",
        explanation: "Cấu trúc chỉ xu hướng thay đổi dần dần (changing situation) với 'more and more' yêu cầu dùng thì Hiện tại tiếp diễn: 'is incorporating'.",
        difficulty: "hard",
        ruleReference: "1E",
      },
      {
        prompt: "The chief compliance officer _______ why the internal audit department requested an emergency review of transaction logs.",
        options: [
          { key: "A", text: "wonders" },
          { key: "B", text: "is wondering" },
          { key: "C", text: "wonder" },
          { key: "D", text: "wondered" },
        ],
        correctAnswer: "A",
        explanation: "Động từ chỉ trạng thái suy nghĩ/nhận thức 'wonder' trong bối cảnh chuẩn ngữ pháp học thuật diễn đạt trạng thái nhận thức hiện tại: 'wonders'.",
        difficulty: "hard",
        ruleReference: "1D",
      },
      {
        prompt: "Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty.",
        options: [
          { key: "A", text: "experience" },
          { key: "B", text: "are experiencing" },
          { key: "C", text: "experienced" },
          { key: "D", text: "experiences" },
        ],
        correctAnswer: "B",
        explanation: "Cụm 'these weeks' kết hợp tính chất tạm thời (unusually severe) diễn tả một tình thế bất thường đang tiếp diễn xung quanh hiện tại: 'are experiencing'.",
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
        explanation: "Trạng từ chỉ tần suất 'always' diễn tả thói quen lặp đi lặp lại hàng ngày, chia thì Hiện tại đơn với chủ ngữ số ít: 'delivers'.",
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
        explanation: "Lịch làm việc cố định hàng tuần dùng thì Hiện tại đơn (Present Simple): 'opens'.",
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
        explanation: "Chủ ngữ số nhiều 'Most software developers' trong câu diễn tả sự thật cố định đi kèm động từ nguyên thể 'work'.",
        difficulty: "easy",
        ruleReference: "2A",
      },
    ],
    medium: [
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
        explanation: "Diễn tả lịch trình, thời khóa biểu cố định của phương tiện giao thông ('every thirty minutes'), dùng thì Hiện tại đơn 'departs'.",
        difficulty: "medium",
        ruleReference: "2B",
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
        difficulty: "medium",
        ruleReference: "2A",
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
        difficulty: "medium",
        ruleReference: "2C",
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
        difficulty: "medium",
        ruleReference: "2C",
      },
    ],
    hard: [
      {
        prompt: "Seldom _______ the senior partner endorse investments without conducting thorough due diligence.",
        options: [
          { key: "A", text: "does" },
          { key: "B", text: "is" },
          { key: "C", text: "do" },
          { key: "D", text: "has" },
        ],
        correctAnswer: "A",
        explanation: "Bẫy đảo ngữ TOEIC 700+ với phó từ phủ định 'Seldom': đứng đầu câu yêu cầu đảo trợ động từ 'does' lên trước chủ ngữ số ít 'the senior partner'.",
        difficulty: "hard",
        ruleReference: "2C",
      },
      {
        prompt: "The chief economist emphasizes that currency volatility _______ directly to fluctuating crude oil pricing.",
        options: [
          { key: "A", text: "relates" },
          { key: "B", text: "is relating" },
          { key: "C", text: "related" },
          { key: "D", text: "relate" },
        ],
        correctAnswer: "A",
        explanation: "Động từ 'relate to' diễn tả mối quan hệ nhân quả/chân lý kinh tế cố định, không chia tiếp diễn; chủ ngữ không đếm được 'volatility' chia 'relates'.",
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
        explanation: "Dấu hiệu 'Last Friday' đã chấm dứt hoàn toàn trong quá khứ, chia thì Quá khứ đơn: 'voted'.",
        difficulty: "easy",
        ruleReference: "3A",
      },
    ],
    medium: [
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
        difficulty: "medium",
        ruleReference: "3B",
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
        difficulty: "medium",
        ruleReference: "3A",
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
        difficulty: "medium",
        ruleReference: "3B",
      },
    ],
    hard: [
      {
        prompt: "Had the compliance inspector _______ the discrepancy earlier, the company would not have faced regulatory fines.",
        options: [
          { key: "A", text: "noticed" },
          { key: "B", text: "notice" },
          { key: "C", text: "noticing" },
          { key: "D", text: "was noticing" },
        ],
        correctAnswer: "A",
        explanation: "Bẫy đảo ngữ câu điều kiện loại 3 (TOEIC 700+): 'Had + S + V-ed/P2' tương đương 'If S had noticed'.",
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
        explanation: "Mệnh lệnh 'Listen...' báo hiệu hành động đang diễn ra tại thời điểm nói: 'is giving'.",
        difficulty: "easy",
        ruleReference: "4A",
      },
    ],
    medium: [
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
        difficulty: "medium",
        ruleReference: "4A",
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
        difficulty: "medium",
        ruleReference: "4B",
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
        difficulty: "medium",
        ruleReference: "4A",
      },
    ],
    hard: [
      {
        prompt: "The chief scientist _______ whether the synthesized compound remains chemically stable under extreme pressure.",
        options: [
          { key: "A", text: "doubts" },
          { key: "B", text: "is doubting" },
          { key: "C", text: "doubted" },
          { key: "D", text: "doubt" },
        ],
        correctAnswer: "A",
        explanation: "Động từ 'doubt' (nghi ngờ) là động từ chỉ thái độ/trạng thái tinh thần, không chia thì tiếp diễn. Chọn thì Hiện tại đơn 'doubts'.",
        difficulty: "hard",
        ruleReference: "4C",
      },
    ],
  },
};

/**
 * Generates dynamic fallback TOEIC Part 5 questions for any unit based on its title, difficulty, and grammar topic.
 */
export function generateDynamicFallbackToeicQuestions(
  unitNumber: number,
  title: string,
  count: number = 5,
  difficulty: DifficultyLevel = "medium",
  theorySections: Array<{ sectionId: string }> = []
): ToeicQuestion[] {
  // If curated questions exist for this unit and difficulty, return them first
  if (CURATED_TOEIC_UNIT_QUESTIONS[unitNumber]) {
    const byDiff = CURATED_TOEIC_UNIT_QUESTIONS[unitNumber][difficulty];
    if (byDiff && byDiff.length >= count) {
      return byDiff.slice(0, count);
    }
  }

  const baseTitle = title.replace(/\([^)]*\)/g, "").trim();
  const getRuleRef = (idx: number) => {
    if (theorySections && theorySections.length > 0) {
      return theorySections[idx % theorySections.length].sectionId;
    }
    const letter = String.fromCharCode(65 + (idx % 4));
    return `${unitNumber}${letter}`;
  };

  const pool: ToeicQuestion[] = [];

  if (difficulty === "easy") {
    pool.push(
      {
        prompt: `All office employees _______ to attend the briefing on "${baseTitle}" today.`,
        options: [
          { key: "A", text: "are required" },
          { key: "B", text: "requires" },
          { key: "C", text: "requiring" },
          { key: "D", text: "requirement" },
        ],
        correctAnswer: "A",
        explanation: `Cấu trúc cơ bản bị động với chủ ngữ số nhiều 'All office employees': 'are required' để tuân thủ chủ điểm ngữ pháp Unit ${unitNumber}.`,
        difficulty: "easy",
        ruleReference: getRuleRef(0),
      },
      {
        prompt: `Our new assistant _______ to office safety regulations at all times.`,
        options: [
          { key: "A", text: "adheres" },
          { key: "B", text: "is adhering" },
          { key: "C", text: "adhere" },
          { key: "D", text: "adhered" },
        ],
        correctAnswer: "A",
        explanation: `Dấu hiệu 'at all times' thể hiện quy tắc thường trực với chủ ngữ số ít, dùng thì Hiện tại đơn: 'adheres'.`,
        difficulty: "easy",
        ruleReference: getRuleRef(1),
      },
      {
        prompt: `Right now, the branch manager _______ an introductory overview of "${baseTitle}".`,
        options: [
          { key: "A", text: "is presenting" },
          { key: "B", text: "presents" },
          { key: "C", text: "presented" },
          { key: "D", text: "present" },
        ],
        correctAnswer: "A",
        explanation: `Dấu hiệu 'Right now' báo hiệu hành động đang diễn ra ngay lúc nói, chọn thì Hiện tại tiếp diễn: 'is presenting'.`,
        difficulty: "easy",
        ruleReference: getRuleRef(2),
      },
      {
        prompt: `Every morning, the administrative coordinator _______ all incoming inquiries regarding "${baseTitle}".`,
        options: [
          { key: "A", text: "reviews" },
          { key: "B", text: "is reviewing" },
          { key: "C", text: "reviewed" },
          { key: "D", text: "review" },
        ],
        correctAnswer: "A",
        explanation: `Dấu hiệu lặp lại định kỳ 'Every morning' chia ở thì Hiện tại đơn với chủ ngữ số ít: 'reviews'.`,
        difficulty: "easy",
        ruleReference: getRuleRef(3),
      },
      {
        prompt: `Clients are always _______ satisfied when our support representatives respond promptly.`,
        options: [
          { key: "A", text: "completely" },
          { key: "B", text: "complete" },
          { key: "C", text: "completing" },
          { key: "D", text: "completion" },
        ],
        correctAnswer: "A",
        explanation: `Bổ nghĩa cho tính từ 'satisfied' cần một trạng từ chỉ mức độ: 'completely' (hoàn toàn hài lòng).`,
        difficulty: "easy",
        ruleReference: getRuleRef(4),
      }
    );
  } else if (difficulty === "hard") {
    pool.push(
      {
        prompt: `Seldom _______ the audit team discovered discrepancies in "${baseTitle}" records without calling for an executive inquiry.`,
        options: [
          { key: "A", text: "has" },
          { key: "B", text: "is" },
          { key: "C", text: "have" },
          { key: "D", text: "did" },
        ],
        correctAnswer: "A",
        explanation: `Bẫy đảo ngữ TOEIC 700+ với phó từ phủ định 'Seldom': trợ động từ 'has' đảo lên trước chủ ngữ số ít tập hợp 'the audit team'.`,
        difficulty: "hard",
        ruleReference: getRuleRef(0),
      },
      {
        prompt: `The executive committee recommended that the lead developer _______ full responsibility for implementing "${baseTitle}".`,
        options: [
          { key: "A", text: "take" },
          { key: "B", text: "takes" },
          { key: "C", text: "took" },
          { key: "D", text: "taking" },
        ],
        correctAnswer: "A",
        explanation: `Cấu trúc giả định thức (Subjunctive) sau động từ 'recommend that + S + V-infinitive', do đó chọn 'take' không chia.`,
        difficulty: "hard",
        ruleReference: getRuleRef(1),
      },
      {
        prompt: `Had the procurement director _______ the supplier's revised terms earlier, the shipment delays would have been averted.`,
        options: [
          { key: "A", text: "accepted" },
          { key: "B", text: "accept" },
          { key: "C", text: "accepting" },
          { key: "D", text: "accepts" },
        ],
        correctAnswer: "A",
        explanation: `Bẫy đảo ngữ điều kiện loại 3 nâng cao: 'Had + S + V3/ed', tương đương 'If the director had accepted'.`,
        difficulty: "hard",
        ruleReference: getRuleRef(2),
      },
      {
        prompt: `Not only _______ our logistics division optimize shipping routes, but it also reduced transit costs significantly.`,
        options: [
          { key: "A", text: "did" },
          { key: "B", text: "does" },
          { key: "C", text: "is" },
          { key: "D", text: "has" },
        ],
        correctAnswer: "A",
        explanation: `Cấu trúc đảo ngữ 'Not only + trợ động từ quá khứ (did) + S + V nguyên thể', hòa hợp thì với vế sau 'reduced'.`,
        difficulty: "hard",
        ruleReference: getRuleRef(3),
      },
      {
        prompt: `The board remains doubtful _______ the proposed restructuring will yield measurable dividends by year-end.`,
        options: [
          { key: "A", text: "whether" },
          { key: "B", text: "unless" },
          { key: "C", text: "although" },
          { key: "D", text: "despite" },
        ],
        correctAnswer: "A",
        explanation: `Cụm liên từ bổ ngữ 'doubtful whether' (hoài nghi liệu rằng...) thể hiện sự băn khoăn về khả năng xảy ra của một mệnh đề.`,
        difficulty: "hard",
        ruleReference: getRuleRef(4),
      }
    );
  } else {
    // Standard medium Part 5 questions
    pool.push(
      {
        prompt: `The executive committee announced that all department heads _______ to align departmental targets with "${baseTitle}" guidelines.`,
        options: [
          { key: "A", text: "are required" },
          { key: "B", text: "requires" },
          { key: "C", text: "requiring" },
          { key: "D", text: "requirement" },
        ],
        correctAnswer: "A",
        explanation: `Trong câu thông báo của ban điều hành, cấu trúc bị động thể hiện yêu cầu bắt buộc: 'be required to do something' nhằm tuân thủ quy tắc của chủ điểm ${baseTitle}.`,
        difficulty: "medium",
        ruleReference: getRuleRef(0),
      },
      {
        prompt: `All newly hired technicians must demonstrate that they _______ adhere to safety protocols during field inspections.`,
        options: [
          { key: "A", text: "can" },
          { key: "B", text: "ability" },
          { key: "C", text: "could have" },
          { key: "D", text: "able" },
        ],
        correctAnswer: "A",
        explanation: `Vị trí sau chủ ngữ 'they' và trước động từ nguyên mẫu 'adhere' cần một trợ động từ khuyết thiếu (modal verb) chỉ năng lực thực hiện theo chủ điểm ngữ pháp Unit ${unitNumber}.`,
        difficulty: "medium",
        ruleReference: getRuleRef(1),
      },
      {
        prompt: `By the time the annual shareholders' conference concludes, the financial director _______ all strategic questions regarding "${baseTitle}".`,
        options: [
          { key: "A", text: "will have addressed" },
          { key: "B", text: "addressed" },
          { key: "C", text: "is addressing" },
          { key: "D", text: "addresses" },
        ],
        correctAnswer: "A",
        explanation: `Mệnh đề chỉ thời gian trong tương lai 'By the time ... concludes' đòi hỏi mệnh đề chính sử dụng thì Tương lai hoàn thành ('will have addressed') để chỉ hành động hoàn tất trước một mốc tương lai.`,
        difficulty: "medium",
        ruleReference: getRuleRef(2),
      },
      {
        prompt: `Customer survey results indicate that clients are _______ satisfied with our updated digital consultation services.`,
        options: [
          { key: "A", text: "highly" },
          { key: "B", text: "high" },
          { key: "C", text: "highest" },
          { key: "D", text: "higher" },
        ],
        correctAnswer: "A",
        explanation: `Đứng trước tính từ 'satisfied' để bổ nghĩa cho mức độ hài lòng, cần dùng trạng từ chỉ mức độ 'highly' (rất / hết sức hài lòng).`,
        difficulty: "medium",
        ruleReference: getRuleRef(3),
      },
      {
        prompt: `Unless the supplier delivers the replacement components by Friday, the procurement team _______ the contract.`,
        options: [
          { key: "A", text: "will terminate" },
          { key: "B", text: "terminated" },
          { key: "C", text: "terminates" },
          { key: "D", text: "terminating" },
        ],
        correctAnswer: "A",
        explanation: `Câu điều kiện / liên từ 'Unless' (trừ khi) ở hiện tại: mệnh đề chính diễn tả kết quả trong tương lai với 'will + V-infinitive' ('will terminate').`,
        difficulty: "medium",
        ruleReference: getRuleRef(4),
      },
      {
        prompt: `The facility manager requested that everyone in the manufacturing plant _______ protective eyewear at all times.`,
        options: [
          { key: "A", text: "wear" },
          { key: "B", text: "wears" },
          { key: "C", text: "wore" },
          { key: "D", text: "wearing" },
        ],
        correctAnswer: "A",
        explanation: `Cấu trúc giả định thức (Subjunctive) sau động từ yêu cầu 'request that + S + (should) + V nguyên thể không chia', do đó chọn 'wear'.`,
        difficulty: "medium",
        ruleReference: getRuleRef(0),
      }
    );
  }

  // If curated questions from other tiers exist for this unit, prepend them if needed
  if (CURATED_TOEIC_UNIT_QUESTIONS[unitNumber]) {
    const unitTiers = CURATED_TOEIC_UNIT_QUESTIONS[unitNumber];
    const available = unitTiers[difficulty] || [];
    if (available.length > 0) {
      const combined = [...available, ...pool];
      return combined.slice(0, count);
    }
  }

  return pool.slice(0, count);
}

/**
 * Calls Gemini API if available to generate TOEIC Part 5 items, or falls back to template.
 */
export async function generateToeicQuestionsForUnit(
  options: GenerateToeicOptions
): Promise<ToeicQuestion[]> {
  const {
    unitNumber,
    title,
    theorySections = [],
    textbookExamples = [],
    count = 5,
    difficulty = "medium",
  } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return generateDynamicFallbackToeicQuestions(
      unitNumber,
      title,
      count,
      difficulty,
      theorySections
    );
  }

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
      easy: "DIFFICULTY TIER: EASY. Focus on basic formula recognition and foundational grammar patterns in clear business contexts. Distractors should be distinctly different grammatical forms.",
      medium:
        "DIFFICULTY TIER: MEDIUM. Authentic standard TOEIC Part 5 business/workplace context sentences. Realistic distractors reflecting common test-taker traps.",
      hard: "DIFFICULTY TIER: HARD (TOEIC 700+). Advanced sentence structures, subtle grammar traps, exceptions, state/action verb nuances, collocations, and confusable distractors requiring careful analytical reading.",
    }[difficulty];

    const promptText = `You are a certified TOEIC test item writer and English grammar specialist.
Generate exactly ${count} authentic TOEIC Part 5 (Incomplete Sentences) multiple-choice questions focusing specifically on the target grammar of Unit ${unitNumber}: "${title}".

${difficultyPromptGuidance}

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
7. Include "difficulty": "${difficulty}".
8. Include "ruleReference": "${theorySections[0]?.sectionId || `${unitNumber}A`}" mapped to the theory section tested.
9. Return ONLY a valid JSON object matching the following structure without markdown code fences or backticks:
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
      "explanation": "Dấu hiệu thời gian 'right now' diễn tả một hành động đang trực tiếp diễn ra tại thời điểm nói. Vì vậy, ta chia động từ ở thì Hiện tại tiếp diễn: 'is conducting'.",
      "difficulty": "${difficulty}",
      "ruleReference": "${theorySections[0]?.sectionId || `${unitNumber}A`}"
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
          return parsed.questions.slice(0, count).map((q, idx) => ({
            ...q,
            difficulty: q.difficulty || difficulty,
            ruleReference:
              q.ruleReference ||
              theorySections[idx % (theorySections.length || 1)]?.sectionId ||
              `${unitNumber}A`,
          }));
        }
      }
    }

    // If Gemini response fails or schema doesn't match, fallback safely
    return generateDynamicFallbackToeicQuestions(
      unitNumber,
      title,
      count,
      difficulty,
      theorySections
    );
  } catch {
    // If network fails or timeout occurs, fallback safely
    return generateDynamicFallbackToeicQuestions(
      unitNumber,
      title,
      count,
      difficulty,
      theorySections
    );
  }
}
