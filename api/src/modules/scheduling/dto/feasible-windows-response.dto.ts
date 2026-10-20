import { ApiProperty } from '@nestjs/swagger';
import { FeasibleWindowResponseDto } from './feasible-window-response.dto';

export class FeasibleWindowsResponseDto {
  @ApiProperty({ example: '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f' })
  campaignId!: string;

  @ApiProperty({
    oneOf: [{ type: 'number' }, { type: 'string', enum: ['Infinity'] }],
    example: 24,
    description:
      'Shortest holding time among the parameters that require a lab window; "Infinity" when ' +
      'every parameter is measured in situ.',
  })
  minHoldingTimeHours!: number | 'Infinity';

  @ApiProperty({ type: FeasibleWindowResponseDto, isArray: true })
  windows!: FeasibleWindowResponseDto[];
}
