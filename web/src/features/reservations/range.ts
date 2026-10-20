export interface BookingRange {
  startsAt: Date;
  endsAt: Date;
}

function toInstant(raw: string): Date {
  // PostgreSQL renders timestamptz as `2026-11-15 13:00:00+00`, which is not strict ISO-8601.
  const normalized = raw
    .trim()
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(normalized);
}

/** Parses the `tstzrange` text form the API returns into usable instants. */
export function parseBookingRange(during: string): BookingRange | null {
  const match = /^[[(]"([^"]+)"\s*,\s*"([^"]+)"[\])]$/.exec(during.trim());
  if (!match) {
    return null;
  }

  const startsAt = toInstant(match[1]);
  const endsAt = toInstant(match[2]);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }
  return { startsAt, endsAt };
}
