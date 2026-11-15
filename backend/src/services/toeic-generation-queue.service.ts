import prisma from "../lib/prisma";
import { generateGeminiText } from "../lib/gemini";
import { validateToeicQuestionQuality } from "./toeic-quality-engine.service";
import { computeToeicItemContentHash } from "../../scripts/import-legacy-toeic";
import { DifficultyLevel } from "./toeic-generator.service";
import { ToeicPrimarySkill } from "@prisma/client";

export interface QueueJobResult {
  jobId: string;
  unitNumber: number;
  difficulty: string;
  status: "completed" | "failed" | "retry_scheduled" | "paused";
  itemsGenerated: number;
  itemsValidated: number;
  error?: string;
}

export class ToeicGenerationQueueService {
  /**
   * Enqueues batch generation jobs for specified units and difficulty levels.
   */
  static async enqueueUnits(params: {
    unitNumbers: number[];
    difficulties?: DifficultyLevel[];
    targetSkill?: ToeicPrimarySkill;
  }) {
    const {
      unitNumbers,
      difficulties = ["easy", "medium", "hard"],
      targetSkill = "direct_grammar",
    } = params;

    const createdJobIds: string[] = [];

    for (const unitNumber of unitNumbers) {
      for (const difficulty of difficulties) {
        // Check if pending or in_progress job already exists for this unit and difficulty
        const existing = await prisma.toeicGenerationJob.findFirst({
          where: {
            unitNumber,
            difficulty,
            status: { in: ["pending", "in_progress"] },
          },
        });

        if (existing) continue;

        const job = await prisma.toeicGenerationJob.create({
          data: {
            unitNumber,
            difficulty,
            targetSkill,
            status: "pending",
            attempts: 0,
            maxAttempts: 5,
          },
        });
        createdJobIds.push(job.id);
      }
    }

    return {
      enqueuedCount: createdJobIds.length,
      jobIds: createdJobIds,
    };
  }

  /**
   * Retrieves summary statistics of the offline job queue.
   */
  static async getQueueStats() {
    const counts = await prisma.toeicGenerationJob.groupBy({
      by: ["status"],
      _count: true,
    });

    const stats: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    };

    for (const row of counts) {
      stats[row.status] = row._count;
    }

    const totalBankApproved = await prisma.toeicQuestionBankItem.count({
      where: { reviewStatus: "approved", isLatestApproved: true },
    });
    const totalBankValidated = await prisma.toeicQuestionBankItem.count({
      where: { reviewStatus: "validated" },
    });
    const totalBankDraft = await prisma.toeicQuestionBankItem.count({
      where: { reviewStatus: "draft" },
    });

