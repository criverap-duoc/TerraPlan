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
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto';
import { ListTechniciansResponseDto } from './dto/list-technicians-response.dto';
import { TechnicianResponseDto } from './dto/technician-response.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { TechniciansService } from './technicians.service';

@ApiTags('technicians')
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List field technicians with pagination and filters' })
  @ApiOkResponse({ type: ListTechniciansResponseDto })
  list(@Query() query: ListTechniciansQueryDto): Promise<ListTechniciansResponseDto> {
    return this.techniciansService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a field technician by id' })
  @ApiOkResponse({ type: TechnicianResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<TechnicianResponseDto> {
    return this.techniciansService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a field technician' })
  @ApiCreatedResponse({ type: TechnicianResponseDto })
  create(@Body() dto: CreateTechnicianDto): Promise<TechnicianResponseDto> {
    return this.techniciansService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a field technician' })
  @ApiOkResponse({ type: TechnicianResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTechnicianDto,
  ): Promise<TechnicianResponseDto> {
    return this.techniciansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a field technician (soft delete)' })
  @ApiNoContentResponse({ description: 'Technician deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.techniciansService.remove(id);
  }
}
