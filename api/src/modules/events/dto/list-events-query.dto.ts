import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CAMPAIGN_EVENT_TYPES } from '../types/campaign-event-type.enum';
import type { CampaignEventType } from '../types/campaign-event-type.enum';

export const DEFAULT_EVENT_LIMIT = 50;
export const MAX_EVENT_LIMIT = 200;

export class ListEventsQueryDto {
  @ApiPropertyOptional({ enum: CAMPAIGN_EVENT_TYPES, enumName: 'CampaignEventType' })
  @IsOptional()
  @IsIn(CAMPAIGN_EVENT_TYPES)
  type?: CampaignEventType;

  @ApiPropertyOptional({
    example: '2026-11-01T13:05:00Z',
    description: 'Only events recorded strictly before this instant (cursor pagination)',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  before?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_EVENT_LIMIT,
    default: DEFAULT_EVENT_LIMIT,
    description: 'Maximum number of events to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EVENT_LIMIT)
  limit: number = DEFAULT_EVENT_LIMIT;
}
