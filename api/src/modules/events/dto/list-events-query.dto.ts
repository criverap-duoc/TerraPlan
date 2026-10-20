import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { CAMPAIGN_EVENT_TYPES } from '../types/campaign-event-type.enum';
import type { CampaignEventType } from '../types/campaign-event-type.enum';

export const DEFAULT_EVENT_LIMIT = 50;
export const MAX_EVENT_LIMIT = 200;
export const BASE64_CURSOR_PATTERN = /^[A-Za-z0-9+/=]+$/;

export class ListEventsQueryDto {
  @ApiPropertyOptional({ enum: CAMPAIGN_EVENT_TYPES, enumName: 'CampaignEventType' })
  @IsOptional()
  @IsIn(CAMPAIGN_EVENT_TYPES)
  type?: CampaignEventType;

  @ApiPropertyOptional({
    example: 'eyJhdCI6IjIwMjYtMTEtMDFUMTM6MDU6MDBaIiwiaWQiOiI2NzJhIn0=',
    description: 'Opaque cursor from meta.nextCursor (base64 of { at, id })',
  })
  @IsOptional()
  @IsString()
  @Matches(BASE64_CURSOR_PATTERN, { message: 'before must be a base64 pagination cursor' })
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
