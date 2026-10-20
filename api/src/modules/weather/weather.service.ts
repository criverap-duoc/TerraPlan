import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import { assessWeather } from './assess-weather.domain';
import type { WeatherAssessment } from './assess-weather.domain';
import { WeatherAssessmentDto } from './dto/weather-assessment.dto';
import { WeatherCheckResponseDto } from './dto/weather-check-response.dto';
import type { FlowProvider } from './ports/flow-provider.interface';
import type { SiteRef, WeatherProvider } from './ports/weather-provider.interface';
import type { WeatherThresholds } from './ports/weather-thresholds.interface';
import { FLOW_PROVIDER, WEATHER_PROVIDER, WEATHER_THRESHOLDS } from './weather.tokens';

const SITE_REQUIRED = 'La campaña no tiene un sitio asociado.';
const NO_WINDOWS_TO_CHECK = 'La campaña no tiene ventanas para evaluar.';

@Injectable()
export class WeatherService {
  constructor(
    @Inject(WEATHER_PROVIDER) private readonly weatherProvider: WeatherProvider,
    @Inject(FLOW_PROVIDER) private readonly flowProvider: FlowProvider,
    @Inject(WEATHER_THRESHOLDS) private readonly thresholds: WeatherThresholds,
    private readonly campaignsService: CampaignsService,
  ) {}

  async checkCampaign(campaignId: string): Promise<WeatherCheckResponseDto> {
    const campaign = await this.campaignsService.findById(campaignId);

    if (!campaign.site) {
      throw new BadRequestException({ code: 'SITE_REQUIRED', message: SITE_REQUIRED });
    }

    const selected = campaign.windows.filter((window) => window.isSelected);
    const windows = selected.length > 0 ? selected : campaign.windows;

    if (windows.length === 0) {
      throw new BadRequestException({
        code: 'NO_WINDOWS_TO_CHECK',
        message: NO_WINDOWS_TO_CHECK,
      });
    }

    const site: SiteRef = {
      id: campaign.site.id,
      code: campaign.site.code,
      latitude: campaign.site.latitude,
      longitude: campaign.site.longitude,
    };
    const assessments: WeatherAssessment[] = [];

    for (const window of windows) {
      const [forecast, flow] = await Promise.all([
        this.weatherProvider.getForecast(site, { start: window.startsAt, end: window.endsAt }),
        this.flowProvider.getFlow(site, window.startsAt),
      ]);

      assessments.push(
        assessWeather({
          window: { id: window.id, startsAt: window.startsAt, endsAt: window.endsAt },
          forecast,
          flow,
          thresholds: this.thresholds,
        }),
      );
    }

    const allFeasible = assessments.every((assessment) => assessment.isFeasible);
    const transitioned = await this.rescheduleIfNeeded(
      campaignId,
      campaign.status,
      assessments,
    );

    return {
      campaignId,
      allFeasible,
      transitioned,
      assessments: assessments.map((assessment) => this.toDto(assessment)),
    };
  }

  private async rescheduleIfNeeded(
    campaignId: string,
    status: CampaignStatus,
    assessments: WeatherAssessment[],
  ): Promise<boolean> {
    const blocked = assessments.find((assessment) => !assessment.isFeasible);

    if (!blocked || status !== CampaignStatus.Confirmed) {
      return false;
    }

    // CampaignsService.transition releases the active bookings as part of the transition.
    await this.campaignsService.transition(
      campaignId,
      CampaignStatus.NeedsReschedule,
      this.buildReason(blocked),
    );

    return true;
  }

  private buildReason(assessment: WeatherAssessment): string {
    switch (assessment.reason) {
      case 'flow_too_low':
        return `Caudal fuera de rango: ${this.formatNumber(assessment.flowM3s)} m³/s (mínimo ${this.thresholds.minFlowM3s}).`;
      case 'flow_too_high':
        return `Caudal fuera de rango: ${this.formatNumber(assessment.flowM3s)} m³/s (máximo ${this.thresholds.maxFlowM3s}).`;
      default:
        return `Clima adverso: precipitación ${this.formatNumber(assessment.precipitationMmH)} mm/h (umbral ${this.thresholds.maxPrecipitationMmH}).`;
    }
  }

  private formatNumber(value: number): string {
    return Number(value.toFixed(2)).toString();
  }

  private toDto(assessment: WeatherAssessment): WeatherAssessmentDto {
    return {
      windowId: assessment.windowId ?? null,
      windowStart: assessment.windowStart.toISOString(),
      windowEnd: assessment.windowEnd.toISOString(),
      isFeasible: assessment.isFeasible,
      precipitationMmH: assessment.precipitationMmH,
      flowM3s: assessment.flowM3s,
      reason: assessment.reason ?? null,
    };
  }
}
