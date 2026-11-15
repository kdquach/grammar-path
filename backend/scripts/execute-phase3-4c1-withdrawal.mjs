#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetId = "7d24582b-ca20-4c7a-a828-530f4852e80a";
  console.log(`[Phase 3.4C.1 Withdrawal] Starting audited withdrawal for item: ${targetId}`);

  // 1. Verify target exists
  const item = await prisma.toeicQuestionBankItem.findUnique({
    where: { id: targetId },
    include: { options: true },
  });

  if (!item) {
    console.error(`[Precondition Failure] Target item '${targetId}' not found.`);
    process.exit(1);
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

  // 3. Verify ZERO attempts exist
  const attemptCount = await prisma.questionAttemptItem.count({
    where: { questionBankItemId: targetId },
  });
  if (attemptCount !== 0) {
    console.error(`[Precondition Failure] Target item has ${attemptCount} attempts! Must be 0.`);
    process.exit(1);
  }

  // 4. Verify ungrammatical option exists to confirm exact target defect
  const correctOption = item.options.find((o) => o.isCorrect);
  if (!correctOption || correctOption.optionText !== "am trying") {
    console.error(`[Precondition Failure] Correct option text mismatch: expected 'am trying', found '${correctOption?.optionText}'`);
    process.exit(1);
  }

  console.log(`[Precondition Check] ALL 4 PRECONDITIONS PASSED.`);
  console.log(`- Item ID: ${item.id}`);
  console.log(`- RootQuestionId: ${item.rootQuestionId}`);
  console.log(`- Version: ${item.version}`);
  console.log(`- Defective key: Option ${correctOption.optionKey} ("${correctOption.optionText}")`);
  console.log(`- Historical reviewer: ${item.reviewedBy}`);
  console.log(`- Historical reviewAt: ${item.reviewedAt?.toISOString()}`);
  console.log(`- Historical reviewNotes: ${item.reviewNotes}`);

  const withdrawalReason = `Withdrawn in Phase 3.4C.1 audit: ungrammatical answer key (Option B 'am trying' with 3rd-person subject 'he'). Originally approved by ${item.reviewedBy} at ${item.reviewedAt?.toISOString()}.`;

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

  console.log(`[Phase 3.4C.1 Withdrawal] Item successfully transitioned.`);
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

  if (remainingApproved.length !== 2) {
    console.error(`[Post-Condition Failure] Expected exactly 2 remaining approved items, found ${remainingApproved.length}`);
    process.exit(1);
  }

  console.log(`[Phase 3.4C.1 Withdrawal] SUCCESS.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

