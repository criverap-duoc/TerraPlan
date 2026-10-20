import { assessWeather } from './assess-weather.domain';
import type { ForecastPoint } from './ports/weather-provider.interface';
import type { WeatherThresholds } from './ports/weather-thresholds.interface';

const THRESHOLDS: WeatherThresholds = {
  maxPrecipitationMmH: 5,
  minFlowM3s: 0.1,
  maxFlowM3s: 100,
};

const STARTS_AT = new Date('2026-11-01T10:00:00Z');
const ENDS_AT = new Date('2026-11-01T12:00:00Z');
const WINDOW = { id: 'window-1', startsAt: STARTS_AT, endsAt: ENDS_AT };

function forecastWith(precipitationMmH: number, at = STARTS_AT): ForecastPoint[] {
  return [{ at, precipitationMmH, temperatureC: 15 }];
}

describe('assessWeather', () => {
  it('flags precipitation above the threshold', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: forecastWith(12),
      flow: { at: STARTS_AT, flowM3s: 4.5 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(false);
    expect(assessment.reason).toBe('precipitation_exceeded');
    expect(assessment.precipitationMmH).toBe(12);
  });

  it('flags a flow below the minimum', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: forecastWith(0.2),
      flow: { at: STARTS_AT, flowM3s: 0.05 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(false);
    expect(assessment.reason).toBe('flow_too_low');
  });

  it('flags a flow above the maximum', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: forecastWith(0.2),
      flow: { at: STARTS_AT, flowM3s: 150 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(false);
    expect(assessment.reason).toBe('flow_too_high');
  });

  it('returns a feasible assessment when rain and flow are within range', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: forecastWith(1.5),
      flow: { at: STARTS_AT, flowM3s: 4.7 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(true);
    expect(assessment.reason).toBeUndefined();
    expect(assessment.windowId).toBe('window-1');
    expect(assessment.windowStart).toEqual(STARTS_AT);
    expect(assessment.windowEnd).toEqual(ENDS_AT);
  });

  it('reports precipitation first when rain and flow both fail', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: forecastWith(12),
      flow: { at: STARTS_AT, flowM3s: 0.05 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.reason).toBe('precipitation_exceeded');
  });

  it('treats an empty forecast as no precipitation', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: [],
      flow: { at: STARTS_AT, flowM3s: 4.7 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(true);
    expect(assessment.precipitationMmH).toBe(0);
  });

  it('ignores forecast points outside the window', () => {
    const assessment = assessWeather({
      window: WINDOW,
      forecast: [
        { at: new Date('2026-11-01T09:00:00Z'), precipitationMmH: 12, temperatureC: 15 },
        { at: new Date('2026-11-01T11:00:00Z'), precipitationMmH: 1, temperatureC: 15 },
      ],
      flow: { at: STARTS_AT, flowM3s: 4.7 },
      thresholds: THRESHOLDS,
    });

    expect(assessment.isFeasible).toBe(true);
    expect(assessment.precipitationMmH).toBe(1);
  });
});
