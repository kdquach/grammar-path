import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import {
  getGrammarConceptsCatalog,
  getNormalizedToeicRoadmap,
} from "../services/concept-mapping.service";

const roadmapQuerySchema = z.object({
  part: z.string().trim().max(30).optional(),
  priority: z.enum(["core", "recommended", "advanced"]).optional(),
  goalBand: z.enum(["450+", "600+", "750+"]).optional(),
  unitNumber: z.coerce.number().int().min(1).max(145).optional(),
});

const conceptsQuerySchema = z.object({
  category: z.string().trim().max(80).optional(),
  includeTheoryLinks: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export async function getCurriculumRoadmapHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = roadmapQuerySchema.parse(req.query);
    const data = await getNormalizedToeicRoadmap(query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getCurriculumConceptsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = conceptsQuerySchema.parse(req.query);
    const data = await getGrammarConceptsCatalog(query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

