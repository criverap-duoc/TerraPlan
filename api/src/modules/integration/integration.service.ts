import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import { CampaignsService } from '../campaigns/campaigns.service';
import type { CampaignDetailResponseDto } from '../campaigns/dto/campaign-detail-response.dto';
import type { CampaignWindowDto } from '../campaigns/dto/campaign-window.dto';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import { CatalogService } from '../catalog/catalog.service';
import { EventsService } from '../events/events.service';
import { CampaignEventType } from '../events/types/campaign-event-type.enum';
import type { SiteResponseDto } from '../sites/dto/site-response.dto';
import { deterministicUuid, sha256Hex } from './deterministic-uuid';
import type { AquaMetricObservationDto } from './dto/aquametric/aquametric-observation.dto';
import { AquaMetricPublishPayloadDto } from './dto/aquametric/aquametric-publish-payload.dto';
import type { AquaMetricSampleDto } from './dto/aquametric/aquametric-sample.dto';
import { PublishCampaignResponseDto } from './dto/publish-campaign-response.dto';
import { AQUAMETRIC_CLIENT } from './ports/aquametric-client.interface';
import type { AquaMetricClient } from './ports/aquametric-client.interface';
import { simulatedValue } from './simulated-values';

const PUBLISHABLE_STATUSES: CampaignStatus[] = [
  CampaignStatus.InField,
  CampaignStatus.Completed,
];
const PUBLISH_INVALID_STATE = 'Solo se pueden publicar campañas en terreno o completadas.';
const SITE_REQUIRED = 'La campaña no tiene un sitio asociado.';
const NO_WINDOW_TO_PUBLISH = 'La campaña no tiene ventanas para publicar.';
const ANALYSIS_DELAY_MS = 5 * 60_000;
// MVP scope: every campaign samples an aqueous matrix; real matrices arrive with data capture.
const SAMPLE_MATRIX = 'water';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly catalogService: CatalogService,
    private readonly eventsService: EventsService,
    @Inject(AQUAMETRIC_CLIENT) private readonly aquametricClient: AquaMetricClient,
  ) {}

  async publishCampaign(
    campaignId: string,
    actorId: string | null = null,
    requestId?: string,
  ): Promise<PublishCampaignResponseDto> {
    const campaign = await this.campaignsService.findById(campaignId);

    if (!PUBLISHABLE_STATUSES.includes(campaign.status)) {
      throw new BadRequestException({
        code: 'PUBLISH_INVALID_STATE',
        message: `${PUBLISH_INVALID_STATE} Estado actual: ${campaign.status}.`,
      });
    }

    const site = campaign.site;

    if (!site) {
      throw new BadRequestException({ code: 'SITE_REQUIRED', message: SITE_REQUIRED });
    }

    const window = campaign.windows.find((candidate) => candidate.isSelected) ?? campaign.windows[0];

    if (!window) {
      throw new BadRequestException({
        code: 'NO_WINDOW_TO_PUBLISH',
        message: NO_WINDOW_TO_PUBLISH,
      });
    }

    const payload = this.buildPayload(campaign, window, site);
    const idempotencyKey = sha256Hex(JSON.stringify(payload));
    const result = await this.aquametricClient.publish(payload, idempotencyKey);

    if (result.statusCode >= 400) {
      throw new BadRequestException({
        code: 'PUBLISH_REJECTED',
        message: `AquaMetric rechazó la publicación (HTTP ${result.statusCode}). ${this.describeRejection(
          result.responseBody,
        )}`,
      });
    }

    // Post-commit and best-effort, like every other event (ADR-006): a lost event never fails the
    // publication that already succeeded upstream.
    await this.eventsService.record({
      campaignId,
      type: CampaignEventType.ObservationsPublished,
      payload: {
        catalogVersion: payload.catalogVersion,
        siteCode: payload.site.code,
        observationCount: payload.observations.length,
        idempotencyKey,
      },
      actorId,
      requestId: resolveRequestId(requestId),
    });

    return {
      campaignId,
      published: true,
      catalogVersion: payload.catalogVersion,
      idempotencyKey,
      observationCount: payload.observations.length,
      siteCode: payload.site.code,
      payload,
    };
  }

  private buildPayload(
    campaign: CampaignDetailResponseDto,
    window: CampaignWindowDto,
    site: SiteResponseDto,
  ): AquaMetricPublishPayloadDto {
    const collectedAt = window.endsAt;
    const arrivalAtLab = new Date(collectedAt.getTime() + window.transportMinutes * 60_000);
    const analyzedAt = new Date(arrivalAtLab.getTime() + ANALYSIS_DELAY_MS);
    const sampleId = deterministicUuid(
      `${campaign.id}:${site.id}:${window.startsAt.toISOString()}`,
    );
    const parameterByCode = new Map(
      this.catalogService.getParameters().map((parameter) => [parameter.code, parameter]),
    );

    const sample: AquaMetricSampleDto = {
      id: sampleId,
      siteId: site.id,
      campaignId: campaign.id,
      matrix: SAMPLE_MATRIX,
      collectedAt: collectedAt.toISOString(),
      labReceivedAt: arrivalAtLab.toISOString(),
      status: 'analyzed',
    };

    const observations: AquaMetricObservationDto[] = [];

    for (const parameterCode of campaign.parameters) {
      const parameter = parameterByCode.get(parameterCode);

      if (!parameter) {
        continue;
      }

      observations.push({
        id: deterministicUuid(`${sampleId}:${parameterCode}`),
        siteId: site.id,
        sampleId,
        parameterCode,
        value: simulatedValue(parameterCode, sampleId),
        unitCode: parameter.canonicalUnitCode,
        qualifier: null,
        loq: null,
        method: parameter.methodReference || null,
        analyzedAt: analyzedAt.toISOString(),
        qcFlag: 'ok',
        source: 'lab',
      });
    }

    return {
      catalogVersion: this.catalogService.getMeta().version,
      site: {
        id: site.id,
        code: site.code,
        name: site.name,
        waterBodyType: site.waterBodyType,
        latitude: site.latitude,
        longitude: site.longitude,
        isActive: site.isActive,
      },
      samples: [sample],
      observations,
    };
  }

  private describeRejection(responseBody: unknown): string {
    if (responseBody !== null && typeof responseBody === 'object') {
      const detail = (responseBody as { detail?: unknown }).detail;

      if (typeof detail === 'string' && detail.length > 0) {
        return detail;
      }
    }

    return 'Revisa el lote antes de reintentar.';
  }
}
