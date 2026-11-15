import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getLearningPathHandler } from "../controllers/learning-path.controller";

const router = Router();

router.get("/learning-path", requireAuth, getLearningPathHandler);

export default router;
