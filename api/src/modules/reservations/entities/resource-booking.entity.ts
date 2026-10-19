import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { BookingStatus, ReservationResourceType } from '../types/reservation.types';

// Writes and reads of `during` (tstzrange) go through parameterized SQL in the repository;
// TypeORM has no native range support, so the column is mapped as text here.
@Entity({ name: 'resource_booking' })
export class ResourceBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: ReservationResourceType;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ type: 'text' })
  during!: string;

  @Column({ type: 'text', default: 'active' })
  status!: BookingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
