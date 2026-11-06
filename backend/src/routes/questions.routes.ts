import { Router } from "express";
import {
  getQuestionById,
  getQuestionSolution,
  checkQuestionAnswer,
} from "../controllers/questions.controller";

const router = Router();

router.get("/questions/:questionId/solution", getQuestionSolution);
router.post("/questions/:questionId/check", checkQuestionAnswer);
router.get("/questions/:questionId", getQuestionById);

export default router;
