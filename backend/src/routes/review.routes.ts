import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { submissionRateLimiter } from "../middleware/rate-limit";
import {
  getDueReviewsHandler,
  getAllReviewsHandler,
  completeReviewHandler,
} from "../controllers/review.controller";

const router = Router();

router.get("/reviews", requireAuth, getAllReviewsHandler);
router.get("/reviews/due", requireAuth, getDueReviewsHandler);
router.post(
  "/reviews/:conceptId/complete",
  requireAuth,
  submissionRateLimiter,
  completeReviewHandler
);

export default router;

