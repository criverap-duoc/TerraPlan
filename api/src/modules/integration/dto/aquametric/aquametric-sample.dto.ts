import { ApiProperty } from '@nestjs/swagger';

export const SAMPLE_STATUSES = [
  'collected',
  'in_transit',
  'received',
  'analyzed',
  'rejected',
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export class AquaMetricSampleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  siteId!: string;

  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: 'water' })
  matrix!: string;

  @ApiProperty({ format: 'date-time', description: 'Sampling window end in UTC' })
  collectedAt!: string;

  @ApiProperty({ format: 'date-time', description: 'Estimated arrival at the laboratory' })
  labReceivedAt!: string;

  @ApiProperty({ enum: SAMPLE_STATUSES })
  status!: SampleStatus;
}
