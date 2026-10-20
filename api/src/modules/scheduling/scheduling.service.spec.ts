import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CampaignsService } from '../campaigns/campaigns.service';
import type { CatalogService } from '../catalog/catalog.service';
import type { ParameterResponseDto } from '../catalog/dto/parameter-response.dto';
import * as feasibleWindows from './compute-feasible-windows.domain';
import type { FeasibleWindowsQueryDto } from './dto/feasible-windows-query.dto';
import { SchedulingService } from './scheduling.service';

const CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const EARLIEST_START = '2026-11-16T11:00:00Z';
const LATEST_END = '2026-11-16T21:00:00Z';

function parameter(
  code: string,
  measurementType: 'in_situ' | 'lab',
  holdingTimeHours: number | null,
): ParameterResponseDto {
  return {
    code,
    nameEs: code,
    category: 'nutriente',
    canonicalUnitCode: 'MG_L',
    decimals: 2,
    measurementType,
    requiresLabWindow: measurementType === 'lab',
    holdingTimeHours,
    preservation: null,
    container: null,
    methodReference: '',
    reportingBasis: '',
    mvpOptional: false,
    status: 'draft-verified',
    sourceNote: '',
  };
}

const PARAMETERS: ParameterResponseDto[] = [
  parameter('PH', 'in_situ', null),
  parameter('DO', 'in_situ', null),
  parameter('TURB', 'lab', 24),
  parameter('N_NO3', 'lab', 48),
  parameter('P_PO4', 'lab', 48),
];

// A plain literal keeps the DTO's class prototype out of the picture.
function query(overrides: Partial<FeasibleWindowsQueryDto> = {}): FeasibleWindowsQueryDto {
  return {
    earliestStart: EARLIEST_START,
    latestEnd: LATEST_END,
    slotMinutes: 120,
    transportMinutes: 90,
    ...overrides,
  };
}

describe('SchedulingService', () => {
  let catalogService: { getParameters: jest.Mock };
  let campaignsService: { findById: jest.Mock };
  let service: SchedulingService;

  beforeEach(() => {
    catalogService = { getParameters: jest.fn().mockReturnValue(PARAMETERS) };
    campaignsService = {
      findById: jest.fn().mockResolvedValue({ id: CAMPAIGN_ID, code: 'CAMP-2026-0001' }),
    };
    service = new SchedulingService(
      catalogService as unknown as CatalogService,
      campaignsService as unknown as CampaignsService,
    );
  });

  it('uses the shortest holding time among the requested lab parameters', async () => {
    const response = await service.computeForCampaign(
      CAMPAIGN_ID,
      query({ parameterCodes: ['TURB', 'N_NO3'] }),
    );

    expect(response.campaignId).toBe(CAMPAIGN_ID);
    expect(response.minHoldingTimeHours).toBe(24);
    expect(response.windows).toHaveLength(5);
  });

  it('returns Infinity when every requested parameter is measured in situ', async () => {
    const response = await service.computeForCampaign(
      CAMPAIGN_ID,
      query({ parameterCodes: ['PH', 'DO'] }),
    );

    expect(response.minHoldingTimeHours).toBe('Infinity');
    expect(response.windows.every((window) => window.isFeasible)).toBe(true);
    expect(response.windows.every((window) => window.holdingDeadline === null)).toBe(true);
  });

  it('defaults to every parameter that requires a lab window', async () => {
    const response = await service.computeForCampaign(CAMPAIGN_ID, query());

    expect(response.minHoldingTimeHours).toBe(24);
  });

  it('forwards the lab hours and the resolved parameters to the pure function', async () => {
    const spy = jest.spyOn(feasibleWindows, 'computeFeasibleWindows');

    await service.computeForCampaign(CAMPAIGN_ID, query({ parameterCodes: ['TURB'] }));

    expect(spy).toHaveBeenCalledWith({
      earliestStart: new Date(EARLIEST_START),
      latestEnd: new Date(LATEST_END),
      slotMinutes: 120,
      transportMinutes: 90,
      labOpenHours: {
        openHour: 8,
        closeHour: 18,
        weekdaysOnly: true,
        timeZone: 'America/Santiago',
      },
      minHoldingTimeHours: 24,
    });
    spy.mockRestore();
  });

  it('rejects a parameter that is not in the catalog', async () => {
    const promise = service.computeForCampaign(
      CAMPAIGN_ID,
      query({ parameterCodes: ['TURB', 'UNOBTAINIUM'] }),
    );

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({
      response: { code: 'UNKNOWN_PARAMETER' },
    });
  });

  it('rejects a range where latestEnd is not after earliestStart', async () => {
    const promise = service.computeForCampaign(CAMPAIGN_ID, query({ latestEnd: EARLIEST_START }));

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toMatchObject({ response: { code: 'INVALID_RANGE' } });
  });

  it('throws NotFoundException when the campaign does not exist', async () => {
    campaignsService.findById.mockResolvedValue(null);

    await expect(service.computeForCampaign(CAMPAIGN_ID, query())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
