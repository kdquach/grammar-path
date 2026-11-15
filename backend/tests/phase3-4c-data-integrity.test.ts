import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Phase 3.4C.4B.5: Data Integrity, Stage 14 Lineage & Historical Attempt Reconciliation", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should confirm exactly 53 question bank records in staging (41 baseline + 8 Unit 3 v1 + 4 Unit 3 v2 items)", async () => {
    const total = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM "toeic_question_bank_items"`;
    expect(total[0].count).toBe(53);
  });

  it("should confirm the clean separation between Units 1-25 (52) and Out-of-Range Unit 40 (1)", async () => {
    const units1To25 = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count 
      FROM "toeic_question_bank_items" 
      WHERE "unit_number" >= 1 AND "unit_number" <= 25
    `;
    const outOfRange = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count 
      FROM "toeic_question_bank_items" 
      WHERE "unit_number" > 25
    `;
    expect(units1To25[0].count).toBe(52);
    expect(outOfRange[0].count).toBe(1);

    const unit40 = await prisma.$queryRaw<any[]>`
      SELECT "id", "root_question_id", "unit_number", "review_status"
      FROM "toeic_question_bank_items"
      WHERE "unit_number" = 40
    `;
    expect(unit40.length).toBe(1);
    expect(unit40[0].id).toBe("77299aeb-93d6-483e-9f77-4d5a8c67496a");
    expect(unit40[0].review_status).toBe("validated");
  });

  it("should confirm exact review_status breakdown totaling 53", async () => {
    const statusCounts = await prisma.$queryRaw<any[]>`
      SELECT "review_status" as status, COUNT(*)::int as count
      FROM "toeic_question_bank_items"
      GROUP BY "review_status"
    `;

    const map = new Map<string, number>();
    for (const row of statusCounts) {
      map.set(row.status, row.count);
    }

    expect(map.get("approved")).toBe(12);
    expect(map.get("validated")).toBe(32);
    expect(map.get("archived")).toBe(5);
    expect(map.get("withdrawn")).toBe(4);

    const sum = (map.get("approved") || 0) + (map.get("validated") || 0) + (map.get("archived") || 0) + (map.get("withdrawn") || 0);
    expect(sum).toBe(53);
  });

  it("should confirm exactly 12 items have is_latest_approved = true", async () => {
    const latestApproved = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM "toeic_question_bank_items"
      WHERE "is_latest_approved" = true
    `;
    expect(latestApproved[0].count).toBe(12);
  });

  it("should confirm Unit 3 immutable lineage across 8 blueprints (4 v1 accepted, 4 with v1 + v2)", async () => {
    const unit3Items = await prisma.$queryRaw<any[]>`
      SELECT "root_question_id", "version", "source_reference", "review_status", "is_latest_approved"
      FROM "toeic_question_bank_items"
      WHERE "unit_number" = 3
      ORDER BY "source_reference" ASC, "version" ASC
    `;
    expect(unit3Items.length).toBe(12);

    // Group by root_question_id
    const rootMap = new Map<string, any[]>();
    for (const item of unit3Items) {
      if (!rootMap.has(item.root_question_id)) {
        rootMap.set(item.root_question_id, []);
      }
      rootMap.get(item.root_question_id)!.push(item);
    }

    // Exactly 8 distinct root question IDs for the 8 blueprints
    expect(rootMap.size).toBe(8);

    // 4 unchanged blueprints have exactly 1 version (v1)
    // 4 revised blueprints have exactly 2 versions (v1 and v2)
    let singleVersionRoots = 0;
    let dualVersionRoots = 0;
    for (const versions of rootMap.values()) {
      if (versions.length === 1) singleVersionRoots++;
      if (versions.length === 2) dualVersionRoots++;
    }
    expect(singleVersionRoots).toBe(4);
    expect(dualVersionRoots).toBe(4);

    // Zero Unit 3 items are approved or practice eligible
    for (const item of unit3Items) {
      expect(item.review_status).toBe("validated");
      expect(item.is_latest_approved).toBe(false);
    }
  });

  it("should reconcile historical attempt records across all telemetry tables", async () => {
    const exerciseAttempts = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM "exercise_attempts"`;
    const questionAttempts = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM "question_attempt_items"`;
    const practiceSessions = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM "toeic_practice_sessions"`;
    const practiceItems = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM "toeic_practice_items"`;

    expect(exerciseAttempts[0].count).toBe(2);
    expect(questionAttempts[0].count).toBe(5);
    expect(practiceSessions[0].count).toBe(10);
    expect(practiceItems[0].count).toBe(15);

    // Reconcile the 5 question attempt items: exactly 2 from exercise_submission and 3 from toeic_practice
    const questionAttemptsBySource = await prisma.$queryRaw<any[]>`
      SELECT "attempt_source", COUNT(*)::int as count
      FROM "question_attempt_items"
      GROUP BY "attempt_source"
    `;
    const sourceMap = new Map<string, number>();
    for (const row of questionAttemptsBySource) {
      sourceMap.set(row.attempt_source, row.count);
    }
    expect(sourceMap.get("exercise_submission")).toBe(2);
    expect(sourceMap.get("toeic_practice")).toBe(3);

    // Reconcile the 15 practice items: 10 linked to question bank items, 5 dynamic
    const bankLinkedPracticeItems = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM "toeic_practice_items"
      WHERE "question_bank_item_id" IS NOT NULL
    `;
    const dynamicPracticeItems = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM "toeic_practice_items"
      WHERE "question_bank_item_id" IS NULL
    `;
    expect(bankLinkedPracticeItems[0].count).toBe(10);
    expect(dynamicPracticeItems[0].count).toBe(5);
  });
});