    return {
      jobs: stats,
      bank: {
        approved: totalBankApproved,
        validated: totalBankValidated,
        draft: totalBankDraft,
      },
    };
  }

  /**
   * Processes the next available pending job with bounded exponential backoff.
   */
  static async processNextJob(options?: { targetJobId?: string }): Promise<QueueJobResult | null> {
    // Pick next eligible pending job (nextRetryAt is null or past)
    const now = new Date();
    const job = options?.targetJobId
      ? await prisma.toeicGenerationJob.findFirst({
          where: {
            id: options.targetJobId,
            status: "pending",
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
          },
        })
      : await prisma.toeicGenerationJob.findFirst({
          where: {
            status: "pending",
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
          },
          orderBy: [{ unitNumber: "asc" }, { createdAt: "asc" }],
        });

    if (!job) return null;

    // Transition to in_progress
    await prisma.toeicGenerationJob.update({
      where: { id: job.id },
      data: { status: "in_progress", attempts: { increment: 1 } },
    });

    const currentAttempt = job.attempts + 1;
    const startTime = Date.now();

    try {
      // Fetch unit details and mapped concept
      const unit = await prisma.unit.findFirst({
        where: { unitNumber: job.unitNumber },
        include: {
          theorySections: {
            select: { sectionId: true, heading: true, sourceContent: true },
            orderBy: { displayOrder: "asc" },
            take: 4,
          },
          textbookExamples: {
            select: { originalText: true, translationVi: true },
            orderBy: { displayOrder: "asc" },
            take: 4,
          },
        },
      });

      if (!unit) {
        throw new Error(`Unit ${job.unitNumber} not found in canonical database`);
      }

      const meta = await prisma.unitToeicMetadata.findFirst({
        where: { unitId: unit.id },
        select: { conceptId: true },
      });

      const conceptId = meta?.conceptId || null;

      // Prepare Prompt
      const theorySummary = unit.theorySections
        .map((s) => `Section ${s.sectionId} - ${s.heading}: ${s.sourceContent.slice(0, 150)}...`)
        .join("\n");

      const promptTemplate = `Generate 2 authentic TOEIC Part 5 multiple-choice questions for Unit ${job.unitNumber}: "${unit.title}".
DIFFICULTY: ${job.difficulty.toUpperCase()}.
THEORY CONTEXT:
${theorySummary}

STRICT JSON OUTPUT FORMAT ONLY:
{
  "questions": [
    {
      "prompt": "Workplace sentence with exactly one _______ blank.",
      "options": [
        { "optionKey": "A", "optionText": "text A", "isCorrect": false, "rationale": "Why wrong" },
        { "optionKey": "B", "optionText": "text B", "isCorrect": true },
        { "optionKey": "C", "optionText": "text C", "isCorrect": false, "rationale": "Why wrong" },
        { "optionKey": "D", "optionText": "text D", "isCorrect": false, "rationale": "Why wrong" }
      ],
      "explanation": "Vietnamese explanation explaining why B is correct and citing grammar clue."
    }
  ]
}`;

      // Create Generation Run record
      const run = await prisma.toeicQuestionGenerationRun.create({
        data: {
          provider: "google_gemini",
          modelName: "gemini-1.5-flash",
          promptVersion: "v1.4-batch-queue",
          promptTemplate,
          targetUnitNumber: job.unitNumber,
          targetDifficulty: job.difficulty,
          targetSkill: job.targetSkill,
          itemsRequested: 2,
          executedBy: "toeic_queue_worker",
        },
      });

      // Link run to job
      await prisma.toeicGenerationJob.update({
        where: { id: job.id },
        data: { runId: run.id },
      });

      // Call Gemini with fail-closed handling
      let rawAiText: string | null = null;
      if (process.env.GEMINI_API_KEY?.trim()) {
        const aiResult = await generateGeminiText({
          prompt: promptTemplate,
          timeoutMs: 8000,
          responseMimeType: "application/json",
          temperature: 0.7,
        });
        rawAiText = aiResult?.text || null;
      }

      if (!rawAiText) {
        throw new Error("PROVIDER_UNAVAILABLE: Gemini returned empty or was unavailable");
      }

      const cleaned = rawAiText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { questions?: any[] };

      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("PARSER_ERROR: LLM output did not yield a valid questions array");
      }

      let validatedCount = 0;
      let insertedCount = 0;

      for (const q of parsed.questions) {
        const validation = await validateToeicQuestionQuality({
          prompt: q.prompt,
          options: q.options,
          explanation: q.explanation,
          unitNumber: job.unitNumber,
          difficulty: job.difficulty as DifficultyLevel,
        });

        const contentHash = computeToeicItemContentHash(
          q.prompt,
          q.options.map((o: any) => ({ key: o.optionKey, text: o.optionText }))
        );

        // Deduplication check
        const existingHash = await prisma.toeicQuestionBankItem.findUnique({
          where: { contentHash },
        });

        if (existingHash) continue;

        const isQualified = validation.canQualifyForValidatedStatus;
        if (isQualified) validatedCount++;

        await prisma.toeicQuestionBankItem.create({
          data: {
            part: "PART_5",
            format: "PART5_INCOMPLETE_SENTENCE",
            prompt: q.prompt,
            explanation: q.explanation,
            difficulty: job.difficulty,
            primarySkill: job.targetSkill,
            unitNumber: job.unitNumber,
            ruleReference: `${job.unitNumber}A`,
            conceptId,
            conceptMappingConfidence: 0.9,
            conceptMappingSource: "queue_generator",
            reviewStatus: isQualified ? "validated" : "draft", // NEVER AUTO-APPROVED
            isLatestApproved: false,
            qualityScore: validation.overallScore,
            validationScores: validation.rubricScores as any,
            source: "ai_generated",
            sourceReference: `Run ${run.id}`,
            contentHash,
            generationRunId: run.id,
            options: {
              create: q.options.map((opt: any, idx: number) => ({
                optionKey: opt.optionKey,
                optionText: opt.optionText,
                isCorrect: Boolean(opt.isCorrect),
                rationale: opt.rationale || null,
                displayOrder: idx,
              })),
            },
          },
        });
        insertedCount++;
      }

      const durationMs = Date.now() - startTime;

      // Update generation run telemetry
      await prisma.toeicQuestionGenerationRun.update({
        where: { id: run.id },
        data: {
          itemsGenerated: insertedCount,
          itemsPassedValidation: validatedCount,
          latencyMs: durationMs,
        },
      });

      // Complete job
      await prisma.toeicGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          lastError: null,
          checkpointData: { insertedCount, validatedCount, durationMs },
        },
      });

      return {
        jobId: job.id,
        unitNumber: job.unitNumber,
        difficulty: job.difficulty,
        status: "completed",
        itemsGenerated: insertedCount,
        itemsValidated: validatedCount,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isMaxAttempts = currentAttempt >= job.maxAttempts;
      const backoffMs = Math.min(60_000, Math.pow(2, currentAttempt) * 1000);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await prisma.toeicGenerationJob.update({
        where: { id: job.id },
        data: {
          status: isMaxAttempts ? "failed" : "pending",
          lastError: errMsg,
          nextRetryAt: isMaxAttempts ? null : nextRetryAt,
        },
      });

      return {
        jobId: job.id,
        unitNumber: job.unitNumber,
        difficulty: job.difficulty,
        status: isMaxAttempts ? "failed" : "retry_scheduled",
        itemsGenerated: 0,
        itemsValidated: 0,
        error: errMsg,
      };
    }
  }
}

