export interface LabOpenHours {
  openHour: number; // 0-23, local to `timeZone`
  closeHour: number; // 0-23, exclusive
  weekdaysOnly: boolean;
  timeZone: string; // IANA zone, e.g. "America/Santiago"
}

export interface FeasibleWindowsInput {
  earliestStart: Date;
  latestEnd: Date;
  slotMinutes: number;
  transportMinutes: number;
  labOpenHours: LabOpenHours;
  minHoldingTimeHours: number; // Infinity when every parameter is measured in situ
}

export type InfeasibilityReason = 'lab_closed' | 'holding_exceeded';

export interface FeasibleWindow {
  samplingStart: Date;
  samplingEnd: Date;
  arrivalAtLab: Date;
  analysisStart: Date;
  holdingDeadline: Date;
  isFeasible: boolean;
  infeasibilityReason?: InfeasibilityReason;
}

// A month of 30-minute slots would return ~1440 windows; the UI never needs that many.
export const MAX_FEASIBLE_WINDOWS = 100;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MAX_DATE_MS = 8_640_000_000_000_000;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKEND = [0, 6];

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = WEEKDAY_INDEX[read('weekday')];

  if (weekday === undefined) {
    throw new Error(`Unsupported weekday returned by Intl: ${read('weekday')}`);
  }

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
    second: Number(read('second')),
    weekday,
  };
}

// Difference between the zone's wall clock and UTC at a given instant, in milliseconds.
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const wallClockMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return wallClockMs - (date.getTime() - date.getUTCMilliseconds());
}

function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const wallClockMs = Date.UTC(year, month - 1, day, hour, 0, 0);
  // Offsets move with DST, so the offset is resolved twice: the first guess can fall on the
  // other side of a transition.
  const firstGuess = new Date(wallClockMs - zoneOffsetMs(new Date(wallClockMs), timeZone));

  return new Date(wallClockMs - zoneOffsetMs(firstGuess, timeZone));
}

function nextLabOpen(date: Date, hours: LabOpenHours): Date {
  const parts = zonedParts(date, hours.timeZone);
  const isOpenDay = !hours.weekdaysOnly || !WEEKEND.includes(parts.weekday);

  if (isOpenDay && parts.hour >= hours.openHour && parts.hour < hours.closeHour) {
    return date;
  }

  const daysAhead = !isOpenDay || parts.hour >= hours.closeHour ? 1 : 0;
  const candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + daysAhead, hours.openHour, 0, 0),
  );

  if (hours.weekdaysOnly) {
    while (WEEKEND.includes(candidate.getUTCDay())) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
  }

  return wallClockToUtc(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth() + 1,
    candidate.getUTCDate(),
    hours.openHour,
    hours.timeZone,
  );
}

/**
 * Splits `[earliestStart, latestEnd)` into consecutive `slotMinutes` slots and evaluates whether
 * the sample would reach the lab before `minHoldingTimeHours` expires. The last slot must end at or
 * before `latestEnd`; incomplete slots are dropped.
 *
 * Returns at most {@link MAX_FEASIBLE_WINDOWS} windows (earliest first) so a month-long range cannot
 * produce a huge payload.
 *
 * An infeasible window always reports `holding_exceeded`: the brief gives it precedence when both
 * causes apply, because a lab-closed delay only matters once it pushes analysis past the deadline.
 * `lab_closed` stays in the contract for the per-window detail the UI shows in R7.
 */
export function computeFeasibleWindows(input: FeasibleWindowsInput): FeasibleWindow[] {
  const firstStartMs = input.earliestStart.getTime();
  const rangeEndMs = input.latestEnd.getTime();
  const slotMs = input.slotMinutes * MS_PER_MINUTE;
  const transportMs = input.transportMinutes * MS_PER_MINUTE;
  const holdingMs = input.minHoldingTimeHours * MS_PER_HOUR;
  const windows: FeasibleWindow[] = [];

  if (slotMs <= 0 || firstStartMs >= rangeEndMs) {
    return windows;
  }

  for (
    let startMs = firstStartMs;
    startMs + slotMs <= rangeEndMs && windows.length < MAX_FEASIBLE_WINDOWS;
    startMs += slotMs
  ) {
    const samplingStart = new Date(startMs);
    const samplingEnd = new Date(startMs + slotMs);
    const arrivalAtLab = new Date(samplingEnd.getTime() + transportMs);
    const analysisStart = new Date(
      Math.max(arrivalAtLab.getTime(), nextLabOpen(arrivalAtLab, input.labOpenHours).getTime()),
    );
    const holdingDeadline = Number.isFinite(input.minHoldingTimeHours)
      ? new Date(samplingEnd.getTime() + holdingMs)
      : new Date(MAX_DATE_MS);
    const isFeasible = analysisStart.getTime() <= holdingDeadline.getTime();

    windows.push({
      samplingStart,
      samplingEnd,
      arrivalAtLab,
      analysisStart,
      holdingDeadline,
      isFeasible,
      ...(isFeasible ? {} : { infeasibilityReason: 'holding_exceeded' as const }),
    });
  }

  return windows;
}
