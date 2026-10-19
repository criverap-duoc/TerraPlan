import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LimitResponseDto {
  @ApiProperty({ example: 'N_NO3' })
  parameterCode!: string;

  @ApiProperty({ example: 'DS53-2014-MMA' })
  regulationCode!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'MA-4' })
  monitoringAreaCode!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'conservacion' })
  qualityLevel!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'vida_acuatica' })
  context!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'P95' })
  statistic!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 3 })
  evaluationWindowYears!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  minimumSeasonalCoverage!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 6.5 })
  min!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  max!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 0.5 })
  maxIncreaseOverNatural!: number | null;

  @ApiProperty({ example: 'MG_N_L' })
  unitCode!: string;

  @ApiProperty({ example: 'draft-verified' })
  status!: string;

  @ApiProperty({ example: 'Tabla 2 D.S. 53/2014 (BCN)' })
  sourceNote!: string;
}
