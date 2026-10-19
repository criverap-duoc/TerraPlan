/**
 * Detects PostgreSQL unique_violation (SQLSTATE 23505) without leaking driver types
 * into services. TypeORM wraps the original error in `driverError`.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const driverError = (error as { driverError?: unknown }).driverError;
  const candidate = typeof driverError === 'object' && driverError !== null ? driverError : error;

  return (candidate as { code?: unknown }).code === '23505';
}
