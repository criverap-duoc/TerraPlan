import { ApiProperty } from '@nestjs/swagger';
import { CAMPAIGN_EVENT_TYPES } from '../types/campaign-event-type.enum';
import type { CampaignEventType } from '../types/campaign-event-type.enum';

export class EventResponseDto {
  @ApiProperty({ description: 'MongoDB document id' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ enum: CAMPAIGN_EVENT_TYPES, enumName: 'CampaignEventType' })
  type!: CampaignEventType;

  @ApiProperty({ type: Object, additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  actorId!: string | null;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;

  @ApiProperty({ format: 'date-time' })
  at!: string;
}
