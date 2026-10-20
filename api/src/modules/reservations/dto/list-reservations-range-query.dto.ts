import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class ListReservationsRangeQueryDto {
  @ApiProperty({ example: '2026-11-16T00:00:00Z', description: 'Range start in UTC (inclusive)' })
  @IsISO8601({ strict: true })
  from!: string;

  @ApiProperty({ example: '2026-11-23T00:00:00Z', description: 'Range end in UTC (exclusive)' })
  @IsISO8601({ strict: true })
  to!: string;
}
