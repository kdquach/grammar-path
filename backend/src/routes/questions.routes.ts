import { Router } from "express";
import {
  getQuestionById,
  getQuestionSolution,
} from "../controllers/questions.controller";

const router = Router();

router.get("/questions/:questionId/solution", getQuestionSolution);
router.get("/questions/:questionId", getQuestionById);

export default router;
