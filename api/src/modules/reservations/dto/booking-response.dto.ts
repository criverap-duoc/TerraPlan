import { ApiProperty } from '@nestjs/swagger';
import type { ReservationResourceType } from '../types/reservation.types';

export class BookingItemDto {
  @ApiProperty({ example: '0f7f9a3c-1f2d-4b5e-9c8a-7b6d5e4f3a2b' })
  id!: string;

  @ApiProperty({ enum: ['technician', 'equipment', 'vehicle'], example: 'vehicle' })
  resourceType!: ReservationResourceType;

  @ApiProperty({ example: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  resourceId!: string;

  @ApiProperty({
    example: '["2026-11-15 13:00:00+00","2026-11-15 17:00:00+00")',
    description: 'Half-open time range stored as tstzrange',
  })
  during!: string;
}

export class BookingResponseDto {
  @ApiProperty({ example: '5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d1c' })
  campaignId!: string;

  @ApiProperty({ type: [BookingItemDto] })
  bookings!: BookingItemDto[];

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2026-10-19T14:05:00.000Z' })
  createdAt!: Date;
}
