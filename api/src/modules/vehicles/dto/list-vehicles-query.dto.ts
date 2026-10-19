import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const VEHICLE_SORT_FIELDS = ['code', 'name', 'plate', 'createdAt'] as const;

export type VehicleSortField = (typeof VEHICLE_SORT_FIELDS)[number];

export class ListVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'hilux', description: 'Search over code, name and plate' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;

  @ApiPropertyOptional({ enum: VEHICLE_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...VEHICLE_SORT_FIELDS])
  sort: VehicleSortField = 'code';
}
