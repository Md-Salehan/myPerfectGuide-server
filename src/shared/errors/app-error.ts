import { HttpStatus } from "@/shared/constants/http-status";

/**
 * Base class for all expected application errors.
 *
 * `isOperational = true` indicates the error is anticipated (validation,
 * authorization, not found, conflict, ...) and safe to expose to the client.
 * The global error handler treats non-operational errors as 500s and
 * redacts their message in production.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Preserve the prototype chain when transpiled to ES5-style classes.
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8 only).
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}