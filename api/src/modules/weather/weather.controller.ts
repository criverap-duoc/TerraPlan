import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
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
  ): Promise<WeatherCheckResponseDto> {
    return this.weatherService.checkCampaign(campaignId);
  }
}
