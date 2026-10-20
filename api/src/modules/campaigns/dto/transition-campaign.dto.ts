import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CampaignStatus } from '../types/campaign-status.enum';

export class TransitionCampaignDto {
  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus', example: 'planned' })
  @IsEnum(CampaignStatus)
  to!: CampaignStatus;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Required when to is cancelled or needs_reschedule',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
