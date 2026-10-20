import { ApiProperty } from '@nestjs/swagger';
import { AquaMetricPublishPayloadDto } from './aquametric/aquametric-publish-payload.dto';

export class PublishCampaignResponseDto {
  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: true })
  published!: boolean;

  @ApiProperty({ example: '1.0.0' })
  catalogVersion!: string;

  @ApiProperty({
    example: 'b6f1a0c7d2e9…',
    description: 'Deterministic SHA-256 of the payload, sent as Idempotency-Key',
  })
  idempotencyKey!: string;

  @ApiProperty({ example: 2 })
  observationCount!: number;

  @ApiProperty({ example: 'RIO-MAIPO-01' })
  siteCode!: string;

  @ApiProperty({ type: AquaMetricPublishPayloadDto, description: 'Exact payload sent to AquaMetric' })
  payload!: AquaMetricPublishPayloadDto;
}
