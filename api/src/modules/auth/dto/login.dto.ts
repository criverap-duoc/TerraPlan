import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'coordinator@terraplan.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Coord1234!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
