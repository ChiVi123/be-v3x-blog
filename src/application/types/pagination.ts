export type PaginationQuery<T = Record<string, unknown>> = {
  query?: string;
  page: number;
  limit: number;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
};
