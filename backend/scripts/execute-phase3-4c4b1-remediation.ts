import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { computeToeicItemContentHash } from "./import-legacy-toeic";

const prisma = new PrismaClient();

interface ReplacementSpec {
  rootQuestionId: string;
  version: number;
  prompt: string;
  ruleReference: string;
  difficulty: string;
  sourceReference: string;
  explanation: string;
  options: Array<{
    optionKey: string;
    optionText: string;
    isCorrect: boolean;
    rationale: string;
    displayOrder: number;
  }>;
}

const REPLACEMENTS: ReplacementSpec[] = [
  // 1. Root 3d71c0d1 (Finance Audit)
  {
    rootQuestionId: "3d71c0d1-6a2d-498a-b6f2-c5abad85657e",
    version: 3,
    prompt: "The chief financial officer is currently unavailable because she _______ the quarterly audit report with external consultants.",
    ruleReference: "1B",
    difficulty: "medium",
    sourceReference: "Editorial authoring v3: Blueprint Root 3d71c0d1 (Finance / Audit)",
    explanation: "The adverb 'currently' and the main clause 'is unavailable' indicate an ongoing activity taking place around the present time (Unit 1.B). The singular subject 'she' requires the present continuous structure 'is reviewing' (be + -ing). Simple present 'reviews' describes habitual facts, while past forms 'reviewed' and 'was reviewing' contradict the present time frame.",
    options: [
      {
        optionKey: "A",
        optionText: "reviews",
        isCorrect: false,
        rationale: "Simple present 'reviews' describes habitual routines or general facts, which contradicts the immediate time marker 'currently' and the temporary nature of the audit meeting.",
        displayOrder: 1,
      },
      {
        optionKey: "B",
        optionText: "is reviewing",
        isCorrect: true,
        rationale: "The time indicator 'currently' specifies an ongoing activity in progress around the present time. The third-person singular subject 'she' agrees with the auxiliary 'is' followed by the present participle 'reviewing'.",
        displayOrder: 2,
      },
      {
        optionKey: "C",
        optionText: "reviewed",
        isCorrect: false,
        rationale: "Simple past 'reviewed' indicates a completed action in the past, which conflicts with the present time frame established by 'is currently unavailable'.",
        displayOrder: 3,
      },
      {
        optionKey: "D",
        optionText: "was reviewing",
        isCorrect: false,
        rationale: "Past continuous 'was reviewing' denotes an action ongoing in the past, which is incompatible with the present state 'is currently unavailable'.",
        displayOrder: 4,
      },
    ],
  },
  // 2. Root 6a54a874 (Logistics Port Customs)
  {
    rootQuestionId: "6a54a874-c48b-4651-a3f5-b686dd51fb6b",
    version: 3,
    prompt: "At the container terminal, customs officers _______ the cargo manifests right now before authorizing ship clearance.",
    ruleReference: "1A",
    difficulty: "medium",
    sourceReference: "Editorial authoring v3: Blueprint Root 6a54a874 (Logistics / Port Customs)",
    explanation: "The time expression 'right now' signals that the action is occurring at the moment of speaking (Unit 1.A). The plural noun phrase 'customs officers' serves as the subject, requiring the plural present continuous auxiliary 'are' followed by the -ing form 'inspecting'. The simple present 'inspect' expresses habitual procedure, while past and perfect forms do not convey an active ongoing inspection.",
    options: [
      {
        optionKey: "A",
        optionText: "are inspecting",
        isCorrect: true,
        rationale: "The time marker 'right now' indicates an action taking place at the moment of speaking. The plural subject 'customs officers' requires the plural auxiliary 'are' and present participle 'inspecting'.",
        displayOrder: 1,
      },
      {
        optionKey: "B",
        optionText: "inspect",
        isCorrect: false,
        rationale: "Simple present 'inspect' expresses general routine or customary duty, which is incompatible with the specific moment-of-speaking indicator 'right now'.",
        displayOrder: 2,
      },
      {
        optionKey: "C",
        optionText: "inspected",
        isCorrect: false,
        rationale: "Past tense 'inspected' indicates a completed action and cannot be used with the immediate present time marker 'right now'.",
        displayOrder: 3,
      },
      {
        optionKey: "D",
        optionText: "have inspected",
        isCorrect: false,
        rationale: "Present perfect 'have inspected' denotes completed actions with present relevance; it does not denote an activity in progress right now.",
        displayOrder: 4,
      },
    ],
  },
  // 3. Root 0fda8409 (Corporate Facility)
  {
    rootQuestionId: "0fda8409-0926-49c0-8b86-1564d83497ac",
    version: 3,
    prompt: "The facility supervisor is not at the front desk because he _______ the executive conference suite right now.",
    ruleReference: "1A",
    difficulty: "easy",
    sourceReference: "Editorial authoring v3: Blueprint Root 0fda8409 (Corporate Facility)",
    explanation: "The clause 'because he ... right now' explains a present action taking place at the moment of speaking (Unit 1.A). The singular subject 'he' pairs with 'is entering'. Unlike the flawed Version 2 ('entering hardware'), 'enter' here naturally collocates with a physical room ('the executive conference suite').",
    options: [
      {
        optionKey: "A",
        optionText: "is entering",
        isCorrect: true,
        rationale: "The transitive verb 'enter' properly collocates with a physical room or location ('the executive conference suite'). The subject 'he' takes 'is entering' to describe an ongoing action.",
        displayOrder: 1,
      },
      {
        optionKey: "B",
        optionText: "enters",
        isCorrect: false,
        rationale: "Simple present 'enters' denotes habit or timetable, not an activity explaining why he is currently away from his desk right now.",
        displayOrder: 2,
      },
      {
        optionKey: "C",
        optionText: "entered",
        isCorrect: false,
        rationale: "Simple past 'entered' cannot be combined with the present time marker 'right now'.",
        displayOrder: 3,
      },
      {
        optionKey: "D",
        optionText: "enter",
        isCorrect: false,
        rationale: "Bare infinitive 'enter' lacks subject-verb agreement with third-person singular 'he'.",
        displayOrder: 4,
      },
    ],
  },
  // 4. Root 634add4d (HR Compliance Training)
  {
    rootQuestionId: "634add4d-5982-4de8-99de-6c4561c6ee44",
    version: 3,
    prompt: "The training coordinator is not at her desk because she _______ the revised safety guidelines to new employees right now.",
    ruleReference: "1B",
    difficulty: "easy",
    sourceReference: "Editorial authoring v3: Blueprint Root 634add4d (HR Compliance Training)",
    explanation: "The immediate time indicator 'right now' requires the present continuous 'is explaining' (Unit 1.B). The verb 'explain' naturally selects an informational topic ('the revised safety guidelines') as its direct object, completely resolving the semantic anomaly present in Version 2 ('explaining hardware').",
    options: [
      {
        optionKey: "A",
        optionText: "explains",
        isCorrect: false,
        rationale: "Simple present 'explains' conveys habitual action rather than an immediate reason for being away from her desk right now.",
        displayOrder: 1,
      },
      {
        optionKey: "B",
        optionText: "is explaining",
        isCorrect: true,
        rationale: "'Explain' properly collocates with 'the revised safety guidelines'. The continuous aspect matches 'right now' and the singular subject 'she'.",
        displayOrder: 2,
      },
      {
        optionKey: "C",
        optionText: "explained",
        isCorrect: false,
        rationale: "Simple past 'explained' conflicts with the present temporal adverbial 'right now'.",
        displayOrder: 3,
      },
      {
        optionKey: "D",
        optionText: "explain",
        isCorrect: false,
        rationale: "Bare infinitive 'explain' lacks subject-verb agreement with third-person singular 'she'.",
        displayOrder: 4,
      },
    ],
  },
];

