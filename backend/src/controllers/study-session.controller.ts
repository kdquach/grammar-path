import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { initUnifiedStudySession } from "../services/study-session.service";

const initSessionQuerySchema = z.object({
  unit: z.coerce.number().int().min(1).max(145),
  exercise: z.string().optional(),
});

export async function initStudySessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unit, exercise } = initSessionQuerySchema.parse(req.query);
    const userId = req.user?.id ?? null;
    const session = await initUnifiedStudySession(userId, unit, exercise);
    sendSuccess(res, session);
  } catch (error) {
    next(error);
  }
}

