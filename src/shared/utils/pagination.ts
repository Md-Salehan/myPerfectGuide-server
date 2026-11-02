import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  type PaginationMeta,
  type PaginationQuery,
} from "@/shared/types/pagination";

/**
 * Build pagination metadata from a total row count.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return { page, limit, total, totalPages };
}

/**
 * Convert `PaginationMeta` to Prisma's `skip`/`take` arguments.
 *
 * Note: clamping to MAX_LIMIT is enforced by Zod schemas in each module;
 * this helper assumes `limit` is already validated.
 */
export function toPrismaPagination(pagination: PaginationQuery): {
  skip: number;
  take: number;
} {
  return {
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  };
}

/**
 * Parse pagination query params defensively.
 *
 * Modules SHOULD use their Zod query schema (`paginationQuerySchema`) rather
 * than this helper — it exists for internal calls and seed scripts.
 */
export function parsePaginationQuery(raw: {
  page?: unknown;
  limit?: unknown;
}): PaginationQuery {
  const page = parsePositiveInt(raw.page, DEFAULT_PAGE);
  const rawLimit = parsePositiveInt(raw.limit, DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  return { page, limit };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}