import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './entities/site.entity';
import { SitesController } from './sites.controller';
import { SitesRepository } from './sites.repository';
import { SitesService } from './sites.service';

@Module({
  imports: [TypeOrmModule.forFeature([Site])],
  controllers: [SitesController],
  providers: [SitesService, SitesRepository],
  exports: [SitesService],
})
export class SitesModule {}
