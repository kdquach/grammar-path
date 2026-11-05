import { Router } from "express";
import healthRouter from "./health.routes";
import bookRouter from "./book.routes";
import unitsRouter from "./units.routes";
import theoryRouter from "./theory.routes";
import exercisesRouter from "./exercises.routes";
import questionsRouter from "./questions.routes";

const router = Router();

router.use(healthRouter);
router.use(bookRouter);
router.use(unitsRouter);
router.use(theoryRouter);
router.use(exercisesRouter);
router.use(questionsRouter);

export default router;
