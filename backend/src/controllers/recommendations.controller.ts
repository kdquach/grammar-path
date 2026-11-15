import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import {
  getPersonalizedRecommendations,
  getNextRecommendedAction,
} from "../services/recommendations.service";

export async function getRecommendationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const recommendations = await getPersonalizedRecommendations(userId);
    sendSuccess(res, {
      total: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNextRecommendationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const nextAction = await getNextRecommendedAction(userId);
    sendSuccess(res, {
      nextAction,
    });
  } catch (error) {
    next(error);
  }
}

