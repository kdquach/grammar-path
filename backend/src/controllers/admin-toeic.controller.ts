import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { ToeicQuestionBankService } from "../services/toeic-question-bank.service";
import { validateToeicQuestionQuality } from "../services/toeic-quality-engine.service";

export const reviewQueueQuerySchema = z.object({
  status: z.enum(["draft", "validated", "approved", "rejected", "archived", "withdrawn"]).optional(),
  unitNumber: z.coerce.number().int().min(1).max(145).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  primarySkill: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const approveQuestionSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const rejectQuestionSchema = z.object({
  defectCode: z.string().max(50).optional(),
  notes: z.string().min(5, "Rejection notes are required and must detail the reason for rejection").max(1000),
});

export const withdrawQuestionSchema = z.object({
  reason: z.string().min(5, "Withdrawal reason is mandatory for audit trail").max(1000),
});

export const createVersionSchema = z.object({
  prompt: z.string().min(10).max(1000).optional(),
  explanation: z.string().min(10).max(2000).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  ruleReference: z.string().max(32).optional(),
  options: z
    .array(
      z.object({
        optionKey: z.string().min(1).max(10),
        optionText: z.string().min(1).max(255),
        isCorrect: z.boolean(),
        rationale: z.string().max(1000).optional(),
      })
    )
    .length(4)
    .optional(),
});

export const validateCandidateSchema = z.object({
  prompt: z.string().min(10),
  options: z
    .array(
      z.object({
        optionKey: z.string().min(1).max(10),
        optionText: z.string().min(1).max(255),
        isCorrect: z.boolean().optional(),
        rationale: z.string().optional(),
      })
    )
    .length(4),
  correctAnswer: z.string().min(1).max(10).optional(),
  explanation: z.string().min(5),
  unitNumber: z.coerce.number().int().min(1).max(145).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  ruleReference: z.string().optional(),
});

export async function getReviewQueueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = reviewQueueQuerySchema.parse(req.query);
    const result = await ToeicQuestionBankService.getReviewQueue(filters as any);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getQuestionDetailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await ToeicQuestionBankService.getQuestionById(id);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function approveQuestionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { notes } = approveQuestionSchema.parse(req.body);
    const adminUserId = req.user!.id;

    const approved = await ToeicQuestionBankService.approveQuestion({
      adminUserId,
      itemId: id,
      notes,
    });

    sendSuccess(res, approved, { message: "Question approved successfully" });
  } catch (error) {
    next(error);
  }
}

export async function rejectQuestionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { defectCode, notes } = rejectQuestionSchema.parse(req.body);
    const adminUserId = req.user!.id;

    const rejected = await ToeicQuestionBankService.rejectQuestion({
      adminUserId,
      itemId: id,
      defectCode,
      notes,
    });

    sendSuccess(res, rejected, { message: "Question rejected successfully" });
  } catch (error) {
    next(error);
  }
}

export async function emergencyWithdrawHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = withdrawQuestionSchema.parse(req.body);
    const adminUserId = req.user!.id;

    const withdrawn = await ToeicQuestionBankService.emergencyWithdrawQuestion({
      adminUserId,
      itemId: id,
      reason,
    });

    sendSuccess(res, withdrawn, { message: "Question withdrawn from learner practice" });
  } catch (error) {
    next(error);
  }
}

export async function createNewVersionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updates = createVersionSchema.parse(req.body);
    const adminUserId = req.user!.id;

    const newVersion = await ToeicQuestionBankService.createNewVersion({
      adminUserId,
      sourceItemId: id,
      updates: updates as any,
    });

    sendSuccess(res, newVersion, { message: "New question version created" }, 201);
  } catch (error) {
    next(error);
  }
}

export async function validateCandidateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = validateCandidateSchema.parse(req.body);
    const report = await validateToeicQuestionQuality(candidate as any);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
}

export async function getDiversityAuditHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { AdminToeicAuditService } = await import("../services/admin-toeic-audit.service");
    const report = await AdminToeicAuditService.generateCompleteAuditReport();
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
}

export async function getContextualInventoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { AdminToeicAuditService } = await import("../services/admin-toeic-audit.service");
    const report = await AdminToeicAuditService.generateCompleteAuditReport();
    sendSuccess(res, {
      summary: report.summary,
      conceptInventories: report.conceptInventories,
    });
  } catch (error) {
    next(error);
  }
}
