import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error';
import type { AquaMetricPublishPayload } from '../ports/aquametric-client.interface';
import { HttpAquaMetricClient } from './http-aquametric.client';

const BASE_URL = 'https://aquametric.test';
const INGEST_URL = `${BASE_URL}/api/v1/ingest/observations`;

const PAYLOAD: AquaMetricPublishPayload = {
  catalogVersion: '1.0.0',
  site: {
    id: '0f4e2f8a-6f43-4f0e-9a5b-1c2d3e4f5a6b',
    code: 'RIO-MAIPO-01',
    name: 'Río Maipo en Puente Maipo',
    waterBodyType: 'river',
    latitude: -33.61,
    longitude: -70.58,
    isActive: true,
  },
  samples: [],
  observations: [],
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HttpAquaMetricClient', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'AQUAMETRIC_URL') {
        return `${BASE_URL}/`;
      }

      if (key === 'AQUAMETRIC_API_KEY') {
        return 'test-api-key';
      }

      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService;

  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let client: HttpAquaMetricClient;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    client = new HttpAquaMetricClient(configService);
  });

  it('posts to the ingest endpoint with api key and idempotency headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }, 200));

    const result = await client.publish(PAYLOAD, 'idem-key');

    expect(result).toEqual({ statusCode: 200, responseBody: { accepted: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      INGEST_URL,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
          'Idempotency-Key': 'idem-key',
        },
        body: JSON.stringify(PAYLOAD),
      }),
    );
  });

  it('retries once on 5xx and fails with UpstreamUnavailableError', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'boom' }, 500))
      .mockResolvedValueOnce(jsonResponse({ detail: 'boom' }, 500));

    await expect(client.publish(PAYLOAD, 'idem-key')).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('recovers when the retry succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'boom' }, 503))
      .mockResolvedValueOnce(jsonResponse({ accepted: 1 }, 201));

    const result = await client.publish(PAYLOAD, 'idem-key');

    expect(result).toEqual({ statusCode: 201, responseBody: { accepted: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx and returns the response to the caller', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'invalid payload' }, 422));

    const result = await client.publish(PAYLOAD, 'idem-key');

    expect(result).toEqual({ statusCode: 422, responseBody: { detail: 'invalid payload' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a timeout as an unavailable upstream', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(client.publish(PAYLOAD, 'idem-key')).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
