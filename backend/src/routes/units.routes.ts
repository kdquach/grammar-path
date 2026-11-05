import { Router } from "express";
import {
  getUnits,
  getUnitByNumber,
  getUnitTheory,
} from "../controllers/units.controller";

const router = Router();

router.get("/units", getUnits);
router.get("/units/:unitNumber", getUnitByNumber);
router.get("/units/:unitNumber/theory", getUnitTheory);

export default router;
