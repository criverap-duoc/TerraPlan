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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
import { CampaignsService } from './campaigns.service';
import { CampaignDetailResponseDto } from './dto/campaign-detail-response.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto';
import { ListCampaignsResponseDto } from './dto/list-campaigns-response.dto';
import { PersistWindowsDto } from './dto/persist-windows.dto';
import { SelectWindowDto } from './dto/select-window.dto';
import { TransitionCampaignDto } from './dto/transition-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const ALL_ROLES = [Role.Admin, Role.Coordinator, Role.FieldTechnician, Role.Viewer] as const;
const PLANNERS = [Role.Admin, Role.Coordinator] as const;

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List sampling campaigns with filters and pagination' })
  @ApiOkResponse({ type: ListCampaignsResponseDto })
  list(@Query() query: ListCampaignsQueryDto): Promise<ListCampaignsResponseDto> {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get a campaign with its site, parameters, windows and bookings flag' })
  @ApiOkResponse({ type: CampaignDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Campaign not found (NOT_FOUND)' })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<CampaignDetailResponseDto> {
    return this.campaignsService.findById(id);
  }

  @Post()
  @Roles(...PLANNERS)
  @ApiOperation({ summary: 'Create a campaign in draft status' })
  @ApiCreatedResponse({ type: CampaignResponseDto })
  @ApiConflictResponse({ description: 'Campaign code already exists' })
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.create(dto, user.userId, resolveRequestId(req.id));
  }

  @Patch(':id')
  @Roles(...PLANNERS)
  @ApiOperation({ summary: 'Update a draft campaign (notes, earliest start, parameter codes)' })
  @ApiOkResponse({ type: CampaignResponseDto })
  @ApiConflictResponse({ description: 'The campaign is no longer in draft (INVALID_STATE_TRANSITION)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(id, dto);
  }

  @Post(':id/transition')
  @Roles(...PLANNERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a campaign to another status enforcing the lifecycle preconditions' })
  @ApiOkResponse({ type: CampaignResponseDto })
  @ApiConflictResponse({ description: 'Invalid transition (INVALID_STATE_TRANSITION)' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.transition(
      id,
      dto.to,
      dto.reason,
      user.userId,
      resolveRequestId(req.id),
    );
  }

  @Post(':id/windows')
  @Roles(...PLANNERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the campaign windows (draft or planned only)' })
  @ApiOkResponse({ type: CampaignDetailResponseDto })
  @ApiConflictResponse({ description: 'The campaign no longer accepts windows' })
  persistWindows(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PersistWindowsDto,
  ): Promise<CampaignDetailResponseDto> {
    return this.campaignsService.persistWindows(id, dto.windows);
  }

  @Post(':id/select-window')
  @Roles(...PLANNERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select the campaign window that will be used in the field' })
  @ApiOkResponse({ type: CampaignDetailResponseDto })
  @ApiNotFoundResponse({ description: 'The window does not belong to the campaign' })
  selectWindow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SelectWindowDto,
  ): Promise<CampaignDetailResponseDto> {
    return this.campaignsService.selectWindow(id, dto.windowId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a campaign and release its active bookings (soft delete)' })
  @ApiNoContentResponse({ description: 'Campaign cancelled' })
  @ApiConflictResponse({ description: 'The campaign cannot be cancelled from its current status' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<void> {
    return this.campaignsService.cancel(id, user.userId, resolveRequestId(req.id));
  }
}
