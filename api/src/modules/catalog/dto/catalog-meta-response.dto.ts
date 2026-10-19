import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CatalogMetaResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-10-19T00:00:00Z' })
  updatedAt!: string;

  @ApiProperty({ example: '9f2c…', description: 'SHA-256 of the concatenated catalog files' })
  sha256!: string;

  @ApiProperty({ example: 'draft-verified' })
  status!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  validatedBy!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  validatedAt!: string | null;

  @ApiProperty({ type: [String], example: ['NCh 1.333 Of.78 (mod. 1987) — BCN'] })
  sources!: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
}
