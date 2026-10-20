import type { ConfigService } from '@nestjs/config';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error';
import type { ForecastRange, SiteRef } from '../ports/weather-provider.interface';
import { OpenMeteoWeatherProvider } from './open-meteo-weather.provider';

const SITE: SiteRef = {
  id: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d',
  code: 'RIO-MAIPO-01',
  latitude: -33.61,
  longitude: -70.58,
};

const RANGE: ForecastRange = {
  start: new Date('2026-11-01T10:00:00Z'),
  end: new Date('2026-11-01T12:00:00Z'),
};

const PAYLOAD = {
  hourly: {
    time: [
      '2026-11-01T09:00',
      '2026-11-01T10:00',
      '2026-11-01T11:00',
      '2026-11-01T12:00',
      '2026-11-01T13:00',
    ],
    precipitation: [9, 0.4, 0.2, 0, 8],
    temperature_2m: [12, 13, 14, null, 16],
  },
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

function abortError(): Error {
  const error = new Error('The operation was aborted');

  error.name = 'AbortError';

  return error;
}

describe('OpenMeteoWeatherProvider', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let provider: OpenMeteoWeatherProvider;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    provider = new OpenMeteoWeatherProvider({
      getOrThrow: () => 'https://api.open-meteo.com/v1/',
    } as unknown as ConfigService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('maps the response to hourly points inside the requested range', async () => {
    fetchMock.mockResolvedValue(jsonResponse(PAYLOAD));

    const points = await provider.getForecast(SITE, RANGE);

    expect(points).toEqual([
      { at: new Date('2026-11-01T10:00:00Z'), precipitationMmH: 0.4, temperatureC: 13 },
      { at: new Date('2026-11-01T11:00:00Z'), precipitationMmH: 0.2, temperatureC: 14 },
      { at: new Date('2026-11-01T12:00:00Z'), precipitationMmH: 0, temperatureC: null },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('timezone=UTC'),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('start_date=2026-11-01'),
      expect.anything(),
    );
  });

  it('retries once and succeeds when the first request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      .mockResolvedValueOnce(jsonResponse(PAYLOAD));

    const points = await provider.getForecast(SITE, RANGE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(points).toHaveLength(3);
  });

  it('fails with UPSTREAM_UNAVAILABLE after two failed requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

    const promise = provider.getForecast(SITE, RANGE);

    await expect(promise).rejects.toBeInstanceOf(UpstreamUnavailableError);
    await expect(promise).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails with UPSTREAM_UNAVAILABLE when the request times out twice', async () => {
    fetchMock.mockRejectedValue(abortError());

    await expect(provider.getForecast(SITE, RANGE)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails with UPSTREAM_UNAVAILABLE when the payload has no hourly series', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await expect(provider.getForecast(SITE, RANGE)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
