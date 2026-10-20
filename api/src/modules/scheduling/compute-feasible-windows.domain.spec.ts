import {
  computeFeasibleWindows,
  MAX_FEASIBLE_WINDOWS,
  type FeasibleWindowsInput,
  type LabOpenHours,
} from './compute-feasible-windows.domain';

// November 2026: America/Santiago is UTC-3 (DST), so local wall clock + 3 h = UTC.
function santiago(localIso: string): Date {
  return new Date(`${localIso}-03:00`);
}

const LAB: LabOpenHours = {
  openHour: 8,
  closeHour: 18,
  weekdaysOnly: true,
  timeZone: 'America/Santiago',
};

function input(overrides: Partial<FeasibleWindowsInput>): FeasibleWindowsInput {
  return {
    earliestStart: santiago('2026-11-16T08:00:00'),
    latestEnd: santiago('2026-11-16T18:00:00'),
    slotMinutes: 120,
    transportMinutes: 0,
    labOpenHours: LAB,
    minHoldingTimeHours: 24,
    ...overrides,
  };
}

describe('computeFeasibleWindows', () => {
  it('keeps a window whose analysis starts before the holding deadline', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T13:00:00'),
        latestEnd: santiago('2026-11-16T15:00:00'),
        transportMinutes: 90,
        minHoldingTimeHours: 24,
      }),
    );

    expect(window.samplingStart).toEqual(santiago('2026-11-16T13:00:00'));
    expect(window.samplingEnd).toEqual(santiago('2026-11-16T15:00:00'));
    expect(window.arrivalAtLab).toEqual(santiago('2026-11-16T16:30:00'));
    expect(window.analysisStart).toEqual(santiago('2026-11-16T16:30:00'));
    expect(window.holdingDeadline).toEqual(santiago('2026-11-17T15:00:00'));
    expect(window.isFeasible).toBe(true);
    expect(window.infeasibilityReason).toBeUndefined();
  });

  it('reports holding_exceeded when the lab opens after the deadline', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T17:00:00'),
        latestEnd: santiago('2026-11-16T19:00:00'),
        transportMinutes: 60,
        minHoldingTimeHours: 4,
      }),
    );

    expect(window.arrivalAtLab).toEqual(santiago('2026-11-16T20:00:00'));
    expect(window.analysisStart).toEqual(santiago('2026-11-17T08:00:00'));
    expect(window.holdingDeadline).toEqual(santiago('2026-11-16T23:00:00'));
    expect(window.isFeasible).toBe(false);
    expect(window.infeasibilityReason).toBe('holding_exceeded');
  });

  it('marks every window feasible when the holding time is infinite', () => {
    const windows = computeFeasibleWindows(input({ minHoldingTimeHours: Infinity }));

    expect(windows).toHaveLength(5);
    expect(windows.every((window) => window.isFeasible)).toBe(true);
    expect(windows.every((window) => window.infeasibilityReason === undefined)).toBe(true);
  });

  it('pushes a Friday evening arrival to Monday and misses the weekend deadline', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-20T17:00:00'),
        latestEnd: santiago('2026-11-20T18:00:00'),
        slotMinutes: 60,
        transportMinutes: 120,
        minHoldingTimeHours: 48,
      }),
    );

    expect(window.analysisStart).toEqual(santiago('2026-11-23T08:00:00'));
    expect(window.holdingDeadline).toEqual(santiago('2026-11-22T18:00:00'));
    expect(window.isFeasible).toBe(false);
  });

  it('rejects a midnight slot even when the deadline is after the next opening', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T22:00:00'),
        latestEnd: santiago('2026-11-16T23:00:00'),
        slotMinutes: 60,
        transportMinutes: 0,
        minHoldingTimeHours: 12,
      }),
    );

    expect(window.analysisStart).toEqual(santiago('2026-11-17T08:00:00'));
    expect(window.holdingDeadline).toEqual(santiago('2026-11-17T11:00:00'));
    expect(window.isFeasible).toBe(false);
    expect(window.infeasibilityReason).toBe('outside_lab_hours');
  });

  it('rejects a Saturday slot when the lab only opens on weekdays', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-21T10:00:00'),
        latestEnd: santiago('2026-11-21T12:00:00'),
        slotMinutes: 120,
        minHoldingTimeHours: 24,
      }),
    );

    expect(window.isFeasible).toBe(false);
    expect(window.infeasibilityReason).toBe('outside_lab_hours');
  });

  it('rejects a weekday slot that starts before the lab opens', () => {
    const [window] = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T03:00:00'),
        latestEnd: santiago('2026-11-16T05:00:00'),
        slotMinutes: 120,
        minHoldingTimeHours: 24,
      }),
    );

    expect(window.isFeasible).toBe(false);
    expect(window.infeasibilityReason).toBe('outside_lab_hours');
  });

  it('splits the range into consecutive slots', () => {
    const windows = computeFeasibleWindows(input({}));

    expect(windows).toHaveLength(5);
    expect(windows.map((window) => window.samplingStart)).toEqual([
      santiago('2026-11-16T08:00:00'),
      santiago('2026-11-16T10:00:00'),
      santiago('2026-11-16T12:00:00'),
      santiago('2026-11-16T14:00:00'),
      santiago('2026-11-16T16:00:00'),
    ]);
    expect(windows[4].samplingEnd).toEqual(santiago('2026-11-16T18:00:00'));
  });

  it('drops a trailing slot that does not fit in the range', () => {
    const windows = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T08:00:00'),
        latestEnd: santiago('2026-11-16T13:00:00'),
      }),
    );

    expect(windows).toHaveLength(2);
  });

  it('returns an empty array when the range is empty', () => {
    expect(
      computeFeasibleWindows(
        input({
          earliestStart: santiago('2026-11-16T18:00:00'),
          latestEnd: santiago('2026-11-16T18:00:00'),
        }),
      ),
    ).toEqual([]);

    expect(
      computeFeasibleWindows(
        input({
          earliestStart: santiago('2026-11-17T08:00:00'),
          latestEnd: santiago('2026-11-16T08:00:00'),
        }),
      ),
    ).toEqual([]);
  });

  it('limits huge ranges to the first 100 windows', () => {
    const windows = computeFeasibleWindows(
      input({
        earliestStart: santiago('2026-11-16T00:00:00'),
        latestEnd: santiago('2026-12-16T00:00:00'),
        slotMinutes: 30,
      }),
    );

    expect(windows).toHaveLength(MAX_FEASIBLE_WINDOWS);
    expect(windows[0].samplingStart).toEqual(santiago('2026-11-16T00:00:00'));
    expect(windows[MAX_FEASIBLE_WINDOWS - 1].samplingStart).toEqual(
      new Date(santiago('2026-11-16T00:00:00').getTime() + 99 * 30 * 60_000),
    );
  });
});
