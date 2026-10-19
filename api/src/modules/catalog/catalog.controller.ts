import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import { CatalogMetaResponseDto } from './dto/catalog-meta-response.dto';
import { LimitResponseDto } from './dto/limit-response.dto';
import { ListLimitsQueryDto } from './dto/list-limits-query.dto';
import { ListParametersQueryDto } from './dto/list-parameters-query.dto';
import { ParameterResponseDto } from './dto/parameter-response.dto';
import { RegulationResponseDto } from './dto/regulation-response.dto';
import { UnitResponseDto } from './dto/unit-response.dto';

@Public()
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('meta')
  @ApiOperation({ summary: 'Get catalog metadata (version, status and checksum)' })
  @ApiOkResponse({ type: CatalogMetaResponseDto })
  getMeta(): CatalogMetaResponseDto {
    return this.catalogService.getMeta();
  }

  @Get('parameters')
  @ApiOperation({ summary: 'List catalog parameters' })
  @ApiOkResponse({ type: [ParameterResponseDto] })
  getParameters(@Query() query: ListParametersQueryDto): ParameterResponseDto[] {
    return this.catalogService.getParameters(query);
  }

  @Get('units')
  @ApiOperation({ summary: 'List catalog units' })
  @ApiOkResponse({ type: [UnitResponseDto] })
  getUnits(): UnitResponseDto[] {
    return this.catalogService.getUnits();
  }

  @Get('regulations')
  @ApiOperation({ summary: 'List catalog regulations' })
  @ApiOkResponse({ type: [RegulationResponseDto] })
  getRegulations(): RegulationResponseDto[] {
    return this.catalogService.getRegulations();
  }

  @Get('limits')
  @ApiOperation({ summary: 'List regulatory limits, filtered by parameter, regulation or area' })
  @ApiOkResponse({ type: [LimitResponseDto] })
  getLimits(@Query() query: ListLimitsQueryDto): LimitResponseDto[] {
    return this.catalogService.getLimits(query);
  }
}
