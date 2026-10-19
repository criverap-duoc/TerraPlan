import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TechnicianResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'TECH-01' })
  code!: string;

  @ApiProperty({ example: 'Camila Rojas' })
  fullName!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Linked login account' })
  userId!: string | null;

  @ApiPropertyOptional({ example: '+56 9 1234 5678', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: ['pH', 'OD'], type: [String] })
  skills!: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
