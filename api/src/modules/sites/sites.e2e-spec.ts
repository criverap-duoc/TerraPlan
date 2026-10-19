import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { seedInitialResources } from '../../database/seeds/initial-resources';
import { seedInitialSites } from '../../database/seeds/initial-sites';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Site } from './entities/site.entity';

const API_PREFIX = 'api/v1';
const TEST_SITE_CODE = 'TEST-01';

const USERS = {
  admin: { email: 'admin@terraplan.local', password: 'Admin1234!' },
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

const SITE_PAYLOAD = {
  code: TEST_SITE_CODE,
  name: 'Sitio de prueba e2e',
  waterBodyType: 'river',
  latitude: -33.5,
  longitude: -70.6,
};

describe('Sites and resources (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ipCounter = 0;

  jest.setTimeout(30_000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    dataSource = moduleRef.get(DataSource);

    try {
      await dataSource.query('SELECT 1');
    } catch {
      throw new Error(
        'Postgres is not reachable. Start it with "docker compose up -d postgres" and re-run ' +
          '"pnpm --filter api test:e2e" (the migrations must be applied first).',
      );
    }

    await seedInitialUsers(dataSource);
    await seedInitialSites(dataSource);
    await seedInitialResources(dataSource);
    await dataSource.getRepository(Site).delete({ code: TEST_SITE_CODE });

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
    // The throttler keys by IP; a unique X-Forwarded-For per request isolates its buckets.
    (app.getHttpAdapter().getInstance() as { set: (key: string, value: unknown) => void }).set(
      'trust proxy',
      true,
    );
    app.use(
      (
        req: { headers: Record<string, string | undefined> },
        _res: unknown,
        next: () => void,
      ) => {
        ipCounter += 1;
        req.headers['x-forwarded-for'] = `10.20.0.${ipCounter}`;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await dataSource.getRepository(Site).delete({ code: TEST_SITE_CODE });
    await app.close();
  });

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  it('lists seeded sites publicly', async () => {
    const response = await request(app.getHttpServer()).get(`/${API_PREFIX}/sites`);

    expect(response.status).toBe(200);
    expect((response.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(6);
  });

  it('lists seeded technicians, equipment and vehicles publicly', async () => {
    const technicians = await request(app.getHttpServer()).get(`/${API_PREFIX}/technicians`);
    const equipment = await request(app.getHttpServer()).get(`/${API_PREFIX}/equipment`);
    const vehicles = await request(app.getHttpServer()).get(`/${API_PREFIX}/vehicles`);

    expect(technicians.status).toBe(200);
    expect((technicians.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(4);
    expect(equipment.status).toBe(200);
    expect((equipment.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(3);
    expect(vehicles.status).toBe(200);
    expect((vehicles.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects site creation without a token', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/sites`)
      .send(SITE_PAYLOAD);

    expect(response.status).toBe(401);
  });

  it('rejects site creation for a viewer', async () => {
    const accessToken = await loginAs(USERS.viewer);
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/sites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(SITE_PAYLOAD);

    expect(response.status).toBe(403);
  });

  it('creates a site as coordinator and rejects a duplicate code', async () => {
    const accessToken = await loginAs(USERS.coordinator);

    const created = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/sites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(SITE_PAYLOAD);

    expect(created.status).toBe(201);
    expect((created.body as { id: string }).id).toEqual(expect.any(String));

    const duplicate = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/sites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(SITE_PAYLOAD);

    expect(duplicate.status).toBe(409);
  });

  it('protects the user list and allows it for admins only', async () => {
    const anonymous = await request(app.getHttpServer()).get(`/${API_PREFIX}/users`);
    expect(anonymous.status).toBe(401);

    const viewerToken = await loginAs(USERS.viewer);
    const asViewer = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(asViewer.status).toBe(403);

    const coordinatorToken = await loginAs(USERS.coordinator);
    const asCoordinator = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(asCoordinator.status).toBe(403);

    const adminToken = await loginAs(USERS.admin);
    const asAdmin = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(asAdmin.status).toBe(200);
    expect((asAdmin.body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(4);
  });
});
