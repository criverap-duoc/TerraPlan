import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'VH-01', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  code!: string;

  @ApiProperty({ example: 'Camioneta Toyota Hilux', minLength: 3, maxLength: 120 })
  @IsString()
  @Length(3, 120)
  name!: string;

  @ApiProperty({ example: 'ABCD-12', minLength: 4, maxLength: 10 })
  @IsString()
  @Length(4, 10)
  plate!: string;

  @ApiPropertyOptional({ example: 800, minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityKg?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
