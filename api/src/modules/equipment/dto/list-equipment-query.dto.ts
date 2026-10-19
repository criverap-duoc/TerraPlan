import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const EQUIPMENT_SORT_FIELDS = ['code', 'name', 'category', 'createdAt'] as const;

export type EquipmentSortField = (typeof EQUIPMENT_SORT_FIELDS)[number];

export class ListEquipmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'sonda', description: 'Search over code and name' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;

  @ApiPropertyOptional({ enum: EQUIPMENT_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...EQUIPMENT_SORT_FIELDS])
  sort: EquipmentSortField = 'code';
}
