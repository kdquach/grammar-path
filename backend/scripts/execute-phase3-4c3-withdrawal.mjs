#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetId = "4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2";
  console.log(`[Phase 3.4C.3 Withdrawal] Starting audited preflight for item: ${targetId}`);

  // 1. Verify target exists
  const item = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: targetId },
    include: { options: true },
  });

  if (!item) {
    console.error(`[Precondition Failure] Target item '${targetId}' not found.`);
    process.exit(1);
  }

  // Idempotency check: if already withdrawn, do not re-modify
  if (item.reviewStatus === "withdrawn" && !item.isLatestApproved) {
    console.log(`[Idempotent Check] Target item '${targetId}' is already withdrawn. No modification needed.`);
    await prisma.$disconnect();
    process.exit(0);
  }

  // 2. Verify exact review status & version
  if (item.reviewStatus !== "approved" || !item.isLatestApproved) {
    console.error(`[Precondition Failure] Item is not currently approved/latest: reviewStatus=${item.reviewStatus}, isLatestApproved=${item.isLatestApproved}`);
    process.exit(1);
  }
  if (item.version !== 2) {
    console.error(`[Precondition Failure] Item version mismatch: expected 2, found ${item.version}`);
    process.exit(1);
  }

  // 3. Verify zero attempts exist
  const attemptCount = await prisma.questionAttemptItem.count({
    where: { questionBankItemId: targetId },
  });
  if (attemptCount !== 0) {
    console.error(`[Precondition Failure] Target item has ${attemptCount} attempts! Expected 0.`);
    process.exit(1);
  }

  // 4. Verify ungrammatical option exists to confirm exact target defect
  const correctOption = item.options.find((o) => o.isCorrect);
  if (!correctOption || correctOption.optionText !== "are / updating") {
    console.error(`[Precondition Failure] Correct option text mismatch: expected 'are / updating', found '${correctOption?.optionText}'`);
    process.exit(1);
  }

  console.log(`[Precondition Check] ALL PRECONDITIONS PASSED.`);
  console.log(`- Item ID: ${item.id}`);
  console.log(`- RootQuestionId: ${item.rootQuestionId}`);
  console.log(`- Version: ${item.version}`);
  console.log(`- Defective key: Option ${correctOption.optionKey} ("${correctOption.optionText}")`);
  console.log(`- Historical reviewer: ${item.reviewedBy}`);
  console.log(`- Historical reviewedAt: ${item.reviewedAt?.toISOString()}`);
  console.log(`- Historical reviewNotes: ${item.reviewNotes}`);

  const withdrawalReason = `Withdrawn in Phase 3.4C.3 preflight audit: ungrammatical answer key (Option A 'are / updating' with 3rd-person singular subject 'he'). Originally approved by ${item.reviewedBy} at ${item.reviewedAt?.toISOString()}.`;

  // 5. Atomic withdrawal update
  const updated = await prisma.toeicQuestionBankItem.update({
    where: { id: targetId },
    data: {
      reviewStatus: "withdrawn",
      isLatestApproved: false,
      withdrawnReason: withdrawalReason,
      updatedAt: new Date(),
    },
  });

  console.log(`[Phase 3.4C.3 Withdrawal] Item successfully transitioned.`);
  console.log(`- New reviewStatus: ${updated.reviewStatus}`);
  console.log(`- New isLatestApproved: ${updated.isLatestApproved}`);
  console.log(`- WithdrawnReason: ${updated.withdrawnReason}`);
  console.log(`- Audit reviewedBy preserved: ${updated.reviewedBy}`);
  console.log(`- Audit reviewedAt preserved: ${updated.reviewedAt?.toISOString()}`);
  console.log(`- Audit reviewNotes preserved: ${updated.reviewNotes}`);

  // 6. Verify remaining approved items count
  const remainingApproved = await prisma.toeicQuestionBankItem.findMany({
    where: { reviewStatus: "approved", isLatestApproved: true },
    select: { id: true, rootQuestionId: true, version: true, prompt: true },
  });
  console.log(`[Post-Condition Check] Remaining approved items count: ${remainingApproved.length}`);
  remainingApproved.forEach((i, idx) => {
    console.log(`  ${idx + 1}. ID: ${i.id}, Root: ${i.rootQuestionId}, Version: ${i.version}`);
  });

  if (remainingApproved.length !== 3) {
    console.error(`[Post-Condition Failure] Expected exactly 3 remaining approved items, found ${remainingApproved.length}`);
    process.exit(1);
  }

  console.log(`[Phase 3.4C.3 Withdrawal] SUCCESS.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

