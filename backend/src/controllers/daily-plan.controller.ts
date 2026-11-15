import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import {
  getOrCreateDailyPlan,
  updateDailyPlanItemStatus,
} from "../services/daily-plan.service";

const updateItemStatusSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed", "deferred"]),
});

export async function getDailyPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const plan = await getOrCreateDailyPlan(userId, dateParam);
    sendSuccess(res, plan);
  } catch (error) {
    next(error);
  }
}

export async function updatePlanItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const rawItemId = req.params.itemId;
    const itemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;
    if (!itemId) {
      throw AppError.badRequest("itemId is required");
    }
    const { status } = updateItemStatusSchema.parse(req.body);
    const plan = await updateDailyPlanItemStatus(userId, itemId, status);
    sendSuccess(res, plan);
  } catch (error) {
    next(error);
  }
}
