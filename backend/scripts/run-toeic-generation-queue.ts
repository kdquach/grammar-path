import { ToeicGenerationQueueService } from "../src/services/toeic-generation-queue.service";
import prisma from "../src/lib/prisma";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("ep-small-dream-a1lqsn1r") || !dbUrl.includes("grammarpath-staging")) {
    console.error("[Staging Isolation Guard] BLOCKED: Host is not staging ep-small-dream-a1lqsn1r");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isStatsOnly = args.includes("--stats");
  const isEnqueueBatch1 = args.includes("--enqueue-units-5-24");
  const isEnqueueBatch2 = args.includes("--enqueue-units-25-52");
  const isProcessOne = args.includes("--process-one");

  console.log("[TOEIC Queue Manager] Connected to Neon staging.");

  if (isStatsOnly) {
    const stats = await ToeicGenerationQueueService.getQueueStats();
    console.log("[TOEIC Queue Stats]:", JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  if (isEnqueueBatch1) {
    console.log("[TOEIC Queue] Enqueueing Priority Batch 1: Units 5–24...");
    const unitNumbers = Array.from({ length: 20 }, (_, i) => i + 5); // 5..24
    const result = await ToeicGenerationQueueService.enqueueUnits({
      unitNumbers,
      difficulties: ["easy", "medium", "hard"],
    });
    console.log(`[TOEIC Queue] Enqueued ${result.enqueuedCount} jobs for Units 5–24.`);
  }

  if (isEnqueueBatch2) {
    console.log("[TOEIC Queue] Enqueueing Priority Batch 2: Units 25–52...");
    const unitNumbers = Array.from({ length: 28 }, (_, i) => i + 25); // 25..52
    const result = await ToeicGenerationQueueService.enqueueUnits({
      unitNumbers,
      difficulties: ["easy", "medium", "hard"],
    });
    console.log(`[TOEIC Queue] Enqueued ${result.enqueuedCount} jobs for Units 25–52.`);
  }

  if (isProcessOne) {
    console.log("[TOEIC Queue] Processing single queue job...");
    const jobResult = await ToeicGenerationQueueService.processNextJob();
    console.log("[TOEIC Queue] Job result:", jobResult);
  }

  const stats = await ToeicGenerationQueueService.getQueueStats();
  console.log("[TOEIC Queue Stats]:", JSON.stringify(stats, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[TOEIC Queue] Fatal error:", err);
  process.exit(1);
});

