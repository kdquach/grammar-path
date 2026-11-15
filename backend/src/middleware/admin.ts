import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";

const DEFAULT_ADMIN_EMAILS = ["kd.quach03@gmail.com", "admin@grammarpath.local", "project-owner@grammarpath.local"];

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const adminEmailsEnv = process.env.ADMIN_EMAILS;
    const adminEmails = adminEmailsEnv
      ? adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase())
      : DEFAULT_ADMIN_EMAILS;

    const userEmail = req.user.email?.trim().toLowerCase();
    const adminKey = req.headers["x-admin-key"];
    const expectedKey = process.env.ADMIN_API_KEY || "staging-admin-secret-key-2026";

    const isAuthorizedByEmail = Boolean(userEmail && adminEmails.includes(userEmail));
    const isAuthorizedByKey = Boolean(adminKey && adminKey === expectedKey);

    if (!isAuthorizedByEmail && !isAuthorizedByKey) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Administrative privileges are required to perform editorial approvals and question bank mutations."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

