import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiRateLimiter } from "../middleware/rate-limit";
import { explainTheoryHandler } from "../controllers/ai.controller";

const router = Router();

// POST /api/v1/theory/explain-theory (requires authenticated learner + AI rate limit)
router.post("/theory/explain-theory", requireAuth, aiRateLimiter, explainTheoryHandler);

export default router;
