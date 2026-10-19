import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../types/role.enum';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'coordinator@terraplan.local' })
  email!: string;

  @ApiProperty({ example: 'Coordinador Demo' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;
}
