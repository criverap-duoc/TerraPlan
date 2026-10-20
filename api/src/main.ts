import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { requestIdMiddleware } from './common/request-id/request-id.middleware';

const API_PREFIX = 'api/v1';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(requestIdMiddleware);
  // Swagger UI loads an inline bootstrap script, hence 'unsafe-inline' for scripts.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGINS').split(','),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TerraPlan API')
      .setDescription('Sampling campaigns, feasible windows and atomic resource booking.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación JWT (login, refresh rotativo, logout)')
      .addTag('catalog', 'Catálogo compartido (parámetros, unidades, límites) — solo lectura')
      .addTag('sites', 'Sitios de muestreo')
      .addTag('campaigns', 'Campañas de muestreo: ciclo de vida, parámetros y ventanas')
      .addTag('technicians', 'Técnicos de terreno (recurso reservable)')
      .addTag('equipment', 'Equipos de medición (recurso reservable)')
      .addTag('vehicles', 'Vehículos (recurso reservable)')
      .addTag('users', 'Usuarios del sistema (solo admin)')
      .addTag('reservations', 'Reserva atómica de técnico + equipo + vehículo')
      .addTag('scheduling', 'Ventanas factibles de muestreo')
      .build(),
  );
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(configService.getOrThrow<number>('PORT'));
}

void bootstrap();
