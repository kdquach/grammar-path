import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getEngagementHandler } from "../controllers/engagement.controller";

const router = Router();

router.get("/engagement/summary", requireAuth, getEngagementHandler);

export default router;
