import { ApiProperty } from '@nestjs/swagger';
import { WATER_BODY_TYPES } from '../entities/site.entity';
import type { WaterBodyType } from '../entities/site.entity';

export class SiteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'RIO-MAIPO-01' })
  code!: string;

  @ApiProperty({ example: 'Río Maipo en Puente Maipo' })
  name!: string;

  @ApiProperty({ enum: WATER_BODY_TYPES, enumName: 'WaterBodyType' })
  waterBodyType!: WaterBodyType;

  @ApiProperty({ example: -33.61, description: 'WGS84 latitude' })
  latitude!: number;

  @ApiProperty({ example: -70.58, description: 'WGS84 longitude' })
  longitude!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
