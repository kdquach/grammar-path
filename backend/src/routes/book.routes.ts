import { Router } from "express";
import { getBook } from "../controllers/book.controller";

const router = Router();

router.get("/book", getBook);

export default router;
