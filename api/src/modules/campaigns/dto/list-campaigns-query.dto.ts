import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CampaignStatus } from '../types/campaign-status.enum';

export const CAMPAIGN_SORT_FIELDS = ['code', 'status', 'earliestStart', 'createdAt'] as const;

export type CampaignSortField = (typeof CAMPAIGN_SORT_FIELDS)[number];

const CAMPAIGN_STATUSES = Object.values(CampaignStatus);

export class ListCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus, enumName: 'CampaignStatus' })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: CampaignStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    example: '2026-11-01T00:00:00Z',
    description: 'Only campaigns whose earliestStart is at or after this instant',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-30T23:59:59Z',
    description: 'Only campaigns whose earliestStart is at or before this instant',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: CAMPAIGN_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...CAMPAIGN_SORT_FIELDS])
  sort: CampaignSortField = 'code';
}
