import { randomUUID } from "crypto";

import type { NextFunction, Request, Response } from "express";

const HEADER = "x-request-id";

/**
 * Attaches a request-scoped ID to `req.id` and echoes it in `X-Request-Id`.
 *
 * Honors an inbound `X-Request-Id` if a trusted upstream (proxy/gateway) set
 * one; otherwise generates a UUID. Runs first in the middleware chain so every
 * log line and error response can be correlated.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header(HEADER);
  req.id = inbound && inbound.length <= 128 ? inbound : randomUUID();
  res.setHeader(HEADER, req.id);
  next();
}