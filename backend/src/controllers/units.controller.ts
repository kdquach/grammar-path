import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/error-handler";
import { Prisma } from "@prisma/client";

export const getUnitsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(145).default(20),
    search: z.string().trim().max(120, "search query too long").optional(),
    fromUnit: z.coerce.number().int().min(1).max(145).optional(),
    toUnit: z.coerce.number().int().min(1).max(145).optional(),
  })
  .refine(
    (data) => {
      if (data.fromUnit !== undefined && data.toUnit !== undefined) {
        return data.fromUnit <= data.toUnit;
      }
      return true;
    },
    {
      message: "fromUnit must be less than or equal to toUnit",
      path: ["fromUnit"],
    }
  );

export const unitNumberParamSchema = z.object({
  unitNumber: z.coerce
    .number()
    .int({ message: "unitNumber must be an integer" })
    .min(1, { message: "unitNumber must be at least 1" })
    .max(145, { message: "unitNumber must be at most 145" }),
});

export async function getUnits(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = getUnitsQuerySchema.parse(req.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UnitWhereInput = {};

    if (query.fromUnit !== undefined || query.toUnit !== undefined) {
      where.unitNumber = {};
      if (query.fromUnit !== undefined) {
        where.unitNumber.gte = query.fromUnit;
      }
      if (query.toUnit !== undefined) {
        where.unitNumber.lte = query.toUnit;
      }
    }

    if (query.search && query.search.length > 0) {
      const trimmed = query.search;
      const numericSearch = Number(trimmed);
      if (
        !isNaN(numericSearch) &&
        Number.isInteger(numericSearch) &&
        numericSearch >= 1 &&
        numericSearch <= 145
      ) {
        where.OR = [
          { unitNumber: numericSearch },
          { title: { contains: trimmed, mode: "insensitive" } },
        ];
      } else {
        where.title = { contains: trimmed, mode: "insensitive" };
      }
    }

    const [totalItems, rawUnits] = await Promise.all([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { unitNumber: "asc" },
        select: {
          id: true,
          unitNumber: true,
          title: true,
          theoryPdfPage: true,
          exercisePdfPage: true,
          bookTheoryPage: true,
          bookExercisePage: true,
          bookAnswerKeyPage: true,
          confidenceLevel: true,
          _count: {
            select: {
              theorySections: true,
              textbookExamples: true,
              exercises: true,
            },
          },
          exercises: {
            select: {
              _count: {
                select: { questions: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const units = rawUnits.map((u) => {
      const questionCount = u.exercises.reduce(
        (acc, curr) => acc + curr._count.questions,
        0
      );
      return {
        id: u.id,
        unitNumber: u.unitNumber,
        title: u.title,
        theoryPdfPage: u.theoryPdfPage,
        exercisePdfPage: u.exercisePdfPage,
        bookTheoryPage: u.bookTheoryPage,
        bookExercisePage: u.bookExercisePage,
        bookAnswerKeyPage: u.bookAnswerKeyPage,
        confidenceLevel: u.confidenceLevel,
        counts: {
          theorySections: u._count.theorySections,
          textbookExamples: u._count.textbookExamples,
          exercises: u._count.exercises,
          questions: questionCount,
        },
      };
    });

    sendSuccess(res, units, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnitByNumber(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      include: {
        sourcePages: {
          orderBy: [{ pageNumber: "asc" }, { pageRole: "asc" }],
        },
        theorySections: {
          orderBy: { displayOrder: "asc" },
          select: {
            sectionId: true,
            heading: true,
            displayOrder: true,
          },
        },
        exercises: {
          orderBy: { displayOrder: "asc" },
          select: {
            exerciseId: true,
            exerciseNumber: true,
            questionType: true,
            instruction: true,
            hasVisualContext: true,
            displayOrder: true,
            _count: {
              select: {
                questions: true,
                wordBankItems: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw AppError.notFound(`Unit ${unitNumber} not found`, "NOT_FOUND");
    }

    const { exercises: rawExercises, ...unitMeta } = unit;

    const exercises = rawExercises.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseNumber: e.exerciseNumber,
      questionType: e.questionType,
      instruction: e.instruction,
      hasVisualContext: e.hasVisualContext,
      displayOrder: e.displayOrder,
      questionCount: e._count.questions,
      wordBankCount: e._count.wordBankItems,
    }));

    const data = {
      ...unitMeta,
      exercises,
    };

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getUnitTheory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { unitNumber } = unitNumberParamSchema.parse(req.params);

    const unit = await prisma.unit.findFirst({
      where: { unitNumber },
      select: {
        unitNumber: true,
        title: true,
        theorySections: {
          orderBy: { displayOrder: "asc" },
          include: {
            sourcePages: {
              select: { pageNumber: true },
              orderBy: { pageNumber: "asc" },
            },
          },
        },
        textbookExamples: {
          orderBy: { displayOrder: "asc" },
          include: {
            sourcePages: {
              select: { pageNumber: true },
              orderBy: { pageNumber: "asc" },
            },
          },
        },
      },
    });

    if (!unit) {
      throw AppError.notFound(`Unit ${unitNumber} not found`, "NOT_FOUND");
    }

    const theorySections = unit.theorySections.map((ts) => ({
      id: ts.id,
      unitId: ts.unitId,
      sectionId: ts.sectionId,
      heading: ts.heading,
      sourceContent: ts.sourceContent,
      displayOrder: ts.displayOrder,
      createdAt: ts.createdAt,
      sourcePages: ts.sourcePages.map((sp) => sp.pageNumber),
    }));

    const textbookExamples = unit.textbookExamples.map((te) => ({
      id: te.id,
      unitId: te.unitId,
      exampleId: te.exampleId,
      originalText: te.originalText,
      translationVi: te.translationVi,
      displayOrder: te.displayOrder,
      createdAt: te.createdAt,
      sourcePages: te.sourcePages.map((sp) => sp.pageNumber),
    }));

    const data = {
      unitNumber: unit.unitNumber,
      title: unit.title,
      theorySections,
      textbookExamples,
    };

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
