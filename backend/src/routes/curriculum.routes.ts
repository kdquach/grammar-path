import { Router } from "express";
import {
  getCurriculumConceptsHandler,
  getCurriculumRoadmapHandler,
} from "../controllers/curriculum.controller";

const router = Router();

router.get("/curriculum/roadmap", getCurriculumRoadmapHandler);
router.get("/curriculum/concepts", getCurriculumConceptsHandler);

export default router;

