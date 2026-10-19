import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListLimitsQueryDto {
  @ApiPropertyOptional({ example: 'N_NO3' })
  @IsOptional()
  @IsString()
  parameterCode?: string;

  @ApiPropertyOptional({ example: 'DS53-2014-MMA' })
  @IsOptional()
  @IsString()
  regulationCode?: string;

  @ApiPropertyOptional({ example: 'MA-4' })
  @IsOptional()
  @IsString()
  monitoringAreaCode?: string;
}
