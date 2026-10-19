import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '5f1c3a9e-8a43-4f0e-9d0b-2c6b7f1a0d11' })
  @IsUUID()
  technicianId!: string;

  @ApiProperty({ example: '9b2d4c11-7e6a-4c39-8a1f-3d5e6f7a8b9c' })
  @IsUUID()
  equipmentId!: string;

  @ApiProperty({ example: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ example: '2026-11-15T13:00:00Z', description: 'Window start in UTC (inclusive)' })
  @IsISO8601({ strict: true })
  startsAt!: string;

  @ApiProperty({ example: '2026-11-15T17:00:00Z', description: 'Window end in UTC (exclusive)' })
  @IsISO8601({ strict: true })
  endsAt!: string;
}
