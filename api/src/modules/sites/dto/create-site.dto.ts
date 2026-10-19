import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { WATER_BODY_TYPES } from '../entities/site.entity';
import type { WaterBodyType } from '../entities/site.entity';

export class CreateSiteDto {
  @ApiProperty({ example: 'RIO-MAIPO-01', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  code!: string;

  @ApiProperty({ example: 'Río Maipo en Puente Maipo', minLength: 3, maxLength: 120 })
  @IsString()
  @Length(3, 120)
  name!: string;

  @ApiProperty({ enum: WATER_BODY_TYPES, enumName: 'WaterBodyType', example: 'river' })
  @IsIn([...WATER_BODY_TYPES])
  waterBodyType!: WaterBodyType;

  @ApiProperty({ example: -33.61, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -70.58, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ default: true, description: 'Whether the site is available for campaigns' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
