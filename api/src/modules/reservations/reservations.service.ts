import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CLOCK } from '../../common/clock/clock.types';
import type { Clock } from '../../common/clock/clock.types';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import { EquipmentService } from '../equipment/equipment.service';
import { EventsService } from '../events/events.service';
import { CampaignEventType } from '../events/types/campaign-event-type.enum';
import { TechniciansService } from '../technicians/technicians.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingRowDto } from './dto/booking-row.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ResourceBooking } from './entities/resource-booking.entity';
import { ResourceConflictError } from './errors/resource-conflict.error';
import { ReservationsRepository } from './reservations.repository';

const MAX_BOOKING_HOURS = 24;
const HOUR_IN_MS = 3_600_000;

const TECHNICIAN_NOT_FOUND = 'El técnico indicado no existe o está inactivo.';
const EQUIPMENT_NOT_FOUND = 'El equipo indicado no existe o está inactivo.';
const VEHICLE_NOT_FOUND = 'El vehículo indicado no existe o está inactivo.';
const CAMPAIGN_NOT_BOOKABLE = 'Solo campañas en borrador o planificadas pueden reservar recursos.';

const BOOKABLE_STATUSES: readonly CampaignStatus[] = [
  CampaignStatus.Draft,
  CampaignStatus.Planned,
];

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly campaignsService: CampaignsService,
    private readonly techniciansService: TechniciansService,
    private readonly equipmentService: EquipmentService,
    private readonly vehiclesService: VehiclesService,
    private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly eventsService: EventsService,
  ) {}

  async bookTriple(
    campaignId: string,
    dto: CreateBookingDto,
    actorId: string | null = null,
    requestId?: string,
  ): Promise<BookingResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de término.');
    }

    if (endsAt.getTime() - startsAt.getTime() > MAX_BOOKING_HOURS * HOUR_IN_MS) {
      throw new BadRequestException('Una reserva no puede durar más de 24 horas.');
    }

    if (endsAt.getTime() <= this.clock.now().getTime()) {
      throw new BadRequestException('No se puede reservar una ventana que ya terminó.');
    }

    const campaign = await this.campaignsService.findById(campaignId);

    if (!BOOKABLE_STATUSES.includes(campaign.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: CAMPAIGN_NOT_BOOKABLE,
      });
    }

    const technician = await this.resolveActive(
      () => this.techniciansService.findById(dto.technicianId),
      TECHNICIAN_NOT_FOUND,
    );
    const equipment = await this.resolveActive(
      () => this.equipmentService.findById(dto.equipmentId),
      EQUIPMENT_NOT_FOUND,
    );
    const vehicle = await this.resolveActive(
      () => this.vehiclesService.findById(dto.vehicleId),
      VEHICLE_NOT_FOUND,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const bookings = await this.reservationsRepository.bookTriple(
        queryRunner,
        campaignId,
        technician.id,
        equipment.id,
        vehicle.id,
        { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
      );

      await queryRunner.commitTransaction();

      // Post-commit: the booking already exists, so the event is audit only.
      await this.eventsService.record({
        campaignId,
        type: CampaignEventType.BookingCreated,
        payload: {
          bookings: bookings.map((booking) => ({
            id: booking.id,
            resourceType: booking.resourceType,
            resourceId: booking.resourceId,
            during: booking.during,
          })),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
        actorId,
        requestId: resolveRequestId(requestId),
      });

      return this.toResponse(campaignId, bookings);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof ResourceConflictError) {
        error.resourceCode = this.resourceCode(error, { technician, equipment, vehicle });
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseByCampaign(
    campaignId: string,
    actorId: string | null = null,
    requestId?: string,
  ): Promise<number> {
    await this.ensureCampaignExists(campaignId);

    const count = await this.reservationsRepository.releaseByCampaign(campaignId);

    await this.eventsService.record({
      campaignId,
      type: CampaignEventType.BookingReleased,
      payload: { count },
      actorId,
      requestId: resolveRequestId(requestId),
    });

    return count;
  }

  async listByCampaign(campaignId: string): Promise<BookingRowDto[]> {
    await this.ensureCampaignExists(campaignId);

    const bookings = await this.reservationsRepository.findActiveByCampaign(campaignId);

    return bookings.map((booking) => this.toRow(booking));
  }

  private async ensureCampaignExists(campaignId: string): Promise<void> {
    // findById throws NotFoundException when the campaign does not exist.
    await this.campaignsService.findById(campaignId);
  }

  private async resolveActive<T extends { isActive: boolean }>(
    loader: () => Promise<T>,
    message: string,
  ): Promise<T> {
    let resource: T | null = null;

    try {
      resource = await loader();
    } catch {
      // Missing resources surface as the same domain error as inactive ones.
      resource = null;
    }

    if (!resource || !resource.isActive) {
      throw new NotFoundException(message);
    }

    return resource;
  }

  private resourceCode(
    error: ResourceConflictError,
    resources: {
      technician: { code: string };
      equipment: { code: string };
      vehicle: { code: string };
    },
  ): string {
    switch (error.resourceType) {
      case 'technician':
        return resources.technician.code;
      case 'equipment':
        return resources.equipment.code;
      default:
        return resources.vehicle.code;
    }
  }

  private toResponse(campaignId: string, bookings: ResourceBooking[]): BookingResponseDto {
    return {
      campaignId,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        resourceType: booking.resourceType,
        resourceId: booking.resourceId,
        during: booking.during,
      })),
      status: bookings[0]?.status ?? 'active',
      createdAt: bookings[0]?.createdAt ?? this.clock.now(),
    };
  }

  private toRow(booking: ResourceBooking): BookingRowDto {
    return {
      id: booking.id,
      campaignId: booking.campaignId,
      resourceType: booking.resourceType,
      resourceId: booking.resourceId,
      during: booking.during,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  }
}
