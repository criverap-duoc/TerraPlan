import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'EQ-SONDA-01', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  code!: string;

  @ApiProperty({ example: 'Sonda multiparamétrica YSI ProDSS', minLength: 3, maxLength: 120 })
  @IsString()
  @Length(3, 120)
  name!: string;

  @ApiProperty({ example: 'multiparametric_probe', maxLength: 60 })
  @IsString()
  @Length(2, 60)
  category!: string;

  @ApiPropertyOptional({ example: 'SN-2024-001', maxLength: 60, nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  serialNumber?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
