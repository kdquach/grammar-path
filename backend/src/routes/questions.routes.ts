import { Router } from "express";
import {
  getQuestionById,
  getQuestionSolution,
  checkQuestionAnswer,
} from "../controllers/questions.controller";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { submissionRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.get("/questions/:questionId/solution", requireAuth, getQuestionSolution);
router.post(
  "/questions/:questionId/check",
  optionalAuth,
  submissionRateLimiter,
  checkQuestionAnswer
);
router.get("/questions/:questionId", getQuestionById);

export default router;
