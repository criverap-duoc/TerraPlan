import { ApiProperty } from '@nestjs/swagger';
import { BookingRowDto } from './booking-row.dto';

export class ReservationsRangeResponseDto {
  @ApiProperty({ type: [BookingRowDto] })
  data!: BookingRowDto[];
}
