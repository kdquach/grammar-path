import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, getDashboardSummary);

export default router;

