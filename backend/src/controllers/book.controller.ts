import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";

export async function getBook(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const book = await prisma.book.findFirst();

    if (!book) {
      throw AppError.notFound("Book record not found in database", "NOT_FOUND");
    }

    const [
      totalUnits,
      totalExercises,
      totalQuestions,
      totalTheorySections,
      totalTextbookExamples,
    ] = await Promise.all([
      prisma.unit.count(),
      prisma.exercise.count(),
      prisma.question.count(),
      prisma.theorySection.count(),
      prisma.textbookExample.count(),
    ]);

    const data = {
      ...book,
      totalUnits,
      totalExercises,
      totalQuestions,
      totalTheorySections,
      totalTextbookExamples,
      counts: {
        totalUnits,
        totalExercises,
        totalQuestions,
        totalTheorySections,
        totalTextbookExamples,
      },
    };

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

