import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class FeasibleWindowsQueryDto {
  @ApiProperty({ example: '2026-11-16T13:00:00Z', description: 'UTC ISO-8601 instant' })
  @IsISO8601({ strict: true })
  earliestStart!: string;

  @ApiProperty({ example: '2026-11-20T22:00:00Z', description: 'UTC ISO-8601 instant' })
  @IsISO8601({ strict: true })
  latestEnd!: string;

  @ApiProperty({ example: 120, minimum: 15, maximum: 1440 })
  @IsInt()
  @Min(15)
  @Max(1440)
  slotMinutes!: number;

  @ApiProperty({
    example: 90,
    minimum: 0,
    maximum: 1440,
    description: 'Minutes between the end of sampling and the arrival at the lab',
  })
  @IsInt()
  @Min(0)
  @Max(1440)
  transportMinutes!: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['TURB', 'N_NO3'],
    description:
      'Catalog parameter codes of the campaign. When omitted, every parameter that requires a ' +
      'lab window is used.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  parameterCodes?: string[];
}
