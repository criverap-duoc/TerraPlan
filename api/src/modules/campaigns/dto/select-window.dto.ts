import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectWindowDto {
  @ApiProperty({ format: 'uuid', description: 'Window that must belong to the campaign' })
  @IsUUID()
  windowId!: string;
}
