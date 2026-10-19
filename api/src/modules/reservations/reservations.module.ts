import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CLOCK } from '../../common/clock/clock.types';
import { SystemClock } from '../../common/clock/system-clock';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { EquipmentModule } from '../equipment/equipment.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ResourceBooking } from './entities/resource-booking.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceBooking]),
    CampaignsModule,
    TechniciansModule,
    EquipmentModule,
    VehiclesModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
