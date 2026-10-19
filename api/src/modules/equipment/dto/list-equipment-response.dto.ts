import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { EquipmentResponseDto } from './equipment-response.dto';

export class ListEquipmentResponseDto {
  @ApiProperty({ type: [EquipmentResponseDto] })
  data!: EquipmentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
