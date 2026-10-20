import { ApiProperty } from '@nestjs/swagger';
import { WeatherAssessmentDto } from './weather-assessment.dto';

export class WeatherCheckResponseDto {
  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: false })
  allFeasible!: boolean;

  @ApiProperty({
    example: true,
    description: 'True when the campaign moved to needs_reschedule because of this check',
  })
  transitioned!: boolean;

  @ApiProperty({ type: [WeatherAssessmentDto] })
  assessments!: WeatherAssessmentDto[];
}
