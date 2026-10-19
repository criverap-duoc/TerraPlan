import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import type { LogLevel } from 'typeorm';

// The TypeORM CLI and the seed script run outside Nest, so api/.env is loaded here.
config({ path: join(__dirname, '..', '..', '.env') });

export const dataSourceOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [join(__dirname, '..', '**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  logging: ['error', 'warn'] as LogLevel[],
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
