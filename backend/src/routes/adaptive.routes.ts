import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiRateLimiter } from "../middleware/rate-limit";
import {
  getAdaptiveAnalytics,
  getAdaptiveRecommendations,
  generateToeicPracticeHandler,
  generateAdaptiveQuizHandler,
} from "../controllers/adaptive.controller";

const router = Router();

// GET /api/v1/adaptive/analytics (requireAuth)
router.get("/adaptive/analytics", requireAuth, getAdaptiveAnalytics);

// GET /api/v1/adaptive/recommendations (requireAuth)
router.get("/adaptive/recommendations", requireAuth, getAdaptiveRecommendations);

// POST /api/v1/adaptive/toeic-practice (requireAuth + AI rate limit)
router.post(
  "/adaptive/toeic-practice",
  requireAuth,
  aiRateLimiter,
  generateToeicPracticeHandler
);

// POST /api/v1/adaptive/quiz/generate (requireAuth + AI rate limit)
router.post(
  "/adaptive/quiz/generate",
  requireAuth,
  aiRateLimiter,
  generateAdaptiveQuizHandler
);

export default router;
