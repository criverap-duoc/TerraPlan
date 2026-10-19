import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { VehicleResponseDto } from './vehicle-response.dto';

export class ListVehiclesResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] })
  data!: VehicleResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
