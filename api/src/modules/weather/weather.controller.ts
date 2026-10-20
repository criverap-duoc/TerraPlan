import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { resolveRequestId } from '../../common/request-id/resolve-request-id';
import type { RequestWithId } from '../../common/request-id/request-id.middleware';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { Role } from '../auth/types/role.enum';
import { WeatherCheckResponseDto } from './dto/weather-check-response.dto';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('campaigns')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post(':campaignId/check-weather')
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check weather and flow feasibility for a campaign' })
  @ApiOkResponse({ type: WeatherCheckResponseDto })
  check(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ): Promise<WeatherCheckResponseDto> {
    return this.weatherService.checkCampaign(campaignId, user.userId, resolveRequestId(req.id));
  }
}
