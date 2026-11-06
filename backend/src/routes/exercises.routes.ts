import { Router } from "express";
import {
  getExerciseById,
  getExerciseSolutions,
  checkExerciseAnswers,
} from "../controllers/exercises.controller";

const router = Router();

router.get("/exercises/:exerciseId/solutions", getExerciseSolutions);
router.post("/exercises/:exerciseId/check", checkExerciseAnswers);
router.get("/exercises/:exerciseId", getExerciseById);

export default router;
