import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class FeasibleWindowInputDto {
  @ApiProperty({ example: '2026-11-16T13:00:00Z', description: 'UTC ISO-8601 instant' })
  @IsISO8601({ strict: true })
  startsAt!: string;

  @ApiProperty({ example: '2026-11-16T15:00:00Z', description: 'UTC ISO-8601 instant' })
  @IsISO8601({ strict: true })
  endsAt!: string;

  @ApiProperty({ example: 90, minimum: 0, maximum: 1440 })
  @IsInt()
  @Min(0)
  @Max(1440)
  transportMinutes!: number;

  @ApiPropertyOptional({
    example: '2026-11-17T15:00:00Z',
    nullable: true,
    type: String,
    description: 'null when no selected parameter requires a lab window',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  holdingDeadline?: string | null;
}

export class PersistWindowsDto {
  @ApiProperty({ type: [FeasibleWindowInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FeasibleWindowInputDto)
  windows!: FeasibleWindowInputDto[];
}
