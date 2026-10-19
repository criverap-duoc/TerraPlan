import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { TechnicianResponseDto } from './technician-response.dto';

export class ListTechniciansResponseDto {
  @ApiProperty({ type: [TechnicianResponseDto] })
  data!: TechnicianResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
