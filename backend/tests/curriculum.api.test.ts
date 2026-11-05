import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Curriculum & Theory Read APIs Integration Tests", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Health check
  it("1. GET /api/v1/health -> returns 200, database: connected, totalUnits: 145", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.database).toBe("connected");
    expect(res.body.data.totalUnits).toBe(145);
  });

  // 2. Book metadata & aggregate counts
  it("2. GET /api/v1/book -> returns 200, title 'English Grammar in Use', edition '4th Edition', totalPdfPages: 399, totalUnits: 145, totalExercises: 549, totalQuestions: 4414", async () => {
    const res = await request(app).get("/api/v1/book");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.title).toBe("English Grammar in Use");
    expect(data.edition).toBe("4th Edition");
    expect(data.author).toBe("Raymond Murphy");
    expect(data.totalPdfPages).toBe(399);
    expect(data.totalUnits).toBe(145);
    expect(data.totalExercises).toBe(549);
    expect(data.totalQuestions).toBe(4414);
    expect(data.totalTheorySections).toBe(542);
    expect(data.totalTextbookExamples).toBe(639);
  });

  // 3. Units pagination defaults
  it("3. GET /api/v1/units -> default pagination returns 20 items, meta.totalItems === 145, meta.totalPages === 8", async () => {
    const res = await request(app).get("/api/v1/units");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(20);

    const meta = res.body.meta;
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
    expect(meta.totalItems).toBe(145);
    expect(meta.totalPages).toBe(8);

    // Verify first unit item schema
    const unit1 = res.body.data[0];
    expect(unit1.unitNumber).toBe(1);
    expect(unit1.title).toBe("Present continuous (I am doing)");
    expect(unit1.theoryPdfPage).toBe(13);
    expect(unit1.exercisePdfPage).toBe(14);
    expect(unit1.counts).toBeDefined();
    expect(unit1.counts.theorySections).toBe(5);
    expect(unit1.counts.exercises).toBe(4);
    expect(unit1.counts.textbookExamples).toBe(14);
    expect(unit1.counts.questions).toBe(25);
  });

  // 4. Units search and range filtering
  it("4. GET /api/v1/units?search=Present continuous and GET /api/v1/units?fromUnit=1&toUnit=5 -> returns accurate filtered subsets", async () => {
    // Search by title
    const searchRes = await request(app).get("/api/v1/units?search=Present continuous");
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
    for (const unit of searchRes.body.data) {
      expect(unit.title.toLowerCase()).toContain("present continuous");
    }

    // Filter by fromUnit and toUnit range
    const rangeRes = await request(app).get("/api/v1/units?fromUnit=1&toUnit=5");
    expect(rangeRes.status).toBe(200);
    expect(rangeRes.body.success).toBe(true);
    expect(rangeRes.body.data).toHaveLength(5);
    expect(rangeRes.body.meta.totalItems).toBe(5);
    expect(rangeRes.body.meta.totalPages).toBe(1);

    const unitNumbers = rangeRes.body.data.map((u: any) => u.unitNumber);
    expect(unitNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  // 5. Unit 1 detail with source pages, theory sections, exercises
  it("5. GET /api/v1/units/1 -> returns 200, Unit 1 title 'Present continuous (I am doing)', 5 theory sections (1A..1E), 4 exercises (1.1..1.4), and harmonized sourcePages (13, 14, 347)", async () => {
    const res = await request(app).get("/api/v1/units/1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const unit = res.body.data;

    expect(unit.unitNumber).toBe(1);
    expect(unit.title).toBe("Present continuous (I am doing)");
    expect(unit.theoryPdfPage).toBe(13);
    expect(unit.exercisePdfPage).toBe(14);

    // Source pages check (13, 14, 347)
    const pageNumbers = unit.sourcePages.map((p: any) => p.pageNumber);
    expect(pageNumbers).toEqual([13, 14, 347]);

    // Theory sections check (1A..1E)
    expect(unit.theorySections).toHaveLength(5);
    const sectionIds = unit.theorySections.map((s: any) => s.sectionId);
    expect(sectionIds).toEqual(["1A", "1B", "1C", "1D", "1E"]);

    // Exercises check (1.1..1.4)
    expect(unit.exercises).toHaveLength(4);
    const exerciseNumbers = unit.exercises.map((e: any) => e.exerciseNumber);
    expect(exerciseNumbers).toEqual(["1.1", "1.2", "1.3", "1.4"]);

    // Verify exercise structure
    const ex1 = unit.exercises[0];
    expect(ex1.exerciseId).toBe("1.1");
    expect(ex1.questionType).toBe("matching");
    expect(ex1.questionCount).toBe(8);
    expect(ex1.wordBankCount).toBe(0);

    const ex4 = unit.exercises[3];
    expect(ex4.exerciseId).toBe("1.4");
    expect(ex4.questionType).toBe("fill_blank");
    expect(ex4.questionCount).toBe(5);
    expect(ex4.wordBankCount).toBe(5);
  });

  // 6. Validation errors for invalid unitNumber
  it("6. GET /api/v1/units/999 and GET /api/v1/units/abc -> returns 400 VALIDATION_ERROR", async () => {
    const res999 = await request(app).get("/api/v1/units/999");
    expect(res999.status).toBe(400);
    expect(res999.body.success).toBe(false);
    expect(res999.body.error.code).toBe("VALIDATION_ERROR");

    const resAbc = await request(app).get("/api/v1/units/abc");
    expect(resAbc.status).toBe(400);
    expect(resAbc.body.success).toBe(false);
    expect(resAbc.body.error.code).toBe("VALIDATION_ERROR");
  });

  // 7. Unit theory detail (theory sections + textbook examples with translations)
  it("7. GET /api/v1/units/1/theory -> returns 5 theory sections and 14 textbook examples with Vietnamese translations", async () => {
    const res = await request(app).get("/api/v1/units/1/theory");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.unitNumber).toBe(1);
    expect(data.title).toBe("Present continuous (I am doing)");

    // 5 theory sections
    expect(data.theorySections).toHaveLength(5);
    const section1A = data.theorySections[0];
    expect(section1A.sectionId).toBe("1A");
    expect(section1A.heading).toBe("Study this example situation:");
    expect(section1A.sourcePages).toEqual([13]);

    // 14 textbook examples with translations
    expect(data.textbookExamples).toHaveLength(14);
    const ex1 = data.textbookExamples[0];
    expect(ex1.exampleId).toBe("1-ex-01");
    expect(ex1.originalText).toBe("Sarah is driving to work.");
    expect(ex1.translationVi).toBe("Sarah đang lái xe đi làm.");
    expect(ex1.sourcePages).toEqual([13]);

    // Ensure all examples have non-empty Vietnamese translations
    for (const example of data.textbookExamples) {
      expect(example.translationVi).toBeTruthy();
      expect(typeof example.translationVi).toBe("string");
    }
  });

  // 8. Theory section lookup by sectionId (case-insensitive & 404)
  it("8. GET /api/v1/theory/sections/1B (and lowercase 1b) -> returns 200 with section 1B content and parent Unit 1 metadata; GET /api/v1/theory/sections/999Z -> returns 404 NOT_FOUND", async () => {
    // Uppercase 1B
    const resUpper = await request(app).get("/api/v1/theory/sections/1B");
    expect(resUpper.status).toBe(200);
    expect(resUpper.body.success).toBe(true);
    const dataUpper = resUpper.body.data;
    expect(dataUpper.sectionId).toBe("1B");
    expect(dataUpper.unit.unitNumber).toBe(1);
    expect(dataUpper.unit.title).toBe("Present continuous (I am doing)");
    expect(dataUpper.sourcePages).toEqual([13]);
    expect(dataUpper.linkedQuestions.count).toBe(6);
    expect(dataUpper.linkedQuestions.questionIds).toEqual([
      "1.1-q1",
      "1.1-q7",
      "1.3-q1",
      "1.3-q2",
      "1.3-q3",
      "1.3-q10",
    ]);

    // Lowercase 1b (case-insensitivity)
    const resLower = await request(app).get("/api/v1/theory/sections/1b");
    expect(resLower.status).toBe(200);
    expect(resLower.body.success).toBe(true);
    expect(resLower.body.data.sectionId).toBe("1B");
    expect(resLower.body.data.unit.unitNumber).toBe(1);

    // Non-existent section -> 404 NOT_FOUND
    const resNotFound = await request(app).get("/api/v1/theory/sections/999Z");
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.success).toBe(false);
    expect(resNotFound.body.error.code).toBe("NOT_FOUND");
  });

  // 9. Extra route coverage: 404 for unknown endpoint
  it("9. Unknown route -> returns 404 NOT_FOUND", async () => {
    const res = await request(app).get("/api/v1/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

