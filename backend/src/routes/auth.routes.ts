import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/auth/register", authRateLimiter, register);
router.post("/auth/login", authRateLimiter, login);
router.get("/auth/me", requireAuth, getMe);

export default router;
