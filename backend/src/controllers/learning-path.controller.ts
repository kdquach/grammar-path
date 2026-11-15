import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import { buildPersonalizedLearningPath } from "../services/learning-path.service";

export async function getLearningPathHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const path = await buildPersonalizedLearningPath(userId);
    sendSuccess(res, path);
  } catch (error) {
    next(error);
  }
}

