import type { NextFunction, Request, Response } from "express";

import { isProduction } from "@/config/env";
import { HttpStatus } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { ApiErrorBody } from "@/shared/responses/api-response";

/**
 * 404 fallback for unmatched routes.
 *
 * Mounted AFTER all routers, BEFORE the error handler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  };
  res.status(HttpStatus.NOT_FOUND).json(body);
}

/**
 * Centralized error handler.
 *
 * Normalizes any thrown value into the standard error envelope:
 *   { success: false, error: { code, message, details? } }
 *
 * Operational `AppError`s pass through unchanged; unknown errors are mapped to
 * `INTERNAL_ERROR` and redacted in production so stack traces, Prisma errors,
 * and Firebase internals never leak. Non-production responses include `details`
 * (useful for field-level validation debugging).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isKnown = err instanceof AppError;
  const statusCode = isKnown ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
  const code = isKnown ? err.code : "INTERNAL_ERROR";
  const message = isKnown
    ? err.message
    : isProduction
      ? "An unexpected error occurred"
      : (err as Error)?.message ?? "Unknown error";

  // Log the raw error server-side (with request ID for correlation). Logging
  // strategy (Pino) arrives in Phase 8; until then we emit a structured line
  // so production observability isn't blocked.
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: "error",
      type: "exception",
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      code,
      message: (err as Error)?.message ?? String(err),
      stack: !isProduction ? (err as Error)?.stack : undefined,
    }),
  );

  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (!isProduction && isKnown && err.details !== undefined) {
    body.error.details = err.details;
  }

  // Guard against double-send if headers already went out (e.g., streaming).
  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json(body);
}