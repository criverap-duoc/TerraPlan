import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { OpenMeteoWeatherProvider } from './providers/open-meteo-weather.provider';
import { SimulatedFlowProvider } from './providers/simulated-flow.provider';
import { DEFAULT_THRESHOLDS } from './weather.constants';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { FLOW_PROVIDER, WEATHER_PROVIDER, WEATHER_THRESHOLDS } from './weather.tokens';

@Module({
  imports: [CampaignsModule],
  controllers: [WeatherController],
  providers: [
    WeatherService,
    { provide: WEATHER_PROVIDER, useClass: OpenMeteoWeatherProvider },
    { provide: FLOW_PROVIDER, useClass: SimulatedFlowProvider },
    { provide: WEATHER_THRESHOLDS, useValue: DEFAULT_THRESHOLDS },
  ],
})
export class WeatherModule {}
