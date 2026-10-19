import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const TECHNICIAN_SORT_FIELDS = ['code', 'fullName', 'createdAt'] as const;

export type TechnicianSortField = (typeof TECHNICIAN_SORT_FIELDS)[number];

export class ListTechniciansQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'camila', description: 'Search over code and full name' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;

  @ApiPropertyOptional({ enum: TECHNICIAN_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...TECHNICIAN_SORT_FIELDS])
  sort: TechnicianSortField = 'code';
}
