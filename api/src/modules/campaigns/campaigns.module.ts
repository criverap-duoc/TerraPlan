import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { ResourceBooking } from '../reservations/entities/resource-booking.entity';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { SitesModule } from '../sites/sites.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';
import { CampaignParameter } from './entities/campaign-parameter.entity';
import { CampaignWindow } from './entities/campaign-window.entity';
import { Campaign } from './entities/campaign.entity';

// ReservationsRepository is registered here (instead of importing ReservationsModule) to keep the
// module graph acyclic: ReservationsModule already depends on CampaignsModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignParameter, CampaignWindow, ResourceBooking]),
    CatalogModule,
    SitesModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsRepository, ReservationsRepository],
  exports: [CampaignsService],
})
export class CampaignsModule {}

