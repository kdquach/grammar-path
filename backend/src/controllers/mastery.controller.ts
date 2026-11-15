import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import {
  getMasterySummary,
  getConceptMasteryDetail,
  recalculateUserMastery,
} from "../services/mastery.service";

export const conceptIdParamSchema = z.object({
  conceptId: z.string().uuid("Invalid concept UUID format"),
});

export async function getMasterySummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const summary = await getMasterySummary(userId);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

export async function getConceptMasteryDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { conceptId } = conceptIdParamSchema.parse(req.params);
    const detail = await getConceptMasteryDetail(userId, conceptId);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function recalculateMasteryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await recalculateUserMastery(userId);
    sendSuccess(res, {
      message: "Mastery recalculated successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

