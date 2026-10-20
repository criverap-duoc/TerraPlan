import { BadRequestException } from '@nestjs/common';
import { UpstreamUnavailableError } from '../../common/errors/upstream-unavailable.error';
import type { CampaignsService } from '../campaigns/campaigns.service';
import type { CampaignDetailResponseDto } from '../campaigns/dto/campaign-detail-response.dto';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import type { CatalogService } from '../catalog/catalog.service';
import type { ParameterResponseDto } from '../catalog/dto/parameter-response.dto';
import type { EventsService } from '../events/events.service';
import { IntegrationService } from './integration.service';
import type { AquaMetricClient } from './ports/aquametric-client.interface';

const CAMPAIGN_ID = '6a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const SITE_ID = '0f4e2f8a-6f43-4f0e-9a5b-1c2d3e4f5a6b';
const WINDOW_ID = '9b8c7d6e-5f40-4a3b-8c2d-1e0f9a8b7c6d';
const ACTOR_ID = '3c2b1a09-8f7e-4d6c-5b4a-392817061514';
const REQUEST_ID = 'req-integration';

const STARTS_AT = new Date('2026-11-02T13:00:00Z');
const ENDS_AT = new Date('2026-11-02T15:00:00Z');

function buildCampaign(
  overrides: Partial<CampaignDetailResponseDto> = {},
): CampaignDetailResponseDto {
  return {
    id: CAMPAIGN_ID,
    code: 'CAMP-INT-0001',
    status: CampaignStatus.InField,
    siteId: SITE_ID,
    earliestStart: STARTS_AT,
    notes: null,
    createdAt: STARTS_AT,
    updatedAt: STARTS_AT,
    site: {
      id: SITE_ID,
      code: 'RIO-MAIPO-01',
      name: 'Río Maipo en Puente Maipo',
      waterBodyType: 'river',
      latitude: -33.61,
      longitude: -70.58,
      isActive: true,
      createdAt: STARTS_AT,
      updatedAt: STARTS_AT,
    },
    parameters: ['PH', 'TURB'],
    windows: [
      {
        id: WINDOW_ID,
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        transportMinutes: 60,
        holdingDeadline: new Date('2026-11-02T23:00:00Z'),
        isSelected: true,
      },
    ],
    hasActiveReservations: true,
    ...overrides,
  };
}

const PARAMETERS = [
  { code: 'PH', canonicalUnitCode: 'UPH', methodReference: 'SMEWW 4500-H+ B' },
  { code: 'TURB', canonicalUnitCode: 'NTU', methodReference: 'SMEWW 2130 B' },
] as unknown as ParameterResponseDto[];

describe('IntegrationService', () => {
  const campaigns = { findById: jest.fn() };
  const catalog = {
    getMeta: jest.fn(() => ({ version: '1.0.0' })),
    getParameters: jest.fn(() => PARAMETERS),
  };
  const events = { record: jest.fn() };
  const client = { publish: jest.fn() };
  let service: IntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    campaigns.findById.mockResolvedValue(buildCampaign());
    client.publish.mockResolvedValue({ statusCode: 200, responseBody: { accepted: 2 } });
    service = new IntegrationService(
      campaigns as unknown as CampaignsService,
      catalog as unknown as CatalogService,
      events as unknown as EventsService,
      client as unknown as AquaMetricClient,
    );
  });

  it('publishes the campaign and records observations_published', async () => {
    const result = await service.publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID);

    expect(result.published).toBe(true);
    expect(result.catalogVersion).toBe('1.0.0');
    expect(result.observationCount).toBe(2);
    expect(result.siteCode).toBe('RIO-MAIPO-01');
    expect(result.payload.observations.map((observation) => observation.parameterCode)).toEqual([
      'PH',
      'TURB',
    ]);
    expect(result.payload.observations[0].unitCode).toBe('UPH');
    expect(result.payload.observations[0].method).toBe('SMEWW 4500-H+ B');
    expect(result.payload.samples[0].collectedAt).toBe(ENDS_AT.toISOString());
    expect(result.payload.samples[0].labReceivedAt).toBe('2026-11-02T16:00:00.000Z');
    expect(client.publish).toHaveBeenCalledWith(result.payload, result.idempotencyKey);
    expect(events.record).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: 'observations_published',
      payload: {
        catalogVersion: '1.0.0',
        siteCode: 'RIO-MAIPO-01',
        observationCount: 2,
        idempotencyKey: result.idempotencyKey,
      },
      actorId: ACTOR_ID,
      requestId: REQUEST_ID,
    });
  });

  it('builds a deterministic payload and idempotency key', async () => {
    const first = await service.publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID);
    const second = await service.publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID);

    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.payload).toEqual(first.payload);
  });

  it('rejects a campaign that is not in_field or completed', async () => {
    campaigns.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Draft }));

    const error = await service
      .publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'PUBLISH_INVALID_STATE',
    });
    expect(client.publish).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });

  it('rejects a campaign without windows', async () => {
    campaigns.findById.mockResolvedValue(buildCampaign({ windows: [] }));

    const error = await service
      .publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'NO_WINDOW_TO_PUBLISH',
    });
    expect(client.publish).not.toHaveBeenCalled();
  });

  it('translates a 4xx from AquaMetric into PUBLISH_REJECTED', async () => {
    client.publish.mockResolvedValue({
      statusCode: 422,
      responseBody: { detail: 'invalid payload' },
    });

    const error = await service
      .publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'PUBLISH_REJECTED',
    });
    expect((error as BadRequestException).message).toContain('invalid payload');
    expect(events.record).not.toHaveBeenCalled();
  });

  it('propagates UpstreamUnavailableError without recording an event', async () => {
    client.publish.mockRejectedValue(
      new UpstreamUnavailableError('AquaMetric caído.', { cause: new Error('timeout') }),
    );

    await expect(service.publishCampaign(CAMPAIGN_ID, ACTOR_ID, REQUEST_ID)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(events.record).not.toHaveBeenCalled();
  });
});
