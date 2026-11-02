import { AppError } from "@/shared/errors/app-error";
import { HttpStatus } from "@/shared/constants/http-status";

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    super(message, code, HttpStatus.BAD_REQUEST, true, details);
  }
}