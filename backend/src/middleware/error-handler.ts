import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { sendError } from "../utils/response";

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST", details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static validationError(message = "Validation failed", details?: unknown): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED"): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN"): AppError {
    return new AppError(403, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND"): AppError {
    return new AppError(404, code, message);
  }

  static conflict(message = "Conflict", code = "CONFLICT"): AppError {
    return new AppError(409, code, message);
  }

  static tooManyRequests(
    message = "Too many requests",
    code = "RATE_LIMIT_EXCEEDED"
  ): AppError {
    return new AppError(429, code, message);
  }

  static internal(message = "Internal server error", code = "INTERNAL_SERVER_ERROR"): AppError {
    return new AppError(500, code, message);
  }

  static serviceUnavailable(
    message = "Service temporarily unavailable",
    code = "SERVICE_UNAVAILABLE"
  ): AppError {
    return new AppError(503, code, message);
  }
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function isJsonSyntaxError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    ("body" in err || (err as { type?: string }).type === "entity.parse.failed")
  );
}

function isPayloadTooLargeError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { type?: string; status?: number; statusCode?: number };
  return (
    candidate.type === "entity.too.large" ||
    candidate.status === 413 ||
    candidate.statusCode === 413
  );
}

function isPrismaKnownError(err: unknown): err is { code: string; name?: string } {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return true;
  }
  if (err && typeof err === "object") {
    const candidate = err as { name?: string; code?: unknown };
    return (
      candidate.name === "PrismaClientKnownRequestError" &&
      typeof candidate.code === "string" &&
      /^P\d{4}$/.test(candidate.code)
    );
  }
  return false;
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const message = err.errors
      .map((e) => `${e.path.join(".") || "value"}: ${e.message}`)
      .join(", ");
    const safeDetails = isProductionEnv()
      ? err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }))
      : err.errors;
    sendError(res, "VALIDATION_ERROR", message, 400, safeDetails);
    return;
  }

  if (isPayloadTooLargeError(err)) {
    sendError(
      res,
      "PAYLOAD_TOO_LARGE",
      "Request payload exceeds maximum allowed size",
      413
    );
    return;
  }

  if (isJsonSyntaxError(err)) {
    sendError(res, "INVALID_JSON", "Malformed JSON request body", 400);
    return;
  }

  if (err instanceof AppError) {
    sendError(
      res,
      err.code,
      err.message,
      err.statusCode,
      isProductionEnv() && err.statusCode >= 500 ? undefined : err.details
    );
    return;
  }

  if (isPrismaKnownError(err)) {
    if (err.code === "P2002") {
      sendError(res, "CONFLICT", "Resource already exists", 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "NOT_FOUND", "Requested resource not found", 404);
      return;
    }
  }

  const rawMessage = err instanceof Error ? err.message : "Unknown internal error";
  console.error("[GrammarPath API] Unhandled error:", rawMessage);

  const clientMessage = isProductionEnv()
    ? "Internal server error"
    : rawMessage || "Internal server error";

  sendError(res, "INTERNAL_SERVER_ERROR", clientMessage, 500);
};
