import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const OBSERVATION_QUALIFIERS = ['<', '>'] as const;
export const QC_FLAGS = ['ok', 'suspect', 'failed'] as const;
export const OBSERVATION_SOURCES = ['lab', 'field', 'sensor'] as const;

export type ObservationQualifier = (typeof OBSERVATION_QUALIFIERS)[number];
export type QcFlag = (typeof QC_FLAGS)[number];
export type ObservationSource = (typeof OBSERVATION_SOURCES)[number];

export class AquaMetricObservationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  siteId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null for sensor readings' })
  sampleId!: string | null;

  @ApiProperty({ example: 'PH' })
  parameterCode!: string;

  @ApiProperty({ type: Number, nullable: true, example: 7.42, description: 'null when censored' })
  value!: number | null;

  @ApiProperty({ example: 'UPH' })
  unitCode!: string;

  @ApiPropertyOptional({ enum: OBSERVATION_QUALIFIERS, nullable: true })
  qualifier!: ObservationQualifier | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Limit of quantification' })
  loq!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SMEWW 4500-H+ B' })
  method!: string | null;

  @ApiProperty({ format: 'date-time' })
  analyzedAt!: string;

  @ApiProperty({ enum: QC_FLAGS })
  qcFlag!: QcFlag;

  @ApiProperty({ enum: OBSERVATION_SOURCES })
  source!: ObservationSource;
}
