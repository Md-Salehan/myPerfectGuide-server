/**
 * Auth module has no request body/query/route params to validate — the only
 * input is the `Authorization: Bearer <token>` header, validated by
 * `authenticate`. This file exists for structural parity with other modules
 * and to hold future auth-specific schemas (e.g., token refresh).
 */
export {};