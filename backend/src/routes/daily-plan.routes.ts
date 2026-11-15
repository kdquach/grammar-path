import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getDailyPlanHandler,
  updatePlanItemHandler,
} from "../controllers/daily-plan.controller";

const router = Router();

router.get("/daily-plan", requireAuth, getDailyPlanHandler);
router.patch("/daily-plan/items/:itemId", requireAuth, updatePlanItemHandler);

export default router;
