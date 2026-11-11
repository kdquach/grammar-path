export type ToeicGoalBand = "450+" | "600+" | "750+";

export type UnitPriority = "core" | "recommended" | "advanced";

export interface RoadmapUnitEntry {
  unitNumber: number;
  priority: UnitPriority;
  toeicTag: string;
  toeicParts: string[];
  noteVi: string;
}

export interface RoadmapModule {
  id: string;
  code: string;
  titleVi: string;
  subtitleEn: string;
  toeicParts: string[];
  descriptionVi: string;
  trapTipVi: string;
  units: RoadmapUnitEntry[];
}

export interface RoadmapStage {
  id: string;
  stageNumber: number;
  titleVi: string;
  targetBand: string;
  goalBandKey: ToeicGoalBand;
  durationEstimate: string;
  accent: "sky" | "emerald" | "indigo" | "amber" | "rose";
  summaryVi: string;
  whyForBeginnersVi: string;
  outcomeVi: string;
  modules: RoadmapModule[];
}

export interface ToeicGoalTrack {
  id: ToeicGoalBand;
  titleVi: string;
  targetBadge: string;
  weeklyPaceVi: string;
  descriptionVi: string;
  includedStages: number[];
  recommendedMode: "core" | "all";
}

export interface ToeicPartMapping {
  part: string;
  titleVi: string;
  weightVi: string;
  keyTopicsVi: string;
  unitNumbers: number[];
}

export interface DailyStudyStep {
  step: number;
  minutes: string;
  titleVi: string;
  descriptionVi: string;
}

export const TOEIC_GOAL_TRACKS: ToeicGoalTrack[] = [
  {
    id: "450+",
    titleVi: "Lấy lại gốc vững chắc",
    targetBadge: "Mục tiêu 450+",
    weeklyPaceVi: "3–5 tuần • 30 phút/ngày",
    descriptionVi:
      "Tập trung khôi phục bộ khung câu, từ loại (Danh/Động/Tính/Trạng), 12 thì cốt lõi và thể Bị động — đủ nền đọc hiểu email ngắn và làm chắc các câu dễ Part 5.",
    includedStages: [1, 2],
    recommendedMode: "core",
  },
  {
    id: "600+",
    titleVi: "Đi làm & Chuẩn tốt nghiệp",
    targetBadge: "Mục tiêu 600+",
    weeklyPaceVi: "6–8 tuần • 30–45 phút/ngày",
    descriptionVi:
      "Mở rộng thêm Động từ khiếm khuyết (Modals), dạng động từ to-V / V-ing sau giới từ và Câu điều kiện — làm tốt 75% câu ngữ pháp Part 5–6 và nghe hiểu công sở.",
    includedStages: [1, 2, 3],
    recommendedMode: "core",
  },
  {
    id: "750+",
    titleVi: "Làm chủ toàn diện TOEIC",
    targetBadge: "Mục tiêu 750–850+",
    weeklyPaceVi: "10–12 tuần • 45 phút/ngày",
    descriptionVi:
      "Chinh phục toàn bộ 145 Units bao gồm Rút gọn mệnh đề phân từ (-ing/-ed), Liên từ vs Giới từ, Collocation và Phrasal Verbs để xử lý bẫy khó Part 5–7.",
    includedStages: [1, 2, 3, 4, 5],
    recommendedMode: "all",
  },
];

export const DAILY_STUDY_STEPS: DailyStudyStep[] = [
  {
    step: 1,
    minutes: "10 phút",
    titleVi: "Nắm bản chất bằng tiếng Việt",
    descriptionVi:
      "Mở tab Theory của Unit, đọc ví dụ song ngữ và bấm nút 'AI giảng lại bằng tiếng Việt' nếu bạn quên gốc phần đó.",
  },
  {
    step: 2,
    minutes: "12 phút",
    titleVi: "Làm bài tập tương tác có Rule Reference",
    descriptionVi:
      "Làm lần lượt từng câu, bấm Check Answer để xem ngay giải thích tiếng Việt và nhấn thẻ Rule (ví dụ 70A) khi bị hổng.",
  },
  {
    step: 3,
    minutes: "5 phút",
    titleVi: "Chuyển hóa sang đề TOEIC Part 5",
    descriptionVi:
      "Bấm '🎯 Luyện tập thêm dạng đề TOEIC' chọn mức Dễ (Cơ bản) trước khi tăng lên Trung bình và Bẫy 700+.",
  },
  {
    step: 4,
    minutes: "3 phút",
    titleVi: "Vá lỗ hổng bằng Review Mistakes",
    descriptionVi:
      "Cuối tuần vào mục Review Mistakes để giải quyết dứt điểm những câu từng sai, tránh lặp lỗi trong phòng thi.",
  },
];

export const TOEIC_PART_MATRIX: ToeicPartMapping[] = [
  {
    part: "Part 1",
    titleVi: "Mô tả tranh (6 câu)",
    weightVi: "Listening nền tảng",
    keyTopicsVi: "Thì hiện tại tiếp diễn (đang làm gì), Bị động (đang/đã được đặt ở đâu), Giới từ vị trí đồ vật.",
    unitNumbers: [1, 3, 42, 43, 123, 124, 125],
  },
  {
    part: "Part 2–4",
    titleVi: "Hỏi đáp, Hội thoại & Bài nói (94 câu)",
    weightVi: "Listening trọng điểm",
    keyTopicsVi: "Câu hỏi Wh-/Yes-No, Câu hỏi đuôi, Tương lai kế hoạch, Modal đề nghị/yêu cầu và Phrasal Verbs công sở.",
    unitNumbers: [19, 20, 26, 37, 49, 50, 52, 137, 140],
  },
  {
    part: "Part 5",
    titleVi: "Hoàn thành câu (30 câu)",
    weightVi: "Ăn điểm nhanh nhất",
    keyTopicsVi: "Word Form (Tính/Trạng/Danh), Đại từ & Lượng từ, Chia thì & Bị động, to-V/V-ing, Rút gọn mệnh đề, Liên từ vs Giới từ.",
    unitNumbers: [69, 80, 89, 97, 98, 100, 113, 115, 119, 129],
  },
  {
    part: "Part 6",
    titleVi: "Hoàn thành đoạn văn (16 câu)",
    weightVi: "Ngữ cảnh + Ngữ pháp",
    keyTopicsVi: "Mạch thì hiện tại–quá khứ–tương lai, Liên từ chuyển ý (Although/Despite), Từ hạn định & So sánh.",
    unitNumbers: [5, 7, 13, 25, 105, 111, 113, 120],
  },
  {
    part: "Part 7",
    titleVi: "Đọc hiểu Email, Thông báo & Hợp đồng (54 câu)",
    weightVi: "Đọc nhanh câu dài",
    keyTopicsVi: "Tách chủ–vị câu dài có Mệnh đề quan hệ, Câu điều kiện chính sách, Tường thuật và Giới từ hạn chót.",
    unitNumbers: [38, 47, 92, 95, 97, 115, 120, 122],
  },
];

