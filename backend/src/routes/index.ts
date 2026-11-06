import { Router } from "express";
import healthRouter from "./health.routes";
import bookRouter from "./book.routes";
import unitsRouter from "./units.routes";
import theoryRouter from "./theory.routes";
import exercisesRouter from "./exercises.routes";
import questionsRouter from "./questions.routes";
import authRouter from "./auth.routes";
import progressRouter from "./progress.routes";
import aiRouter from "./ai.routes";
import adaptiveRouter from "./adaptive.routes";

const router = Router();

router.use(healthRouter);
router.use(bookRouter);
router.use(unitsRouter);
router.use(theoryRouter);
router.use(exercisesRouter);
router.use(questionsRouter);
router.use(authRouter);
router.use(progressRouter);
router.use(aiRouter);
router.use(adaptiveRouter);

export default router;
