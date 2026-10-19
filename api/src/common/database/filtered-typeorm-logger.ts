import { SimpleConsoleLogger, type Logger as TypeOrmLogger } from 'typeorm';

// A booking conflict is an expected 409, not a system failure: keep it out of the error log.
const EXPECTED_CONFLICT_MARKERS = ['23P01', 'exclusion_violation', 'no_double_booking'];

function isExpectedConflict(error: string | Error): boolean {
  const message = typeof error === 'string' ? error : error.message;

  return EXPECTED_CONFLICT_MARKERS.some((marker) => message.includes(marker));
}

export class FilteredTypeOrmLogger implements TypeOrmLogger {
  private readonly inner = new SimpleConsoleLogger(['error', 'warn']);

  logQuery(query: string, parameters?: unknown[]): void {
    this.inner.logQuery(query, parameters);
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
    if (isExpectedConflict(error)) {
      return;
    }

    this.inner.logQueryError(typeof error === 'string' ? error : error.message, query, parameters);
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    this.inner.logQuerySlow(time, query, parameters);
  }

  logSchemaBuild(message: string): void {
    this.inner.logSchemaBuild(message);
  }

  logMigration(message: string): void {
    this.inner.logMigration(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    this.inner.log(level, message);
  }
}
