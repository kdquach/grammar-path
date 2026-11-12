import { Router } from "express";
import {
  getExerciseById,
  getExerciseSolutions,
  checkExerciseAnswers,
} from "../controllers/exercises.controller";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/exercises/:exerciseId/solutions", requireAuth, getExerciseSolutions);
router.post("/exercises/:exerciseId/check", optionalAuth, checkExerciseAnswers);
router.get("/exercises/:exerciseId", getExerciseById);

export default router;
