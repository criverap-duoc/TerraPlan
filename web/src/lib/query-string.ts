export type QueryValue = string | number | boolean | undefined | null;

/** Builds an `?a=1&b=2` suffix, skipping empty values so filters stay optional. */
export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}
