import rateLimit from "express-rate-limit";

import { HttpStatus } from "@/shared/constants/http-status";

/**
 * Global API rate limiter.
 *
 * In-memory store — sufficient for a single-instance deployment and
 * deliberately avoids introducing Redis in the first version. If/when the API
 * scales horizontally, swap the store to a Redis-backed one (one-file change).
 *
 * The response body matches the standard error envelope so clients don't need
 * a special case for 429.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300, // 300 requests per IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later.",
      },
    });
  },
});