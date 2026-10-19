import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonitoringAreaResponseDto {
  @ApiProperty({ example: 'MA-4' })
  code!: string;

  @ApiProperty({ example: 'Río Maipo: Río Clarillo a Río Mapocho' })
  description!: string;
}

export class RegulationResponseDto {
  @ApiProperty({ example: 'DS53-2014-MMA' })
  code!: string;

  @ApiProperty({ example: 'D.S. N.º 53/2014 MMA: Normas Secundarias de Calidad Ambiental...' })
  name!: string;

  @ApiProperty({ example: 'CL-RM' })
  jurisdiction!: string;

  @ApiProperty({ example: 'cuenca_maipo' })
  scope!: string;

  @ApiProperty({ example: 'https://www.bcn.cl/leychile/navegar?idNorma=1063954' })
  officialSourceUrl!: string;

  @ApiProperty({ example: '2014' })
  version!: string;

  @ApiProperty({ example: '2014-07-04' })
  effectiveDate!: string;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 3 })
  evaluationWindowYears!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  minimumSeasonalCoverage!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 12 })
  samplesPerYearTarget!: number | null;

  @ApiPropertyOptional({ type: [MonitoringAreaResponseDto] })
  monitoringAreas!: MonitoringAreaResponseDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
}
