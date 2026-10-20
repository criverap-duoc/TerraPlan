import type { WeatherThresholds } from './ports/weather-thresholds.interface';

// Global MVP thresholds; per-site configuration is deferred (R12) until the catalog carries it.
export const DEFAULT_THRESHOLDS: WeatherThresholds = {
  maxPrecipitationMmH: 5,
  minFlowM3s: 0.1,
  maxFlowM3s: 100,
};
