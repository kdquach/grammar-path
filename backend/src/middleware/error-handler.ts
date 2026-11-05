import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
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

  static notFound(message = "Resource not found", code = "NOT_FOUND"): AppError {
    return new AppError(404, code, message);
  }

  static internal(message = "Internal server error", code = "INTERNAL_SERVER_ERROR"): AppError {
    return new AppError(500, code, message);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".") || "value"}: ${e.message}`).join(", ");
    sendError(res, "VALIDATION_ERROR", message, 400, err.errors);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  const errorMessage = err instanceof Error ? err.message : "Internal server error";
  console.error("Unhandled error:", err);
  sendError(res, "INTERNAL_SERVER_ERROR", errorMessage, 500);
};

