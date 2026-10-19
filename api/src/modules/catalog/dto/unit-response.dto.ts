import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnitResponseDto {
  @ApiProperty({ example: 'MG_N_L' })
  code!: string;

  @ApiProperty({ example: 'miligramo de nitrógeno por litro' })
  nameEs!: string;

  @ApiProperty({ example: 'concentracion' })
  dimension!: string;

  @ApiProperty({ example: 1 })
  factorToCanonical!: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Factor aproximado; solo para conversiones informativas.',
  })
  notes!: string | null;
}
