import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WATER_BODY_TYPES } from '../entities/site.entity';
import type { WaterBodyType } from '../entities/site.entity';

export const SITE_SORT_FIELDS = ['code', 'name', 'createdAt'] as const;

export type SiteSortField = (typeof SITE_SORT_FIELDS)[number];

export class ListSitesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WATER_BODY_TYPES, description: 'Filter by water body type' })
  @IsOptional()
  @IsIn([...WATER_BODY_TYPES])
  waterBodyType?: WaterBodyType;

  @ApiPropertyOptional({ default: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'maipo', description: 'Search over code and name' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;

  @ApiPropertyOptional({ enum: SITE_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...SITE_SORT_FIELDS])
  sort: SiteSortField = 'code';
}
