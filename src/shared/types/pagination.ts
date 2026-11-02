/**
 * Query parameters accepted by list endpoints.
 *
 * Kept intentionally minimal (page/limit). Sort/filter parameters will be
 * added per-endpoint in later phases as validated Zod schemas.
 */
export interface PaginationQuery {
  page: number;
  limit: number;
}

/**
 * Metadata returned alongside paginated lists.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;