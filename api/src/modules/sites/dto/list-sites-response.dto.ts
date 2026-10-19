import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { SiteResponseDto } from './site-response.dto';

export class ListSitesResponseDto {
  @ApiProperty({ type: [SiteResponseDto] })
  data!: SiteResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
