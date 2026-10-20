import { ApiProperty } from '@nestjs/swagger';

export class WeatherAssessmentDto {
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  windowId!: string | null;

  @ApiProperty({ format: 'date-time' })
  windowStart!: string;

  @ApiProperty({ format: 'date-time' })
  windowEnd!: string;

  @ApiProperty({ example: true })
  isFeasible!: boolean;

  @ApiProperty({ example: 1.2, description: 'Maximum hourly precipitation in the window' })
  precipitationMmH!: number;

  @ApiProperty({ example: 4.7 })
  flowM3s!: number;

  @ApiProperty({
    nullable: true,
    type: String,
    enum: ['precipitation_exceeded', 'flow_too_low', 'flow_too_high'],
    example: 'precipitation_exceeded',
  })
  reason!: string | null;
}
