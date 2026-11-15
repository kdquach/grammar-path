import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import { buildLearnerDashboardSummary } from "../services/dashboard.service";

export async function getDashboardSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const summary = await buildLearnerDashboardSummary(userId);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

