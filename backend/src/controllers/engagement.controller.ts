import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import { getEngagementSummary } from "../services/engagement.service";

export async function getEngagementHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const summary = await getEngagementSummary(userId);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

