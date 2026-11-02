import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND", details?: unknown) {
    super(message, code, HttpStatus.NOT_FOUND, true, details);
  }
}