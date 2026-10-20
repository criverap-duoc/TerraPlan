import { ApiProperty } from '@nestjs/swagger';
import { SiteResponseDto } from '../../sites/dto/site-response.dto';
import { CampaignResponseDto } from './campaign-response.dto';
import { CampaignWindowDto } from './campaign-window.dto';

export class CampaignDetailResponseDto extends CampaignResponseDto {
  @ApiProperty({
    type: SiteResponseDto,
    nullable: true,
    description: 'null for legacy campaigns created before R7',
  })
  site!: SiteResponseDto | null;

  @ApiProperty({ type: [String], example: ['PH', 'TURB'] })
  parameters!: string[];

  @ApiProperty({ type: [CampaignWindowDto] })
  windows!: CampaignWindowDto[];

  @ApiProperty({ example: true })
  hasActiveReservations!: boolean;
}
