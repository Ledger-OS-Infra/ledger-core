export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function resolvePagination(input: PaginationInput): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = input.page;
  const limit = input.limit;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
