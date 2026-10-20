import { ApiProperty } from '@nestjs/swagger';
import { EventResponseDto } from './event-response.dto';

export class ListEventsMetaDto {
  @ApiProperty({ description: 'Number of events in this page' })
  count!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass this value as ?before= to fetch the next page',
  })
  nextCursor!: string | null;
}

export class ListEventsResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  data!: EventResponseDto[];

  @ApiProperty({ type: ListEventsMetaDto })
  meta!: ListEventsMetaDto;
}
