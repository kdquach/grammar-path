import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/response";

export async function getHealth(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const totalUnits = await prisma.unit.count();

    const healthData = {
      status: "ok",
      database: "connected",
      totalUnits,
    };

    // Include data inside sendSuccess envelope, and also support top-level inspection if needed
    sendSuccess(res, healthData);
  } catch (error) {
    next(error);
  }
}
