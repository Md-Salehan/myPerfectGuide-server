import type { NextFunction, Request, Response } from "express";

import type { StaffRole } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

/**
 * Role-based authorization for STAFF routes.
 *
 * A STUDENT principal never satisfies `authorize` — students have no staff
 * role. Use `requireStudent` for student-only routes.
 *
 * Usage:
 *   router.post("/courses", authenticate, authorize("ADMIN", "INSTRUCTOR"), create)
 *
 * Assumes `authenticate` ran first. Fails closed with 401 if not.
 */
export function authorize(...roles: StaffRole[]) {
  if (roles.length === 0) {
    throw new Error("authorize() requires at least one role");
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new UnauthorizedError("Authentication required", "AUTH_REQUIRED"),
      );
    }

    if (req.user.kind !== "STAFF") {
      return next(
        new ForbiddenError(
          "This action requires a staff account",
          "STAFF_ONLY",
        ),
      );
    }

    if (!roles.includes(req.user.staff.role)) {
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

export const requireRole = authorize;

/**
 * Guard for student-only routes (enrollments, orders, dashboard, ...).
 *
 * Assumes `authenticate` ran first. A STAFF principal is rejected with 403.
 */
export function requireStudent() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new UnauthorizedError("Authentication required", "AUTH_REQUIRED"),
      );
    }
    if (req.user.kind !== "STUDENT") {
      return next(
        new ForbiddenError(
          "This action requires a student account",
          "STUDENT_ONLY",
        ),
      );
    }
    next();
  };
}