import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

/**
 * Role-based authorization middleware factory.
 *
 * Usage (Phase 6+):
 *   router.post("/", authenticate, authorize(UserRole.ADMIN, UserRole.INSTRUCTOR), create)
 *
 * Assumes `authenticate` ran first (`req.user` is set). If not, it fails
 * closed with 401 — a route misconfiguration is never a silent bypass.
 */
export function authorize(...roles: UserRole[]) {
  if (roles.length === 0) {
    throw new Error("authorize() requires at least one role");
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new UnauthorizedError("Authentication required", "AUTH_REQUIRED"),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          "You do not have permission to perform this action",
          "INSUFFICIENT_ROLE",
        ),
      );
    }

    next();
  };
}

/**
 * Alias for `authorize`, used where the intent reads more clearly.
 * Example: `requireRole(UserRole.ADMIN)`.
 */
export const requireRole = authorize;