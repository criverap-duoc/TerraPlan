import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CatalogService } from '../catalog/catalog.service';
import type { ParameterResponseDto } from '../catalog/dto/parameter-response.dto';
import type { EventsService } from '../events/events.service';
import type { ReservationsRepository } from '../reservations/reservations.repository';
import type { SiteResponseDto } from '../sites/dto/site-response.dto';
import type { SitesService } from '../sites/sites.service';
import type { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';
import type { Campaign } from './entities/campaign.entity';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error';
import { CampaignStatus } from './types/campaign-status.enum';

const CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const SITE_ID = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d';
const USER_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const WINDOW_ID = '4d3c2b1a-0f9e-4d8c-9b7a-6f5e4d3c2b1a';
const REQUEST_ID = 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b';

const CATALOG = ['PH', 'TURB', 'N_NO3'].map((code) => ({ code })) as unknown as ParameterResponseDto[];

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

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: CAMPAIGN_ID,
    code: 'CAMP-2026-0100',
    status: CampaignStatus.Draft,
    siteId: SITE_ID,
    earliestStart: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  };
}

const CREATE_DTO = {
  code: 'CAMP-2026-0100',
  siteId: SITE_ID,
  parameterCodes: ['PH', 'TURB', 'PH'],
};

describe('CampaignsService', () => {
  let repository: {
    createWithParameters: jest.Mock;
    findPage: jest.Mock;
    findById: jest.Mock;
    findParameterCodes: jest.Mock;
    findWindows: jest.Mock;
    hasWindows: jest.Mock;
    hasSelectedWindow: jest.Mock;
    hasActiveReservations: jest.Mock;
    updateWithParameters: jest.Mock;
    transitionStatus: jest.Mock;
    persistWindows: jest.Mock;
    selectWindow: jest.Mock;
  };
  let reservations: { releaseByCampaign: jest.Mock };
  let catalog: { getParameters: jest.Mock };
  let sites: { findById: jest.Mock };
  let events: { record: jest.Mock };
  let service: CampaignsService;

  beforeEach(() => {
    repository = {
      createWithParameters: jest.fn(),
      findPage: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildCampaign()),
      findParameterCodes: jest.fn().mockResolvedValue([]),
      findWindows: jest.fn().mockResolvedValue([]),
      hasWindows: jest.fn().mockResolvedValue(false),
      hasSelectedWindow: jest.fn().mockResolvedValue(false),
      hasActiveReservations: jest.fn().mockResolvedValue(false),
      updateWithParameters: jest.fn().mockResolvedValue(true),
      transitionStatus: jest.fn().mockResolvedValue(true),
      persistWindows: jest.fn().mockResolvedValue(undefined),
      selectWindow: jest.fn().mockResolvedValue(true),
    };
    reservations = { releaseByCampaign: jest.fn().mockResolvedValue(3) };
    catalog = { getParameters: jest.fn().mockReturnValue(CATALOG) };
    sites = { findById: jest.fn().mockResolvedValue(SITE) };
    events = { record: jest.fn().mockResolvedValue({ recorded: true }) };
    service = new CampaignsService(
      repository as unknown as CampaignsRepository,
      reservations as unknown as ReservationsRepository,
      catalog as unknown as CatalogService,
      sites as unknown as SitesService,
      events as unknown as EventsService,
    );
  });

  it('creates a draft campaign with a site and deduplicated catalog parameters', async () => {
    repository.createWithParameters.mockResolvedValue(buildCampaign());

    const result = await service.create(CREATE_DTO, USER_ID);

    expect(repository.createWithParameters).toHaveBeenCalledWith(
      expect.objectContaining({ code: CREATE_DTO.code, siteId: SITE_ID, createdBy: USER_ID }),
      ['PH', 'TURB'],
    );
    expect(result.status).toBe(CampaignStatus.Draft);
    expect(result.siteId).toBe(SITE_ID);
  });

  it('records a created event after the campaign is committed', async () => {
    repository.createWithParameters.mockResolvedValue(buildCampaign());

    await service.create(CREATE_DTO, USER_ID, REQUEST_ID);

    expect(events.record).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: 'created',
      payload: { code: 'CAMP-2026-0100', siteId: SITE_ID },
      actorId: USER_ID,
      requestId: REQUEST_ID,
    });
  });

  it('throws 404 when the site does not exist', async () => {
    sites.findById.mockRejectedValue(new NotFoundException('Sitio no encontrado.'));

    await expect(service.create(CREATE_DTO, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.createWithParameters).not.toHaveBeenCalled();
  });

  it('updates a draft campaign and replaces its parameters', async () => {
    const result = await service.update(CAMPAIGN_ID, {
      notes: 'Coordinado con la municipalidad',
      parameterCodes: ['PH', 'N_NO3'],
    });

    expect(repository.updateWithParameters).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      { notes: 'Coordinado con la municipalidad' },
      ['PH', 'N_NO3'],
    );
    expect(result.id).toBe(CAMPAIGN_ID);
  });

  it('rejects updates when the campaign is no longer in draft', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Planned }));

    const promise = service.update(CAMPAIGN_ID, { notes: 'tarde' });

    await expect(promise).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(repository.updateWithParameters).not.toHaveBeenCalled();
  });

  it('leaves no partial changes when a concurrent transition wins the row lock', async () => {
    repository.updateWithParameters.mockResolvedValue(false);

    const promise = service.update(CAMPAIGN_ID, {
      notes: 'Coordinado con la municipalidad',
      parameterCodes: ['PH', 'N_NO3'],
    });

    await expect(promise).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(repository.updateWithParameters).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      { notes: 'Coordinado con la municipalidad' },
      ['PH', 'N_NO3'],
    );
  });

  it('rejects draft to planned without windows', async () => {
    repository.hasWindows.mockResolvedValue(false);

    const promise = service.transition(CAMPAIGN_ID, CampaignStatus.Planned);

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({ response: { code: 'NO_WINDOW_SELECTED' } });
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });

  it('moves draft to planned when at least one window exists', async () => {
    repository.hasWindows.mockResolvedValue(true);

    await service.transition(CAMPAIGN_ID, CampaignStatus.Planned);

    expect(repository.transitionStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.Draft,
      CampaignStatus.Planned,
      undefined,
    );
  });

  it('records a status_changed event with the previous and the next status', async () => {
    repository.hasWindows.mockResolvedValue(true);

    await service.transition(
      CAMPAIGN_ID,
      CampaignStatus.Planned,
      undefined,
      USER_ID,
      REQUEST_ID,
    );

    expect(events.record).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: 'status_changed',
      payload: { from: CampaignStatus.Draft, to: CampaignStatus.Planned, reason: null },
      actorId: USER_ID,
      requestId: REQUEST_ID,
    });
  });

  it('rejects planned to confirmed without an active reservation', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Planned }));
    repository.hasActiveReservations.mockResolvedValue(false);

    const promise = service.transition(CAMPAIGN_ID, CampaignStatus.Confirmed);

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({ response: { code: 'NO_ACTIVE_RESERVATION' } });
  });

  it('moves planned to confirmed when a reservation is active', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Planned }));
    repository.hasActiveReservations.mockResolvedValue(true);

    await service.transition(CAMPAIGN_ID, CampaignStatus.Confirmed);

    expect(repository.transitionStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.Planned,
      CampaignStatus.Confirmed,
      undefined,
    );
  });

  it('rejects confirmed to in_field without a selected window', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));
    repository.hasSelectedWindow.mockResolvedValue(false);

    const promise = service.transition(CAMPAIGN_ID, CampaignStatus.InField);

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({ response: { code: 'NO_SELECTED_WINDOW' } });
  });

  it('moves confirmed to in_field when a window is selected', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));
    repository.hasSelectedWindow.mockResolvedValue(true);

    await service.transition(CAMPAIGN_ID, CampaignStatus.InField);

    expect(repository.transitionStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.Confirmed,
      CampaignStatus.InField,
      undefined,
    );
  });

  it('releases active reservations when moving confirmed to needs_reschedule', async () => {
    repository.findById.mockResolvedValue(
      buildCampaign({ status: CampaignStatus.Confirmed, notes: 'Contacto previo' }),
    );

    await service.transition(CAMPAIGN_ID, CampaignStatus.NeedsReschedule, 'Lluvia intensa');

    expect(reservations.releaseByCampaign).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(repository.transitionStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.Confirmed,
      CampaignStatus.NeedsReschedule,
      'Contacto previo\nLluvia intensa',
    );
  });

  it('requires a reason when moving to needs_reschedule', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));

    const promise = service.transition(CAMPAIGN_ID, CampaignStatus.NeedsReschedule);

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({ response: { code: 'REASON_REQUIRED' } });
    expect(reservations.releaseByCampaign).not.toHaveBeenCalled();
  });

  it('cancels a completed campaign with a reason and releases reservations', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Completed }));

    await service.transition(CAMPAIGN_ID, CampaignStatus.Cancelled, 'Registro duplicado');

    expect(reservations.releaseByCampaign).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(repository.transitionStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      CampaignStatus.Completed,
      CampaignStatus.Cancelled,
      'Registro duplicado',
    );
  });

  it('rejects moving a cancelled campaign back to planned', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Cancelled }));

    const promise = service.transition(CAMPAIGN_ID, CampaignStatus.Planned);

    await expect(promise).rejects.toBeInstanceOf(InvalidStateTransitionError);
    await expect(promise).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION', status: 409 });
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });

  it('persists windows for a draft campaign', async () => {
    await service.persistWindows(CAMPAIGN_ID, [
      {
        startsAt: '2026-11-16T13:00:00Z',
        endsAt: '2026-11-16T15:00:00Z',
        transportMinutes: 90,
        holdingDeadline: null,
      },
    ]);

    expect(repository.persistWindows).toHaveBeenCalledWith(CAMPAIGN_ID, [
      {
        startsAt: new Date('2026-11-16T13:00:00Z'),
        endsAt: new Date('2026-11-16T15:00:00Z'),
        transportMinutes: 90,
        holdingDeadline: null,
      },
    ]);
  });

  it('rejects windows for a confirmed campaign', async () => {
    repository.findById.mockResolvedValue(buildCampaign({ status: CampaignStatus.Confirmed }));

    const promise = service.persistWindows(CAMPAIGN_ID, [
      {
        startsAt: '2026-11-16T13:00:00Z',
        endsAt: '2026-11-16T15:00:00Z',
        transportMinutes: 90,
      },
    ]);

    await expect(promise).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(repository.persistWindows).not.toHaveBeenCalled();
  });

  it('selects a window that belongs to the campaign', async () => {
    await service.selectWindow(CAMPAIGN_ID, WINDOW_ID);

    expect(repository.selectWindow).toHaveBeenCalledWith(CAMPAIGN_ID, WINDOW_ID);
  });

  it('throws 404 when the window does not belong to the campaign', async () => {
    repository.selectWindow.mockResolvedValue(false);

    await expect(service.selectWindow(CAMPAIGN_ID, WINDOW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
