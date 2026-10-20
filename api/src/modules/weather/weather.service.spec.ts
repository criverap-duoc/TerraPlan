import { BadRequestException } from '@nestjs/common';
import type { CampaignsService } from '../campaigns/campaigns.service';
import type { CampaignDetailResponseDto } from '../campaigns/dto/campaign-detail-response.dto';
import type { CampaignWindowDto } from '../campaigns/dto/campaign-window.dto';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import type { EventsService } from '../events/events.service';
import type { SiteResponseDto } from '../sites/dto/site-response.dto';
import { DEFAULT_THRESHOLDS } from './weather.constants';
import { WeatherService } from './weather.service';

const CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const SITE_ID = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d';
const FIRST_WINDOW_ID = '4d3c2b1a-0f9e-4d8c-9b7a-6f5e4d3c2b1a';
const SECOND_WINDOW_ID = '5e4d3c2b-1a0f-4e9d-8c7b-6a5f4e3d2c1b';
const USER_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const REQUEST_ID = 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b';

const SITE: SiteResponseDto = {
  id: SITE_ID,
  code: 'RIO-MAIPO-01',
  name: 'Río Maipo en Puente Maipo',
  waterBodyType: 'river',
  latitude: -33.61,
  longitude: -70.58,
  isActive: true,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
};

function buildWindow(
  id: string,
  startsAt: Date,
  endsAt: Date,
  isSelected = false,
): CampaignWindowDto {
  return {
    id,
    startsAt,
    endsAt,
    transportMinutes: 60,
    holdingDeadline: null,
    isSelected,
  };
}

const FIRST_WINDOW = buildWindow(
  FIRST_WINDOW_ID,
  new Date('2026-11-01T10:00:00Z'),
  new Date('2026-11-01T12:00:00Z'),
);

const SECOND_WINDOW = buildWindow(
  SECOND_WINDOW_ID,
  new Date('2026-11-01T12:00:00Z'),
  new Date('2026-11-01T14:00:00Z'),
  true,
);

function buildCampaign(
  overrides: Partial<CampaignDetailResponseDto> = {},
): CampaignDetailResponseDto {
  return {
    id: CAMPAIGN_ID,
    code: 'CAMP-2026-0100',
    status: CampaignStatus.Draft,
    siteId: SITE_ID,
    earliestStart: null,
    notes: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    site: SITE,
    parameters: ['PH'],
    windows: [FIRST_WINDOW],
    hasActiveReservations: false,
    ...overrides,
  };
}

describe('WeatherService', () => {
  let weatherProvider: { getForecast: jest.Mock };
  let flowProvider: { getFlow: jest.Mock };
  let campaigns: { findById: jest.Mock; transition: jest.Mock };
  let events: { record: jest.Mock };
  let service: WeatherService;

  beforeEach(() => {
    weatherProvider = { getForecast: jest.fn().mockResolvedValue([]) };
    flowProvider = {
      getFlow: jest
        .fn()
        .mockImplementation((_site: unknown, at: Date) =>
          Promise.resolve({ at, flowM3s: 4.5 }),
        ),
    };
    campaigns = {
      findById: jest.fn().mockResolvedValue(buildCampaign()),
      transition: jest.fn().mockResolvedValue(buildCampaign()),
    };
    events = { record: jest.fn().mockResolvedValue({ recorded: true }) };
    service = new WeatherService(
      weatherProvider,
      flowProvider,
      DEFAULT_THRESHOLDS,
      campaigns as unknown as CampaignsService,
      events as unknown as EventsService,
    );
  });

  it('reports a feasible campaign without transitioning it', async () => {
    const result = await service.checkCampaign(CAMPAIGN_ID);

    expect(result).toMatchObject({
      campaignId: CAMPAIGN_ID,
      allFeasible: true,
      transitioned: false,
    });
    expect(result.assessments).toHaveLength(1);
    expect(campaigns.transition).not.toHaveBeenCalled();
  });

  it('moves a confirmed campaign to needs_reschedule when rain exceeds the threshold', async () => {
    campaigns.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));
    weatherProvider.getForecast.mockResolvedValue([
      { at: FIRST_WINDOW.startsAt, precipitationMmH: 12, temperatureC: 15 },
    ]);

    const result = await service.checkCampaign(CAMPAIGN_ID);

    expect(result.allFeasible).toBe(false);
    expect(result.transitioned).toBe(true);
    expect(result.assessments[0]).toMatchObject({
      isFeasible: false,
      reason: 'precipitation_exceeded',
      precipitationMmH: 12,
    });
    expect(campaigns.transition).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.NeedsReschedule,
      expect.stringContaining('Clima adverso'),
      null,
      expect.any(String),
    );
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        type: 'weather_blocked',
        actorId: null,
        requestId: expect.any(String),
      }),
    );
  });

  it('records the weather block with the caller context before transitioning', async () => {
    campaigns.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));
    weatherProvider.getForecast.mockResolvedValue([
      { at: FIRST_WINDOW.startsAt, precipitationMmH: 12, temperatureC: 15 },
    ]);

    await service.checkCampaign(CAMPAIGN_ID, USER_ID, REQUEST_ID);

    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        type: 'weather_blocked',
        actorId: USER_ID,
        requestId: REQUEST_ID,
        payload: expect.objectContaining({ reason: expect.stringContaining('Clima adverso') }),
      }),
    );
    expect(campaigns.transition).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.NeedsReschedule,
      expect.stringContaining('Clima adverso'),
      USER_ID,
      REQUEST_ID,
    );
    expect(events.record).toHaveBeenCalledTimes(1);
  });

  it('reports the blocker without transitioning a draft campaign', async () => {
    weatherProvider.getForecast.mockResolvedValue([
      { at: FIRST_WINDOW.startsAt, precipitationMmH: 12, temperatureC: 15 },
    ]);

    const result = await service.checkCampaign(CAMPAIGN_ID);

    expect(result.allFeasible).toBe(false);
    expect(result.transitioned).toBe(false);
    expect(campaigns.transition).not.toHaveBeenCalled();
  });

  it('rejects a campaign without windows', async () => {
    campaigns.findById.mockResolvedValue(buildCampaign({ windows: [] }));

    const promise = service.checkCampaign(CAMPAIGN_ID);

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: { code: 'NO_WINDOWS_TO_CHECK' },
    });
  });

  it('checks only the selected window when one is marked', async () => {
    campaigns.findById.mockResolvedValue(
      buildCampaign({ windows: [FIRST_WINDOW, SECOND_WINDOW] }),
    );

    await service.checkCampaign(CAMPAIGN_ID);

    expect(weatherProvider.getForecast).toHaveBeenCalledTimes(1);
    expect(weatherProvider.getForecast).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RIO-MAIPO-01' }),
      { start: SECOND_WINDOW.startsAt, end: SECOND_WINDOW.endsAt },
    );
  });

  it('checks every window when none is selected', async () => {
    campaigns.findById.mockResolvedValue(
      buildCampaign({
        windows: [
          FIRST_WINDOW,
          buildWindow(SECOND_WINDOW_ID, SECOND_WINDOW.startsAt, SECOND_WINDOW.endsAt),
        ],
      }),
    );

    const result = await service.checkCampaign(CAMPAIGN_ID);

    expect(weatherProvider.getForecast).toHaveBeenCalledTimes(2);
    expect(result.assessments).toHaveLength(2);
  });
});
