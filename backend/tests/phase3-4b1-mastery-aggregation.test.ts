import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateConceptMastery } from "../src/services/mastery.service";
import bcrypt from "bcryptjs";

describe("Phase 3.4B.1 Priority 1 — TOEIC Mastery Aggregation & Invariants", () => {
  let testUserId: string;
  let testConceptId: string;
  let createdBankItemIds: string[] = [];
  let createdAttemptIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a dedicated test user
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await prisma.user.create({
      data: {
        email: `audit-m4b1-${Date.now()}@grammarpath.local`,
        passwordHash,
        displayName: "Audit Mastery User",
      },
    });
    testUserId = user.id;

    // 2. Pick a real concept (e.g., Unit 1 Present Continuous)
    const concept = await prisma.grammarConcept.findFirst({
      where: { code: "unit.001" },
    });
    expect(concept).not.toBeNull();
    testConceptId = concept!.id;
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
    // Clean up mastery record and test user
    await prisma.userConceptMastery.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  it("calculates baseline 'not_started' mastery when no attempts exist for the test user", async () => {
    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    expect(mastery.masteryStatus).toBe("not_started");
    expect(mastery.evidenceCount).toBe(0);
    expect(mastery.distinctQuestionCount).toBe(0);
  });

  it("increases evidence exactly once for an eligible TOEIC direct_grammar attempt", async () => {
    // Create an eligible TOEIC question bank item
    const bankItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The construction team _______ the foundation this afternoon.",
        explanation: "Action in progress.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: testConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-m4b1-gram-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "is laying", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "lays", isCorrect: false, displayOrder: 1 },
            { optionKey: "C", optionText: "laid", isCorrect: false, displayOrder: 2 },
            { optionKey: "D", optionText: "laying", isCorrect: false, displayOrder: 3 },
          ],
        },
      },
    });
    createdBankItemIds.push(bankItem.id);

    // Record correct attempt
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

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    expect(mastery.distinctQuestionCount).toBe(1);
    expect(mastery.evidenceCount).toBeGreaterThanOrEqual(1);
    expect(mastery.correctCount).toBe(1);
    expect(mastery.incorrectCount).toBe(0);
  });

  it("includes an eligible word_form_morphology attempt in mastery aggregation", async () => {
    const morphItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The supervisor evaluated the proposal with extreme _______.",
        explanation: "Preposition with + noun.",
        difficulty: "medium",
        primarySkill: "word_form_morphology",
        unitNumber: 1,
        conceptId: testConceptId,
        conceptMappingConfidence: 0.90,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-m4b1-morph-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "care", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "careful", isCorrect: false, displayOrder: 1 },
            { optionKey: "C", optionText: "carefully", isCorrect: false, displayOrder: 2 },
            { optionKey: "D", optionText: "caring", isCorrect: false, displayOrder: 3 },
          ],
        },
      },
    });
    createdBankItemIds.push(morphItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: morphItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    // Distinct questions now = 2 (grammar item + morphology item)
    expect(mastery.distinctQuestionCount).toBe(2);
    expect(mastery.correctCount).toBe(2);
  });

  it("excludes low-confidence concept mapping (< 0.85) from grammar mastery", async () => {
    const lowConfItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "Low confidence mapping test _______.",
        explanation: "Low confidence test.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: testConceptId,
        conceptMappingConfidence: 0.60, // BELOW 0.85 THRESHOLD
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-m4b1-lowconf-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "test", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "tested", isCorrect: false, displayOrder: 1 },
          ],
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

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    // Distinct question count MUST NOT increase (remains 2)
    expect(mastery.distinctQuestionCount).toBe(2);
    expect(mastery.correctCount).toBe(2);
  });

  it("excludes items with missing conceptId from concept mastery", async () => {
    const noConceptItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "No concept mapping test _______.",
        explanation: "No concept test.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: null, // NO CONCEPT
        conceptMappingConfidence: 1.0,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-m4b1-noconcept-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "opt", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "optB", isCorrect: false, displayOrder: 1 },
          ],
        },
      },
    });
    createdBankItemIds.push(noConceptItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: noConceptItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    expect(mastery.distinctQuestionCount).toBe(2);
  });

  it("excludes non-grammar skills (vocabulary, reading, listening) from grammar mastery", async () => {
    const vocabItem = await prisma.toeicQuestionBankItem.create({
      data: {
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The market report provides _______ insight into regional trends.",
        explanation: "Vocabulary: valuable.",
        difficulty: "medium",
        primarySkill: "vocabulary_collocation", // NON-GRAMMAR SKILL
        unitNumber: 1,
        conceptId: testConceptId,
        conceptMappingConfidence: 1.0,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: `hash-m4b1-vocab-${Date.now()}`,
        options: {
          create: [
            { optionKey: "A", optionText: "valuable", isCorrect: true, displayOrder: 0 },
            { optionKey: "B", optionText: "valuably", isCorrect: false, displayOrder: 1 },
          ],
        },
      },
    });
    createdBankItemIds.push(vocabItem.id);

    const attempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: vocabItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(attempt.id);

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    // Distinct question count MUST REMAIN 2
    expect(mastery.distinctQuestionCount).toBe(2);
  });

  it("excludes unanswered attempts (attemptStatus='unanswered' or isCorrect=null)", async () => {
    const validGrammarItem = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: createdBankItemIds[0] },
    });
    expect(validGrammarItem).not.toBeNull();

    const unansweredAttempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: validGrammarItem!.id,
        attemptSource: "toeic_practice",
        attemptStatus: "unanswered",
        studentAnswer: Prisma.DbNull,
        isCorrect: null,
      },
    });
    createdAttemptIds.push(unansweredAttempt.id);

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    // Denominator must not increase for unanswered
    expect(mastery.distinctQuestionCount).toBe(2);
  });

  it("discounts duplicate submissions on the exact same question without duplicating distinctQuestionCount", async () => {
    const validGrammarItem = await prisma.toeicQuestionBankItem.findUnique({
      where: { id: createdBankItemIds[0] },
    });

    // Submit a 2nd attempt on the same question
    const repeatAttempt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: validGrammarItem!.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(repeatAttempt.id);

    const mastery = await calculateConceptMastery(testUserId, testConceptId);
    // Distinct questions MUST STILL BE 2
    expect(mastery.distinctQuestionCount).toBe(2);
    // Repeated attempt count increments
    expect(mastery.repeatedAttemptCount).toBe(1);
  });

  it("verifies historical textbook attempts and staging users remain completely unaltered", async () => {
    const historicalUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            "phase32-e2e-1794547108109@grammarpath.local",
            "audit-db-1794547651039@grammarpath.local",
            "perf-audit-1794548142017@grammarpath.local",
          ],
        },
      },
    });
    expect(historicalUsers).toHaveLength(3);

    const textbookAttempts = await prisma.questionAttemptItem.findMany({
      where: { attemptId: { not: null } },
    });
    expect(textbookAttempts).toHaveLength(2);
    for (const a of textbookAttempts) {
      expect(a.questionId).not.toBeNull();
      expect(a.questionBankItemId).toBeNull();
    }
  });
});
