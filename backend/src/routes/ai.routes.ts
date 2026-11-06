import { Router } from "express";
import { optionalAuth } from "../middleware/auth";
import { explainTheoryHandler } from "../controllers/ai.controller";

const router = Router();

// POST /api/v1/theory/explain-theory (supports optionalAuth for guest & signed-in users)
router.post("/theory/explain-theory", optionalAuth, explainTheoryHandler);

export default router;

