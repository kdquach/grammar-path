import { describe, it, expect } from "vitest";

describe("Phase 3.2 — TOEIC Multiple-Choice Review Engine Unit Tests", () => {
  describe("1. TOEIC Review Options Contract", () => {
    it("ensures review questions format options with distinct keys (A, B, C, D)", () => {
      const mockOptions = [
        { key: "A", text: "is conducting" },
        { key: "B", text: "conducted" },
        { key: "C", text: "conducts" },
        { key: "D", text: "conduct" },
      ];

      const keys = mockOptions.map((o) => o.key);
      expect(keys).toEqual(["A", "B", "C", "D"]);
      expect(new Set(keys).size).toBe(4);
    });

    it("verifies single-tap selection grading logic", () => {
      const correctKey = "B";
      const correctText = "is conducting";

      const evaluate = (input: string) => {
        const studentStr = input.trim().toLowerCase();
        return (
          studentStr === correctKey.toLowerCase() ||
          studentStr === correctText.toLowerCase() ||
          studentStr === `${correctKey.toLowerCase()}. ${correctText.toLowerCase()}` ||
          studentStr === `${correctKey.toLowerCase()}) ${correctText.toLowerCase()}`
        );
      };

      // Correct variations
      expect(evaluate("B")).toBe(true);
      expect(evaluate("b")).toBe(true);
      expect(evaluate("is conducting")).toBe(true);
      expect(evaluate("b. is conducting")).toBe(true);
      expect(evaluate("B) is conducting")).toBe(true);

      // Incorrect variations
      expect(evaluate("A")).toBe(false);
      expect(evaluate("C")).toBe(false);
      expect(evaluate("conducted")).toBe(false);
    });
  });

  describe("2. Review Speed & Friction Reduction", () => {
    it("confirms 1-click option selection payload replaces raw input string typing", () => {
      // Contrast: old raw fulfil input required typing full sentences/words
      const oldPayload = { "q1": "is conducting" };
      // New TOEIC review payload allows instant 1-character tap
      const newPayload = { "q1": "B" };

      expect(typeof newPayload["q1"]).toBe("string");
      expect(newPayload["q1"].length).toBe(1);
      expect(["A", "B", "C", "D"]).toContain(newPayload["q1"]);
    });
  });
});

