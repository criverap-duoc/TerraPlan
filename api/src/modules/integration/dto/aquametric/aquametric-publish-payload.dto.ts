import { ApiProperty } from '@nestjs/swagger';
import { AquaMetricObservationDto } from './aquametric-observation.dto';
import { AquaMetricSampleDto } from './aquametric-sample.dto';
import { AquaMetricSiteDto } from './aquametric-site.dto';

export class AquaMetricPublishPayloadDto {
  @ApiProperty({ example: '1.0.0', description: 'Catalog version both projects agree on' })
  catalogVersion!: string;

  @ApiProperty({ type: AquaMetricSiteDto })
  site!: AquaMetricSiteDto;

  @ApiProperty({ type: [AquaMetricSampleDto] })
  samples!: AquaMetricSampleDto[];

  @ApiProperty({ type: [AquaMetricObservationDto] })
  observations!: AquaMetricObservationDto[];
}
