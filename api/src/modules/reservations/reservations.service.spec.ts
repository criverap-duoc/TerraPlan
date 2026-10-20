import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { Clock } from '../../common/clock/clock.types';
import type { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import type { EquipmentService } from '../equipment/equipment.service';
import type { EventsService } from '../events/events.service';
import type { TechniciansService } from '../technicians/technicians.service';
import type { VehiclesService } from '../vehicles/vehicles.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { ResourceBooking } from './entities/resource-booking.entity';
import { ResourceConflictError } from './errors/resource-conflict.error';
import type { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';

const CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const TECHNICIAN_ID = '5f1c3a9e-8a43-4f0e-9d0b-2c6b7f1a0d11';
const EQUIPMENT_ID = '9b2d4c11-7e6a-4c39-8a1f-3d5e6f7a8b9c';
const VEHICLE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const NOW = new Date('2026-01-01T00:00:00Z');
const USER_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const REQUEST_ID = 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b';

const WINDOW = { startsAt: '2026-11-15T13:00:00Z', endsAt: '2026-11-15T17:00:00Z' };

function buildRow(resourceType: ResourceBooking['resourceType'], resourceId: string): ResourceBooking {
  return {
    id: `row-${resourceType}`,
    campaignId: CAMPAIGN_ID,
    resourceType,
    resourceId,
    during: '[2026-11-15 13:00:00+00,2026-11-15 17:00:00+00)',
    status: 'active',
    createdAt: new Date('2026-10-19T14:05:00Z'),
  };
}

describe('ReservationsService', () => {
  let repository: {
    bookTriple: jest.Mock;
    releaseByCampaign: jest.Mock;
    findActiveByCampaign: jest.Mock;
  };
  let campaignsService: { findById: jest.Mock };
  let techniciansService: { findById: jest.Mock };
  let equipmentService: { findById: jest.Mock };
  let vehiclesService: { findById: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };
  let clock: Clock;
  let events: { record: jest.Mock };
  let service: ReservationsService;
  let dto: CreateBookingDto;

  beforeEach(() => {
    repository = {
      bookTriple: jest.fn(),
      releaseByCampaign: jest.fn(),
      findActiveByCampaign: jest.fn(),
    };
    campaignsService = {
      findById: jest.fn().mockResolvedValue({
        id: CAMPAIGN_ID,
        code: 'CAMP-2026-0001',
        status: CampaignStatus.Draft,
      }),
    };
    techniciansService = {
      findById: jest.fn().mockResolvedValue({ id: TECHNICIAN_ID, code: 'TECH-01', isActive: true }),
    };
    equipmentService = {
      findById: jest.fn().mockResolvedValue({ id: EQUIPMENT_ID, code: 'EQ-SONDA-01', isActive: true }),
    };
    vehiclesService = {
      findById: jest.fn().mockResolvedValue({ id: VEHICLE_ID, code: 'VH-01', isActive: true }),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    clock = { now: () => NOW };
    events = { record: jest.fn().mockResolvedValue({ recorded: true }) };
    dto = {
      technicianId: TECHNICIAN_ID,
      equipmentId: EQUIPMENT_ID,
      vehicleId: VEHICLE_ID,
      ...WINDOW,
    };

    service = new ReservationsService(
      repository as unknown as ReservationsRepository,
      campaignsService as unknown as CampaignsService,
      techniciansService as unknown as TechniciansService,
      equipmentService as unknown as EquipmentService,
      vehiclesService as unknown as VehiclesService,
      { createQueryRunner: () => queryRunner } as unknown as DataSource,
      clock,
      events as unknown as EventsService,
    );
  });

  it('rejects a window whose start is not before its end', async () => {
    await expect(
      service.bookTriple(CAMPAIGN_ID, {
        technicianId: TECHNICIAN_ID,
        equipmentId: EQUIPMENT_ID,
        vehicleId: VEHICLE_ID,
        startsAt: WINDOW.endsAt,
        endsAt: WINDOW.startsAt,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.bookTriple).not.toHaveBeenCalled();
  });

  it('rejects bookings longer than 24 hours', async () => {
    await expect(
      service.bookTriple(CAMPAIGN_ID, {
        technicianId: TECHNICIAN_ID,
        equipmentId: EQUIPMENT_ID,
        vehicleId: VEHICLE_ID,
        startsAt: '2026-11-15T00:00:00Z',
        endsAt: '2026-11-16T00:00:01Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.bookTriple).not.toHaveBeenCalled();
  });

  it('rejects windows that already ended', async () => {
    await expect(
      service.bookTriple(CAMPAIGN_ID, {
        technicianId: TECHNICIAN_ID,
        equipmentId: EQUIPMENT_ID,
        vehicleId: VEHICLE_ID,
        startsAt: '2025-12-30T10:00:00Z',
        endsAt: '2025-12-30T12:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.bookTriple).not.toHaveBeenCalled();
  });

  it('throws 404 when the campaign does not exist', async () => {
    campaignsService.findById.mockRejectedValue(new NotFoundException('Campaña no encontrada.'));

    await expect(service.bookTriple(CAMPAIGN_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.bookTriple).not.toHaveBeenCalled();
  });

  it('rejects bookings when the campaign is already confirmed', async () => {
    campaignsService.findById.mockResolvedValue({
      id: CAMPAIGN_ID,
      code: 'CAMP-2026-0001',
      status: CampaignStatus.Confirmed,
    });

    const error: unknown = await service
      .bookTriple(CAMPAIGN_ID, dto)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
    expect(repository.bookTriple).not.toHaveBeenCalled();
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('throws 404 when the technician is inactive', async () => {
    techniciansService.findById.mockResolvedValue({ id: TECHNICIAN_ID, code: 'TECH-01', isActive: false });

    await expect(service.bookTriple(CAMPAIGN_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('throws 404 when the equipment does not exist', async () => {
    equipmentService.findById.mockRejectedValue(new NotFoundException('Equipo no encontrado.'));

    await expect(service.bookTriple(CAMPAIGN_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.bookTriple).not.toHaveBeenCalled();
  });

  it('books the three resources in one transaction', async () => {
    repository.bookTriple.mockResolvedValue([
      buildRow('technician', TECHNICIAN_ID),
      buildRow('equipment', EQUIPMENT_ID),
      buildRow('vehicle', VEHICLE_ID),
    ]);

    const result = await service.bookTriple(CAMPAIGN_ID, dto);

    expect(repository.bookTriple).toHaveBeenCalledWith(
      queryRunner,
      CAMPAIGN_ID,
      TECHNICIAN_ID,
      EQUIPMENT_ID,
      VEHICLE_ID,
      { startsAt: '2026-11-15T13:00:00.000Z', endsAt: '2026-11-15T17:00:00.000Z' },
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(result.campaignId).toBe(CAMPAIGN_ID);
    expect(result.status).toBe('active');
    expect(result.bookings).toHaveLength(3);
  });

  it('rolls back and names the conflicting resource', async () => {
    repository.bookTriple.mockRejectedValue(new ResourceConflictError('vehicle', VEHICLE_ID));

    const error: unknown = await service.bookTriple(CAMPAIGN_ID, dto).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ResourceConflictError);
    expect((error as ResourceConflictError).resourceCode).toBe('VH-01');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('releases the active bookings of a campaign', async () => {
    repository.releaseByCampaign.mockResolvedValue(3);

    await expect(service.releaseByCampaign(CAMPAIGN_ID)).resolves.toBe(3);
    expect(repository.releaseByCampaign).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it('records a booking_created event with the three bookings', async () => {
    const bookings = [
      buildRow('technician', TECHNICIAN_ID),
      buildRow('equipment', EQUIPMENT_ID),
      buildRow('vehicle', VEHICLE_ID),
    ];
    repository.bookTriple.mockResolvedValue(bookings);

    await service.bookTriple(CAMPAIGN_ID, dto, USER_ID, REQUEST_ID);

    expect(events.record).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: 'booking_created',
      payload: {
        bookings: bookings.map((booking) => ({
          id: booking.id,
          resourceType: booking.resourceType,
          resourceId: booking.resourceId,
          during: booking.during,
        })),
        startsAt: '2026-11-15T13:00:00.000Z',
        endsAt: '2026-11-15T17:00:00.000Z',
      },
      actorId: USER_ID,
      requestId: REQUEST_ID,
    });
  });

  it('records a booking_released event with the released count', async () => {
    repository.releaseByCampaign.mockResolvedValue(3);

    const count = await service.releaseByCampaign(CAMPAIGN_ID, USER_ID, REQUEST_ID);

    expect(count).toBe(3);
    expect(events.record).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: 'booking_released',
      payload: { count: 3 },
      actorId: USER_ID,
      requestId: REQUEST_ID,
    });
  });

  it('lists the active bookings of a campaign', async () => {
    repository.findActiveByCampaign.mockResolvedValue([buildRow('technician', TECHNICIAN_ID)]);

    const rows = await service.listByCampaign(CAMPAIGN_ID);

    expect(rows).toEqual([
      {
        id: 'row-technician',
        campaignId: CAMPAIGN_ID,
        resourceType: 'technician',
        resourceId: TECHNICIAN_ID,
        during: '[2026-11-15 13:00:00+00,2026-11-15 17:00:00+00)',
        status: 'active',
        createdAt: new Date('2026-10-19T14:05:00Z'),
      },
    ]);
  });

  it('throws 404 when releasing a campaign that does not exist', async () => {
    campaignsService.findById.mockRejectedValue(new NotFoundException('Campaña no encontrada.'));

    await expect(service.releaseByCampaign(CAMPAIGN_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.releaseByCampaign).not.toHaveBeenCalled();
  });
});
