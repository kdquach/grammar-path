import { Router } from "express";
import {
  getExerciseById,
  getExerciseSolutions,
} from "../controllers/exercises.controller";

const router = Router();

router.get("/exercises/:exerciseId/solutions", getExerciseSolutions);
router.get("/exercises/:exerciseId", getExerciseById);

export default router;
