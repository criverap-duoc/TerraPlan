import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestIdMiddleware } from '../../common/request-id/request-id.middleware';
import { seedInitialCampaigns } from '../../database/seeds/initial-campaigns';
import { seedInitialResources } from '../../database/seeds/initial-resources';
import { seedInitialSites } from '../../database/seeds/initial-sites';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

const API_PREFIX = 'api/v1';
const TEST_CAMPAIGN_CODE = 'TEST-CAMP-RES-01';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

// Unique per run so repeated executions never collide with leftovers from an earlier run.
const WINDOW_START = new Date(Date.now() + 7 * 24 * 3_600_000);
WINDOW_START.setUTCMinutes(0, 0, 0);
const WINDOW = {
  startsAt: WINDOW_START.toISOString(),
  endsAt: new Date(WINDOW_START.getTime() + 4 * 3_600_000).toISOString(),
};

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let campaignId: string;
  let payload: { technicianId: string; equipmentId: string; vehicleId: string } & typeof WINDOW;
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
    await seedInitialCampaigns(dataSource);

    const campaignRepository = dataSource.getRepository(Campaign);
    await campaignRepository.delete({ code: TEST_CAMPAIGN_CODE });
    const campaign = await campaignRepository.save(
      campaignRepository.create({ code: TEST_CAMPAIGN_CODE }),
    );
    campaignId = campaign.id;

    const technician = await dataSource
      .getRepository(Technician)
      .findOneByOrFail({ code: 'TECH-01' });
    const equipment = await dataSource
      .getRepository(Equipment)
      .findOneByOrFail({ code: 'EQ-SONDA-01' });
    const vehicle = await dataSource.getRepository(Vehicle).findOneByOrFail({ code: 'VH-01' });

    payload = {
      technicianId: technician.id,
      equipmentId: equipment.id,
      vehicleId: vehicle.id,
      ...WINDOW,
    };

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
    app.use(requestIdMiddleware);
    app.useGlobalFilters(new GlobalExceptionFilter());
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
        req.headers['x-forwarded-for'] = `10.30.0.${ipCounter}`;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await dataSource.getRepository(Campaign).delete({ code: TEST_CAMPAIGN_CODE });
    await app.close();
  });

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  function reservationsPath(): string {
    return `/${API_PREFIX}/campaigns/${campaignId}/reservations`;
  }

  it('rejects bookings without a token', async () => {
    const response = await request(app.getHttpServer()).post(reservationsPath()).send(payload);

    expect(response.status).toBe(401);
  });

  it('rejects bookings for a viewer', async () => {
    const accessToken = await loginAs(USERS.viewer);
    const response = await request(app.getHttpServer())
      .post(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(response.status).toBe(403);
  });

  it('books the technician, the equipment and the vehicle as coordinator', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(response.status).toBe(201);

    const body = response.body as { campaignId: string; bookings: unknown[]; status: string };
    expect(body.campaignId).toBe(campaignId);
    expect(body.bookings).toHaveLength(3);
    expect(body.status).toBe('active');
  });

  it('returns 409 problem+json when the same window is booked again', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(response.status).toBe(409);
    expect(response.headers['content-type']).toContain('application/problem+json');

    const body = response.body as { code: string; detail: string; requestId: string };
    expect(body.code).toBe('RESOURCE_CONFLICT');
    expect(body.detail).toContain('ya está reservado en ese horario');
    expect(body.requestId).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toBe(body.requestId);
  });

  it('lists the active bookings of the campaign', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .get(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const bookings = response.body as { resourceType: string; status: string }[];
    expect(bookings).toHaveLength(3);
    expect(bookings.map((booking) => booking.resourceType).sort()).toEqual([
      'equipment',
      'technician',
      'vehicle',
    ]);
  });

  it('releases the bookings and allows booking the same window again', async () => {
    const accessToken = await loginAs(USERS.coordinator);

    const released = await request(app.getHttpServer())
      .delete(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`);
    expect(released.status).toBe(204);

    const listed = await request(app.getHttpServer())
      .get(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body as unknown[]).toHaveLength(0);

    const rebooked = await request(app.getHttpServer())
      .post(reservationsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(rebooked.status).toBe(201);
    expect((rebooked.body as { bookings: unknown[] }).bookings).toHaveLength(3);
  });
});
