import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", code = "CONFLICT", details?: unknown) {
    super(message, code, HttpStatus.CONFLICT, true, details);
  }
}