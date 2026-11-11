import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import { sendSuccess } from "../utils/response";
import { signJwtToken } from "../utils/jwt";

const registerBodySchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name cannot be empty")
    .max(100, "Display name too long"),
});

const loginBodySchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
});

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, displayName } = registerBodySchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw AppError.conflict("User with this email already exists", "CONFLICT");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    const token = signJwtToken({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    sendSuccess(res, { token, user }, undefined, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = loginBodySchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = signJwtToken({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound("User not found", "NOT_FOUND");
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}
