import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED", details?: unknown) {
    super(message, code, HttpStatus.UNAUTHORIZED, true, details);
  }
}