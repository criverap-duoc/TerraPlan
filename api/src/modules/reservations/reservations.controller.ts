import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import type { RequestWithId } from '../../common/request-id/request-id.middleware';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { Role } from '../auth/types/role.enum';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingRowDto } from './dto/booking-row.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('campaigns/:campaignId/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @ApiOperation({
    summary: 'Book a technician, an equipment and a vehicle for a campaign window',
    description:
      'The three bookings are inserted in a single transaction; if any of them overlaps an ' +
      'existing booking the whole operation is rolled back and 409 is returned.',
  })
  @ApiCreatedResponse({ type: BookingResponseDto })
  @ApiConflictResponse({
    description: 'One of the resources is already booked in that window (RESOURCE_CONFLICT)',
  })
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<BookingResponseDto> {
    return this.reservationsService.bookTriple(
      campaignId,
      dto,
      user.userId,
      resolveRequestId(req.id),
    );
  }

  @Delete()
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Release every active booking of a campaign' })
  @ApiNoContentResponse({ description: 'Bookings released' })
  release(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<void> {
    return this.reservationsService
      .releaseByCampaign(campaignId, user.userId, resolveRequestId(req.id))
      .then(() => undefined);
  }

  @Get()
  @Roles(Role.Admin, Role.Coordinator, Role.FieldTechnician)
  @ApiOperation({ summary: 'List the active bookings of a campaign' })
  @ApiOkResponse({ type: BookingRowDto, isArray: true })
  list(@Param('campaignId', ParseUUIDPipe) campaignId: string): Promise<BookingRowDto[]> {
    return this.reservationsService.listByCampaign(campaignId);
  }
}
