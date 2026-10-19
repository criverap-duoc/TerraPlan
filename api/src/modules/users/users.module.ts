import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUser } from './entities/app-user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppUser])],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
