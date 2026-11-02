import type { NextFunction, Request, Response } from "express";

/**
 * Structured access log.
 *
 * Logs AFTER the response has been sent so `res.statusCode` is final.
 * Redaction rules (Firebase tokens, OTPs, KYC) are enforced by the logger in
 * Phase 8; here we deliberately log only method/path/status/duration, which
 * never contains sensitive data.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: "info",
        type: "http",
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      }),
    );
  });

  next();
}