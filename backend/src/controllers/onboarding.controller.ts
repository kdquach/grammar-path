import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import {
  getUserPreferences,
  updateUserPreferences,
  startDiagnosticAssessment,
  submitDiagnosticAssessment,
} from "../services/onboarding.service";

const updatePreferencesSchema = z.object({
  grammarConfidence: z.enum(["beginner", "elementary", "intermediate", "advanced"]).optional(),
  learningObjective: z.enum(["foundation", "toeic_prep", "speaking_writing", "review"]).optional(),
  dailyStudyMinutes: z.number().int().min(5).max(180).optional(),
  preferredDays: z.array(z.string()).min(1).max(7).optional(),
  targetToeicScore: z.number().int().min(100).max(990).nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.any()),
});

export async function getPreferencesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const preferences = await getUserPreferences(userId);
    sendSuccess(res, preferences);
  } catch (error) {
    next(error);
  }
}

export async function updatePreferencesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const parsed = updatePreferencesSchema.parse(req.body);
    const updated = await updateUserPreferences(userId, parsed);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

export async function startAssessmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const assessment = await startDiagnosticAssessment(userId);
    sendSuccess(res, assessment);
  } catch (error) {
    next(error);
  }
}

export async function submitAssessmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const rawAssessmentId = req.params.assessmentId;
    const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId;
    if (!assessmentId) {
      throw AppError.badRequest("assessmentId is required");
    }
    const { answers } = submitAssessmentSchema.parse(req.body);
    const result = await submitDiagnosticAssessment(userId, assessmentId, answers);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
