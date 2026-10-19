import { ApiProperty } from '@nestjs/swagger';
import type { ReservationResourceType } from '../types/reservation.types';

export class BookingRowDto {
  @ApiProperty({ example: '0f7f9a3c-1f2d-4b5e-9c8a-7b6d5e4f3a2b' })
  id!: string;

  @ApiProperty({ example: '5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d1c' })
  campaignId!: string;

  @ApiProperty({ enum: ['technician', 'equipment', 'vehicle'], example: 'technician' })
  resourceType!: ReservationResourceType;

  @ApiProperty({ example: '5f1c3a9e-8a43-4f0e-9d0b-2c6b7f1a0d11' })
  resourceId!: string;

  @ApiProperty({ example: '["2026-11-15 13:00:00+00","2026-11-15 17:00:00+00")' })
  during!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2026-10-19T14:05:00.000Z' })
  createdAt!: Date;
}
