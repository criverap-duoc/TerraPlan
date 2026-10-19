import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EquipmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'EQ-SONDA-01' })
  code!: string;

  @ApiProperty({ example: 'Sonda multiparamétrica YSI ProDSS' })
  name!: string;

  @ApiProperty({ example: 'multiparametric_probe' })
  category!: string;

  @ApiPropertyOptional({ example: 'SN-2024-001', nullable: true })
  serialNumber!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
