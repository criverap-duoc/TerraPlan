import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { QueryRunner } from 'typeorm';
import { Repository } from 'typeorm';
import { ResourceBooking } from './entities/resource-booking.entity';
import { ResourceConflictError } from './errors/resource-conflict.error';
import type { ReservationResourceType } from './types/reservation.types';

const INSERT_BOOKING = `
  INSERT INTO resource_booking (campaign_id, resource_type, resource_id, during)
  VALUES ($1, $2, $3, tstzrange($4::timestamptz, $5::timestamptz, '[)'))
  RETURNING
    id,
    campaign_id AS "campaignId",
    resource_type AS "resourceType",
    resource_id AS "resourceId",
    during::text AS during,
    status,
    created_at AS "createdAt"
`;

const SELECT_ACTIVE_BY_CAMPAIGN = `
  SELECT
    id,
    campaign_id AS "campaignId",
    resource_type AS "resourceType",
    resource_id AS "resourceId",
    during::text AS during,
    status,
    created_at AS "createdAt"
  FROM resource_booking
  WHERE campaign_id = $1 AND status = 'active'
  ORDER BY created_at
`;

// RETURNING id keeps the affected-row count reliable across drivers.
const RELEASE_BY_CAMPAIGN = `
  UPDATE resource_booking
  SET status = 'released'
  WHERE campaign_id = $1 AND status = 'active'
  RETURNING id
`;

const EXCLUSION_VIOLATION = '23P01';

export interface BookingWindow {
  startsAt: string;
  endsAt: string;
}

@Injectable()
export class ReservationsRepository {
  constructor(
    @InjectRepository(ResourceBooking)
    private readonly repository: Repository<ResourceBooking>,
  ) {}

  // The three inserts share the caller's transaction: any violation rolls the whole booking back.
  async bookTriple(
    queryRunner: QueryRunner,
    campaignId: string,
    technicianId: string,
    equipmentId: string,
    vehicleId: string,
    window: BookingWindow,
  ): Promise<ResourceBooking[]> {
    const targets: { resourceType: ReservationResourceType; resourceId: string }[] = [
      { resourceType: 'technician', resourceId: technicianId },
      { resourceType: 'equipment', resourceId: equipmentId },
      { resourceType: 'vehicle', resourceId: vehicleId },
    ];
    const bookings: ResourceBooking[] = [];

    for (const target of targets) {
      try {
        const rows = (await queryRunner.query(INSERT_BOOKING, [
          campaignId,
          target.resourceType,
          target.resourceId,
          window.startsAt,
          window.endsAt,
        ])) as ResourceBooking[];

        bookings.push(...rows);
      } catch (error) {
        throw this.toResourceConflict(error, target.resourceType, target.resourceId);
      }
    }

    return bookings;
  }

  async releaseByCampaign(campaignId: string): Promise<number> {
    // TypeORM returns [rows, affectedCount] for UPDATE ... RETURNING.
    const [rows] = (await this.repository.query(RELEASE_BY_CAMPAIGN, [campaignId])) as [
      { id: string }[],
      number,
    ];

    return rows.length;
  }

  findActiveByCampaign(campaignId: string): Promise<ResourceBooking[]> {
    return this.repository.query(SELECT_ACTIVE_BY_CAMPAIGN, [campaignId]) as Promise<
      ResourceBooking[]
    >;
  }

  // SQLSTATE 23P01 is the exclusion constraint: another transaction holds an overlapping range.
  private toResourceConflict(
    error: unknown,
    resourceType: ReservationResourceType,
    resourceId: string,
  ): unknown {
    const driverError = (error as { driverError?: { code?: string } }).driverError;
    const code = driverError?.code ?? (error as { code?: string }).code;

    return code === EXCLUSION_VIOLATION
      ? new ResourceConflictError(resourceType, resourceId)
      : error;
  }
}
