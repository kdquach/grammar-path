import { Router } from "express";
import { optionalAuth } from "../middleware/auth";
import { initStudySessionHandler } from "../controllers/study-session.controller";

const router = Router();

router.get("/study-sessions/init", optionalAuth, initStudySessionHandler);
router.get("/study-session/init", optionalAuth, initStudySessionHandler);

export default router;
