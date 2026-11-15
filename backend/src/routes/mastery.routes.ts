import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getMasterySummaryHandler,
  getConceptMasteryDetailHandler,
  recalculateMasteryHandler,
} from "../controllers/mastery.controller";

const router = Router();

router.get("/mastery", requireAuth, getMasterySummaryHandler);
router.get("/mastery/concepts/:conceptId", requireAuth, getConceptMasteryDetailHandler);
router.post("/mastery/recalculate", requireAuth, recalculateMasteryHandler);

export default router;

