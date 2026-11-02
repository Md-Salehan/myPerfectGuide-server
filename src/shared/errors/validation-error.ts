import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

/**
 * Field-level validation error.
 *
 * `details` is typically `{ field: string, message: string }[]` (see
 * `shared/utils/validation.ts` added in Phase 3, which maps Zod issues to
 * this shape).
 */
export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    details?: unknown,
    code = "VALIDATION_ERROR",
  ) {
    super(message, code, HttpStatus.UNPROCESSABLE_ENTITY, true, details);
  }
}