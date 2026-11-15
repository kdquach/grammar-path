import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateConceptMastery } from "../src/services/mastery.service";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

describe("Phase 3.4C.1: Evidence Integrity & Foundational Mastery Hardening", () => {
  let testUserId: string;
  let unit1ConceptId: string;
  let module2ConceptId: string;
  let module3ConceptId: string;
  let createdBankItemIds: string[] = [];
  let createdAttemptIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a dedicated test user
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await prisma.user.create({
      data: {
        email: `audit-m4c1-${Date.now()}@grammarpath.local`,
        passwordHash,
        displayName: "Phase 3.4C.1 Audit User",
      },
    });
    testUserId = user.id;

    // 2. Query real concept: Unit 1 Present Continuous (child unit concept)
    const unit1 = await prisma.grammarConcept.findFirst({
      where: { code: "unit.001" },
    });
    expect(unit1).not.toBeNull();
    unit1ConceptId = unit1!.id;

    // 3. Query real concept: Module 2.1 (parent module concept covering Unit 1-4)
    const mod2 = await prisma.grammarConcept.findFirst({
      where: { code: "module.2.1" },
    });
    expect(mod2).not.toBeNull();
    module2ConceptId = mod2!.id;

    // 4. Query real concept: Module 3.1 (parent module concept covering Modals)
    const mod3 = await prisma.grammarConcept.findFirst({
      where: { code: "module.3.1" },
    });
    expect(mod3).not.toBeNull();
    module3ConceptId = mod3!.id;
  });

  afterAll(async () => {
    // Clean up temporary attempts and bank items
    if (createdAttemptIds.length > 0) {
      await prisma.questionAttemptItem.deleteMany({
        where: { id: { in: createdAttemptIds } },
      });
    }
    if (createdBankItemIds.length > 0) {
      await prisma.toeicQuestionOption.deleteMany({
        where: { questionBankItemId: { in: createdBankItemIds } },
      });
      await prisma.toeicQuestionBankItem.deleteMany({
        where: { id: { in: createdBankItemIds } },
      });
    }
    // Clean up test user mastery records and user
    await prisma.userConceptMastery.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.conceptMasteryEvent.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  // ─── Test Group 1: TOEIC Editorial Status Gating ─────────────────────────────

  it("1. Approved latest TOEIC item contributes evidence to concept mastery", async () => {
    const bankItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The marketing director _______ a new campaign right now.",
        explanation: "Present continuous action.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-c1-appr-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "is launching", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "launches", isCorrect: false, displayOrder: 1 },
          ],
        },
      },
    });
    createdBankItemIds.push(bankItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: bankItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1);
    expect(mastery.distinctQuestionCount).toBe(1);
    expect(mastery.correctCount).toBe(1);
    expect(mastery.masteryStatus).toBe("insufficient_data"); // N < 3
  });

  it("2. Draft TOEIC item does NOT contribute evidence", async () => {
    const draftItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The team _______ on the project currently.",
        explanation: "Draft item.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "draft",
        isLatestApproved: false,
        contentHash: `hash-c1-draft-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is working", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(draftItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: draftItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    // Should still only have evidence from Test 1 (1 item), draft ignored!
    expect(mastery.evidenceCount).toBe(1);
  });

  it("3. Validated (unapproved) TOEIC item does NOT contribute evidence", async () => {
    const validatedItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The logistics manager _______ the shipping schedule today.",
        explanation: "Validated candidate.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.90,
        reviewStatus: "validated",
        isLatestApproved: false,
        contentHash: `hash-c1-valid-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is revising", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(validatedItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: validatedItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1);
  });

  it("4. Rejected TOEIC item does NOT contribute evidence", async () => {
    const rejectedItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The staff _______ safety drills right now.",
        explanation: "Rejected candidate.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.90,
        reviewStatus: "rejected",
        isLatestApproved: false,
        contentHash: `hash-c1-rej-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is practicing", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(rejectedItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: rejectedItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1);
  });

  it("5. Withdrawn TOEIC item does NOT contribute evidence", async () => {
    const withdrawnItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The IT technician _______ the server.",
        explanation: "Withdrawn item.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.90,
        reviewStatus: "withdrawn",
        isLatestApproved: false,
        contentHash: `hash-c1-wth-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "am trying", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(withdrawnItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: withdrawnItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1);
  });

  it("6. Superseded / Archived version does NOT contribute to current live mastery", async () => {
    // Root question has Version 1 (archived) and Version 2 (approved)
    const rootId = randomUUID();
    const v1Archived = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: rootId,
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The consultant _______ the client today.",
        explanation: "V1 archived.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "archived",
        isLatestApproved: false,
        contentHash: `hash-v1-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is meeting", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(v1Archived.id);

    // Learner had attempted V1 in the past
    const attemptV1 = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: v1Archived.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attemptV1.id);

    // Live mastery calculation excludes archived V1
    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1); // Only Test 1 item counted!
  });

  it("7. Historical attempts remain 100% intact and unmutated in QuestionAttemptItem", async () => {
    const attempts = await prisma.questionAttemptItem.findMany({
      where: { userId: testUserId },
    });
    // All 6 attempts created above must exist in the database without any deletion
    expect(attempts.length).toBe(6);
  });

  // ─── Test Group 2: Evidence Filters & Isolation ──────────────────────────────

  it("8. Excludes unanswered attempts (attemptStatus='unanswered' or isCorrect=null)", async () => {
    const approvedItem2 = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The accountant _______ the invoices right now.",
        explanation: "Approved item 2.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-c1-appr2-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is checking", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(approvedItem2.id);

    // Unanswered attempt matching PostgreSQL check constraint chk_qai_attempt_status_consistency
    const skippedAttempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: approvedItem2.id,
        attemptSource: "toeic_practice",
        attemptStatus: "unanswered",
        studentAnswer: Prisma.DbNull,
        isCorrect: null,
      },
    });
    createdAttemptIds.push(skippedAttempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    // Unanswered attempt ignored from evidence denominator!
    expect(mastery.evidenceCount).toBe(1);
  });

  it("9. Excludes low-confidence mappings (< 0.85) from concept mastery", async () => {
    const lowConfItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The staff _______ about the project.",
        explanation: "Low confidence item.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.70, // < 0.85
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-c1-lowconf-${Date.now()}`,
        options: {
          create: [{ optionKey: "A", optionText: "is talking", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdBankItemIds.push(lowConfItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: lowConfItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(1);
  });

  it("10. Repeated attempts discount exponentially and do NOT inflate distinctQuestionCount", async () => {
    // Add 2 more attempts on the Test 1 approved bank item
    const firstApprovedId = createdBankItemIds[0];
    const retry1 = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: firstApprovedId,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(retry1.id);

    const retry2 = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: firstApprovedId,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(retry2.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    // Distinct questions must remain 1!
    expect(mastery.distinctQuestionCount).toBe(1);
    expect(mastery.repeatedAttemptCount).toBe(2);
    expect(mastery.evidenceCount).toBe(3);
    expect(mastery.masteryStatus).toBe("insufficient_data");
  });

  // ─── Test Group 3: Concept Evidence Isolation & Modules ─────────────────────

  it("11. Concept without direct questions does not sweep in broad unit questions", async () => {
    // Module 3.1 covers Units 26-37 (Modals); test user has 0 attempts on any child units of Module 3.1
    const moduleMastery = await calculateConceptMastery(testUserId, module3ConceptId);
    expect(moduleMastery.masteryStatus).toBe("not_started");
    expect(moduleMastery.distinctQuestionCount).toBe(0);
    expect(moduleMastery.evidenceCount).toBe(0);
    expect(moduleMastery.masteryScore).toBeNull();
  });

  it("12. Parent module aggregates child unit masteries without double-counting", async () => {
    // Module 2.1 covers Units 1, 2, 3, 4 (Present & Past Tenses)
    // We already have 1 distinct question on Unit 1 for testUserId
    const moduleMastery = await calculateConceptMastery(testUserId, module2ConceptId);
    expect(moduleMastery.distinctQuestionCount).toBe(1);
    expect(moduleMastery.evidenceCount).toBe(3); // 1 original + 2 retries
    expect(moduleMastery.masteryStatus).toBe("insufficient_data"); // totalDistinct < 3
  });

  // ─── Test Group 4: Staging Audit Invariants & Flawed Item ────────────────────

  it("13. Verifies flawed staging item 7d24582b is withdrawn and inactive", async () => {
    const flawedItem = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: "7d24582b-ca20-4c7a-a828-530f4852e80a" },
    });
    expect(flawedItem).not.toBeNull();
    expect(flawedItem!.reviewStatus).toBe("withdrawn");
    expect(flawedItem!.isLatestApproved).toBe(false);
    expect(flawedItem!.withdrawnReason).toContain("Phase 3.4C.1");
  });

  it("14. Verifies historical textbook attempts and canonical staging users remain completely unaltered", async () => {
    const historicalAttempts = await prisma.questionAttemptItem.findMany({
      where: { questionId: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    expect(historicalAttempts.length).toBe(2);
    expect(historicalAttempts[0].questionId).toBe("0c657406-9046-4704-8609-55a9ed670fd5");
    expect(historicalAttempts[1].questionId).toBe("0c657406-9046-4704-8609-55a9ed670fd5");

    // Canonical baseline users from Phase 3.2 must exist intact
    const canonicalEmails = [
      "audit-db-1794547651039@grammarpath.local",
      "perf-audit-1794548142017@grammarpath.local",
      "phase32-e2e-1794547108109@grammarpath.local",
    ];
    for (const email of canonicalEmails) {
      const u = await prisma.user.findUnique({ where: { email } });
      expect(u).not.toBeNull();
    }
  });
});
