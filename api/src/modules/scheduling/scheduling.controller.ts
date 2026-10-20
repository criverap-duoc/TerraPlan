import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { FeasibleWindowsQueryDto } from './dto/feasible-windows-query.dto';
import { FeasibleWindowsResponseDto } from './dto/feasible-windows-response.dto';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('campaigns/:campaignId/feasible-windows')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compute feasible sampling windows',
    description:
      'Splits the requested range into slots and keeps the ones whose sample reaches the lab ' +
      'before the shortest holding time of the selected parameters expires. Informative only: ' +
      'nothing is persisted and no resources are booked.',
  })
  @ApiOkResponse({ type: FeasibleWindowsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid range and/or unknown catalog parameter' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Only admins and coordinators can plan campaigns' })
  @ApiNotFoundResponse({ description: 'Campaign does not exist' })
  compute(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: FeasibleWindowsQueryDto,
  ): Promise<FeasibleWindowsResponseDto> {
    return this.schedulingService.computeForCampaign(campaignId, dto);
  }
}
