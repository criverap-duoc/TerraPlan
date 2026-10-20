import type { FlowReading } from './ports/flow-provider.interface';
import type { ForecastPoint } from './ports/weather-provider.interface';
import type { WeatherThresholds } from './ports/weather-thresholds.interface';

export type WeatherBlockReason = 'precipitation_exceeded' | 'flow_too_low' | 'flow_too_high';

export interface WeatherAssessment {
  windowId?: string;
  windowStart: Date;
  windowEnd: Date;
  isFeasible: boolean;
  precipitationMmH: number;
  flowM3s: number;
  reason?: WeatherBlockReason;
}

export interface AssessWeatherInput {
  window: { id?: string; startsAt: Date; endsAt: Date };
  forecast: ForecastPoint[];
  flow: FlowReading;
  thresholds: WeatherThresholds;
}

export function assessWeather(input: AssessWeatherInput): WeatherAssessment {
  const { window, forecast, flow, thresholds } = input;
  const precipitationMmH = maxPrecipitationInWindow(forecast, window.startsAt, window.endsAt);
  const flowM3s = flow.flowM3s;
  const reason = resolveReason(precipitationMmH, flowM3s, thresholds);

  return {
    ...(window.id === undefined ? {} : { windowId: window.id }),
    windowStart: window.startsAt,
    windowEnd: window.endsAt,
    isFeasible: reason === undefined,
    precipitationMmH,
    flowM3s,
    ...(reason === undefined ? {} : { reason }),
  };
}

// Points outside the window are ignored; an empty forecast means "no rain expected".
function maxPrecipitationInWindow(
  forecast: ForecastPoint[],
  startsAt: Date,
  endsAt: Date,
): number {
  let maximum = 0;

  for (const point of forecast) {
    if (point.at < startsAt || point.at > endsAt) {
      continue;
    }

    if (point.precipitationMmH > maximum) {
      maximum = point.precipitationMmH;
    }
  }

  return maximum;
}

// Priority order: rain blocks first, then an abnormally low flow, then an abnormally high one.
function resolveReason(
  precipitationMmH: number,
  flowM3s: number,
  thresholds: WeatherThresholds,
): WeatherBlockReason | undefined {
  if (precipitationMmH > thresholds.maxPrecipitationMmH) {
    return 'precipitation_exceeded';
  }

  if (flowM3s < thresholds.minFlowM3s) {
    return 'flow_too_low';
  }

  if (flowM3s > thresholds.maxFlowM3s) {
    return 'flow_too_high';
  }

  return undefined;
}
