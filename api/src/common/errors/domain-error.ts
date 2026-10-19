// Domain failures carry a stable code and HTTP status so the global filter never guesses.
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
