import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { seedInitialUsers } from '../../database/seeds/initial-users';

const API_PREFIX = 'api/v1';
const COORDINATOR = { email: 'coordinator@terraplan.local', password: 'Coord1234!' };

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let ipCounter = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const dataSource = moduleRef.get(DataSource);

    try {
      await dataSource.query('SELECT 1');
    } catch {
      throw new Error(
        'Postgres is not reachable. Start it with "docker compose up -d postgres" and re-run ' +
          '"pnpm --filter api test:e2e" (the migration must be applied first).',
      );
    }

    await seedInitialUsers(dataSource);

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    // The throttler keys by IP; trusting the proxy lets each test use its own X-Forwarded-For.
    (app.getHttpAdapter().getInstance() as { set: (key: string, value: unknown) => void }).set(
      'trust proxy',
      true,
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function nextIp(): string {
    ipCounter += 1;
    return `10.10.0.${ipCounter}`;
  }

  function login(ip: string, password = COORDINATOR.password) {
    return request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .set('X-Forwarded-For', ip)
      .send({ email: COORDINATOR.email, password });
  }

  it('returns a token pair for valid credentials', async () => {
    const response = await login(nextIp());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    });
  });

  it('keeps the health endpoint public', async () => {
    const response = await request(app.getHttpServer()).get(`/${API_PREFIX}/health`);

    expect(response.status).toBe(200);
  });

  it('keeps the catalog endpoints public', async () => {
    const response = await request(app.getHttpServer()).get(`/${API_PREFIX}/catalog/parameters`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('rejects the profile endpoint without a token', async () => {
    const response = await request(app.getHttpServer()).get(`/${API_PREFIX}/auth/me`);

    expect(response.status).toBe(401);
  });

  it('returns the profile for an authenticated coordinator', async () => {
    const credentials = await login(nextIp());
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${String((credentials.body as TokenPair).accessToken)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      email: COORDINATOR.email,
      role: 'coordinator',
    });
  });

  it('rejects a login with an incorrect password', async () => {
    const response = await login(nextIp(), 'WrongPassword1!');

    expect(response.status).toBe(401);
  });

  it('rotates refresh tokens and rejects reuse of the old one', async () => {
    const ip = nextIp();
    const initial = await login(ip);
    const initialPair = initial.body as TokenPair;

    const rotated = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('X-Forwarded-For', ip)
      .send({ refreshToken: initialPair.refreshToken });

    expect(rotated.status).toBe(200);
    expect((rotated.body as TokenPair).refreshToken).not.toBe(initialPair.refreshToken);

    const reuse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('X-Forwarded-For', ip)
      .send({ refreshToken: initialPair.refreshToken });

    expect(reuse.status).toBe(401);
  });

  it('rate limits repeated login attempts', async () => {
    const ip = nextIp();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await login(ip, 'WrongPassword1!');
      statuses.push(response.status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });
});

