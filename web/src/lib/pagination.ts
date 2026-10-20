export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const DEFAULT_PAGE_SIZE = 25;

export function pageRangeLabel(meta: PaginationMeta): string {
  if (meta.total === 0) {
    return '0 resultados';
  }
  const first = (meta.page - 1) * meta.pageSize + 1;
  const last = Math.min(meta.page * meta.pageSize, meta.total);
  return `Mostrando ${first}–${last} de ${meta.total}`;
}

export function totalPages(meta: PaginationMeta): number {
  return Math.max(1, Math.ceil(meta.total / meta.pageSize));
}
