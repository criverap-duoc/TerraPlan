import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'CAMP-2026-0013', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'El código solo admite mayúsculas, números y guiones.',
  })
  code!: string;

  @ApiProperty({ format: 'uuid', description: 'Site where the campaign takes place' })
  @IsUUID()
  siteId!: string;

  @ApiPropertyOptional({ example: '2026-11-16T13:00:00Z', description: 'UTC ISO-8601 instant' })
  @IsOptional()
  @IsISO8601({ strict: true })
  earliestStart?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [String], example: ['PH', 'TURB'], description: 'Catalog parameter codes' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  parameterCodes!: string[];
}
