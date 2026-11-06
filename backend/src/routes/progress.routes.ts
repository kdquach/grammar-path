import { Router } from "express";
import {
  getProgressOverview,
  updateUnitProgress,
  getUnitProgress,
  getMistakes,
} from "../controllers/progress.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/progress/overview", requireAuth, getProgressOverview);
router.get("/progress/mistakes", requireAuth, getMistakes);
router.get("/progress/units/:unitNumber", requireAuth, getUnitProgress);
router.put("/progress/units/:unitNumber", requireAuth, updateUnitProgress);

export default router;
