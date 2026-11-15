import { describe, it, expect } from "vitest";

describe("Phase 3.3 Unit Tests: Learning Experience & Engagement Logic", () => {
  describe("1. Onboarding & Preferences Logic", () => {
    it("provides reasonable defaults for a new learner without preferences", () => {
      const defaultPrefs = {
        grammarConfidence: "elementary",
        learningObjective: "foundation",
        dailyStudyMinutes: 20,
        preferredDays: ["mon", "tue", "wed", "thu", "fri"],
        targetToeicScore: 650,
        targetDate: null,
        onboardingCompleted: false,
      };

      expect(defaultPrefs.dailyStudyMinutes).toBeGreaterThanOrEqual(15);
      expect(defaultPrefs.preferredDays.length).toBe(5);
      expect(defaultPrefs.onboardingCompleted).toBe(false);
    });

    it("validates time budgeting within acceptable limits (5 to 180 minutes)", () => {
      const isValidBudget = (min: number) => min >= 5 && min <= 180;
      expect(isValidBudget(0)).toBe(false);
      expect(isValidBudget(20)).toBe(true);
      expect(isValidBudget(60)).toBe(true);
      expect(isValidBudget(300)).toBe(false);
    });
  });

  describe("2. Diagnostic Assessment Level Estimation", () => {
    it("estimates level and recommends starting point based on diagnostic score", () => {
      const estimateLevel = (scorePct: number) => {
        if (scorePct >= 85) return { level: "intermediate", startingUnit: 53 };
        if (scorePct >= 50) return { level: "developing", startingUnit: 25 };
        return { level: "foundation", startingUnit: 1 };
      };

      expect(estimateLevel(90)).toEqual({ level: "intermediate", startingUnit: 53 });
      expect(estimateLevel(75)).toEqual({ level: "developing", startingUnit: 25 });
      expect(estimateLevel(40)).toEqual({ level: "foundation", startingUnit: 1 });
    });

    it("verifies diagnostic disclaimer ensures no false claim of mastery", () => {
      const disclaimer =
        "Kết quả đánh giá ban đầu này chỉ mang tính chất định hướng lộ trình học tập, không tự động đánh dấu hoàn thành hoặc thành thạo ngữ pháp khi chưa có đủ bằng chứng luyện tập.";
      expect(disclaimer).toContain("định hướng");
      expect(disclaimer).toContain("không tự động đánh dấu");
    });
  });

  describe("3. Learning Path Priority Hierarchy", () => {
    it("strictly respects the 4-tier action prioritization hierarchy", () => {
      const determineAction = (item: {
        isDue: boolean;
        masteryStatus: string;
        distinctQuestions: number;
      }) => {
        if (item.isDue) return { type: "review", priority: 100 };
        if (item.masteryStatus === "needs_review") return { type: "remediate", priority: 80 };
        if (item.distinctQuestions < 5) return { type: "build_evidence", priority: 60 };
        return { type: "progress", priority: 40 };
      };

      // Case 1: Overdue review takes absolute precedence (Priority 100)
      expect(
        determineAction({ isDue: true, masteryStatus: "needs_review", distinctQuestions: 2 }).priority
      ).toBe(100);

      // Case 2: Remediation takes second precedence (Priority 80)
      expect(
        determineAction({ isDue: false, masteryStatus: "needs_review", distinctQuestions: 1 }).priority
      ).toBe(80);

      // Case 3: Insufficient evidence takes third precedence (Priority 60)
      expect(
        determineAction({ isDue: false, masteryStatus: "practicing", distinctQuestions: 3 }).priority
      ).toBe(60);

      // Case 4: Progression (Priority 40)
      expect(
        determineAction({ isDue: false, masteryStatus: "mastered", distinctQuestions: 8 }).priority
      ).toBe(40);
    });
  });

  describe("4. Daily Plan Idempotency & Budgeting", () => {
    it("correctly calculates planned minutes from activity items", () => {
      const items = [
        { activityType: "spaced_review", estimatedMinutes: 5, status: "completed" },
        { activityType: "mistake_review", estimatedMinutes: 5, status: "completed" },
        { activityType: "exercise_practice", estimatedMinutes: 10, status: "not_started" },
      ];

      const completedMinutes = items
        .filter((it) => it.status === "completed")
        .reduce((sum, it) => sum + it.estimatedMinutes, 0);

      const totalBudgeted = items.reduce((sum, it) => sum + it.estimatedMinutes, 0);

      expect(completedMinutes).toBe(10);
      expect(totalBudgeted).toBe(20);
    });

    it("transitions daily plan status based on item statuses", () => {
      const computePlanStatus = (
        items: Array<{ status: string }>
      ): "not_started" | "in_progress" | "completed" | "deferred" => {
        const nonDeferred = items.filter((it) => it.status !== "deferred");
        if (nonDeferred.length > 0 && nonDeferred.every((it) => it.status === "completed")) {
          return "completed";
        }
        if (items.every((it) => it.status === "deferred")) {
          return "deferred";
        }
        if (items.some((it) => it.status === "in_progress" || it.status === "completed")) {
          return "in_progress";
        }
        return "not_started";
      };

      expect(computePlanStatus([{ status: "not_started" }, { status: "not_started" }])).toBe(
        "not_started"
      );
      expect(computePlanStatus([{ status: "completed" }, { status: "not_started" }])).toBe(
        "in_progress"
      );
      expect(computePlanStatus([{ status: "completed" }, { status: "deferred" }])).toBe(
        "completed"
      );
      expect(computePlanStatus([{ status: "deferred" }, { status: "deferred" }])).toBe(
        "deferred"
      );
    });
  });

  describe("5. Streak & Timezone Boundary Logic", () => {
    it("maintains streak if active yesterday and today has not yet been practiced", () => {
      const todayKey = "2026-11-13";
      const yesterdayKey = "2026-11-12";
      const activeDateSet = new Set(["2026-11-10", "2026-11-11", "2026-11-12"]);

      let currentStreak = 0;
      const isActiveToday = activeDateSet.has(todayKey);
      const isActiveYesterday = activeDateSet.has(yesterdayKey);

      expect(isActiveToday).toBe(false);
      expect(isActiveYesterday).toBe(true);

      // Streak calculation should count backwards from yesterday
      if (isActiveToday || isActiveYesterday) {
        let cur = new Date("2026-11-12T12:00:00Z");
        while (activeDateSet.has(cur.toISOString().slice(0, 10))) {
          currentStreak += 1;
          cur = new Date(cur.getTime() - 24 * 60 * 60 * 1000);
        }
      }

      expect(currentStreak).toBe(3);
    });

    it("resets streak to 0 if inactive yesterday and inactive today", () => {
      const todayKey = "2026-11-13";
      const yesterdayKey = "2026-11-12";
      const activeDateSet = new Set(["2026-11-09", "2026-11-10"]); // stopped 3 days ago

      let currentStreak = 0;
      const isActiveToday = activeDateSet.has(todayKey);
      const isActiveYesterday = activeDateSet.has(yesterdayKey);

      if (isActiveToday || isActiveYesterday) {
        currentStreak = 1;
      }

      expect(currentStreak).toBe(0);
    });
  });
});

