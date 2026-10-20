import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CatalogService } from '../catalog/catalog.service';
import type { ParameterResponseDto } from '../catalog/dto/parameter-response.dto';
import {
  computeFeasibleWindows,
  type FeasibleWindow,
  type LabOpenHours,
} from './compute-feasible-windows.domain';
import type { FeasibleWindowsQueryDto } from './dto/feasible-windows-query.dto';
import type { FeasibleWindowResponseDto } from './dto/feasible-window-response.dto';
import type { FeasibleWindowsResponseDto } from './dto/feasible-windows-response.dto';

const CAMPAIGN_NOT_FOUND = 'La campaña solicitada no existe.';
const INVALID_RANGE = 'latestEnd debe ser posterior a earliestStart.';

// R6 keeps the lab schedule fixed; R8 makes it configurable.
const DEFAULT_LAB_OPEN_HOURS: LabOpenHours = {
  openHour: 8,
  closeHour: 18,
  weekdaysOnly: true,
  timeZone: 'America/Santiago',
};

// Infinity has no deadline; the API exposes null instead of the sentinel date.
function toResponse(window: FeasibleWindow, minHoldingTimeHours: number): FeasibleWindowResponseDto {
  return {
    samplingStart: window.samplingStart.toISOString(),
    samplingEnd: window.samplingEnd.toISOString(),
    arrivalAtLab: window.arrivalAtLab.toISOString(),
    analysisStart: window.analysisStart.toISOString(),
    holdingDeadline: Number.isFinite(minHoldingTimeHours)
      ? window.holdingDeadline.toISOString()
      : null,
    isFeasible: window.isFeasible,
    ...(window.infeasibilityReason ? { infeasibilityReason: window.infeasibilityReason } : {}),
  };
}

@Injectable()
export class SchedulingService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async computeForCampaign(
    campaignId: string,
    dto: FeasibleWindowsQueryDto,
  ): Promise<FeasibleWindowsResponseDto> {
    const campaign = await this.campaignsService.findById(campaignId);

    if (campaign === null) {
      throw new NotFoundException(CAMPAIGN_NOT_FOUND);
    }

    const earliestStart = new Date(dto.earliestStart);
    const latestEnd = new Date(dto.latestEnd);

    if (earliestStart.getTime() >= latestEnd.getTime()) {
      throw new BadRequestException({ code: 'INVALID_RANGE', message: INVALID_RANGE });
    }

    const minHoldingTimeHours = this.resolveMinHoldingTimeHours(dto.parameterCodes);
    const windows = computeFeasibleWindows({
      earliestStart,
      latestEnd,
      slotMinutes: dto.slotMinutes,
      transportMinutes: dto.transportMinutes,
      labOpenHours: DEFAULT_LAB_OPEN_HOURS,
      minHoldingTimeHours,
    });

    return {
      campaignId,
      minHoldingTimeHours: Number.isFinite(minHoldingTimeHours) ? minHoldingTimeHours : 'Infinity',
      windows: windows.map((window) => toResponse(window, minHoldingTimeHours)),
    };
  }

  // Holding times come from the shared catalog, never from hardcoded values.
  private resolveMinHoldingTimeHours(parameterCodes?: string[]): number {
    const selected = this.resolveParameters(parameterCodes);
    const holdingTimes = selected
      .filter((parameter) => parameter.requiresLabWindow)
      .map((parameter) => parameter.holdingTimeHours)
      .filter((hours): hours is number => hours !== null);

    return holdingTimes.length === 0 ? Infinity : Math.min(...holdingTimes);
  }

  private resolveParameters(parameterCodes?: string[]): ParameterResponseDto[] {
    const catalogParameters = this.catalogService.getParameters();

    if (parameterCodes === undefined || parameterCodes.length === 0) {
      return catalogParameters.filter((parameter) => parameter.requiresLabWindow);
    }

    return parameterCodes.map((code) => {
      const found = catalogParameters.find((parameter) => parameter.code === code);

      if (found === undefined) {
        throw new BadRequestException({
          code: 'UNKNOWN_PARAMETER',
          message: `El parámetro ${code} no existe en el catálogo.`,
        });
      }

      return found;
    });
  }
}
