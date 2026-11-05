import { Router } from "express";
import healthRouter from "./health.routes";
import bookRouter from "./book.routes";
import unitsRouter from "./units.routes";
import theoryRouter from "./theory.routes";

const router = Router();

router.use(healthRouter);
router.use(bookRouter);
router.use(unitsRouter);
router.use(theoryRouter);

export default router;
