import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";
import { verifyJwtToken, JwtUserPayload } from "../utils/jwt";

export interface AuthUser extends JwtUserPayload {}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized("Authentication token missing", "UNAUTHORIZED");
    }

    try {
      const decoded = verifyJwtToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        displayName: decoded.displayName,
      };
      next();
    } catch {
      throw AppError.unauthorized("Invalid or expired authentication token", "UNAUTHORIZED");
    }
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const decoded = verifyJwtToken(token);
          req.user = {
            id: decoded.id,
            email: decoded.email,
            displayName: decoded.displayName,
          };
        } catch {
          req.user = undefined;
        }
      } else {
        req.user = undefined;
      }
    } else {
      req.user = undefined;
    }
    next();
  } catch {
    req.user = undefined;
    next();
  }
}