async function main() {
  const isExecute = process.argv.includes("--execute");
  console.log(`=== PHASE 3.4C.4B.1 REMEDIATION EXECUTION (Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}) ===`);

  // 1. Guard check
  const sysInfo = await prisma.$queryRawUnsafe<any[]>(`
    SELECT current_database() as db_name, inet_server_addr() as server_ip
  `);
  if (sysInfo[0].db_name !== "grammarpath-staging") {
    throw new Error(`CRITICAL ABORT: Connected to '${sysInfo[0].db_name}', expected 'grammarpath-staging'!`);
  }
  console.log(`[Safety Guard] Target database verified: ${sysInfo[0].db_name} (${sysInfo[0].server_ip})`);

  // 2. Fetch Concept unit.001 ID
  const conceptUnit1 = await prisma.grammarConcept.findFirst({
    where: { code: "unit.001" },
  });
  if (!conceptUnit1) throw new Error("Concept unit.001 not found!");

  // 3. Pre-execution checks
  const target1Id = "7d9abd94-df89-4762-8a86-a3217f0217b0";
  const target2Id = "44931eb1-344b-4ec8-aceb-5524a952ed59";
  const retainApprovedId = "45e751fd-4915-4bac-a386-c7bae5295911";

  const target1 = await prisma.toeicQuestionBankItem.findUnique({ where: { id: target1Id } });
  const target2 = await prisma.toeicQuestionBankItem.findUnique({ where: { id: target2Id } });
  const retainItem = await prisma.toeicQuestionBankItem.findUnique({ where: { id: retainApprovedId } });

  if (!target1 || !target2 || !retainItem) throw new Error("One or more targets missing!");
  if (target1.reviewStatus !== "approved" || !target1.isLatestApproved) {
    throw new Error(`Target 1 (${target1Id}) is not approved latest!`);
  }
  if (target2.reviewStatus !== "approved" || !target2.isLatestApproved) {
    throw new Error(`Target 2 (${target2Id}) is not approved latest!`);
  }
  if (retainItem.reviewStatus !== "approved" || !retainItem.isLatestApproved) {
    throw new Error(`Retain item (${retainApprovedId}) is not approved latest!`);
  }

  console.log("Pre-checks passed:");
  console.log(` - Target 1 to withdraw: ${target1Id} (Root: ${target1.rootQuestionId}, v${target1.version})`);
  console.log(` - Target 2 to withdraw: ${target2Id} (Root: ${target2.rootQuestionId}, v${target2.version})`);
  console.log(` - Item to retain approved: ${retainApprovedId} (Root: ${retainItem.rootQuestionId}, v${retainItem.version})`);

  // 4. Check that no Version 3 already exists
  for (const rep of REPLACEMENTS) {
    const existingV3 = await prisma.toeicQuestionBankItem.findFirst({
      where: { rootQuestionId: rep.rootQuestionId, version: 3 },
    });
    if (existingV3) {
      throw new Error(`Version 3 already exists for root ${rep.rootQuestionId}!`);
    }
  }

  // 5. Compute content hashes for the 4 replacements
  const hashedReplacements = REPLACEMENTS.map((rep) => {
    const contentHash = computeToeicItemContentHash(
      rep.prompt,
      rep.options.map((o) => ({ key: o.optionKey, text: o.optionText }))
    );
    return { ...rep, contentHash };
  });

  console.log("\nComputed Content Hashes for Version 3 Items:");
  hashedReplacements.forEach((rep, idx) => {
    console.log(` [${idx + 1}] Root: ${rep.rootQuestionId.slice(0, 8)} | Hash: ${rep.contentHash} | Prompt: "${rep.prompt.slice(0, 45)}..."`);
  });

  if (!isExecute) {
    console.log("\n[DRY-RUN COMPLETE] Pre-conditions 100% verified. No writes performed.");
    return;
  }

  // 6. EXECUTE TRANSACTION
  console.log("\nExecuting atomic database transaction...");
  const now = new Date();
  const adminId = "admin-audit-c4b1";

  await prisma.$transaction(async (tx) => {
    // Action 1: Withdraw target 1 (7d9abd94)
    await tx.toeicQuestionBankItem.update({
      where: { id: target1Id },
      data: {
        reviewStatus: "withdrawn",
        isLatestApproved: false,
        reviewedBy: adminId,
        reviewedAt: now,
        withdrawnReason: "Withdrawn in Phase 3.4C.4B.1 audit: severe verb-object collocation defect ('is entering the server hardware'). Historical version preserved. Reviewed by admin.",
      },
    });

    // Action 2: Withdraw target 2 (44931eb1)
    await tx.toeicQuestionBankItem.update({
      where: { id: target2Id },
      data: {
        reviewStatus: "withdrawn",
        isLatestApproved: false,
        reviewedBy: adminId,
        reviewedAt: now,
        withdrawnReason: "Withdrawn in Phase 3.4C.4B.1 audit: unnatural semantic collocation defect ('is explaining the server hardware'). Historical version preserved. Reviewed by admin.",
      },
    });

    // Action 3: Insert 4 Version 3 items with their options
    for (const rep of hashedReplacements) {
      await tx.toeicQuestionBankItem.create({
        data: {
          rootQuestionId: rep.rootQuestionId,
          version: 3,
          isLatestApproved: false,
          part: "PART_5",
          format: "PART5_INCOMPLETE_SENTENCE",
          prompt: rep.prompt,
          explanation: rep.explanation,
          difficulty: rep.difficulty,
          primarySkill: "direct_grammar",
          unitNumber: 1,
          ruleReference: rep.ruleReference,
          conceptId: conceptUnit1.id,
          conceptMappingConfidence: 1.0,
          conceptMappingSource: "expert_editorial_authoring_v3",
          reviewStatus: "validated",
          qualityScore: 9.5,
          source: "curated_expert",
          sourceReference: rep.sourceReference,
          contentHash: rep.contentHash,
          reviewedBy: adminId,
          reviewedAt: now,
          reviewNotes: "Authored in Phase 3.4C.4B.1 to restore cohesive prompt and option syntax across distinct workplace domains.",
          options: {
            create: rep.options.map((o) => ({
              optionKey: o.optionKey,
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              rationale: o.rationale,
              displayOrder: o.displayOrder,
            })),
          },
        },
      });
    }
  });

  console.log("[TRANSACTION COMMITTED] Remediation successfully written to database.");

  // 7. Post-execution verification
  const postCounts = await prisma.toeicQuestionBankItem.groupBy({
    by: ["reviewStatus"],
    _count: { id: true },
  });
  console.log("\nPost-Execution Status Counts:", postCounts);

  const postApproved = await prisma.toeicQuestionBankItem.findMany({
    where: { isLatestApproved: true },
  });
  console.log(`Approved Items (${postApproved.length}):`);
  postApproved.forEach((a) => console.log(` - ID: ${a.id} (Root: ${a.rootQuestionId.slice(0, 8)}, v${a.version}) prompt: "${a.prompt.slice(0, 45)}..."`));

  const postWithdrawn = await prisma.toeicQuestionBankItem.findMany({
    where: { reviewStatus: "withdrawn" },
  });
  console.log(`Withdrawn Items (${postWithdrawn.length}):`);
  postWithdrawn.forEach((w) => console.log(` - ID: ${w.id} (Root: ${w.rootQuestionId.slice(0, 8)}, v${w.version}) reason: "${w.withdrawnReason?.slice(0, 50)}..."`));

  const postV3 = await prisma.toeicQuestionBankItem.findMany({
    where: { version: 3 },
    include: { options: true },
  });
  console.log(`Version 3 Items (${postV3.length}):`);
  postV3.forEach((v) => console.log(` - ID: ${v.id} (Root: ${v.rootQuestionId.slice(0, 8)}) status=${v.reviewStatus}, isLatestApproved=${v.isLatestApproved}, options=${v.options.length}`));

  const totalBank = await prisma.toeicQuestionBankItem.count();
  console.log(`Total question bank items: ${totalBank} (expected: 41)`);

  const totalAttempts = await prisma.questionAttemptItem.count();
  console.log(`Total attempt items: ${totalAttempts} (expected: 5)`);

  if (totalBank !== 41 || totalAttempts !== 5 || postApproved.length !== 1 || postWithdrawn.length !== 4 || postV3.length !== 4) {
    throw new Error("POST-EXECUTION INVARIANT VIOLATION!");
  }

  console.log("\n[SUCCESS] All post-execution invariants verified.");
}

main()
  .catch((err) => {
    console.error("Remediation execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

