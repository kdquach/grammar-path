import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import {
  getReviewQueueHandler,
  getQuestionDetailsHandler,
  approveQuestionHandler,
  rejectQuestionHandler,
  emergencyWithdrawHandler,
  createNewVersionHandler,
  validateCandidateHandler,
  getDiversityAuditHandler,
  getContextualInventoryHandler,
} from "../controllers/admin-toeic.controller";

const router = Router();

// All admin TOEIC routes require both authentication and administrative authorization
router.use(requireAuth);
router.use(requireAdmin);

router.get("/queue", getReviewQueueHandler);
router.get("/diversity-audit", getDiversityAuditHandler);
router.get("/inventory/contextual", getContextualInventoryHandler);
router.get("/items/:id", getQuestionDetailsHandler);
router.post("/items/:id/approve", approveQuestionHandler);
router.post("/items/:id/reject", rejectQuestionHandler);
router.post("/items/:id/withdraw", emergencyWithdrawHandler);
router.post("/items/:id/version", createNewVersionHandler);
router.post("/validate", validateCandidateHandler);

export default router;

