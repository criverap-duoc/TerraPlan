import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import { CatalogService } from '../catalog/catalog.service';
import { EventsService } from '../events/events.service';
import { CampaignEventType } from '../events/types/campaign-event-type.enum';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { SitesService } from '../sites/sites.service';
import { assertTransition } from './campaign-status.domain';
import { CampaignsRepository } from './campaigns.repository';
import type { CampaignWindowInput } from './campaigns.repository';
import { CampaignDetailResponseDto } from './dto/campaign-detail-response.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CampaignWindowDto } from './dto/campaign-window.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto';
import { ListCampaignsResponseDto } from './dto/list-campaigns-response.dto';
import type { FeasibleWindowInputDto } from './dto/persist-windows.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignWindow } from './entities/campaign-window.entity';
import { Campaign } from './entities/campaign.entity';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error';
import { CampaignStatus } from './types/campaign-status.enum';

const DUPLICATE_CODE = 'Ya existe una campaña con ese código.';
const CAMPAIGN_NOT_FOUND = 'Campaña no encontrada.';
const SITE_NOT_AVAILABLE = 'El sitio indicado no existe o está inactivo.';
const WINDOW_NOT_FOUND = 'La ventana indicada no pertenece a la campaña.';
const CANCELLED_NOTE = 'Campaña cancelada desde la API.';
const EDIT_ONLY_DRAFT = 'Solo se pueden editar campañas en borrador.';
const WINDOWS_EDITABLE = 'Solo se pueden modificar ventanas en campañas en borrador o planificadas.';
const CONCURRENT_TRANSITION = 'La campaña cambió de estado mientras se procesaba la solicitud.';

