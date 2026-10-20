import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { ListReservationsRangeQueryDto } from './dto/list-reservations-range-query.dto';
import { ReservationsRangeResponseDto } from './dto/reservations-range-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsRangeController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @Roles(Role.Admin, Role.Coordinator, Role.FieldTechnician)
  @ApiOperation({
    summary: 'List the active bookings overlapping a time range',
    description:
      'Returns every active booking whose range intersects [from, to). Backs the agenda, which ' +
      'needs one request per visible range instead of one request per campaign.',
  })
  @ApiOkResponse({ type: ReservationsRangeResponseDto })
  list(@Query() query: ListReservationsRangeQueryDto): Promise<ReservationsRangeResponseDto> {
    return this.reservationsService.listByRange(query.from, query.to);
  }
}
