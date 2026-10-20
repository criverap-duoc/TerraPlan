import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { Role } from '../auth/types/role.enum';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import type { RequestWithId } from '../../common/request-id/request-id.middleware';
import { PublishCampaignResponseDto } from './dto/publish-campaign-response.dto';
import { IntegrationService } from './integration.service';

const PUBLISHERS = [Role.Admin, Role.Coordinator] as const;

@ApiTags('integration')
@ApiBearerAuth()
@Controller('campaigns')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post(':campaignId/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(...PUBLISHERS)
  @ApiOperation({ summary: 'Publish campaign observations to AquaMetric' })
  @ApiParam({ name: 'campaignId', format: 'uuid' })
  @ApiResponse({ status: 200, type: PublishCampaignResponseDto })
  @ApiResponse({ status: 400, description: 'PUBLISH_INVALID_STATE, NO_WINDOW_TO_PUBLISH or PUBLISH_REJECTED' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({ status: 502, description: 'AquaMetric is unavailable (UPSTREAM_UNAVAILABLE)' })
  publish(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<PublishCampaignResponseDto> {
    return this.integrationService.publishCampaign(
      campaignId,
      user.userId,
      resolveRequestId(req.id),
    );
  }
}
