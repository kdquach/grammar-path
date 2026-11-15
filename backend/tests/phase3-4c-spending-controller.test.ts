import { describe, it, expect } from "vitest";
import { SpendingController } from "../src/services/toeic-pipeline/spending-controller";

describe("Phase 3.4C.4B.4.2: Spending Controls & Hard Budget Cap Guard", () => {
  it("should initialize default budget caps: $0.25 for Unit 3 pilot, $5.00 for expansion", () => {
    const pilotCtrl = new SpendingController({ jobType: "unit3_pilot" });
    expect(pilotCtrl.getHardBudgetCap()).toBe(0.25);
    expect(pilotCtrl.getRemainingBudget()).toBe(0.25);

    const expCtrl = new SpendingController({ jobType: "units2_25_expansion" });
    expect(expCtrl.getHardBudgetCap()).toBe(5.0);
    expect(expCtrl.getRemainingBudget()).toBe(5.0);
  });

  it("should allow pre-call reservation when budget is sufficient and update remaining budget", () => {
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });

    // Reserve for 1500 input tokens, 500 output tokens on gemini-2.5-pro
    // Expected projected: (1500 * 1.25 / 1M) + (500 * 5.0 / 1M) = 0.001875 + 0.0025 = 0.004375 USD
    const reservation = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);

    expect(reservation.allowed).toBe(true);
    expect(reservation.projectedCost).toBeCloseTo(0.004375, 6);
    expect(ctrl.getRemainingBudget()).toBeCloseTo(0.25 - 0.004375, 6);
  });

  it("should reconcile actual usage correctly including thinking tokens", () => {
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const reservation = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);

    // Actual usage returned: 1200 prompt, 400 candidate (including 50 thinking tokens)
    // Rate: 1.25/1M input, 5.0/1M output, 5.0/1M thinking
    // Net candidate: 350, Thinking: 50
    // Total candidate cost: (350 * 5 + 50 * 5) / 1M = 400 * 5 / 1M = 0.00200 USD
    // Input cost: 1200 * 1.25 / 1M = 0.00150 USD
    // Total: 0.00350 USD
    const result = ctrl.recordActualUsage(
      "gemini-2.5-pro",
      {
        promptTokenCount: 1200,
        candidatesTokenCount: 400,
        totalTokenCount: 1600,
        thinkingTokenCount: 50,
      },
      "generation",
      reservation.projectedCost
    );

    expect(result.callCost).toBeCloseTo(0.0035, 6);
    expect(result.cumulativeCost).toBeCloseTo(0.0035, 6);
    expect(result.budgetExhausted).toBe(false);

    const summary = ctrl.getSummary();
    expect(summary.totalInputTokens).toBe(1200);
    expect(summary.totalOutputTokens).toBe(400);
    expect(summary.totalThinkingTokens).toBe(50);
    expect(summary.generationCalls).toBe(1);
  });

  it("should treat missing provider usage metadata as worst-case cost (never zero)", () => {
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });
    const reservation = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);

    const result = ctrl.recordActualUsage(
      "gemini-2.5-pro",
      undefined, // Missing usage
      "generation",
      reservation.projectedCost
    );

    // Must charge the worst-case reserved cost, not zero!
    expect(result.callCost).toBe(reservation.projectedCost);
    expect(result.callCost).toBeGreaterThan(0);
    expect(ctrl.getCumulativeCost()).toBe(reservation.projectedCost);
  });

  it("should abort pre-call reservation before dispatch when budget cap would be exceeded", () => {
    // Tight budget of $0.005 USD
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.005 });

    // Call 1: costs ~0.004375 USD
    const res1 = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);
    expect(res1.allowed).toBe(true);
    ctrl.recordActualUsage(
      "gemini-2.5-pro",
      { promptTokenCount: 1500, candidatesTokenCount: 500, totalTokenCount: 2000 },
      "generation",
      res1.projectedCost
    );

    // Call 2: projected 0.004375 USD. Cumulative (0.004375 + 0.004375 = 0.00875) > 0.005
    const res2 = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);
    expect(res2.allowed).toBe(false);
    expect(res2.reason).toContain("would exceed remaining budget");
  });

  it("should strictly reject any calls or retries once budget is exhausted", () => {
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.002 });

    const res = ctrl.reservePreCallBudget("gemini-2.5-pro", 1000, 400);
    ctrl.recordActualUsage(
      "gemini-2.5-pro",
      { promptTokenCount: 1000, candidatesTokenCount: 400, totalTokenCount: 1400 },
      "generation",
      res.projectedCost
    );

    // Budget spent is ~0.00325 USD, exceeding 0.002
    expect(ctrl.isBudgetExhausted()).toBe(true);

    // Attempting another call or retry:
    const retryRes = ctrl.reservePreCallBudget("gemini-2.5-pro", 1000, 400);
    expect(retryRes.allowed).toBe(false);
    expect(retryRes.reason).toContain("already exhausted");
  });

  it("should prevent concurrent jobs from overspending the same shared budget", () => {
    // Shared budget of $0.006 USD
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.006 });

    // Job A initiates reservation: projected cost 0.004375 USD
    const resA = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);
    expect(resA.allowed).toBe(true);

    // Job B concurrently attempts to reserve before Job A finishes:
    // Remaining unreserved budget is 0.006 - 0.004375 = 0.001625 USD
    // Job B needs 0.004375 USD -> MUST BE REJECTED!
    const resB = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);
    expect(resB.allowed).toBe(false);
    expect(resB.reason).toContain("would exceed remaining budget");

    // Once Job A finishes and records actual usage (e.g. 0.00200 USD):
    ctrl.recordActualUsage(
      "gemini-2.5-pro",
      { promptTokenCount: 800, candidatesTokenCount: 200, totalTokenCount: 1000 },
      "generation",
      resA.projectedCost
    );

    // Now remaining budget is 0.006 - 0.00200 = 0.00400 USD
    // A smaller job C needing 0.00180 USD (critic call) can now be accommodated:
    const resC = ctrl.reservePreCallBudget("gemini-2.5-flash", 1200, 300);
    expect(resC.allowed).toBe(true);
  });

  it("should forbid a job from bypassing the USD 0.25 pilot cap through retries", () => {
    const ctrl = new SpendingController({ jobType: "unit3_pilot", hardBudgetCapUsd: 0.25 });

    // Simulate batch execution consuming up to $0.248 USD
    const largeUsage = {
      promptTokenCount: 100_000, // 100k * 1.25 / 1M = 0.125 USD
      candidatesTokenCount: 24_600, // 24.6k * 5.0 / 1M = 0.123 USD
      totalTokenCount: 124_600,
    };
    const resInitial = ctrl.reservePreCallBudget("gemini-2.5-pro", 100_000, 25_000);
    ctrl.recordActualUsage("gemini-2.5-pro", largeUsage, "generation", resInitial.projectedCost);

    expect(ctrl.getCumulativeCost()).toBeCloseTo(0.248, 4);
    expect(ctrl.getRemainingBudget()).toBeCloseTo(0.002, 4);

    // Now an item fails validation and requests a retry call with projected cost 0.004375 USD:
    const retryRes = ctrl.reservePreCallBudget("gemini-2.5-pro", 1500, 500);
    expect(retryRes.allowed).toBe(false);
    expect(retryRes.reason).toContain("would exceed remaining budget");

    // The system stops at the USD 0.25 pilot cap
    expect(ctrl.getCumulativeCost()).toBeLessThanOrEqual(0.25);
  });
});
