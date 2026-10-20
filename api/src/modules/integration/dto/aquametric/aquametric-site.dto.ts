import { ApiProperty } from '@nestjs/swagger';

export class AquaMetricSiteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'RIO-MAIPO-01' })
  code!: string;

  @ApiProperty({ example: 'Río Maipo en Puente Maipo' })
  name!: string;

  @ApiProperty({ example: 'river', enum: ['river', 'lake', 'estuary', 'groundwater', 'effluent', 'drinking'] })
  waterBodyType!: string;

  @ApiProperty({ example: -33.61, description: 'WGS84 latitude' })
  latitude!: number;

  @ApiProperty({ example: -70.58, description: 'WGS84 longitude' })
  longitude!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
