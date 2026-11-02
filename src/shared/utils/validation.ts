import { z, type ZodTypeAny } from "zod";

import { ValidationError } from "@/shared/errors/validation-error";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "@/shared/types/pagination";

/**
 * Canonical validation-error `details` shape returned to clients.
 */
export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Parse input with a Zod schema, throwing a `ValidationError` on failure.
 *
 * Use this in controllers/middleware so every invalid input maps to the same
 * 422 envelope. Later phases call `parseOrThrow(schema, req.body)` etc.
 */
export function parseOrThrow<T extends ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    throw new ValidationError("Validation failed", issues);
  }
  return result.data;
}

/**
 * Reusable pagination query schema.
 *
 * Pages are 1-indexed; `limit` is clamped to `MAX_LIMIT`. Every list endpoint
 * that supports pagination must merge this into its own query schema so
 * pagination validation is defined exactly once.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;