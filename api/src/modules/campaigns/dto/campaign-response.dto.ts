import { ApiProperty } from '@nestjs/swagger';
import { CampaignStatus } from '../types/campaign-status.enum';

export class CampaignResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'CAMP-2026-0001' })
  code!: string;

  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus', example: 'draft' })
  status!: CampaignStatus;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  siteId!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  earliestStart!: Date | null;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
