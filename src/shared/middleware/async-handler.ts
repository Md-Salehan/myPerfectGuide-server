import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async Express handler so rejected promises are forwarded to the
 * global error handler via `next(err)`.
 *
 * All controllers in later phases MUST be wrapped with this helper; it is the
 * single mechanism that lets `AppError` subclasses bubble to the centralized
 * error handler.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}