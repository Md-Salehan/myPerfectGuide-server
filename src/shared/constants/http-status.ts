/**
 * Named HTTP status codes used across the codebase.
 *
 * Keeping these centralized avoids magic numbers in errors/controllers and
 * makes the API contract reviewable in one place.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];