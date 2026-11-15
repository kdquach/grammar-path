import prisma from "../lib/prisma";

export interface LearningPathItem {
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  displayOrder: number;
  masteryStatus: string;
  masteryScore: number | null;
  retentionScore: number;
  evidenceCount: number;
  distinctQuestionCount: number;
  reviewState: string | null;
  isDue: boolean;
  dueAt: string | null;
  units: Array<{
    unitNumber: number;
    title: string;
    exercises: Array<{ exerciseNumber: string; questionCount: number }>;
  }>;
  suggestedAction: {
    type: "review" | "remediate" | "build_evidence" | "progress";
    labelVi: string;
    priority: number;
    targetExerciseNumber?: string;
    targetUnitNumber?: number;
  };
}

export interface LearningPathStage {
  stageKey: string;
  titleVi: string;
  subtitleEn: string;
  unitRange: string;
  concepts: LearningPathItem[];
}

export interface LearningPathResponse {
  totalConcepts: number;
  masteredCount: number;
  practicingCount: number;
  needsReviewCount: number;
  stages: LearningPathStage[];
}

export async function buildPersonalizedLearningPath(
  userId: string
): Promise<LearningPathResponse> {
  const [concepts, userMasteries, reviewSchedules, unitsWithExercises] = await Promise.all([
    prisma.grammarConcept.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        theoryLinks: {
          include: {
            theorySection: {
              select: {
                unitId: true,
                sectionId: true,
                unit: {
                  select: {
                    unitNumber: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        toeicUnits: {
          select: {
            unitId: true,
            unit: {
              select: {
                unitNumber: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.userConceptMastery.findMany({
      where: { userId },
    }),
    prisma.conceptReviewSchedule.findMany({
      where: { userId },
    }),
    prisma.unit.findMany({
      select: {
        id: true,
        unitNumber: true,
        title: true,
        exercises: {
          select: {
            exerciseNumber: true,
            _count: { select: { questions: true } },
          },
          orderBy: { exerciseNumber: "asc" },
        },
      },
      orderBy: { unitNumber: "asc" },
    }),
  ]);

  const masteryMap = new Map(userMasteries.map((m) => [m.conceptId, m]));
  const scheduleMap = new Map(reviewSchedules.map((s) => [s.conceptId, s]));
  const unitMap = new Map(unitsWithExercises.map((u) => [u.id, u]));

  const now = new Date();

  // 5 Staging Tiers
  // 1. Foundation: Units 1-25 (Tenses & Core Basics)
  // 2. Developing: Units 26-52 (Modals, Conditionals & Passive)
  // 3. Intermediate: Units 53-91 (Reported Speech, Relative Clauses, -ing/to)
  // 4. Advanced: Units 92-145 (Articles, Pronouns, Prepositions, Phrasal Verbs)
  // 5. TOEIC Readiness: Units mapped with TOEIC metadata
  const stages: Record<string, LearningPathStage> = {
    foundation: {
      stageKey: "foundation",
      titleVi: "1. Nền tảng Ngữ pháp",
      subtitleEn: "Foundation Grammar (Units 1–25)",
      unitRange: "Units 1–25",
      concepts: [],
    },
    developing: {
      stageKey: "developing",
      titleVi: "2. Ngữ pháp Phát triển",
      subtitleEn: "Developing Grammar (Units 26–52)",
      unitRange: "Units 26–52",
      concepts: [],
    },
    intermediate: {
      stageKey: "intermediate",
      titleVi: "3. Ngữ pháp Trung cấp",
      subtitleEn: "Intermediate Grammar (Units 53–91)",
      unitRange: "Units 53–91",
      concepts: [],
    },
    advanced: {
      stageKey: "advanced",
      titleVi: "4. Ngữ pháp Nâng cao",
      subtitleEn: "Advanced Grammar (Units 92–145)",
      unitRange: "Units 92–145",
      concepts: [],
    },
    toeic_readiness: {
      stageKey: "toeic_readiness",
      titleVi: "5. Sẵn sàng TOEIC Part 5 & 6",
      subtitleEn: "TOEIC Grammar Readiness",
      unitRange: "Curated Units",
      concepts: [],
    },
  };

  let masteredCount = 0;
  let practicingCount = 0;
  let needsReviewCount = 0;

  for (const concept of concepts) {
    const mastery = masteryMap.get(concept.id);
    const schedule = scheduleMap.get(concept.id);

    const mStatus = mastery?.masteryStatus ?? "not_started";
    if (mStatus === "mastered") masteredCount += 1;
    else if (mStatus === "practicing" || mStatus === "proficient") practicingCount += 1;
    else if (mStatus === "needs_review") needsReviewCount += 1;

    const isDue = schedule ? schedule.dueAt <= now || schedule.reviewState === "due" : false;

    // Resolve associated units
    const associatedUnitIds = new Set<string>();
    concept.theoryLinks.forEach((l) => associatedUnitIds.add(l.theorySection.unitId));
    concept.toeicUnits.forEach((u) => associatedUnitIds.add(u.unitId));

    const unitList: LearningPathItem["units"] = [];
    let minUnitNumber = 999;

    associatedUnitIds.forEach((uId) => {
      const u = unitMap.get(uId);
      if (u) {
        if (u.unitNumber < minUnitNumber) minUnitNumber = u.unitNumber;
        unitList.push({
          unitNumber: u.unitNumber,
          title: u.title,
          exercises: u.exercises.map((e) => ({
            exerciseNumber: e.exerciseNumber,
            questionCount: e._count.questions,
          })),
        });
      }
    });

    unitList.sort((a, b) => a.unitNumber - b.unitNumber);

    // Determine target exercise for action
    const firstExercise = unitList[0]?.exercises[0]?.exerciseNumber ?? `${unitList[0]?.unitNumber ?? 1}.1`;

    // Prioritization hierarchy
    let suggestedAction: LearningPathItem["suggestedAction"];
    if (isDue) {
      suggestedAction = {
        type: "review",
        labelVi: "Ôn tập theo chu kỳ",
        priority: 100,
        targetExerciseNumber: firstExercise,
        targetUnitNumber: unitList[0]?.unitNumber,
      };
    } else if (mStatus === "needs_review") {
      suggestedAction = {
        type: "remediate",
        labelVi: "Củng cố điểm yếu",
        priority: 80,
        targetExerciseNumber: firstExercise,
        targetUnitNumber: unitList[0]?.unitNumber,
      };
    } else if (mStatus === "insufficient_data" || (mastery && mastery.distinctQuestionCount < 5)) {
      suggestedAction = {
        type: "build_evidence",
        labelVi: "Luyện thêm câu hỏi",
        priority: 60,
        targetExerciseNumber: firstExercise,
        targetUnitNumber: unitList[0]?.unitNumber,
      };
    } else {
      suggestedAction = {
        type: "progress",
        labelVi: "Học tiếp bài mới",
        priority: 40,
        targetExerciseNumber: firstExercise,
        targetUnitNumber: unitList[0]?.unitNumber,
      };
    }

    const item: LearningPathItem = {
      conceptId: concept.id,
      conceptCode: concept.code,
      conceptName: concept.name,
      category: concept.category,
      displayOrder: concept.displayOrder,
      masteryStatus: mStatus,
      masteryScore: mastery?.masteryScore ?? null,
      retentionScore: mastery?.retentionScore ?? 1.0,
      evidenceCount: mastery?.evidenceCount ?? 0,
      distinctQuestionCount: mastery?.distinctQuestionCount ?? 0,
      reviewState: schedule?.reviewState ?? null,
      isDue,
      dueAt: schedule?.dueAt ? schedule.dueAt.toISOString() : null,
      units: unitList,
      suggestedAction,
    };

    // Assign to Stage
    if (concept.toeicUnits.length > 0 && stages.toeic_readiness.concepts.length < 15) {
      stages.toeic_readiness.concepts.push(item);
    }

    if (minUnitNumber <= 25) {
      stages.foundation.concepts.push(item);
    } else if (minUnitNumber <= 52) {
      stages.developing.concepts.push(item);
    } else if (minUnitNumber <= 91) {
      stages.intermediate.concepts.push(item);
    } else {
      stages.advanced.concepts.push(item);
    }
  }

  return {
    totalConcepts: concepts.length,
    masteredCount,
    practicingCount,
    needsReviewCount,
    stages: Object.values(stages),
  };
}
