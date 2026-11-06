import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getAdaptiveAnalytics,
  getAdaptiveRecommendations,
} from "../controllers/adaptive.controller";

const router = Router();

// GET /api/v1/adaptive/analytics (requireAuth)
router.get("/adaptive/analytics", requireAuth, getAdaptiveAnalytics);

// GET /api/v1/adaptive/recommendations (requireAuth)
router.get("/adaptive/recommendations", requireAuth, getAdaptiveRecommendations);

export default router;

