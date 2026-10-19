import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateTechnicianDto {
  @ApiProperty({ example: 'TECH-01', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  code!: string;

  @ApiProperty({ example: 'Camila Rojas', minLength: 3, maxLength: 120 })
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Login account to link; it must belong to a field_technician user',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(6, 30)
  phone?: string;

  @ApiPropertyOptional({
    example: ['pH', 'OD'],
    type: [String],
    maxItems: 20,
    description: 'Free-form skills (20 max) until the catalog link lands in R7',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
