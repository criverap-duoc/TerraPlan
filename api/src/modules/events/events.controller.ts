import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { ListEventsResponseDto } from './dto/list-events-response.dto';
import { EventsService } from './events.service';

const ALL_ROLES = [Role.Admin, Role.Coordinator, Role.FieldTechnician, Role.Viewer] as const;

@ApiTags('events')
@ApiBearerAuth()
@Controller('campaigns')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get(':campaignId/events')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'List the audit events of a campaign, newest first',
    description: 'Best-effort append-only log stored in MongoDB; entries expire after 90 days.',
  })
  @ApiOkResponse({ type: ListEventsResponseDto })
  list(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Query() query: ListEventsQueryDto,
  ): Promise<ListEventsResponseDto> {
    return this.eventsService.listByCampaign(campaignId, query);
  }
}
