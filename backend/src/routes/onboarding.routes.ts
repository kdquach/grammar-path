import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { submissionRateLimiter } from "../middleware/rate-limit";
import {
  getPreferencesHandler,
  updatePreferencesHandler,
  startAssessmentHandler,
  submitAssessmentHandler,
} from "../controllers/onboarding.controller";

const router = Router();

// Learning preferences endpoints
router.get("/onboarding/preferences", requireAuth, getPreferencesHandler);
router.put("/onboarding/preferences", requireAuth, updatePreferencesHandler);

// Diagnostic assessment endpoints
router.post("/assessment/start", requireAuth, startAssessmentHandler);
router.post(
  "/assessment/:assessmentId/submit",
  requireAuth,
  submissionRateLimiter,
  submitAssessmentHandler
);

export default router;
