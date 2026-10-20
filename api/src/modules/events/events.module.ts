import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CampaignEvent, CampaignEventSchema } from './schemas/campaign-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CampaignEvent.name, schema: CampaignEventSchema }]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
