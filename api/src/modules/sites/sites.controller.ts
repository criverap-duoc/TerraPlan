import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { CreateSiteDto } from './dto/create-site.dto';
import { ListSitesQueryDto } from './dto/list-sites-query.dto';
import { ListSitesResponseDto } from './dto/list-sites-response.dto';
import { SiteResponseDto } from './dto/site-response.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SitesService } from './sites.service';

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List sampling sites with pagination and filters' })
  @ApiOkResponse({ type: ListSitesResponseDto })
  list(@Query() query: ListSitesQueryDto): Promise<ListSitesResponseDto> {
    return this.sitesService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a sampling site by id' })
  @ApiOkResponse({ type: SiteResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<SiteResponseDto> {
    return this.sitesService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sampling site' })
  @ApiCreatedResponse({ type: SiteResponseDto })
  create(@Body() dto: CreateSiteDto): Promise<SiteResponseDto> {
    return this.sitesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sampling site' })
  @ApiOkResponse({ type: SiteResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteDto,
  ): Promise<SiteResponseDto> {
    return this.sitesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a sampling site (soft delete)' })
  @ApiNoContentResponse({ description: 'Site deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sitesService.remove(id);
  }
}
