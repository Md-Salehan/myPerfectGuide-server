import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN", details?: unknown) {
    super(message, code, HttpStatus.FORBIDDEN, true, details);
  }
}