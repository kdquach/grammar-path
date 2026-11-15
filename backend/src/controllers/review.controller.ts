import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import {
  getDueReviews,
  getAllReviews,
  completeConceptReview,
} from "../services/review.service";

export const reviewConceptParamSchema = z.object({
  conceptId: z.string().uuid("Invalid concept UUID format"),
});

export const completeReviewBodySchema = z
  .object({
    scheduleId: z.string().uuid("Invalid schedule UUID format").optional(),
    submissionId: z.string().trim().min(1).max(128).optional(),
    answers: z
      .record(z.string(), z.unknown())
      .refine(
        (obj) => Object.keys(obj).length > 0,
        "Answers map must contain at least one question answer"
      ),
  })
  .passthrough();

export async function getDueReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const due = await getDueReviews(userId);
    sendSuccess(res, due);
  } catch (error) {
    next(error);
  }
}

export async function getAllReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const all = await getAllReviews(userId);
    sendSuccess(res, all);
  } catch (error) {
    next(error);
  }
}

export async function completeReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { conceptId } = reviewConceptParamSchema.parse(req.params);
    const body = completeReviewBodySchema.parse(req.body);

    const result = await completeConceptReview(userId, conceptId, {
      answers: body.answers,
      scheduleId: body.scheduleId,
      submissionId: body.submissionId,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

