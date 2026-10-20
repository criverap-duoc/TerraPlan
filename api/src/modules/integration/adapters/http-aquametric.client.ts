import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error';
import type {
  AquaMetricClient,
  AquaMetricPublishPayload,
  AquaMetricPublishResult,
} from '../ports/aquametric-client.interface';

const REQUEST_TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 2;
const INGEST_PATH = '/api/v1/ingest/observations';

/**
 * Publisher for the sibling AquaMetric project (FastAPI). Retries once on 5xx and timeouts;
 * 4xx responses are returned to the caller because retrying them would never succeed.
 */
@Injectable()
export class HttpAquaMetricClient implements AquaMetricClient {
  private readonly logger = new Logger(HttpAquaMetricClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('AQUAMETRIC_URL').replace(/\/+$/, '');
    this.apiKey = configService.getOrThrow<string>('AQUAMETRIC_API_KEY');
  }

  async publish(
    payload: AquaMetricPublishPayload,
    idempotencyKey: string,
  ): Promise<AquaMetricPublishResult> {
    const url = `${this.baseUrl}${INGEST_PATH}`;
    let lastError: unknown;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await this.send(url, payload, idempotencyKey);

        if (result.statusCode < 500) {
          return result;
        }

        lastStatusCode = result.statusCode;
        lastError = new UpstreamUnavailableError(`AquaMetric respondió ${result.statusCode}.`);
      } catch (error) {
        lastError = error;
      }

      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
      }
    }

    // The original error distinguishes timeouts from HTTP 5xx in the logs.
    this.logger.error(
      {
        err: lastError,
        cause: lastError instanceof Error ? lastError.cause : undefined,
        statusCode: lastStatusCode,
        url,
      },
      'AquaMetric publish failed',
    );

    throw new UpstreamUnavailableError(
      'No fue posible publicar las observaciones en AquaMetric. Intenta nuevamente en unos minutos.',
      { cause: lastError },
    );
  }

  private async send(
    url: string,
    payload: AquaMetricPublishPayload,
    idempotencyKey: string,
  ): Promise<AquaMetricPublishResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();

      return { statusCode: response.status, responseBody: parseBody(text) };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseBody(text: string): unknown {
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
