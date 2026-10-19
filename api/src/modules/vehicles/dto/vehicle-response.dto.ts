import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'VH-01' })
  code!: string;

  @ApiProperty({ example: 'Camioneta Toyota Hilux' })
  name!: string;

  @ApiProperty({ example: 'ABCD-12' })
  plate!: string;

  @ApiPropertyOptional({ example: 800, nullable: true })
  capacityKg!: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
