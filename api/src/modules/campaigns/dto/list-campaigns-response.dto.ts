import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { CampaignResponseDto } from './campaign-response.dto';

export class ListCampaignsResponseDto {
  @ApiProperty({ type: [CampaignResponseDto] })
  data!: CampaignResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
