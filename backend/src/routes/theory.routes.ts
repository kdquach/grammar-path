import { Router } from "express";
import { getTheorySectionById } from "../controllers/theory.controller";

const router = Router();

router.get("/theory/sections/:sectionId", getTheorySectionById);

export default router;
