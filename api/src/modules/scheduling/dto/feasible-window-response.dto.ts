import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { InfeasibilityReason } from '../compute-feasible-windows.domain';

export class FeasibleWindowResponseDto {
  @ApiProperty({ example: '2026-11-16T13:00:00.000Z' })
  samplingStart!: string;

  @ApiProperty({ example: '2026-11-16T15:00:00.000Z' })
  samplingEnd!: string;

  @ApiProperty({ example: '2026-11-16T16:30:00.000Z' })
  arrivalAtLab!: string;

  @ApiProperty({
    example: '2026-11-16T16:30:00.000Z',
    description: 'Arrival pushed to the next lab opening when the sample arrives while closed',
  })
  analysisStart!: string;

  @ApiProperty({
    example: '2026-11-17T15:00:00.000Z',
    nullable: true,
    type: String,
    description:
      'samplingEnd + the shortest holding time of the selected parameters. ' +
      'null when the campaign has no lab parameters (every parameter is in_situ).',
  })
  holdingDeadline!: string | null;

  @ApiProperty({ example: true })
  isFeasible!: boolean;

  @ApiPropertyOptional({
    enum: ['lab_closed', 'holding_exceeded'],
    description: 'Only present when isFeasible is false',
  })
  infeasibilityReason?: InfeasibilityReason;
}
