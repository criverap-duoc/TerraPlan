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
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { ListEquipmentQueryDto } from './dto/list-equipment-query.dto';
import { ListEquipmentResponseDto } from './dto/list-equipment-response.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List sampling equipment with pagination and filters' })
  @ApiOkResponse({ type: ListEquipmentResponseDto })
  list(@Query() query: ListEquipmentQueryDto): Promise<ListEquipmentResponseDto> {
    return this.equipmentService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a sampling equipment item by id' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<EquipmentResponseDto> {
    return this.equipmentService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sampling equipment item' })
  @ApiCreatedResponse({ type: EquipmentResponseDto })
  create(@Body() dto: CreateEquipmentDto): Promise<EquipmentResponseDto> {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sampling equipment item' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<EquipmentResponseDto> {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a sampling equipment item (soft delete)' })
  @ApiNoContentResponse({ description: 'Equipment deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.equipmentService.remove(id);
  }
}
