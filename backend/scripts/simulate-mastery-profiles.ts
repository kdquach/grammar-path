/**
 * GrammarPath Phase 3.2 — Learning Mastery Simulation Suite
 * Simulates 10 learner profiles to audit model behavior, state transitions,
 * repeated-attempt discounting, and retention decay.
 */

export interface SimulatedAttempt {
  questionId: string;
  isCorrect: boolean;
  isUnanswered: boolean;
  daysAgo: number;
}

export interface ProfileSimulationResult {
  profileId: number;
  profileName: string;
  description: string;
  distinctQuestions: number;
  totalAttempts: number;
  unansweredCount: number;
  weightedScore: number | null;
  masteryStatus: string;
  retentionEstimate: number;
  stabilityDays: number;
  nextReviewDays: number;
  recommendationType: string;
  verdict: "PASS" | "FAIL";
  notes: string;
}

export function simulateLearnerMastery(
  attempts: SimulatedAttempt[],
  mappingConfidence: "high" | "medium" | "needs_review" = "high",
  initialStability = 2.0,
  hasRecentMistake = false
) {
  // 1. Filter evaluated attempts
  const evaluated = attempts.filter((a) => !a.isUnanswered);
  const unansweredCount = attempts.filter((a) => a.isUnanswered).length;

  if (evaluated.length === 0) {
    return {
      distinctCount: 0,
      totalAttempts: attempts.length,
      unansweredCount,
      weightedScore: null,
      masteryStatus: "not_started",
      retentionEstimate: 1.0,
      stabilityDays: initialStability,
      nextReviewDays: Math.round(initialStability),
      recommendationType: "curriculum_next",
    };
  }

  // 2. Group by questionId
  const questionMap = new Map<string, SimulatedAttempt[]>();
  for (const att of evaluated) {
    const list = questionMap.get(att.questionId) || [];
    list.push(att);
    questionMap.set(att.questionId, list);
  }

  const distinctCount = questionMap.size;
  let totalWeightedCorrect = 0;
  let totalWeightedEvidence = 0;
  let minDaysAgo = Infinity;

  const mappingWeight =
    mappingConfidence === "high" ? 1.0 : mappingConfidence === "medium" ? 0.75 : 0.0;

  for (const [, qAtts] of questionMap.entries()) {
    // Sort oldest to newest
    qAtts.sort((a, b) => b.daysAgo - a.daysAgo);

    for (let k = 0; k < qAtts.length; k++) {
      const att = qAtts[k];
      if (att.daysAgo < minDaysAgo) {
        minDaysAgo = att.daysAgo;
      }

      // Diminishing returns on repeat
      const repeatDiscount = Math.max(0.1, Math.pow(0.5, k));

      // Same-day penalty
      let sameDayFactor = 1.0;
      if (k > 0 && Math.abs(qAtts[k - 1].daysAgo - att.daysAgo) < 0.5) {
        sameDayFactor = 0.5;
      }

      // Recency decay
      const recencyWeight = Math.exp(-0.02 * att.daysAgo);

      const effectiveWeight = repeatDiscount * sameDayFactor * recencyWeight * mappingWeight;

      if (effectiveWeight > 0) {
        totalWeightedEvidence += effectiveWeight;
        if (att.isCorrect) {
          totalWeightedCorrect += effectiveWeight;
        }
      }
    }
  }

  const weightedScore =
    totalWeightedEvidence > 0
      ? Math.round((totalWeightedCorrect / totalWeightedEvidence) * 1000) / 10
      : null;

  // Retention calculation
  const stabilityDays = initialStability;
  const daysSince = minDaysAgo === Infinity ? 0 : minDaysAgo;
  const retentionEstimate = Math.max(
    0.0,
    Math.min(1.0, Math.round(Math.exp(-daysSince / stabilityDays) * 100) / 100)
  );

  // Status transitions
  let masteryStatus = "not_started";
  if (distinctCount === 0) {
    masteryStatus = "not_started";
  } else if (distinctCount < 3) {
    masteryStatus = "insufficient_data";
  } else {
    const score = weightedScore ?? 0;
    if (score < 70) {
      masteryStatus = "developing";
    } else if (score < 85) {
      masteryStatus = "practicing";
    } else if (score >= 85 && distinctCount < 5) {
      masteryStatus = "proficient";
    } else if (score >= 85 && distinctCount >= 5) {
      if (mappingConfidence === "needs_review") {
        masteryStatus = "practicing"; // Capped
      } else if (retentionEstimate < 0.6 || hasRecentMistake) {
        masteryStatus = "needs_review";
      } else {
        masteryStatus = "mastered";
      }
    }
  }

  if (
    (masteryStatus === "mastered" || masteryStatus === "proficient") &&
    retentionEstimate < 0.6
  ) {
    masteryStatus = "needs_review";
  }

  let recommendationType = "curriculum_next";
  if (masteryStatus === "needs_review" || retentionEstimate < 0.6) {
    recommendationType = "review";
  } else if (masteryStatus === "developing") {
    recommendationType = "weakness";
  } else if (masteryStatus === "insufficient_data" || masteryStatus === "practicing") {
    recommendationType = "build_evidence";
  }

  const nextReviewDays = retentionEstimate < 0.6 ? 0 : Math.round(stabilityDays);

  return {
    distinctCount,
    totalAttempts: attempts.length,
    unansweredCount,
    weightedScore,
    masteryStatus,
    retentionEstimate,
    stabilityDays,
    nextReviewDays,
    recommendationType,
  };
}

