import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error';
import type {
  ForecastPoint,
  ForecastRange,
  SiteRef,
  WeatherProvider,
} from '../ports/weather-provider.interface';

const REQUEST_TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 2;

interface OpenMeteoHourly {
  time?: string[];
  precipitation?: number[];
  temperature_2m?: (number | null)[];
}

interface OpenMeteoResponse {
  hourly?: OpenMeteoHourly;
}

/**
 * Real provider hitting the Open-Meteo public API. No API key required. Retries once with a
 * 500ms backoff before failing with UPSTREAM_UNAVAILABLE.
 */
@Injectable()
export class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly logger = new Logger(OpenMeteoWeatherProvider.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('OPEN_METEO_BASE_URL').replace(/\/+$/, '');
  }

  async getForecast(site: SiteRef, range: ForecastRange): Promise<ForecastPoint[]> {
    const payload = await this.fetchWithRetry(this.buildUrl(site, range));

    return this.toForecastPoints(payload, range);
  }

  private buildUrl(site: SiteRef, range: ForecastRange): string {
    const url = new URL(`${this.baseUrl}/forecast`);

    url.searchParams.set('latitude', String(site.latitude));
    url.searchParams.set('longitude', String(site.longitude));
    url.searchParams.set('hourly', 'precipitation,temperature_2m');
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('start_date', toIsoDate(range.start));
    url.searchParams.set('end_date', toIsoDate(range.end));

    return url.toString();
  }

  private async fetchWithRetry(url: string): Promise<OpenMeteoResponse> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.fetchOnce(url);
      } catch (error) {
        lastError = error;

        if (attempt === MAX_ATTEMPTS) {
          break;
        }

        await delay(RETRY_DELAY_MS);
      }
    }

    // The original error distinguishes HTTP 4xx/5xx from timeouts and DNS failures in the logs.
    this.logger.error(
      { err: lastError, cause: errorCause(lastError), url },
      'Open-Meteo request failed after retry',
    );

    throw new UpstreamUnavailableError(
      'No fue posible obtener el pronóstico del clima. Intenta nuevamente en unos minutos.',
      { cause: lastError },
    );
  }

  private async fetchOnce(url: string): Promise<OpenMeteoResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new UpstreamUnavailableError(`Open-Meteo respondió ${response.status}.`);
      }

      return (await response.json()) as OpenMeteoResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private toForecastPoints(payload: OpenMeteoResponse, range: ForecastRange): ForecastPoint[] {
    const hourly = payload.hourly;

    if (!hourly?.time || !hourly.precipitation) {
      throw new UpstreamUnavailableError('Open-Meteo devolvió una respuesta inesperada.');
    }

    const points: ForecastPoint[] = [];

    for (let index = 0; index < hourly.time.length; index += 1) {
      const time = hourly.time[index];
      const precipitationMmH = hourly.precipitation[index];

      if (time === undefined || precipitationMmH === undefined) {
        continue;
      }

      const at = parseHourlyUtc(time);

      if (at === null || at < range.start || at > range.end) {
        continue;
      }

      const temperatureC = hourly.temperature_2m?.[index] ?? null;

      points.push({
        at,
        precipitationMmH,
        temperatureC: typeof temperatureC === 'number' ? temperatureC : null,
      });
    }

    return points;
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Open-Meteo returns zone-less local times, and the request pins timezone=UTC.
function parseHourlyUtc(value: string): Date | null {
  const at = new Date(value.endsWith('Z') ? value : `${value}Z`);

  return Number.isNaN(at.getTime()) ? null : at;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorCause(error: unknown): unknown {
  return error instanceof Error ? error.cause : undefined;
}
