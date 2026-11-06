import { Router } from "express";
import {
  getQuestionById,
  getQuestionSolution,
  checkQuestionAnswer,
} from "../controllers/questions.controller";
import { optionalAuth } from "../middleware/auth";

const router = Router();

router.get("/questions/:questionId/solution", getQuestionSolution);
router.post("/questions/:questionId/check", optionalAuth, checkQuestionAnswer);
router.get("/questions/:questionId", getQuestionById);

export default router;
