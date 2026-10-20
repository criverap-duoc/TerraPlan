import { ApiProperty } from '@nestjs/swagger';

export class CampaignWindowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ example: 90, description: 'Minutes between the end of sampling and the lab' })
  transportMinutes!: number;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'null when the campaign has no lab parameters (every parameter is in_situ)',
  })
  holdingDeadline!: Date | null;

  @ApiProperty({ example: false })
  isSelected!: boolean;
}
