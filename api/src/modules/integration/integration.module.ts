import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CatalogModule } from '../catalog/catalog.module';
import { EventsModule } from '../events/events.module';
import { HttpAquaMetricClient } from './adapters/http-aquametric.client';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { AQUAMETRIC_CLIENT } from './ports/aquametric-client.interface';

@Module({
  imports: [CampaignsModule, CatalogModule, EventsModule, ConfigModule],
  controllers: [IntegrationController],
  providers: [
    IntegrationService,
    { provide: AQUAMETRIC_CLIENT, useClass: HttpAquaMetricClient },
  ],
  exports: [IntegrationService],
})
export class IntegrationModule {}
