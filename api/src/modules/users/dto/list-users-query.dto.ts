import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Role } from '../../auth/types/role.enum';

export const USER_SORT_FIELDS = ['email', 'fullName', 'role', 'createdAt'] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role, enumName: 'Role', description: 'Filter by role' })
  @IsOptional()
  @IsIn(Object.values(Role))
  role?: Role;

  @ApiPropertyOptional({ example: 'terraplan', description: 'Search over email and full name' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;

  @ApiPropertyOptional({ enum: USER_SORT_FIELDS, default: 'email' })
  @IsOptional()
  @IsIn([...USER_SORT_FIELDS])
  sort: UserSortField = 'email';
}
