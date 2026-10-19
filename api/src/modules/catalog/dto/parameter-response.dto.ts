import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParameterResponseDto {
  @ApiProperty({ example: 'N_NO3' })
  code!: string;

  @ApiProperty({ example: 'Nitrato (como N-NO₃)' })
  nameEs!: string;

  @ApiProperty({ example: 'nutriente' })
  category!: string;

  @ApiProperty({ example: 'MG_N_L' })
  canonicalUnitCode!: string;

  @ApiProperty({ example: 3 })
  decimals!: number;

  @ApiProperty({ example: 'lab', enum: ['in_situ', 'lab'] })
  measurementType!: string;

  @ApiProperty({ example: true })
  requiresLabWindow!: boolean;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 48 })
  holdingTimeHours!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Refrigerar ≤6°C' })
  preservation!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Plástico o vidrio' })
  container!: string | null;

  @ApiProperty({ example: 'SMEWW 4110 B / 4500-NO3 B / 4500-NO3 D' })
  methodReference!: string;

  @ApiProperty({ example: 'as_N' })
  reportingBasis!: string;

  @ApiProperty({ example: false })
  mvpOptional!: boolean;

  @ApiProperty({ example: 'draft-verified' })
  status!: string;

  @ApiProperty({
    example: 'Tabla 4 D.S. 53/2014. EPA: 48 h para especiación de nitrógeno inorgánico.',
  })
  sourceNote!: string;
}
