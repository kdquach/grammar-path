import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";

export const sectionIdParamSchema = z.object({
  sectionId: z
    .string()
    .trim()
    .min(1, "sectionId cannot be empty")
    .max(20, "sectionId must be 20 characters or less"),
});

export async function getTheorySectionById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sectionId } = sectionIdParamSchema.parse(req.params);

    const normalizedId = sectionId.trim().toUpperCase();

    const section = await prisma.theorySection.findFirst({
      where: {
        sectionId: { equals: normalizedId, mode: "insensitive" },
      },
      include: {
        sourcePages: {
          select: { pageNumber: true },
          orderBy: { pageNumber: "asc" },
        },
        unit: {
          select: {
            unitNumber: true,
            title: true,
          },
        },
      },
    });

    if (!section) {
      throw AppError.notFound(
        `Theory section '${sectionId}' not found`,
        "NOT_FOUND"
      );
    }

    const linkedExplanations = await prisma.explanation.findMany({
      where: {
        ruleReference: { equals: section.sectionId, mode: "insensitive" },
      },
      select: {
        question: {
          select: {
            questionId: true,
          },
        },
      },
      orderBy: [
        {
          question: {
            exercise: {
              displayOrder: "asc",
            },
          },
        },
        {
          question: {
            displayOrder: "asc",
          },
        },
      ],
    });

    const questionIds = linkedExplanations.map(
      (item) => item.question.questionId
    );

    const data = {
      id: section.id,
      unitId: section.unitId,
      sectionId: section.sectionId,
      heading: section.heading,
      sourceContent: section.sourceContent,
      displayOrder: section.displayOrder,
      createdAt: section.createdAt,
      sourcePages: section.sourcePages.map((sp) => sp.pageNumber),
      unit: section.unit,
      unitNumber: section.unit.unitNumber,
      unitTitle: section.unit.title,
      linkedQuestions: {
        count: questionIds.length,
        questionIds,
      },
      linkedQuestionCount: questionIds.length,
      linkedQuestionIds: questionIds,
    };

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
