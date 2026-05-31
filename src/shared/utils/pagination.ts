import type { PaginatedResponse } from '@shared/types/api.types';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export const parsePagination = (
  query: Record<string, unknown>,
  defaults: PaginationOptions = { page: 1, limit: 10 },
): PaginationOptions => {
  const page = Math.max(1, Number(query['page']) || defaults.page);
  const limit = Math.min(100, Math.max(1, Number(query['limit']) || defaults.limit));
  return { page, limit };
};

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  { page, limit }: PaginationOptions,
): Omit<PaginatedResponse<T>, 'success'> => ({
  data,
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    limit,
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  },
});

export const getSkip = ({ page, limit }: PaginationOptions): number => (page - 1) * limit;
