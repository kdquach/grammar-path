import prisma from "../lib/prisma";

export interface RecommendationItem {
  id: string;
  type: "review" | "weakness" | "build_evidence" | "curriculum_next";
  priority: number;
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  category: string;
  unitNumber: number;
  unitTitle: string;
  exerciseId: string;
  exerciseTitle: string;
  estimatedQuestionCount: number;
  reasonVi: string;
  actionUrl: string;
}

/**
 * Returns prioritized personalized practice recommendations.
 * Deterministic: ranked by priority score and concept sequence.
 */
export async function getPersonalizedRecommendations(
  userId: string
): Promise<RecommendationItem[]> {
  const now = new Date();

  // 1. Fetch user masteries and review schedules
  const [masteries, schedules, units] = await Promise.all([
    prisma.userConceptMastery.findMany({
      where: { userId },
      include: {
        concept: {
          include: {
            theoryLinks: {
              include: {
                theorySection: {
                  include: {
                    unit: {
                      select: { id: true, unitNumber: true, title: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.conceptReviewSchedule.findMany({
      where: { userId },
      include: {
        concept: {
          include: {
            theoryLinks: {
              include: {
                theorySection: {
                  include: {
                    unit: {
                      select: { id: true, unitNumber: true, title: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.unit.findMany({
      orderBy: { unitNumber: "asc" },
      select: {
        id: true,
        unitNumber: true,
        title: true,
        exercises: {
          take: 1,
          select: {
            id: true,
            instruction: true,
            exerciseNumber: true,
            questions: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  type UnitWithExercises = {
    id: string;
    unitNumber: number;
    title: string;
    exercises: {
      id: string;
      instruction: string;
      exerciseNumber: string;
      questions: { id: string }[];
    }[];
  };

  const recommendations: RecommendationItem[] = [];
  const coveredConcepts = new Set<string>();

  // Helper to find a playable exercise for a given unit
  const unitList = units as unknown as UnitWithExercises[];
  const unitMap = new Map<number, UnitWithExercises>();
  unitList.forEach((u) => unitMap.set(u.unitNumber, u));

  function getPlayableExercise(unitNumber: number) {
    const u = unitMap.get(unitNumber);
    if (!u || u.exercises.length === 0) return null;
    const ex = u.exercises[0];
    return {
      exerciseId: ex.id,
      exerciseTitle: `Exercise ${unitNumber}.${ex.exerciseNumber}: ${ex.instruction.slice(0, 50)}...`,
      questionCount: ex.questions.length,
      unitTitle: u.title,
    };
  }

  // Dimension 1: Overdue or Due Reviews (Priority 100)
  for (const s of schedules) {
    if (s.dueAt <= now || s.reviewState === "due") {
      const c = s.concept;
      if (coveredConcepts.has(c.id)) continue;

      const unit = c.theoryLinks[0]?.theorySection?.unit;
      const unitNum = unit?.unitNumber ?? 1;
      const exInfo = getPlayableExercise(unitNum);
      if (!exInfo) continue;

      recommendations.push({
        id: `rec-review-${c.id}`,
        type: "review",
        priority: 100,
        conceptId: c.id,
        conceptCode: c.code,
        conceptName: c.name,
        category: c.category,
        unitNumber: unitNum,
        unitTitle: exInfo.unitTitle,
        exerciseId: exInfo.exerciseId,
        exerciseTitle: exInfo.exerciseTitle,
        estimatedQuestionCount: exInfo.questionCount,
        reasonVi: `Đến hạn ôn tập Spaced Repetition: Ôn lại "${c.name}" để củng cố trí nhớ dài hạn.`,
        actionUrl: `/reviews?conceptId=${c.id}`,
      });
      coveredConcepts.add(c.id);
    }
  }

  // Dimension 2: Weak concepts / Developing (Priority 80)
  for (const m of masteries) {
    if (m.masteryStatus === "developing" || m.masteryStatus === "needs_review") {
      const c = m.concept;
      if (coveredConcepts.has(c.id)) continue;

      const unit = c.theoryLinks[0]?.theorySection?.unit;
      const unitNum = unit?.unitNumber ?? 1;
      const exInfo = getPlayableExercise(unitNum);
      if (!exInfo) continue;

      recommendations.push({
        id: `rec-weakness-${c.id}`,
        type: "weakness",
        priority: 80,
        conceptId: c.id,
        conceptCode: c.code,
        conceptName: c.name,
        category: c.category,
        unitNumber: unitNum,
        unitTitle: exInfo.unitTitle,
        exerciseId: exInfo.exerciseId,
        exerciseTitle: exInfo.exerciseTitle,
        estimatedQuestionCount: exInfo.questionCount,
        reasonVi: `Cần khắc phục điểm yếu: Tỉ lệ chính xác hiện tại là ${m.masteryScore ?? 0}%. Hãy luyện tập thêm để nâng điểm.`,
        actionUrl: `/units/${unitNum}`,
      });
      coveredConcepts.add(c.id);
    }
  }

  // Dimension 3: In Progress / Insufficient Evidence (Priority 60)
  for (const m of masteries) {
    if (m.masteryStatus === "insufficient_data" || m.masteryStatus === "practicing") {
      const c = m.concept;
      if (coveredConcepts.has(c.id)) continue;

      const unit = c.theoryLinks[0]?.theorySection?.unit;
      const unitNum = unit?.unitNumber ?? 1;
      const exInfo = getPlayableExercise(unitNum);
      if (!exInfo) continue;

      const needed = Math.max(1, 5 - m.distinctQuestionCount);
      recommendations.push({
        id: `rec-evidence-${c.id}`,
        type: "build_evidence",
        priority: 60,
        conceptId: c.id,
        conceptCode: c.code,
        conceptName: c.name,
        category: c.category,
        unitNumber: unitNum,
        unitTitle: exInfo.unitTitle,
        exerciseId: exInfo.exerciseId,
        exerciseTitle: exInfo.exerciseTitle,
        estimatedQuestionCount: exInfo.questionCount,
        reasonVi: `Xây dựng độ thành thạo: Hoàn thành thêm ${needed} câu hỏi riêng biệt trong "${c.name}" để đạt chuẩn Mastered.`,
        actionUrl: `/units/${unitNum}`,
      });
      coveredConcepts.add(c.id);
    }
  }

  // Dimension 4: Next Sequential Unit (Priority 40)
  // Find the first unit that the user has not started
  const startedUnitNumbers = new Set(
    masteries
      .map((m) => m.concept.theoryLinks[0]?.theorySection?.unit?.unitNumber)
      .filter((n): n is number => n !== undefined)
  );

  for (const u of units) {
    if (!startedUnitNumbers.has(u.unitNumber)) {
      const exInfo = getPlayableExercise(u.unitNumber);
      if (exInfo) {
        recommendations.push({
          id: `rec-curriculum-${u.unitNumber}`,
          type: "curriculum_next",
          priority: 40,
          conceptId: `unit-${u.unitNumber}`,
          conceptCode: `unit.${String(u.unitNumber).padStart(3, "0")}`,
          conceptName: u.title,
          category: "Lộ trình giáo trình",
          unitNumber: u.unitNumber,
          unitTitle: u.title,
          exerciseId: exInfo.exerciseId,
          exerciseTitle: exInfo.exerciseTitle,
          estimatedQuestionCount: exInfo.questionCount,
          reasonVi: `Tiếp tục bài học tiếp theo trong giáo trình: Unit ${u.unitNumber} (${u.title}).`,
          actionUrl: `/units/${u.unitNumber}`,
        });
        break; // Suggest the next 1 unit
      }
    }
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, 5);
}

/**
 * Returns the single top-priority recommended action for the learner.
 */
export async function getNextRecommendedAction(
  userId: string
): Promise<RecommendationItem | null> {
  const recommendations = await getPersonalizedRecommendations(userId);
  return recommendations[0] ?? null;
}
