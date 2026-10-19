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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { ListVehiclesResponseDto } from './dto/list-vehicles-response.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List vehicles with pagination and filters' })
  @ApiOkResponse({ type: ListVehiclesResponseDto })
  list(@Query() query: ListVehiclesQueryDto): Promise<ListVehiclesResponseDto> {
    return this.vehiclesService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a vehicle by id' })
  @ApiOkResponse({ type: VehicleResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleResponseDto> {
    return this.vehiclesService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a vehicle' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Coordinator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiOkResponse({ type: VehicleResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a vehicle (soft delete)' })
  @ApiNoContentResponse({ description: 'Vehicle deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