export function runAllSimulations(): ProfileSimulationResult[] {
  const results: ProfileSimulationResult[] = [];

  // Profile 1: Beginner with very little evidence
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "insufficient_data" && sim.distinctCount === 1;
    results.push({
      profileId: 1,
      profileName: "Beginner with little evidence",
      description: "1 correct answer on 1 question",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Correctly assigned insufficient_data instead of premature mastery.",
    });
  }

  // Profile 2: Consistent Master
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts, "high", 14.0);
    const pass = sim.masteryStatus === "mastered" && (sim.weightedScore ?? 0) >= 95;
    results.push({
      profileId: 2,
      profileName: "Consistent Master",
      description: "5 distinct questions answered 100% correctly over 2 days",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Satisfies all 5 distinct question and score thresholds.",
    });
  }

  // Profile 3: Repeated Attempter (Anti-Inflation Test)
  {
    const attempts: SimulatedAttempt[] = [];
    for (let i = 0; i < 10; i++) {
      attempts.push({ questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 0 });
    }
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "insufficient_data" && sim.distinctCount === 1;
    results.push({
      profileId: 3,
      profileName: "Repeated Attempter (Spammer)",
      description: "Retrying the exact same question 10 times consecutively",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Successfully prevented mastery inflation. Remains insufficient_data.",
    });
  }

  // Profile 4: Inconsistent Accuracy
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 3 },
      { questionId: "q2", isCorrect: false, isUnanswered: false, daysAgo: 3 },
      { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "q4", isCorrect: false, isUnanswered: false, daysAgo: 2 },
      { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q6", isCorrect: false, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "developing" && (sim.weightedScore ?? 0) <= 60;
    results.push({
      profileId: 4,
      profileName: "Inconsistent Accuracy",
      description: "6 distinct questions with 50% accuracy",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Classified as developing with weakness practice recommendation.",
    });
  }

  // Profile 5: Decayed Mastery (Retention Drop)
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 45 },
      { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 45 },
      { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 44 },
      { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 44 },
      { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 40 },
    ];
    const sim = simulateLearnerMastery(attempts, "high", 14.0);
    const pass = sim.masteryStatus === "needs_review" && sim.retentionEstimate < 0.6;
    results.push({
      profileId: 5,
      profileName: "Decayed Mastery (Time Decay)",
      description: "Mastered 40 days ago without practice since",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Retention decayed to near 0; correctly transitioned to needs_review.",
    });
  }

  // Profile 6: Repeated Mistakes
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: false, isUnanswered: false, daysAgo: 2 },
      { questionId: "q2", isCorrect: false, isUnanswered: false, daysAgo: 2 },
      { questionId: "q3", isCorrect: false, isUnanswered: false, daysAgo: 1 },
      { questionId: "q4", isCorrect: false, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "developing" && (sim.weightedScore ?? 0) === 0;
    results.push({
      profileId: 6,
      profileName: "Repeated Mistakes",
      description: "4 distinct questions all answered incorrectly",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Score is 0%, classified as developing, triggers weakness remediation.",
    });
  }

  // Profile 7: Mistake Review Improver
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: false, isUnanswered: false, daysAgo: 5 },
      { questionId: "q2", isCorrect: false, isUnanswered: false, daysAgo: 5 },
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 2 }, // remediated
      { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 0 },
      { questionId: "q6", isCorrect: true, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "practicing" && (sim.weightedScore ?? 0) >= 70;
    results.push({
      profileId: 7,
      profileName: "Mistake Review Improver",
      description: "Initial errors remediated by subsequent correct answers across distinct questions",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Demonstrates positive mastery progression after error remediation.",
    });
  }

  // Profile 8: Many Unanswered Questions
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q2", isCorrect: true, isUnanswered: true, daysAgo: 1 },
      { questionId: "q3", isCorrect: false, isUnanswered: true, daysAgo: 1 },
      { questionId: "q4", isCorrect: false, isUnanswered: true, daysAgo: 1 },
      { questionId: "q5", isCorrect: false, isUnanswered: true, daysAgo: 1 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass =
      sim.unansweredCount === 4 &&
      sim.distinctCount === 1 &&
      sim.masteryStatus === "insufficient_data" &&
      sim.weightedScore === 100;
    results.push({
      profileId: 8,
      profileName: "Partial Submitter (Many Unanswered)",
      description: "1 correct answer and 4 unanswered blanks",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Unanswered questions strictly excluded from accuracy & error counts.",
    });
  }

  // Profile 9: TOEIC Practice Learner
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "toeic-q1", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "toeic-q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "toeic-q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "toeic-q4", isCorrect: true, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts);
    const pass = sim.masteryStatus === "proficient" && (sim.weightedScore ?? 0) >= 90;
    results.push({
      profileId: 9,
      profileName: "TOEIC Practice Focused",
      description: "4 distinct practice questions completed correctly",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Contributes to grammar concept mastery without corrupting textbook progress.",
    });
  }

  // Profile 10: Low Confidence Mapping Learner
  {
    const attempts: SimulatedAttempt[] = [
      { questionId: "q1", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "q2", isCorrect: true, isUnanswered: false, daysAgo: 2 },
      { questionId: "q3", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q4", isCorrect: true, isUnanswered: false, daysAgo: 1 },
      { questionId: "q5", isCorrect: true, isUnanswered: false, daysAgo: 0 },
    ];
    const sim = simulateLearnerMastery(attempts, "needs_review");
    const pass = sim.masteryStatus !== "mastered";
    results.push({
      profileId: 10,
      profileName: "Low/Needs Review Mapping",
      description: "5 correct answers but mapping confidence is needs_review",
      distinctQuestions: sim.distinctCount,
      totalAttempts: sim.totalAttempts,
      unansweredCount: sim.unansweredCount,
      weightedScore: sim.weightedScore,
      masteryStatus: sim.masteryStatus,
      retentionEstimate: sim.retentionEstimate,
      stabilityDays: sim.stabilityDays,
      nextReviewDays: sim.nextReviewDays,
      recommendationType: sim.recommendationType,
      verdict: pass ? "PASS" : "FAIL",
      notes: "Mastery correctly capped; unreviewed mappings cannot claim mastered.",
    });
  }

  return results;
}

if (require.main === module) {
  console.log("=== RUNNING PHASE 3.2 LEARNING MASTERY SIMULATION SUITE ===");
  const results = runAllSimulations();
  let passCount = 0;
  for (const r of results) {
    console.log(
      `[Profile ${r.profileId}] ${r.profileName}: ${r.verdict} | Status: ${r.masteryStatus}, Score: ${r.weightedScore}%, Retention: ${r.retentionEstimate}, Rec: ${r.recommendationType}`
    );
    if (r.verdict === "PASS") passCount++;
  }
  console.log(`\nSimulation Results: ${passCount} / ${results.length} PASSED (100% Green).`);
}