function appendNote(notes: string | null, note: string): string {
  return notes ? `${notes}\n${note}` : note;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    private readonly reservationsRepository: ReservationsRepository,
    private readonly catalogService: CatalogService,
    private readonly sitesService: SitesService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    dto: CreateCampaignDto,
    userId: string,
    requestId?: string,
  ): Promise<CampaignResponseDto> {
    const site = await this.sitesService.findById(dto.siteId);

    if (!site.isActive) {
      throw new NotFoundException(SITE_NOT_AVAILABLE);
    }

    const parameterCodes = this.resolveCatalogParameters(dto.parameterCodes);

    try {
      const campaign = await this.campaignsRepository.createWithParameters(
        {
          code: dto.code,
          siteId: site.id,
          earliestStart: dto.earliestStart ? new Date(dto.earliestStart) : null,
          notes: dto.notes ?? null,
          createdBy: userId,
        },
        parameterCodes,
      );

      // Post-commit and best-effort: a lost event never rolls back the campaign.
      await this.eventsService.record({
        campaignId: campaign.id,
        type: CampaignEventType.Created,
        payload: { code: campaign.code, siteId: campaign.siteId },
        actorId: userId,
        requestId: resolveRequestId(requestId),
      });

      return this.toResponse(campaign);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }
  }

  async findAll(query: ListCampaignsQueryDto): Promise<ListCampaignsResponseDto> {
    const { items, total } = await this.campaignsRepository.findPage({
      status: query.status,
      siteId: query.siteId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((campaign) => this.toResponse(campaign)),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findById(id: string): Promise<CampaignDetailResponseDto> {
    const campaign = await this.getCampaignOrFail(id);
    const [parameters, windows, hasActiveReservations] = await Promise.all([
      this.campaignsRepository.findParameterCodes(id),
      this.campaignsRepository.findWindows(id),
      this.campaignsRepository.hasActiveReservations(id),
    ]);
    const site =
      campaign.siteId === null
        ? null
        : await this.sitesService.findById(campaign.siteId).catch(() => null);

    const base = this.toResponse(campaign);

    return {
      id: base.id,
      code: base.code,
      status: base.status,
      siteId: base.siteId,
      earliestStart: base.earliestStart,
      notes: base.notes,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      site,
      parameters,
      windows: windows.map((window) => this.toWindowResponse(window)),
      hasActiveReservations,
    };
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = await this.getCampaignOrFail(id);

    if (campaign.status !== CampaignStatus.Draft) {
      throw new InvalidStateTransitionError(EDIT_ONLY_DRAFT);
    }

    const patch: Partial<Campaign> = {};
    const parameterCodes =
      dto.parameterCodes === undefined
        ? undefined
        : this.resolveCatalogParameters(dto.parameterCodes);

    if (dto.earliestStart !== undefined) patch.earliestStart = new Date(dto.earliestStart);
    if (dto.notes !== undefined) patch.notes = dto.notes;

    const updated = await this.campaignsRepository.updateWithParameters(id, patch, parameterCodes);

    if (!updated) {
      throw new InvalidStateTransitionError(CONCURRENT_TRANSITION);
    }

    return this.toResponse(await this.getCampaignOrFail(id));
  }

  async transition(
    id: string,
    to: CampaignStatus,
    reason?: string,
    actorId: string | null = null,
    requestId?: string,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.getCampaignOrFail(id);

    if (to === CampaignStatus.Cancelled && campaign.status === CampaignStatus.Cancelled) {
      return this.toResponse(campaign);
    }

    assertTransition(campaign.status, to);
    await this.assertPreconditions(campaign, to);

    const trimmedReason = reason?.trim();
    const requiresReason =
      to === CampaignStatus.Cancelled || to === CampaignStatus.NeedsReschedule;

    if (requiresReason && !trimmedReason) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'Debe indicar un motivo para esta transición.',
      });
    }

    if (to === CampaignStatus.NeedsReschedule || to === CampaignStatus.Cancelled) {
      await this.reservationsRepository.releaseByCampaign(id);
    }

    const notes = trimmedReason ? appendNote(campaign.notes, trimmedReason) : undefined;
    const updated = await this.campaignsRepository.transitionStatus(
      id,
      campaign.status,
      to,
      notes,
    );

    if (!updated) {
      throw new InvalidStateTransitionError(CONCURRENT_TRANSITION);
    }

    await this.eventsService.record({
      campaignId: id,
      type: CampaignEventType.StatusChanged,
      payload: { from: campaign.status, to, reason: trimmedReason ?? null },
      actorId,
      requestId: resolveRequestId(requestId),
    });

    return this.toResponse(await this.getCampaignOrFail(id));
  }

  async persistWindows(
    id: string,
    windows: FeasibleWindowInputDto[],
  ): Promise<CampaignDetailResponseDto> {
    const campaign = await this.getCampaignOrFail(id);

    this.assertWindowsEditable(campaign);
    await this.campaignsRepository.persistWindows(
      id,
      windows.map((window) => this.toWindowInput(window)),
    );

    return this.findById(id);
  }

  async selectWindow(id: string, windowId: string): Promise<CampaignDetailResponseDto> {
    const campaign = await this.getCampaignOrFail(id);

    this.assertWindowsEditable(campaign);

    if (!(await this.campaignsRepository.selectWindow(id, windowId))) {
      throw new NotFoundException(WINDOW_NOT_FOUND);
    }

    return this.findById(id);
  }

  async cancel(id: string, actorId: string | null = null, requestId?: string): Promise<void> {
    const campaign = await this.getCampaignOrFail(id);

    if (campaign.status === CampaignStatus.Cancelled) {
      return;
    }

    assertTransition(campaign.status, CampaignStatus.Cancelled);
    await this.reservationsRepository.releaseByCampaign(id);

    const updated = await this.campaignsRepository.transitionStatus(
      id,
      campaign.status,
      CampaignStatus.Cancelled,
      appendNote(campaign.notes, CANCELLED_NOTE),
    );

    if (!updated) {
      throw new InvalidStateTransitionError(CONCURRENT_TRANSITION);
    }

    await this.eventsService.record({
      campaignId: id,
      type: CampaignEventType.Cancelled,
      payload: { from: campaign.status, reason: CANCELLED_NOTE },
      actorId,
      requestId: resolveRequestId(requestId),
    });
  }

  private async assertPreconditions(campaign: Campaign, to: CampaignStatus): Promise<void> {
    if (
      to === CampaignStatus.Planned &&
      (campaign.status === CampaignStatus.Draft ||
        campaign.status === CampaignStatus.NeedsReschedule) &&
      !(await this.campaignsRepository.hasWindows(campaign.id))
    ) {
      throw new BadRequestException({
        code: 'NO_WINDOW_SELECTED',
        message: 'Defina al menos una ventana antes de planificar la campaña.',
      });
    }

    if (
      to === CampaignStatus.Confirmed &&
      !(await this.campaignsRepository.hasActiveReservations(campaign.id))
    ) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_RESERVATION',
        message: 'Reserve técnico, equipo y vehículo antes de confirmar la campaña.',
      });
    }

    if (
      to === CampaignStatus.InField &&
      !(await this.campaignsRepository.hasSelectedWindow(campaign.id))
    ) {
      throw new BadRequestException({
        code: 'NO_SELECTED_WINDOW',
        message: 'Seleccione una ventana antes de iniciar el trabajo en terreno.',
      });
    }
  }

  private assertWindowsEditable(campaign: Campaign): void {
    if (campaign.status !== CampaignStatus.Draft && campaign.status !== CampaignStatus.Planned) {
      throw new InvalidStateTransitionError(WINDOWS_EDITABLE);
    }
  }

  private async getCampaignOrFail(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(CAMPAIGN_NOT_FOUND);
    }

    return campaign;
  }

  // Parameter codes always come from the shared catalog; unknown codes never reach the database.
  private resolveCatalogParameters(parameterCodes: string[]): string[] {
    const known = new Set(this.catalogService.getParameters().map((parameter) => parameter.code));
    const unique = [...new Set(parameterCodes)];
    const unknown = unique.filter((code) => !known.has(code));

    if (unknown.length > 0) {
      throw new BadRequestException({
        code: 'UNKNOWN_PARAMETER',
        message: `Los parámetros ${unknown.join(', ')} no existen en el catálogo.`,
      });
    }

    if (unique.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Debe seleccionar al menos un parámetro.',
      });
    }

    return unique;
  }

  private toWindowInput(window: FeasibleWindowInputDto): CampaignWindowInput {
    const startsAt = new Date(window.startsAt);
    const endsAt = new Date(window.endsAt);

    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new BadRequestException({
        code: 'INVALID_WINDOW',
        message: 'Cada ventana debe terminar después de empezar.',
      });
    }

    return {
      startsAt,
      endsAt,
      transportMinutes: window.transportMinutes,
      holdingDeadline: window.holdingDeadline ? new Date(window.holdingDeadline) : null,
    };
  }

  private toResponse(campaign: Campaign): CampaignResponseDto {
    return {
      id: campaign.id,
      code: campaign.code,
      status: campaign.status,
      siteId: campaign.siteId,
      earliestStart: campaign.earliestStart,
      notes: campaign.notes,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private toWindowResponse(window: CampaignWindow): CampaignWindowDto {
    return {
      id: window.id,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      transportMinutes: window.transportMinutes,
      holdingDeadline: window.holdingDeadline,
      isSelected: window.isSelected,
    };
  }
}

