import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getRecommendationsHandler,
  getNextRecommendationHandler,
} from "../controllers/recommendations.controller";

const router = Router();

router.get("/recommendations", requireAuth, getRecommendationsHandler);
router.get("/recommendations/next", requireAuth, getNextRecommendationHandler);

export default router;

