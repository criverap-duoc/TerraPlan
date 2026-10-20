import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
import { FilteredTypeOrmLogger } from './common/database/filtered-typeorm-logger';
import { HealthModule } from './common/health/health.module';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { EventsModule } from './modules/events/events.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { SitesModule } from './modules/sites/sites.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { WeatherModule } from './modules/weather/weather.module';

const DEFAULT_THROTTLE_LIMIT = 100;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        synchronize: false,
        entities: [join(__dirname, '**/*.entity.{ts,js}')],
        migrations: [join(__dirname, 'database/migrations/*.{ts,js}')],
        logging: ['error', 'warn'],
        logger: new FilteredTypeOrmLogger(),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: 60_000,
          // Load tests raise this locally; production keeps the safe default.
          limit: configService.get<number>('THROTTLER_LIMIT') ?? DEFAULT_THROTTLE_LIMIT,
        },
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URL'),
        serverSelectionTimeoutMS: 5_000,
        // EventsService owns the retries, so the driver must fail fast instead of looping.
        retryAttempts: 0,
      }),
    }),
    HealthModule,
    CatalogModule,
    UsersModule,
    AuthModule,
    EventsModule,
    SitesModule,
    TechniciansModule,
    EquipmentModule,
    VehiclesModule,
    CampaignsModule,
    ReservationsModule,
    SchedulingModule,
    WeatherModule,
    IntegrationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

