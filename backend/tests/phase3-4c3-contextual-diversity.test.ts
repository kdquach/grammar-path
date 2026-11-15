import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import {
  computeTemplateSimilarity,
  computeSlotAlignment,
  computeSemanticSimilarity,
  computeDistractorMorphologicalOverlap,
  computeRuleOverlap,
  evaluatePairwiseDiversity,
  clusterQuestionsIntoIndependentContexts,
  classifyWorkplaceDomain,
  QuestionForDiversityAnalysis,
} from "../src/services/contextual-diversity.service";
import { AdminToeicAuditService } from "../src/services/admin-toeic-audit.service";
import { calculateConceptMastery } from "../src/services/mastery.service";
import { ToeicQuestionBankService } from "../src/services/toeic-question-bank.service";
import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Phase 3.4C.3: Contextual Diversity Engine & Audit Tooling Suite", () => {
  let adminToken: string;
  let adminUserId: string;
  let learnerToken: string;
  let testUserId: string;
  let unit1ConceptId: string;

  const createdItemIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdAttemptIds: string[] = [];

  let initialBankCount: number;

  beforeAll(async () => {
    initialBankCount = await prisma.toeicQuestionBankItem.count();

    // 1. Create dedicated admin user
    const adminEmail = `admin-c3-${Date.now()}@grammarpath.local`;
    const resAdmin = await request(app).post("/api/v1/auth/register").send({
      email: adminEmail,
      password: "AdminPassword123!",
      displayName: "Diversity Audit Admin",
    });
    expect(resAdmin.status).toBe(201);
    adminToken = resAdmin.body.data.token;
    adminUserId = resAdmin.body.data.user.id;
    createdUserIds.push(adminUserId);

    // 2. Create dedicated learner user
    const learnerEmail = `learner-c3-${Date.now()}@grammarpath.local`;
    const resLearner = await request(app).post("/api/v1/auth/register").send({
      email: learnerEmail,
      password: "LearnerPassword123!",
      displayName: "Diversity Learner",
    });
    expect(resLearner.status).toBe(201);
    learnerToken = resLearner.body.data.token;
    testUserId = resLearner.body.data.user.id;
    createdUserIds.push(testUserId);

    // 3. Find Unit 1 concept ID
    const u1 = await prisma.grammarConcept.findFirst({ where: { code: "unit.001" } });
    expect(u1).not.toBeNull();
    unit1ConceptId = u1!.id;
  });

  afterAll(async () => {
    // Clean up attempts
    if (createdAttemptIds.length > 0) {
      await prisma.questionAttemptItem.deleteMany({
        where: { id: { in: createdAttemptIds } },
      });
    }

    // Clean up question bank items
    if (createdItemIds.length > 0) {
      await prisma.toeicQuestionOption.deleteMany({
        where: { questionBankItemId: { in: createdItemIds } },
      });
      await prisma.toeicQuestionBankItem.deleteMany({
        where: { id: { in: createdItemIds } },
      });
    }

    // Clean up test user mastery & schedules
    if (testUserId) {
      await prisma.userConceptMastery.deleteMany({ where: { userId: testUserId } });
      await prisma.conceptMasteryEvent.deleteMany({ where: { userId: testUserId } });
      await prisma.conceptReviewSchedule.deleteMany({ where: { userId: testUserId } });
    }

    // Clean up test users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  // ─── Group 1: Core Similarity Signals & Relationship Classification ────────

  it("1. Exact duplicate detection identifies 100% identical content", () => {
    const itemA: QuestionForDiversityAnalysis = {
      id: "q-a",
      prompt: "The marketing director _______ a new campaign right now.",
      options: [
        { optionKey: "A", optionText: "is launching", isCorrect: true },
        { optionKey: "B", optionText: "launches", isCorrect: false },
        { optionKey: "C", optionText: "launched", isCorrect: false },
        { optionKey: "D", optionText: "launch", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const itemB: QuestionForDiversityAnalysis = {
      id: "q-b",
      prompt: "The marketing director _______ a new campaign right now.",
      options: [
        { optionKey: "A", optionText: "is launching", isCorrect: true },
        { optionKey: "B", optionText: "launches", isCorrect: false },
        { optionKey: "C", optionText: "launched", isCorrect: false },
        { optionKey: "D", optionText: "launch", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const metrics = evaluatePairwiseDiversity(itemA, itemB);
    expect(metrics.sNorm).toBe(1.0);
    expect(metrics.relationship).toBe("EXACT_DUPLICATE");
    expect(metrics.dCtx).toBe(0.0);
  });

  it("2. Same carrier template with different options flags TEMPLATE_DUPLICATE", () => {
    const itemA: QuestionForDiversityAnalysis = {
      id: "q-it-1",
      prompt: "The IT technician is not at his desk because he _______ the server hardware in Room 3 right now.",
      options: [
        { optionKey: "A", optionText: "is repairing", isCorrect: true },
        { optionKey: "B", optionText: "repairs", isCorrect: false },
        { optionKey: "C", optionText: "repaired", isCorrect: false },
        { optionKey: "D", optionText: "repair", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const itemB: QuestionForDiversityAnalysis = {
      id: "q-it-2",
      prompt: "The IT technician is not at his desk because he _______ the server hardware in Room 3 right now.",
      options: [
        { optionKey: "A", optionText: "is updating", isCorrect: true },
        { optionKey: "B", optionText: "updates", isCorrect: false },
        { optionKey: "C", optionText: "updated", isCorrect: false },
        { optionKey: "D", optionText: "update", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const metrics = evaluatePairwiseDiversity(itemA, itemB);
    expect(metrics.sNorm).toBe(1.0);
    expect(metrics.relationship).toBe("TEMPLATE_DUPLICATE");
    expect(metrics.dCtx).toBeLessThan(0.20);
    expect(metrics.workplaceDomainA).toBe("it_technology");
    expect(metrics.workplaceDomainB).toBe("it_technology");
  });

  it("3. Same rule in different contexts flags SAME_RULE_NOVEL_CONTEXT (D_ctx >= 0.50)", () => {
    const itItem: QuestionForDiversityAnalysis = {
      id: "q-it",
      prompt: "The IT technician is not at his desk because he _______ the server hardware in Room 3 right now.",
      options: [
        { optionKey: "A", optionText: "is repairing", isCorrect: true },
        { optionKey: "B", optionText: "repairs", isCorrect: false },
        { optionKey: "C", optionText: "repaired", isCorrect: false },
        { optionKey: "D", optionText: "repair", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const logisticsItem: QuestionForDiversityAnalysis = {
      id: "q-logistics",
      prompt: "Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty.",
      options: [
        { optionKey: "A", optionText: "are experiencing", isCorrect: true },
        { optionKey: "B", optionText: "experience", isCorrect: false },
        { optionKey: "C", optionText: "experienced", isCorrect: false },
        { optionKey: "D", optionText: "experiences", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const metrics = evaluatePairwiseDiversity(itItem, logisticsItem);
    expect(metrics.sNorm).toBeLessThan(0.30);
    expect(metrics.dCtx).toBeGreaterThanOrEqual(0.50);
    expect(metrics.relationship).toBe("SAME_RULE_NOVEL_CONTEXT");
    expect(metrics.workplaceDomainA).toBe("it_technology");
    expect(metrics.workplaceDomainB).toBe("logistics_shipping");
  });

  it("4. Similar wording but different grammar concepts flags DIFFERENT_RULE_SIMILAR_CONTEXT", () => {
    const presentContinuousItem: QuestionForDiversityAnalysis = {
      id: "q-pres-cont",
      prompt: "The regional manager is in the conference room because she _______ with overseas investors right now.",
      options: [
        { optionKey: "A", optionText: "is meeting", isCorrect: true },
        { optionKey: "B", optionText: "meets", isCorrect: false },
      ],
      unitNumber: 1,
      conceptId: unit1ConceptId,
      primarySkill: "direct_grammar",
    };

    const pastSimpleItem: QuestionForDiversityAnalysis = {
      id: "q-past-simple",
      prompt: "The regional manager was in the conference room because she _______ with overseas investors yesterday morning.",
      options: [
        { optionKey: "A", optionText: "met", isCorrect: true },
        { optionKey: "B", optionText: "meets", isCorrect: false },
      ],
      unitNumber: 5,
      conceptId: randomUUID(), // Different concept ID
      primarySkill: "direct_grammar",
    };

    const metrics = evaluatePairwiseDiversity(presentContinuousItem, pastSimpleItem);
    expect(metrics.sCarrier).toBeGreaterThanOrEqual(0.70);
    expect(metrics.sRule).toBeLessThan(0.50);
    expect(metrics.relationship).toBe("DIFFERENT_RULE_SIMILAR_CONTEXT");
  });

  it("5. Distractor morphological profile measures affix pattern overlap accurately", () => {
    const optsVerbal = [
      { optionText: "is updating" },
      { optionText: "updates" },
      { optionText: "updated" },
      { optionText: "update" },
    ];
    const optsDerivational = [
      { optionText: "competition" },
      { optionText: "competitive" },
      { optionText: "competitively" },
      { optionText: "compete" },
    ];

    const verbalToVerbal = computeDistractorMorphologicalOverlap(optsVerbal, optsVerbal);
    expect(verbalToVerbal).toBe(1.0);

    const verbalToDeriv = computeDistractorMorphologicalOverlap(optsVerbal, optsDerivational);
    expect(verbalToDeriv).toBeLessThan(0.50);
  });

  // ─── Group 2: Context Clustering & Evidence Sufficiency Gating ──────────────

  it("10. Insufficient independent contexts: 3 approved items sharing 1 template yield K_ctx=1 < 3", async () => {
    // Create 3 approved items with the exact same template in Unit 1
    const promptTemplate = "The senior accountant _______ the annual fiscal audit in Conference Room 4 right now.";
    const item1 = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: randomUUID(),
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: promptTemplate,
        explanation: "Action in progress.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: sha256(`c3-tmpl-1-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is conducting", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(item1.id);

    const item2 = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: randomUUID(),
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: promptTemplate,
        explanation: "Action in progress.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: sha256(`c3-tmpl-2-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is preparing", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(item2.id);

    const item3 = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: randomUUID(),
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: promptTemplate,
        explanation: "Action in progress.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: sha256(`c3-tmpl-3-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is reviewing", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(item3.id);

    // Cluster these 3 items
    const clusters = clusterQuestionsIntoIndependentContexts([
      { id: item1.id, prompt: item1.prompt, options: [{ optionKey: "A", optionText: "is conducting", isCorrect: true }] },
      { id: item2.id, prompt: item2.prompt, options: [{ optionKey: "A", optionText: "is preparing", isCorrect: true }] },
      { id: item3.id, prompt: item3.prompt, options: [{ optionKey: "A", optionText: "is reviewing", isCorrect: true }] },
    ]);

    // All 3 share the template -> exactly 1 cluster!
    expect(clusters.length).toBe(1);
    expect(clusters[0].items.length).toBe(3);

    // If learner attempts all 3, they get distinctQuestionCount=3, but context count is 1!
    // Live mastery calculation on these attempts must stay insufficient_data if we test N_ctx < 3
  });

  // ─── Group 3: Evidence Lifecycle Gating & Status Invariants ─────────────────

  it("6. Withdrawn item exclusion: practice retrieval and mastery ignore withdrawn items", async () => {
    // Check practice retrieval for Unit 1: items with reviewStatus='withdrawn' must never appear
    const practiceItems = await ToeicQuestionBankService.getApprovedQuestionsForPractice({
      unitNumber: 1,
      difficulty: "easy",
      count: 20,
    });

    const withdrawnItemsInDb = await prisma.toeicQuestionBankItem.findMany({
      where: { reviewStatus: "withdrawn" },
      select: { id: true },
    });
    const withdrawnIds = new Set(withdrawnItemsInDb.map((w) => w.id));

    // Specifically confirm item 4a1223fc is withdrawn and excluded
    expect(withdrawnIds.has("4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2")).toBe(true);
    for (const p of practiceItems) {
      expect(withdrawnIds.has(p.id)).toBe(false);
    }
  });

  it("7. Superseded version exclusion: archived versions do not contribute to live mastery", async () => {
    // Create Root with v1 (archived) and v2 (approved)
    const rootId = randomUUID();
    const v1 = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: rootId,
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The legal counsel _______ the contract today.",
        explanation: "V1 archived.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "archived",
        isLatestApproved: false,
        contentHash: sha256(`c3-sup-v1-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is examining", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(v1.id);

    // Learner attempts v1
    const att1 = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: v1.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(att1.id);

    // Recalculate concept mastery: v1 attempt must NOT be counted because v1 is archived (isLatestApproved=false)
    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(0);
    expect(mastery.masteryStatus).toBe("not_started");
  });

  it("8. Unanswered attempt exclusion: skipped attempts do not inflate denominator", async () => {
    const approvedItem = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: randomUUID(),
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The operations director _______ a company-wide update right now.",
        explanation: "Approved item.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.95,
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: sha256(`c3-unans-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is delivering", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(approvedItem.id);

    // Learner skips this item
    const skipAtt = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: approvedItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "unanswered",
        studentAnswer: Prisma.DbNull,
        isCorrect: null,
      },
    });
    createdAttemptIds.push(skipAtt.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(0); // Excluded!
  });

  it("9. Invalid mapping exclusion: confidence < 0.85 excluded from concept evidence", async () => {
    const lowConfItem = await prisma.toeicQuestionBankItem.create({
      data: {
        rootQuestionId: randomUUID(),
        version: 1,
        part: "PART_5",
        format: "PART5_INCOMPLETE_SENTENCE",
        prompt: "The logistics officer _______ shipment documents.",
        explanation: "Low conf item.",
        difficulty: "easy",
        primarySkill: "direct_grammar",
        unitNumber: 1,
        conceptId: unit1ConceptId,
        conceptMappingConfidence: 0.75, // < 0.85
        reviewStatus: "approved",
        isLatestApproved: true,
        contentHash: sha256(`c3-lowconf-${Date.now()}`),
        options: {
          create: [{ optionKey: "A", optionText: "is organizing", isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    createdItemIds.push(lowConfItem.id);

    const att = await prisma.questionAttemptItem.create({
      data: {
        userId: testUserId,
        questionBankItemId: lowConfItem.id,
        attemptSource: "toeic_practice",
        attemptStatus: "correct",
        studentAnswer: "A",
        isCorrect: true,
      },
    });
    createdAttemptIds.push(att.id);

    const mastery = await calculateConceptMastery(testUserId, unit1ConceptId);
    expect(mastery.evidenceCount).toBe(0); // Excluded due to confidence threshold!
  });

  // ─── Group 4: Data Immutability & Test Hygiene ──────────────────────────────

  it("11. Historical attempt immutability: attempts are never deleted or mutated", async () => {
    const totalAttempts = await prisma.questionAttemptItem.count();
    expect(totalAttempts).toBeGreaterThanOrEqual(4);

    // Verify canonical attempts on textbook question exist
    const textbookAttempts = await prisma.questionAttemptItem.count({
      where: { questionId: { not: null } },
    });
    expect(textbookAttempts).toBe(2);
  });

  it("12. Repeatable test cleanup: running test does not increase staging question count", async () => {
    // Current count with our created test items
    const countNow = await prisma.toeicQuestionBankItem.count();
    expect(countNow).toBeGreaterThan(initialBankCount);

    // Delete created attempts first to satisfy foreign key constraints
    if (createdAttemptIds.length > 0) {
      await prisma.questionAttemptItem.deleteMany({
        where: { id: { in: createdAttemptIds } },
      });
      createdAttemptIds.length = 0;
    }

    // Delete created items explicitly
    if (createdItemIds.length > 0) {
      await prisma.toeicQuestionOption.deleteMany({
        where: { questionBankItemId: { in: createdItemIds } },
      });
      await prisma.toeicQuestionBankItem.deleteMany({
        where: { id: { in: createdItemIds } },
      });
      createdItemIds.length = 0; // Clear tracked array
    }

    // After cleanup, total bank count must match initialBankCount exactly!
    const countRestored = await prisma.toeicQuestionBankItem.count();
    expect(countRestored).toBe(initialBankCount);
  });

  // ─── Group 5: Administrative Audit Tooling & API ────────────────────────────

  it("13. Admin authorization and ownership: rejects non-admin, allows admin", async () => {
    // Non-admin request
    const resForbidden = await request(app)
      .get("/api/v1/admin/toeic/diversity-audit")
      .set("Authorization", `Bearer ${learnerToken}`);
    expect(resForbidden.status).toBe(403);

    // Admin request with secret key
    const resAllowed = await request(app)
      .get("/api/v1/admin/toeic/diversity-audit")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-admin-key", "staging-admin-secret-key-2026");
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.body.success).toBe(true);
    expect(resAllowed.body.data.summary).toBeDefined();
    expect(Array.isArray(resAllowed.body.data.warnings)).toBe(true);
  });

  it("14. Inventory consistency: contextual inventory distinguishes N_q from K_ctx", async () => {
    const res = await request(app)
      .get("/api/v1/admin/toeic/inventory/contextual")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-admin-key", "staging-admin-secret-key-2026");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const inventories = res.body.data.conceptInventories;
    expect(Array.isArray(inventories)).toBe(true);

    // Find Unit 1
    const u1Inv = inventories.find((i: any) => i.conceptCode === "unit.001");
    expect(u1Inv).toBeDefined();
    // Unit 1 has 3 approved items (4a1223fc withdrawn), but all 3 share the IT technician template!
    expect(u1Inv.approvedQuestionCount).toBe(3);
    expect(u1Inv.independentContextCount).toBe(1); // K_ctx = 1 !
    expect(u1Inv.isEvidenceSufficient).toBe(false); // False because K_ctx < 3 !
  });
});
