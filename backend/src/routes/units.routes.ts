import { Router } from "express";
import {
  getUnits,
  getUnitByNumber,
  getUnitTheory,
} from "../controllers/units.controller";
import { getUnitExercises } from "../controllers/exercises.controller";

const router = Router();

router.get("/units", getUnits);
router.get("/units/:unitNumber", getUnitByNumber);
router.get("/units/:unitNumber/theory", getUnitTheory);
router.get("/units/:unitNumber/exercises", getUnitExercises);

export default router;
