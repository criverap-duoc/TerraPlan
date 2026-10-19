import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Technician } from './entities/technician.entity';
import { TechniciansController } from './technicians.controller';
import { TechniciansRepository } from './technicians.repository';
import { TechniciansService } from './technicians.service';

@Module({
  imports: [TypeOrmModule.forFeature([Technician]), UsersModule],
  controllers: [TechniciansController],
  providers: [TechniciansService, TechniciansRepository],
  exports: [TechniciansService],
})
export class TechniciansModule {}