export const TOEIC_ROADMAP_STAGES: RoadmapStage[] = [
  {
    id: "stage-1",
    stageNumber: 1,
    titleVi: "Giai đoạn 1: Khôi phục Khung Câu, Danh Từ & Từ Loại",
    targetBand: "0 → 350+ TOEIC",
    goalBandKey: "450+",
    durationEstimate: "Tuần 1–3",
    accent: "sky",
    summaryVi:
      "Thay vì học vội các thì phức tạp, người mất gốc cần hiểu cấu tạo một câu tiếng Anh gồm những thành phần nào: Chủ ngữ, Tân ngữ, Danh từ, Tính từ và Trạng từ.",
    whyForBeginnersVi:
      "Gần 30% câu hỏi Part 5 là bài tập Từ loại (Word Form) và Đại từ/Lượng từ — dạng bài có thể làm đúng trong 5 giây nếu bạn nhìn ra vị trí Danh/Tính/Trạng từ mà không cần dịch hết câu.",
    outcomeVi:
      "Nhận diện ngay cấu trúc S-V-O, phân biệt được vị trí cần Danh từ – Tính từ – Trạng từ trong đề Part 5 và hết nhầm số ít/số nhiều cơ bản.",
    modules: [
      {
        id: "m-1-1",
        code: "1.1",
        titleVi: "Cấu trúc câu & Trật tự từ nền tảng",
        subtitleEn: "Sentence Word Order & Question Patterns",
        toeicParts: ["Listening Part 2", "Reading Part 5"],
        descriptionVi:
          "Hiểu trật tự chuẩn Chủ ngữ + Động từ + Tân ngữ + Nơi chốn + Thời gian, cấu trúc There is/are và cách đặt câu hỏi để nghe đúng trọng tâm Part 2.",
        trapTipVi:
          "Ở TOEIC Part 2, bẫy kinh điển là câu hỏi đuôi (Unit 52) và câu hỏi gián tiếp 'Do you know where...' (Unit 50 — giữ nguyên trật tự S + V, không đảo ngữ!).",
        units: [
          {
            unitNumber: 84,
            priority: "core",
            toeicTag: "Chủ ngữ giả",
            toeicParts: ["Part 1", "Part 5"],
            noteVi: "Nắm chắc 'There is/are' mô tả tranh Part 1 và chủ ngữ giả 'It is + adj + to V'.",
          },
          {
            unitNumber: 109,
            priority: "core",
            toeicTag: "Khung S-V-O",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nắm trật tự Động từ + Tân ngữ + Nơi chốn + Thời gian để tách ý nhanh khi đọc email.",
          },
          {
            unitNumber: 110,
            priority: "recommended",
            toeicTag: "Vị trí trạng từ",
            toeicParts: ["Part 5"],
            noteVi: "Biết vị trí đứng của trạng từ (always, also, probably) trước động từ thường và sau trợ động từ.",
          },
          {
            unitNumber: 49,
            priority: "core",
            toeicTag: "Nghe Part 2",
            toeicParts: ["Part 2"],
            noteVi: "Nghe chính xác từ để hỏi (Who/When/Where/Why/How) và trợ động từ đầu câu.",
          },
          {
            unitNumber: 50,
            priority: "core",
            toeicTag: "Bẫy câu hỏi",
            toeicParts: ["Part 2", "Part 5"],
            noteVi: "Phân biệt câu hỏi trực tiếp và mệnh đề hỏi gián tiếp 'Could you tell me where the office is?'.",
          },
          {
            unitNumber: 51,
            priority: "recommended",
            toeicTag: "Trợ động từ",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Hiểu cách đáp ngắn bằng trợ động từ (I do / I haven't / I hope so) rất hay nghe trong hội thoại.",
          },
          {
            unitNumber: 52,
            priority: "recommended",
            toeicTag: "Câu hỏi đuôi",
            toeicParts: ["Part 2"],
            noteVi: "Làm quen câu hỏi đuôi (isn't it? / haven't you?) xuất hiện đều đặn trong Listening Part 2.",
          },
        ],
      },
      {
        id: "m-1-2",
        code: "1.2",
        titleVi: "Danh từ, Mạo từ & Danh từ ghép công sở",
        subtitleEn: "Nouns, Articles (a/an/the) & Compound Nouns",
        toeicParts: ["Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Phân biệt danh từ đếm được và không đếm được (information, advice, equipment...), quy tắc mạo từ và cụm Danh từ + Danh từ.",
        trapTipVi:
          "Đề TOEIC rất hay lừa với các danh từ không đếm được nhưng có nghĩa số nhiều trong tiếng Việt như: information, equipment, furniture, work, advice (không bao giờ thêm -s hay a/an!).",
        units: [
          {
            unitNumber: 69,
            priority: "core",
            toeicTag: "Đếm được / Không",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Gốc quan trọng nhất để chia đúng động từ số ít/nhiều và không dùng sai 'a/an'.",
          },
          {
            unitNumber: 70,
            priority: "core",
            toeicTag: "Bẫy danh từ",
            toeicParts: ["Part 5"],
            noteVi: "Nhớ nhóm từ không đếm được kinh điển: information, advice, luggage, progress, work.",
          },
          {
            unitNumber: 71,
            priority: "core",
            toeicTag: "a / an / some",
            toeicParts: ["Part 5"],
            noteVi: "Quy tắc bắt buộc danh từ đếm được số ít luôn cần mạo từ hoặc từ hạn định đi kèm.",
          },
          {
            unitNumber: 72,
            priority: "core",
            toeicTag: "a/an vs the",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Dấu hiệu nhận biết mạo từ báo hiệu ngay phía sau chỗ trống đang cần một cụm Danh từ.",
          },
          {
            unitNumber: 73,
            priority: "recommended",
            toeicTag: "Cách dùng The",
            toeicParts: ["Part 6", "Part 7"],
            noteVi: "Hiểu khi nào sự vật được xác định ngữ cảnh (the manager, the report).",
          },
          {
            unitNumber: 74,
            priority: "advanced",
            toeicTag: "Nơi chốn không The",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Phân biệt cụm cố định 'at work / in hospital / go to university' khi nghe hiểu.",
          },
          {
            unitNumber: 75,
            priority: "advanced",
            toeicTag: "Danh từ khái quát",
            toeicParts: ["Part 7"],
            noteVi: "Hiểu nghĩa khái quát khi danh từ số nhiều không dùng 'the'.",
          },
          {
            unitNumber: 76,
            priority: "advanced",
            toeicTag: "The + Tính từ",
            toeicParts: ["Part 7"],
            noteVi: "Nhận biết cấu trúc 'the unemployed / the elderly' trong bài báo, thông báo cộng đồng.",
          },
          {
            unitNumber: 77,
            priority: "advanced",
            toeicTag: "Địa danh & The",
            toeicParts: ["Part 7"],
            noteVi: "Đọc hiểu tên quốc gia, tổ chức, khu vực trong bài đọc TOEIC thương mại.",
          },
          {
            unitNumber: 78,
            priority: "advanced",
            toeicTag: "Tên đường/tòa nhà",
            toeicParts: ["Part 2", "Part 7"],
            noteVi: "Tên đường phố, sân bay, nhà ga, trụ sở thường gặp trong email chỉ dẫn công ty.",
          },
          {
            unitNumber: 79,
            priority: "core",
            toeicTag: "Số ít / Số nhiều",
            toeicParts: ["Part 5"],
            noteVi: "Nắm chắc danh từ có đuôi -s nhưng chia số ít (news, economics) và danh từ bất quy tắc.",
          },
          {
            unitNumber: 80,
            priority: "core",
            toeicTag: "Danh từ ghép",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Xuất hiện dày đặc trong TOEIC: customer service, sales department, safety regulations.",
          },
          {
            unitNumber: 81,
            priority: "core",
            toeicTag: "Sở hữu cách",
            toeicParts: ["Part 5"],
            noteVi: "Nhận biết sau 's hoặc tính từ sở hữu luôn là cụm Danh từ (the company's policy).",
          },
        ],
      },
      {
        id: "m-1-3",
        code: "1.3",
        titleVi: "Đại từ & Từ chỉ lượng",
        subtitleEn: "Pronouns & Quantifiers (each / every / both / all)",
        toeicParts: ["Part 5", "Part 6"],
        descriptionVi:
          "Làm chủ đại từ phản thân (-self), sở hữu, và nhóm từ chỉ định lượng như both/either/neither, each/every, most/all.",
        trapTipVi:
          "Bẫy kinh điển Part 5: 'each / every + Danh từ số ít + Động từ số ít', còn 'each of the + Danh từ số nhiều + Động từ số ít'!",
        units: [
          {
            unitNumber: 82,
            priority: "core",
            toeicTag: "Đại từ phản thân",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt 'by myself / themselves' vs đại từ tân ngữ 'me / them' (chiếm 1–2 câu mỗi đề).",
          },
          {
            unitNumber: 83,
            priority: "recommended",
            toeicTag: "Sở hữu kép",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt tính từ sở hữu (my) vs đại từ sở hữu (mine/theirs) khi đứng một mình.",
          },
          {
            unitNumber: 85,
            priority: "core",
            toeicTag: "some / any",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Quy tắc dùng some/any và cụm bất định (anyone, something) trong câu khẳng định/phủ định.",
          },
          {
            unitNumber: 86,
            priority: "recommended",
            toeicTag: "no / none / any",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt nhanh: 'no + Noun' nhưng 'none' đứng một mình không kèm danh từ.",
          },
          {
            unitNumber: 87,
            priority: "core",
            toeicTag: "much / many / few",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Nắm chắc many/few + đếm được số nhiều; much/little + không đếm được.",
          },
          {
            unitNumber: 88,
            priority: "core",
            toeicTag: "all / most of",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt 'most employees' (không có of) vs 'most of the employees' (có of + the/these).",
          },
          {
            unitNumber: 89,
            priority: "core",
            toeicTag: "both/neither/either",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Bộ cặp liên từ–lượng từ tần suất cực cao: both A and B, either A or B, neither A nor B.",
          },
          {
            unitNumber: 90,
            priority: "recommended",
            toeicTag: "all / every / whole",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Phân biệt 'the whole day' vs 'all day' vs 'every employee'.",
          },
          {
            unitNumber: 91,
            priority: "core",
            toeicTag: "each / every",
            toeicParts: ["Part 5"],
            noteVi: "Nhận diện ngay danh từ số ít và động từ số ít đi sau each/every.",
          },
        ],
      },
      {
        id: "m-1-4",
        code: "1.4",
        titleVi: "Tính từ, Trạng từ & Câu So sánh (Vua Part 5)",
        subtitleEn: "Word Forms, Adjectives, Adverbs & Comparisons",
        toeicParts: ["Part 5", "Part 6"],
        descriptionVi:
          "Phần kiếm điểm nhanh nhất cho người mất gốc: phân biệt đuôi Tính từ vs Trạng từ, tính từ chủ động -ing vs bị động -ed, và các cấp so sánh.",
        trapTipVi:
          "Mẹo 3 giây Part 5: Trước Danh từ chọn Tính từ; bổ nghĩa cho Động từ/Tính từ hoặc đứng cuối câu đủ nghĩa chọn Trạng từ (-ly); thấy 'than' chọn so sánh hơn, thấy 'the ___est / the most ___' chọn so sánh nhất!",
        units: [
          {
            unitNumber: 98,
            priority: "core",
            toeicTag: "Tính từ -ing / -ed",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt bản chất (interesting/challenging) với cảm xúc con người (interested/satisfied).",
          },
          {
            unitNumber: 99,
            priority: "core",
            toeicTag: "Tính từ & Linking V",
            toeicParts: ["Part 5"],
            noteVi: "Nhớ nhóm động từ nối (be, become, remain, look, seem) + Tính từ chứ không cộng Trạng từ!",
          },
          {
            unitNumber: 100,
            priority: "core",
            toeicTag: "Word Form -ly",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt Adj và Adv (-ly) — dạng câu hỏi có mặt trong mọi đề TOEIC Part 5.",
          },
          {
            unitNumber: 101,
            priority: "core",
            toeicTag: "Trạng từ đặc biệt",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt cặp dễ sai: hard vs hardly, late vs lately, high vs highly, good vs well.",
          },
          {
            unitNumber: 102,
            priority: "recommended",
            toeicTag: "so / such",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "'so + adj/adv + that' vs 'such + (a/an) + adj + noun + that'.",
          },
          {
            unitNumber: 103,
            priority: "core",
            toeicTag: "enough / too",
            toeicParts: ["Part 5"],
            noteVi: "Nhớ vị trí: 'adj + enough' (đứng sau tính từ) vs 'enough + noun' (đứng trước danh từ).",
          },
          {
            unitNumber: 104,
            priority: "advanced",
            toeicTag: "Phó từ mức độ",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Hiểu sắc thái mức độ (quite, rather, fairly) trong nhận xét công việc.",
          },
          {
            unitNumber: 105,
            priority: "core",
            toeicTag: "So sánh hơn",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Nhận dấu hiệu 'than' và trạng từ nhấn mạnh trước so sánh hơn (much/far/even better).",
          },
          {
            unitNumber: 106,
            priority: "recommended",
            toeicTag: "So sánh nâng cao",
            toeicParts: ["Part 5"],
            noteVi: "Nhận dạng cấu trúc 'more and more' và 'the sooner, the better'.",
          },
          {
            unitNumber: 107,
            priority: "core",
            toeicTag: "So sánh bằng",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Cấu trúc 'as + adj/adv + as' rất thường gặp khi so sánh giá, hiệu suất trong hợp đồng.",
          },
          {
            unitNumber: 108,
            priority: "core",
            toeicTag: "So sánh nhất",
            toeicParts: ["Part 5"],
            noteVi: "Nhận biết cụm 'one of the + most/est + Danh từ số nhiều'.",
          },
        ],
      },
    ],
  },
  {
    id: "stage-2",
    stageNumber: 2,
    titleVi: "Giai đoạn 2: Làm Chủ 12 Thì & Thể Bị Động — Xương Sống TOEIC",
    targetBand: "350 → 500+ TOEIC",
    goalBandKey: "450+",
    durationEstimate: "Tuần 4–5",
    accent: "emerald",
    summaryVi:
      "Sau khi vững Danh–Tính–Trạng, bạn bước vào hệ thống Động từ: chia đúng Thì theo dấu hiệu thời gian và phân biệt Chủ động vs Bị động.",
    whyForBeginnersVi:
      "Chỉ cần nhìn thấy 4 đáp án cùng một gốc động từ (ví dụ: submits / submitted / will submit / has been submitted), bạn cần quy trình 2 bước: xét Chủ động/Bị động trước -> xét Mốc thời gian sau.",
    outcomeVi:
      "Đạt độ chính xác trên 80% các câu chia thì & bị động trong Part 5, đồng thời nghe tranh Part 1 và đọc mốc thời gian Part 7 cực nhạy.",
    modules: [
      {
        id: "m-2-1",
        code: "2.1",
        titleVi: "Các thì Hiện tại & Quá khứ cốt lõi",
        subtitleEn: "Present Simple/Continuous & Past Simple/Continuous",
        toeicParts: ["Part 1", "Part 5", "Part 7"],
        descriptionVi:
          "Hiểu bản chất hành động lặp lại / sự thật (Present simple), đang diễn ra (Present continuous — đặc sản Part 1) và đã chấm dứt trong quá khứ (Past simple).",
        trapTipVi:
          "Đừng dịch máy móc 'đang' là dùng V-ing cho mọi động từ! Nhóm động từ trạng thái (know, belong, prefer, contain, own) gần như không chia tiếp diễn (Unit 4).",
        units: [
          {
            unitNumber: 1,
            priority: "core",
            toeicTag: "Part 1 Mô tả",
            toeicParts: ["Part 1", "Part 5"],
            noteVi: "Nền tảng tả hành động đang diễn ra trong ảnh Listening Part 1 (is holding, are walking).",
          },
          {
            unitNumber: 2,
            priority: "core",
            toeicTag: "Hiện tại đơn",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Chia đúng S số ít/số nhiều cho lịch trình, quy định công ty và sự thật hiển nhiên.",
          },
          {
            unitNumber: 3,
            priority: "core",
            toeicTag: "Phân biệt Tiếp diễn",
            toeicParts: ["Part 1", "Part 5"],
            noteVi: "Phân biệt sự việc tạm thời với thói quen cố định để không chọn nhầm thì.",
          },
          {
            unitNumber: 4,
            priority: "core",
            toeicTag: "Động từ trạng thái",
            toeicParts: ["Part 5"],
            noteVi: "Tránh bẫy chia V-ing với động từ trạng thái (include, own, belong, prefer, consist).",
          },
          {
            unitNumber: 5,
            priority: "core",
            toeicTag: "Quá khứ đơn",
            toeicParts: ["Part 5", "Part 6", "Part 7"],
            noteVi: "Dấu hiệu: last week, ago, yesterday, in 2022 -> chọn ngay V-ed / cột 2.",
          },
          {
            unitNumber: 6,
            priority: "recommended",
            toeicTag: "Quá khứ tiếp diễn",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Diễn tả hành động đang xảy ra tại một thời điểm quá khứ khi hành động khác xen vào.",
          },
          {
            unitNumber: 17,
            priority: "advanced",
            toeicTag: "have / have got",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Quen với cách nói 'have got' rất tự nhiên của giọng Anh–Anh trong Listening.",
          },
          {
            unitNumber: 18,
            priority: "recommended",
            toeicTag: "used to do",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Phân biệt thói quen cũ 'used to + V' với quen việc gì 'be used to + V-ing' (Unit 61).",
          },
        ],
      },
      {
        id: "m-2-2",
        code: "2.2",
        titleVi: "Nhóm thì Hoàn thành & Bẫy for / since",
        subtitleEn: "Present Perfect & Past Perfect",
        toeicParts: ["Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Điểm ngữ pháp người Việt hay hổng nhất do tiếng Việt không có thì Hoàn thành: kết nối quá khứ với hiện tại (has/have + V3) và thứ tự trước–sau trong quá khứ (had + V3).",
        trapTipVi:
          "Thấy 'since + mốc thời gian' hoặc 'for + khoảng thời gian' hoặc 'over the past five years' trong email -> ưu tiên hàng đầu Hiện tại hoàn thành (has/have V3)!",
        units: [
          {
            unitNumber: 7,
            priority: "core",
            toeicTag: "Hiện tại hoàn thành",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Hành động mới xảy ra hoặc kéo dài tới hiện tại, không nêu thời điểm cụ thể.",
          },
          {
            unitNumber: 8,
            priority: "recommended",
            toeicTag: "ever / already / yet",
            toeicParts: ["Part 2", "Part 5"],
            noteVi: "Nắm chắc vị trí và nghĩa của already, yet, recently trong email thông báo.",
          },
          {
            unitNumber: 9,
            priority: "recommended",
            toeicTag: "HTHT Tiếp diễn",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nhấn mạnh tính liên tục của hành động kéo dài từ quá khứ tới nay.",
          },
          {
            unitNumber: 10,
            priority: "recommended",
            toeicTag: "Simple vs Cont",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt nhấn mạnh kết quả số lượng (done) vs quá trình (been doing).",
          },
          {
            unitNumber: 11,
            priority: "recommended",
            toeicTag: "How long...",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Nghe chính xác câu hỏi How long trong Part 2–3 để không nhầm với câu trả lời khoảng cách/chiều dài.",
          },
          {
            unitNumber: 12,
            priority: "core",
            toeicTag: "for vs since",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt nhanh: 'for + khoảng thời gian' (for 3 years) vs 'since + mốc thời gian' (since 2020).",
          },
          {
            unitNumber: 13,
            priority: "core",
            toeicTag: "HTHT vs Quá khứ",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt lỗi sai số 1: có thời gian quá khứ xác định (yesterday, last year) thì phải dùng Past simple!",
          },
          {
            unitNumber: 14,
            priority: "recommended",
            toeicTag: "Phân biệt nâng cao",
            toeicParts: ["Part 6", "Part 7"],
            noteVi: "Thực hành sâu ngữ cảnh thông báo đã xảy ra vs còn hiệu lực hiện tại.",
          },
          {
            unitNumber: 15,
            priority: "core",
            toeicTag: "Quá khứ hoàn thành",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Hành động xảy ra TRƯỚC một mốc/hành động khác trong quá khứ (Before he joined..., he had worked...).",
          },
          {
            unitNumber: 16,
            priority: "advanced",
            toeicTag: "QKHT Tiếp diễn",
            toeicParts: ["Part 7"],
            noteVi: "Đọc hiểu quá trình diễn ra liên tục trước một sự kiện quá khứ.",
          },
        ],
      },
      {
        id: "m-2-3",
        code: "2.3",
        titleVi: "Các thì Tương lai & Quy tắc Mệnh đề Thời gian",
        subtitleEn: "Future Forms & Time Clauses (When / Before / Until)",
        toeicParts: ["Part 2", "Part 3", "Part 5"],
        descriptionVi:
          "Phân biệt kế hoạch đã chốt (be going to / present continuous), quyết định/thông báo tương lai (will), và thì Tương lai hoàn thành (will have done).",
        trapTipVi:
          "Bẫy vàng Part 5 (Unit 25): Sau 'when / before / after / as soon as / until' KHÔNG BAO GIỜ dùng 'will' — dùng Hiện tại đơn để chỉ nghĩa tương lai!",
        units: [
          {
            unitNumber: 19,
            priority: "core",
            toeicTag: "Lịch trình tương lai",
            toeicParts: ["Part 2", "Part 3", "Part 7"],
            noteVi: "Hiểu Hiện tại đơn dùng cho giờ tàu/lịch họp cố định (The meeting starts at 9).",
          },
          {
            unitNumber: 20,
            priority: "core",
            toeicTag: "be going to",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Nghe tốt câu hỏi & câu trả lời kế hoạch, dự định trong hội thoại văn phòng.",
          },
          {
            unitNumber: 21,
            priority: "core",
            toeicTag: "will + V0",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Thì Tương lai đơn chuẩn cho lời hứa, thông báo chính sách, dự đoán (next month/soon).",
          },
          {
            unitNumber: 22,
            priority: "recommended",
            toeicTag: "will / shall",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Nhận biết mẫu đề nghị giúp đỡ 'Shall I / Shall we...' thường gặp trong Listening.",
          },
          {
            unitNumber: 23,
            priority: "recommended",
            toeicTag: "will vs going to",
            toeicParts: ["Part 3", "Part 6"],
            noteVi: "Phân biệt dự định sẵn có với quyết định nảy sinh ngay lúc nói.",
          },
          {
            unitNumber: 24,
            priority: "core",
            toeicTag: "By + TL Hoàn thành",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Thấy 'By next Friday / By the end of the year' -> ưu tiên 'will have + V3'!",
          },
          {
            unitNumber: 25,
            priority: "core",
            toeicTag: "Bẫy When + HTĐ",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Quy tắc bắt buộc: Mệnh đề phụ chỉ thời gian (when/until/as soon as) chỉ chia Hiện tại, không dùng will.",
          },
        ],
      },
      {
        id: "m-2-4",
        code: "2.4",
        titleVi: "Câu Bị Động — Trọng điểm Part 1 & Part 5",
        subtitleEn: "Passive Voice Mastery",
        toeicParts: ["Part 1", "Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Cách phân biệt nhanh Chủ động vs Bị động dựa vào Tân ngữ phía sau chỗ trống và dạng 'be + V3' theo từng thì.",
        trapTipVi:
          "Quy tắc kiểm tra 2 giây: Nếu sau chỗ trống KHÔNG có Tân ngữ (mà lại là giới từ in/on/by/to hoặc dấu chấm câu) -> 90% đáp án cần chia Bị động (be + V3)!",
        units: [
          {
            unitNumber: 42,
            priority: "core",
            toeicTag: "Bị động cơ bản",
            toeicParts: ["Part 1", "Part 5", "Part 6"],
            noteVi: "Công thức cốt lõi (is/was + V3) xuất hiện liên tục ở thông báo công ty và bài chia thì.",
          },
          {
            unitNumber: 43,
            priority: "core",
            toeicTag: "being / been done",
            toeicParts: ["Part 1", "Part 5"],
            noteVi: "Cực kỳ quan trọng ở Part 1: phân biệt 'is being repaired' (đang được sửa) vs 'has been repaired' (đã sửa xong).",
          },
          {
            unitNumber: 44,
            priority: "recommended",
            toeicTag: "Bị động 2 tân ngữ",
            toeicParts: ["Part 5"],
            noteVi: "Hiểu cấu trúc 'Employees were given a bonus / Applicants will be notified'.",
          },
          {
            unitNumber: 45,
            priority: "recommended",
            toeicTag: "be supposed to",
            toeicParts: ["Part 3", "Part 5"],
            noteVi: "Nắm cụm 'is expected to / is supposed to' (được kỳ vọng / theo quy định phải).",
          },
          {
            unitNumber: 46,
            priority: "recommended",
            toeicTag: "Have sth done",
            toeicParts: ["Part 3", "Part 5"],
            noteVi: "Cấu trúc nhờ/thuê dịch vụ 'have the equipment serviced' — nghĩa bị động cho đồ vật.",
          },
        ],
      },
    ],
  },
  {
    id: "stage-3",
    stageNumber: 3,
    titleVi: "Giai đoạn 3: Động Từ Khiếm Khuyết, Dạng Động Từ & Điều Kiện",
    targetBand: "500 → 650+ TOEIC",
    goalBandKey: "600+",
    durationEstimate: "Tuần 6–8",
    accent: "indigo",
    summaryVi:
      "Giai đoạn bứt phá điểm số lên mốc 600+: làm chủ sắc thái Modal verbs trong giao tiếp công sở, bẫy to-V / V-ing và các mẫu câu Điều kiện.",
    whyForBeginnersVi:
      "Nếu Stage 1–2 giúp bạn không mất điểm câu dễ, Stage 3 giúp bạn giải quyết nhóm câu phân loại ở mức trung bình–khá: chọn V-ing hay to-V, và câu điều kiện không dùng 'If'.",
    outcomeVi:
      "Thành thạo các động từ đi với to-V vs V-ing, nhớ nằm lòng 'Giới từ + V-ing' và nhận diện nhanh câu điều kiện loại 1/2/3 & Unless/Provided.",
    modules: [
      {
        id: "m-3-1",
        code: "3.1",
        titleVi: "Động từ khiếm khuyết (Modals) & Yêu cầu công sở",
        subtitleEn: "Modal Verbs, Obligation & Polite Workplace Requests",
        toeicParts: ["Part 2", "Part 3", "Part 4", "Part 5"],
        descriptionVi:
          "Phân biệt mức độ bắt buộc (must / have to / needn't), khuyên bảo (should / had better), và khả năng suy luận (may / might / could).",
        trapTipVi:
          "Sau MỌI Modal verb (can, could, may, might, must, should, will, would) luôn là Động từ nguyên mẫu (V0) hoặc (be + V3) nếu bị động — đừng bao giờ thêm 'to' hoặc -s/-ed!",
        units: [
          {
            unitNumber: 26,
            priority: "core",
            toeicTag: "can / be able to",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Dùng 'will be able to' khi chia ở tương lai (không dùng 'will can').",
          },
          {
            unitNumber: 27,
            priority: "recommended",
            toeicTag: "could / could have",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Hiểu suy đoán hoặc cơ hội đã qua trong quá khứ.",
          },
          {
            unitNumber: 28,
            priority: "recommended",
            toeicTag: "Suy luận must/can't",
            toeicParts: ["Part 3", "Part 4"],
            noteVi: "Suy luận logic trong bài nghe: 'The file must be in the cabinet'.",
          },
          {
            unitNumber: 29,
            priority: "core",
            toeicTag: "may / might 1",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Diễn đạt khả năng có thể xảy ra (may/might + V0) trong email & báo cáo.",
          },
          {
            unitNumber: 30,
            priority: "recommended",
            toeicTag: "may / might 2",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Nắm cách nói khả năng hiện tại/tương lai trong hội thoại văn phòng.",
          },
          {
            unitNumber: 31,
            priority: "core",
            toeicTag: "have to / must",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nội quy nhân sự: bắt buộc phải làm (must / have to) — từ khóa câu hỏi chi tiết Part 7.",
          },
          {
            unitNumber: 32,
            priority: "core",
            toeicTag: "mustn't vs needn't",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "CỰC QUAN TRỌNG Part 7: 'mustn't' = CẤM làm, còn 'don't have to / needn't' = KHÔNG CẦN thiết!",
          },
          {
            unitNumber: 33,
            priority: "core",
            toeicTag: "should",
            toeicParts: ["Part 2", "Part 5"],
            noteVi: "Khuyên bảo, đề xuất hợp lý (should + V0) và cấu trúc câu điều kiện đảo ngữ với Should.",
          },
          {
            unitNumber: 34,
            priority: "recommended",
            toeicTag: "should (nâng cao)",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nhận biết 'recommend / suggest / request that S + (should) + V0' (thức giả định Part 5!).",
          },
          {
            unitNumber: 35,
            priority: "recommended",
            toeicTag: "had better",
            toeicParts: ["Part 3", "Part 4"],
            noteVi: "Hiểu lời khuyên khẩn 'We'd better finish before 5' hay gặp trong hội thoại Part 3.",
          },
          {
            unitNumber: 36,
            priority: "recommended",
            toeicTag: "Would",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Nhận biết lời mời 'Would you like...' và giả định trang trọng trong email.",
          },
          {
            unitNumber: 37,
            priority: "core",
            toeicTag: "Yêu cầu lịch sự",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Nghe cực nhạy câu đề nghị/yêu cầu/xin phép trong Part 2–3 để bắt đúng câu trả lời.",
          },
        ],
      },
      {
        id: "m-3-2",
        code: "3.2",
        titleVi: "Danh động từ (V-ing) & Nguyên mẫu (to V)",
        subtitleEn: "Gerunds, Infinitives & Preposition + -ing",
        toeicParts: ["Part 5", "Part 6"],
        descriptionVi:
          "Giải quyết bài toán kinh điển của người Việt: sau động từ nào dùng V-ing, sau động từ nào dùng to-V, và quy tắc vàng 'Giới từ + V-ing'.",
        trapTipVi:
          "3 bẫy hay gặp nhất TOEIC: (1) 'look forward to + V-ing' (chữ 'to' là giới từ!), (2) 'encourage/advise/ask + Tân ngữ + to V', (3) 'in order to / so that' chỉ mục đích.",
        units: [
          {
            unitNumber: 53,
            priority: "core",
            toeicTag: "Verb + V-ing",
            toeicParts: ["Part 5"],
            noteVi: "Nhóm động từ đi với V-ing hay thi: consider, avoid, postpone, finish, recommend, suggest.",
          },
          {
            unitNumber: 54,
            priority: "core",
            toeicTag: "Verb + to V",
            toeicParts: ["Part 5"],
            noteVi: "Nhóm động từ đi với to-V hay thi: decide, plan, expect, agree, refuse, offer, fail.",
          },
          {
            unitNumber: 55,
            priority: "core",
            toeicTag: "V + Object + to V",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cấu trúc vàng Part 5: require / allow / encourage / remind / ask + somebody + TO DO.",
          },
          {
            unitNumber: 56,
            priority: "recommended",
            toeicTag: "remember / regret",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt 'remember to do' (nhớ phải làm) vs 'remember doing' (nhớ đã làm).",
          },
          {
            unitNumber: 57,
            priority: "recommended",
            toeicTag: "try / need / help",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cấu trúc hay gặp: 'need + V-ing' mang nghĩa bị động (the printer needs fixing).",
          },
          {
            unitNumber: 58,
            priority: "advanced",
            toeicTag: "like / would like",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Phân biệt sở thích chung (like) với lời mời lịch sự (would like to).",
          },
          {
            unitNumber: 59,
            priority: "recommended",
            toeicTag: "would rather",
            toeicParts: ["Part 3", "Part 5"],
            noteVi: "Thể hiện lựa chọn ưu tiên trong đối thoại & so sánh phương án.",
          },
          {
            unitNumber: 60,
            priority: "core",
            toeicTag: "Giới từ + V-ing",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Quy tắc BẤT DI BẤT DỊCH: Sau bất kỳ giới từ nào (in/for/by/without/before/after) + V-ing!",
          },
          {
            unitNumber: 61,
            priority: "core",
            toeicTag: "be used to V-ing",
            toeicParts: ["Part 5"],
            noteVi: "Cẩn thận bẫy 'to' là giới từ: be used to / look forward to / object to + V-ing!",
          },
          {
            unitNumber: 62,
            priority: "recommended",
            toeicTag: "V + Prep + V-ing",
            toeicParts: ["Part 5"],
            noteVi: "Nhóm động từ công sở: succeed in, apologize for, insist on + V-ing.",
          },
          {
            unitNumber: 63,
            priority: "recommended",
            toeicTag: "Cụm + V-ing",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Nhớ cụm 'have difficulty (in) + V-ing', 'it's worth + V-ing', 'spend time + V-ing'.",
          },
          {
            unitNumber: 64,
            priority: "core",
            toeicTag: "Mục đích to / for",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt '(in order) to + V0', 'for + Noun/V-ing', 'so that + S + V'.",
          },
          {
            unitNumber: 65,
            priority: "recommended",
            toeicTag: "Adj + to V",
            toeicParts: ["Part 5"],
            noteVi: "Mẫu câu thông báo: 'pleased to announce', 'essential to check', 'easy to use'.",
          },
          {
            unitNumber: 66,
            priority: "advanced",
            toeicTag: "afraid to / of",
            toeicParts: ["Part 7"],
            noteVi: "Phân biệt tinh tế sắc thái Tính từ + to V vs Giới từ + V-ing.",
          },
          {
            unitNumber: 67,
            priority: "advanced",
            toeicTag: "Động từ giác quan",
            toeicParts: ["Part 7"],
            noteVi: "Hiểu cấu trúc 'see/hear somebody do/doing' trong tường thuật sự việc.",
          },
        ],
      },
      {
        id: "m-3-3",
        code: "3.3",
        titleVi: "Câu Điều Kiện, Mong Ước & Tường Thuật",
        subtitleEn: "Conditionals (If / Unless / Provided) & Reported Speech",
        toeicParts: ["Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Nắm chắc 3 loại câu điều kiện, nhóm liên từ thay thế 'If' cực chuộng trong quy định TOEIC (unless, as long as, provided that) và câu tường thuật.",
        trapTipVi:
          "Trong hợp đồng/thông báo TOEIC Part 5–7, 'Provided (that) / As long as' (= Miễn là) và 'Unless' (= Trừ khi = If... not) xuất hiện thường xuyên hơn cả chữ 'If'!",
        units: [
          {
            unitNumber: 38,
            priority: "core",
            toeicTag: "Điều kiện loại 1 & 2",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Nhớ chuẩn phối hợp thì: Loại 1 (HTĐ -> will V0); Loại 2 (QKĐ -> would V0).",
          },
          {
            unitNumber: 39,
            priority: "recommended",
            toeicTag: "Điều kiện loại 2",
            toeicParts: ["Part 5"],
            noteVi: "Dùng 'were' cho mọi ngôi trong giả định trái hiện tại (If I were...).",
          },
          {
            unitNumber: 40,
            priority: "core",
            toeicTag: "Điều kiện loại 3",
            toeicParts: ["Part 5"],
            noteVi: "Nhận diện giả định quá khứ: 'If S + had V3, S + would have V3' (và dạng đảo ngữ Had S + V3!).",
          },
          {
            unitNumber: 41,
            priority: "advanced",
            toeicTag: "Câu ước Wish",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Hiểu lùi thì với 'wish' trong hội thoại bày tỏ tiếc nuối.",
          },
          {
            unitNumber: 114,
            priority: "core",
            toeicTag: "In case",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Phân biệt 'in case + Mệnh đề' (phòng khi) vs 'in case of + Danh từ'!",
          },
          {
            unitNumber: 115,
            priority: "core",
            toeicTag: "Unless / Provided",
            toeicParts: ["Part 5", "Part 6", "Part 7"],
            noteVi: "BỘ TỨ ĐẮT GIÁ: Unless, As long as, Provided/Providing (that) — phải thuộc lòng cho Part 5!",
          },
          {
            unitNumber: 47,
            priority: "recommended",
            toeicTag: "Tường thuật 1",
            toeicParts: ["Part 6", "Part 7"],
            noteVi: "Hiểu lùi thì trong báo cáo lại phát biểu của sếp/khách hàng.",
          },
          {
            unitNumber: 48,
            priority: "recommended",
            toeicTag: "Tường thuật 2",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Phân biệt động từ tường thuật 'say' (không cần tân ngữ người) vs 'tell + somebody'.",
          },
        ],
      },
    ],
  },
  {
    id: "stage-4",
    stageNumber: 4,
    titleVi: "Giai đoạn 4: Mệnh Đề Quan Hệ, Rút Gọn & Liên Từ Học Thuật",
    targetBand: "650 → 750+ TOEIC",
    goalBandKey: "750+",
    durationEstimate: "Tuần 9–10",
    accent: "amber",
    summaryVi:
      "Bí quyết vượt ngưỡng 650 lên 750+: xử lý câu văn dài đa mệnh đề, làm gọn câu bằng Phân từ (-ing/-ed) và phân biệt Liên từ vs Giới từ.",
    whyForBeginnersVi:
      "Người mới hay bị 'choáng' khi gặp một câu email dài 3 dòng trong Part 7 hoặc câu Part 5 có dấu phẩy liên tiếp. Nắm Mệnh đề quan hệ và Rút gọn phân từ giúp bạn đọc bóc tách ý chính nhanh gấp đôi.",
    outcomeVi:
      "Giải quyết trơn tru các câu Part 5 khó nhất: 'whose/whom/where', rút gọn chủ động V-ing vs bị động V-ed, và 'Although + S V' vs 'Despite + Noun'.",
    modules: [
      {
        id: "m-4-1",
        code: "4.1",
        titleVi: "Mệnh đề quan hệ & Rút gọn Phân từ (-ing / -ed)",
        subtitleEn: "Relative Clauses & Participle Clauses",
        toeicParts: ["Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Cách chọn who/whom/whose/which/that, cách lược bỏ đại từ quan hệ và đặc biệt là rút gọn mệnh đề quan hệ thành V-ing (chủ động) hoặc V-ed/V3 (bị động).",
        trapTipVi:
          "Bẫy 700+ kinh điển (Unit 97): Câu đã có 1 động từ chính rồi, chỗ trống bổ nghĩa cho Danh từ phía trước -> KHÔNG chọn V chia thì, hãy xét xem Danh từ đó tự làm (V-ing) hay bị làm (V-ed)!",
        units: [
          {
            unitNumber: 92,
            priority: "core",
            toeicTag: "who / that / which",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nối hai mệnh đề bổ nghĩa cho người (who/that) và vật (which/that).",
          },
          {
            unitNumber: 93,
            priority: "core",
            toeicTag: "Lược đại từ QH",
            toeicParts: ["Part 6", "Part 7"],
            noteVi: "Nhận ra câu không có chữ that/which vẫn chứa mệnh đề quan hệ ('the report you sent').",
          },
          {
            unitNumber: 94,
            priority: "core",
            toeicTag: "whose / whom / where",
            toeicParts: ["Part 5"],
            noteVi: "Mẹo 2 giây: Thấy [Danh từ chỉ người] + ___ + [Danh từ] -> chọn ngay 'whose'!",
          },
          {
            unitNumber: 95,
            priority: "recommended",
            toeicTag: "MĐQH có dấu phẩy",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Luật bất di bất dịch: Sau dấu phẩy (,) KHÔNG BAO GIỜ dùng 'that'!",
          },
          {
            unitNumber: 96,
            priority: "recommended",
            toeicTag: "Giới từ + whom/which",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Gặp cấu trúc văn phong trang trọng: 'the hotel in which', 'the manager to whom'.",
          },
          {
            unitNumber: 97,
            priority: "core",
            toeicTag: "Rút gọn -ing / -ed",
            toeicParts: ["Part 5", "Part 6", "Part 7"],
            noteVi: "TRỌNG ĐIỂM SỐ 1 VÙNG 700+: Phân biệt 'documents containing' vs 'products manufactured'.",
          },
          {
            unitNumber: 68,
            priority: "recommended",
            toeicTag: "Rút gọn đầu câu",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Rút gọn mệnh đề trạng ngữ đầu câu cùng chủ ngữ ('Working closely with clients, the team...').",
          },
        ],
      },
      {
        id: "m-4-2",
        code: "4.2",
        titleVi: "Liên từ đối lập, Nguyên nhân & Bẫy Giới từ",
        subtitleEn: "Conjunctions vs Prepositions (Although / Despite / While / During)",
        toeicParts: ["Part 5", "Part 6", "Part 7"],
        descriptionVi:
          "Phân biệt rạch ròi chữ nào theo sau bởi Mệnh đề (S + V) và chữ nào theo sau bởi Cụm Danh từ / V-ing.",
        trapTipVi:
          "Cặp bẫy kinh điển xuất hiện mỗi kỳ thi: 'Although / Even though / While + S + V' ≠ 'Despite / In spite of / During + Cụm Danh từ'!",
        units: [
          {
            unitNumber: 111,
            priority: "recommended",
            toeicTag: "still / yet / already",
            toeicParts: ["Part 2", "Part 5", "Part 6"],
            noteVi: "Chọn đúng phó từ thời gian theo sắc thái câu khẳng định/phủ định.",
          },
          {
            unitNumber: 112,
            priority: "advanced",
            toeicTag: "Even / Even though",
            toeicParts: ["Part 7"],
            noteVi: "Phân biệt trạng từ nhấn mạnh 'even' với liên từ 'even though / even if'.",
          },
          {
            unitNumber: 113,
            priority: "core",
            toeicTag: "Although vs Despite",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Bẫy Top 3 TOEIC Part 5: Soi ngay xem sau chỗ trống có Động từ chia thì hay chỉ là Cụm danh từ!",
          },
          {
            unitNumber: 116,
            priority: "recommended",
            toeicTag: "Đa nghĩa As",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Nhận diện 2 nghĩa hay gặp của 'as': khi đang (thời gian) và bởi vì (nguyên nhân).",
          },
          {
            unitNumber: 117,
            priority: "core",
            toeicTag: "Like vs As",
            toeicParts: ["Part 5"],
            noteVi: "Phân biệt 'work as a director' (vai trò chức danh) vs 'like' (giống như).",
          },
          {
            unitNumber: 118,
            priority: "advanced",
            toeicTag: "as if / as though",
            toeicParts: ["Part 7"],
            noteVi: "Hiểu cách so sánh giả định trong văn bản bình luận.",
          },
          {
            unitNumber: 119,
            priority: "core",
            toeicTag: "For / During / While",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cực dễ ăn điểm: For + khoảng thời gian, During + Danh từ sự kiện, While + S + V (hoặc V-ing).",
          },
          {
            unitNumber: 120,
            priority: "core",
            toeicTag: "By vs Until",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Hạn chót công sở: 'by Friday' (trước/muộn nhất là Thứ Sáu) ≠ 'until Friday' (kéo dài suốt tới Thứ Sáu).",
          },
        ],
      },
    ],
  },
  {
    id: "stage-5",
    stageNumber: 5,
    titleVi: "Giai đoạn 5: Giới Từ Công Sở, Collocations & Cụm Động Từ",
    targetBand: "750 → 850+ TOEIC",
    goalBandKey: "750+",
    durationEstimate: "Tuần 11–12",
    accent: "rose",
    summaryVi:
      "Hoàn thiện chặng cuối với giới từ thời gian/vị trí, cụm Danh từ/Tính từ/Động từ đi với Giới từ cố định (Collocations) và Phrasal Verbs.",
    whyForBeginnersVi:
      "Ở band 750+, ngữ pháp khung không còn làm khó bạn được nữa — câu phân hóa sẽ hỏi giới từ nào đi đúng với từ đứng trước ('responsible ___', 'increase ___', 'apply ___').",
    outcomeVi:
      "Nắm trọn bộ 145 Units Murphy, giải quyết tốt các câu Collocation Part 5–6 và hiểu tự nhiên cụm động từ trong Part 2–4 & Part 7.",
    modules: [
      {
        id: "m-5-1",
        code: "5.1",
        titleVi: "Giới từ Thời gian, Vị trí & Hạn chót",
        subtitleEn: "Prepositions of Time, Position & Movement",
        toeicParts: ["Part 1", "Part 2", "Part 5"],
        descriptionVi:
          "Hệ thống hóa at/on/in chỉ thời gian & nơi chốn, cặp 'on time vs in time', và giới từ 'by' đa nghĩa (bởi ai, bằng phương tiện gì, tăng/giảm bao nhiêu %).",
        trapTipVi:
          "Mẹo đọc số liệu TOEIC Part 5–7: 'increase BY 10%' = tăng thêm 10%; 'increase TO 10%' = tăng chạm mức 10%; 'on time' = đúng giờ hẹn ≠ 'in time' = kịp lúc!",
        units: [
          {
            unitNumber: 121,
            priority: "core",
            toeicTag: "At / On / In (Time)",
            toeicParts: ["Part 2", "Part 5"],
            noteVi: "At + giờ, On + ngày/thứ, In + tháng/năm/mùa (dùng liên tục ở Part 2 & Part 5).",
          },
          {
            unitNumber: 122,
            priority: "core",
            toeicTag: "on time vs in time",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Phân biệt cặp kinh điển: 'on time' (đúng giờ), 'in time' (kịp giờ), 'at the end' vs 'in the end'.",
          },
          {
            unitNumber: 123,
            priority: "core",
            toeicTag: "Vị trí In / At / On",
            toeicParts: ["Part 1", "Part 2"],
            noteVi: "Cốt lõi nghe tranh Part 1 và câu hỏi địa điểm Where ở Part 2.",
          },
          {
            unitNumber: 124,
            priority: "recommended",
            toeicTag: "In / At / On 2",
            toeicParts: ["Part 1", "Part 7"],
            noteVi: "Các cụm cố định: 'on the floor', 'at the top', 'in the corner', 'on the left'.",
          },
          {
            unitNumber: 125,
            priority: "recommended",
            toeicTag: "In / At / On 3",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Phân biệt 'arrive at + địa điểm nhỏ' vs 'arrive in + thành phố/quốc gia'.",
          },
          {
            unitNumber: 126,
            priority: "recommended",
            toeicTag: "to / at / into",
            toeicParts: ["Part 1", "Part 5"],
            noteVi: "Phân biệt giới từ chỉ hướng chuyển động (walk into) với vị trí tĩnh (at).",
          },
          {
            unitNumber: 127,
            priority: "recommended",
            toeicTag: "Cụm giới từ công sở",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cụm hay gặp: 'on business', 'on vacation', 'in writing', 'in advance', 'on the phone'.",
          },
          {
            unitNumber: 128,
            priority: "core",
            toeicTag: "Cách dùng By",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Đa nghĩa chữ 'by': bằng đường/phương tiện gì (by mail), chênh lệch số liệu (by 15%), bởi tác nhân.",
          },
        ],
      },
      {
        id: "m-5-2",
        code: "5.2",
        titleVi: "Collocation: Danh từ / Tính từ / Động từ + Giới từ",
        subtitleEn: "Preposition Collocations for Business English",
        toeicParts: ["Part 5", "Part 6"],
        descriptionVi:
          "Những cặp từ luôn đi kè kè cùng một giới từ cố định trong văn bản kinh doanh: demand for, responsible for, comply with, rely on...",
        trapTipVi:
          "Học theo cụm thay vì dịch nghĩa giới từ tiếng Việt! Ví dụ 'request for (n)' có FOR, nhưng động từ 'request (v) something' KHÔNG CÓ FOR!",
        units: [
          {
            unitNumber: 129,
            priority: "core",
            toeicTag: "Noun + Giới từ",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cụm kinh điển: demand for, increase/decrease in, reason for, solution to.",
          },
          {
            unitNumber: 130,
            priority: "core",
            toeicTag: "Adj + Giới từ 1",
            toeicParts: ["Part 5"],
            noteVi: "Học thuộc cụm công sở: pleased with, satisfied with, impressed by/with, proud of.",
          },
          {
            unitNumber: 131,
            priority: "core",
            toeicTag: "Adj + Giới từ 2",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cụm xuất hiện cực nhiều: responsible for, capable of, aware of, similar to, interested in.",
          },
          {
            unitNumber: 132,
            priority: "recommended",
            toeicTag: "Verb + to / at",
            toeicParts: ["Part 5", "Part 7"],
            noteVi: "Phân biệt talk/speak/listen TO someone vs look/aim AT.",
          },
          {
            unitNumber: 133,
            priority: "recommended",
            toeicTag: "Verb + about / for",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Các cụm: apply for (a job), ask for, wait for, apologize for, care about.",
          },
          {
            unitNumber: 134,
            priority: "advanced",
            toeicTag: "Verb + about / of",
            toeicParts: ["Part 7"],
            noteVi: "Phân biệt sắc thái think about/of, hear about/of/from trong email.",
          },
          {
            unitNumber: 135,
            priority: "recommended",
            toeicTag: "Verb + for / from / on",
            toeicParts: ["Part 5", "Part 6"],
            noteVi: "Cụm quan trọng: depend on, rely on, congratulate on, prevent from.",
          },
          {
            unitNumber: 136,
            priority: "recommended",
            toeicTag: "Verb + in / with / to",
            toeicParts: ["Part 5"],
            noteVi: "Cụm hay thi: specialize in, participate in, agree with, provide somebody with.",
          },
        ],
      },
      {
        id: "m-5-3",
        code: "5.3",
        titleVi: "Cụm Động Từ Thực Chiến (Phrasal Verbs)",
        subtitleEn: "Essential Business & Daily Phrasal Verbs",
        toeicParts: ["Part 2", "Part 3", "Part 4", "Part 7"],
        descriptionVi:
          "Tăng tốc phản xạ Listening và câu hỏi đồng nghĩa Reading bằng các cụm động từ phổ biến nhất: turn down, put off, fill out, look up, follow up.",
        trapTipVi:
          "Trong Reading Part 7, câu hỏi tìm từ gần nghĩa hoặc diễn giải lại (paraphrase) rất hay đổi từ học thuật sang Phrasal Verb hoặc ngược lại (ví dụ: 'postpone' = 'put off', 'submit' = 'hand in').",
        units: [
          {
            unitNumber: 137,
            priority: "core",
            toeicTag: "Nguyên tắc Phrasal V",
            toeicParts: ["Part 3", "Part 5"],
            noteVi: "Quy tắc vị trí tân ngữ đại từ BẮT BUỘC đặt giữa: 'turn it off' (không phải turn off it).",
          },
          {
            unitNumber: 138,
            priority: "recommended",
            toeicTag: "in / out",
            toeicParts: ["Part 2", "Part 7"],
            noteVi: "Cụm văn phòng: fill in/out (điền đơn), check in/out, drop in.",
          },
          {
            unitNumber: 139,
            priority: "recommended",
            toeicTag: "out (nâng cao)",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Cụm hay gặp: find out (phát hiện), carry out (tiến hành), run out of (hết hàng), figure out.",
          },
          {
            unitNumber: 140,
            priority: "recommended",
            toeicTag: "on / off (1)",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Cụm hay nghe: put off (hoãn lại), call off (hủy), turn on/off, go on (tiếp tục).",
          },
          {
            unitNumber: 141,
            priority: "advanced",
            toeicTag: "on / off (2)",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Mở rộng nghĩa thành ngữ của on/off trong hội thoại hằng ngày.",
          },
          {
            unitNumber: 142,
            priority: "recommended",
            toeicTag: "up / down",
            toeicParts: ["Part 2", "Part 3", "Part 7"],
            noteVi: "Cụm phổ biến: turn down (từ chối/giảm âm), write down, slow down, calm down.",
          },
          {
            unitNumber: 143,
            priority: "recommended",
            toeicTag: "up (1)",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Cụm công sở: set up (thiết lập/lên lịch), bring up, tidy up, make up.",
          },
          {
            unitNumber: 144,
            priority: "recommended",
            toeicTag: "up (2)",
            toeicParts: ["Part 3", "Part 7"],
            noteVi: "Cụm hay thi: catch up with (theo kịp), keep up with, come up with (nảy ra ý tưởng).",
          },
          {
            unitNumber: 145,
            priority: "advanced",
            toeicTag: "away / back",
            toeicParts: ["Part 2", "Part 3"],
            noteVi: "Cụm giao tiếp điện thoại: call back (gọi lại), get back to somebody (phản hồi lại).",
          },
        ],
      },
    ],
  },
];

export function getAllRoadmapUnits(): RoadmapUnitEntry[] {
  return TOEIC_ROADMAP_STAGES.flatMap((stage) =>
    stage.modules.flatMap((mod) => mod.units)
  );
}

