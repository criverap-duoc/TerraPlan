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
import { Site } from '../sites/entities/site.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

const API_PREFIX = 'api/v1';

const MAIN_CODE = 'TEST-CAMP-R7-01';
const NO_RESERVATION_CODE = 'TEST-CAMP-R7-NORES';
const RESCHEDULE_CODE = 'TEST-CAMP-R7-RESCHED';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

// Unique per run: a repeated execution never overlaps bookings from an earlier one.
const BASE = new Date(Date.now() + 10 * 24 * 3_600_000);
BASE.setUTCHours(13, 0, 0, 0);

const HOUR = 3_600_000;

function at(offsetHours: number): string {
  return new Date(BASE.getTime() + offsetHours * HOUR).toISOString();
}

interface CampaignBody {
  id: string;
  code: string;
  status: string;
  siteId: string | null;
}

interface CampaignDetailBody extends CampaignBody {
  parameters: string[];
  windows: { id: string; isSelected: boolean }[];
  hasActiveReservations: boolean;
}

interface ProblemBody {
  code: string;
  detail: string;
}

describe('Campaigns (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let siteId: string;
  let resourceIds: { technicianId: string; equipmentId: string; vehicleId: string };
  let campaignId: string;
  let windowIds: string[];
  let ipCounter = 0;

  jest.setTimeout(60_000);

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

    await dataSource.query("DELETE FROM campaign WHERE code LIKE 'TEST-CAMP-R7%'");
    await seedInitialUsers(dataSource);
    await seedInitialSites(dataSource);
    await seedInitialResources(dataSource);
    await seedInitialCampaigns(dataSource);

    const site = await dataSource.getRepository(Site).findOneByOrFail({ code: 'RIO-MAIPO-01' });
    siteId = site.id;

    const technician = await dataSource
      .getRepository(Technician)
      .findOneByOrFail({ code: 'TECH-01' });
    const equipment = await dataSource
      .getRepository(Equipment)
      .findOneByOrFail({ code: 'EQ-SONDA-01' });
    const vehicle = await dataSource.getRepository(Vehicle).findOneByOrFail({ code: 'VH-01' });
    resourceIds = {
      technicianId: technician.id,
      equipmentId: equipment.id,
      vehicleId: vehicle.id,
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
        req.headers['x-forwarded-for'] = `10.41.0.${ipCounter}`;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  function campaignsPath(id?: string): string {
    const suffix = id === undefined ? '' : `/${id}`;
    return `/${API_PREFIX}/campaigns${suffix}`;
  }

  function bookingPayload(offsetHours: number): Record<string, string> {
    return {
      ...resourceIds,
      startsAt: at(offsetHours),
      endsAt: at(offsetHours + 4),
    };
  }

  async function createCampaign(token: string, code: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(campaignsPath())
      .set('Authorization', `Bearer ${token}`)
      .send({ code, siteId, earliestStart: at(0), parameterCodes: ['PH', 'TURB'] });

    expect(response.status).toBe(201);

    return (response.body as CampaignBody).id;
  }

  async function persistWindows(token: string, id: string, offsetHours: number): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/windows`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        windows: [
          { startsAt: at(offsetHours), endsAt: at(offsetHours + 2), transportMinutes: 60 },
          { startsAt: at(offsetHours + 2), endsAt: at(offsetHours + 4), transportMinutes: 60 },
          { startsAt: at(offsetHours + 4), endsAt: at(offsetHours + 6), transportMinutes: 60 },
        ],
      });

    expect(response.status).toBe(200);
    expect((response.body as CampaignDetailBody).windows).toHaveLength(3);

    return (response.body as CampaignDetailBody).windows.map((window) => window.id);
  }

  let token: string;

  it('rejects creating a campaign without a token', async () => {
    const response = await request(app.getHttpServer())
      .post(campaignsPath())
      .send({ code: MAIN_CODE, siteId, parameterCodes: ['PH'] });

    expect(response.status).toBe(401);
  });

  it('rejects creating a campaign as viewer', async () => {
    const viewerToken = await loginAs(USERS.viewer);
    const response = await request(app.getHttpServer())
      .post(campaignsPath())
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ code: MAIN_CODE, siteId, parameterCodes: ['PH'] });

    expect(response.status).toBe(403);
  });

  it('creates a draft campaign as coordinator', async () => {
    token = await loginAs(USERS.coordinator);

    const response = await request(app.getHttpServer())
      .post(campaignsPath())
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: MAIN_CODE,
        siteId,
        earliestStart: at(0),
        parameterCodes: ['PH', 'TURB'],
      });

    expect(response.status).toBe(201);

    const body = response.body as CampaignBody;
    expect(body.status).toBe('draft');
    expect(body.siteId).toBe(siteId);
    campaignId = body.id;
  });

  it('filters the campaign list by status', async () => {
    const response = await request(app.getHttpServer())
      .get(`${campaignsPath()}?status=draft&pageSize=100`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const body = response.body as { data: CampaignBody[]; meta: { total: number } };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.total).toBeGreaterThanOrEqual(body.data.length);
    expect(body.data.every((campaign) => campaign.status === 'draft')).toBe(true);
  });

  it('filters the campaign list by site', async () => {
    const response = await request(app.getHttpServer())
      .get(`${campaignsPath()}?siteId=${siteId}&pageSize=100`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const body = response.body as { data: CampaignBody[] };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((campaign) => campaign.siteId === siteId)).toBe(true);
  });

  it('combines the status and site filters', async () => {
    const response = await request(app.getHttpServer())
      .get(`${campaignsPath()}?status=draft&siteId=${siteId}&pageSize=100`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const body = response.body as { data: CampaignBody[] };
    expect(body.data.length).toBeGreaterThan(0);
    expect(
      body.data.every((campaign) => campaign.status === 'draft' && campaign.siteId === siteId),
    ).toBe(true);
  });

  it('returns the detail with its site and parameters', async () => {
    const response = await request(app.getHttpServer())
      .get(campaignsPath(campaignId))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const body = response.body as CampaignDetailBody & { site: { code: string } };
    expect(body.parameters).toEqual(['PH', 'TURB']);
    expect(body.site.code).toBe('RIO-MAIPO-01');
    expect(body.hasActiveReservations).toBe(false);
  });

  it('computes feasible windows from the campaign parameters', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/feasible-windows`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        earliestStart: at(0),
        latestEnd: at(8),
        slotMinutes: 120,
        transportMinutes: 60,
      });

    expect(response.status).toBe(200);

    const body = response.body as {
      campaignId: string;
      minHoldingTimeHours: number;
      windows: { holdingDeadline: string | null }[];
    };
    expect(body.campaignId).toBe(campaignId);
    expect(body.minHoldingTimeHours).toBe(24);
    expect(body.windows).toHaveLength(4);
    expect(body.windows.every((window) => typeof window.holdingDeadline === 'string')).toBe(true);
  });

  it('persists three windows', async () => {
    windowIds = await persistWindows(token, campaignId, 0);
  });

  it('selects exactly one window', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/select-window`)
      .set('Authorization', `Bearer ${token}`)
      .send({ windowId: windowIds[0] });

    expect(response.status).toBe(200);

    const body = response.body as CampaignDetailBody;
    expect(body.windows.filter((window) => window.isSelected)).toHaveLength(1);
    expect(body.windows[0].isSelected).toBe(true);
  });

  it('moves the campaign from draft to planned', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'planned' });

    expect(response.status).toBe(200);
    expect((response.body as CampaignBody).status).toBe('planned');
  });

  it('books the technician, the equipment and the vehicle', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/reservations`)
      .set('Authorization', `Bearer ${token}`)
      .send(bookingPayload(0));

    expect(response.status).toBe(201);
    expect((response.body as { bookings: unknown[] }).bookings).toHaveLength(3);
  });

  it('moves the campaign from planned to confirmed', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'confirmed' });

    expect(response.status).toBe(200);
    expect((response.body as CampaignBody).status).toBe('confirmed');
  });

  it('rejects new reservations once the campaign is confirmed', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/reservations`)
      .set('Authorization', `Bearer ${token}`)
      .send(bookingPayload(8));

    expect(response.status).toBe(400);
    expect((response.body as ProblemBody).code).toBe('INVALID_STATE_TRANSITION');
  });

  it('moves the campaign from confirmed to in_field', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'in_field' });

    expect(response.status).toBe(200);
    expect((response.body as CampaignBody).status).toBe('in_field');
  });

  it('moves the campaign from in_field to completed', async () => {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaignId)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'completed' });

    expect(response.status).toBe(200);
    expect((response.body as CampaignBody).status).toBe('completed');
  });

  it('rejects confirmed without an active reservation', async () => {
    const id = await createCampaign(token, NO_RESERVATION_CODE);
    await persistWindows(token, id, 12);

    const planned = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'planned' });
    expect(planned.status).toBe(200);

    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'confirmed' });

    expect(response.status).toBe(400);
    expect((response.body as ProblemBody).code).toBe('NO_ACTIVE_RESERVATION');
  });

  it('returns 409 when jumping from planned to completed', async () => {
    const campaign = await dataSource
      .getRepository(Campaign)
      .findOneByOrFail({ code: NO_RESERVATION_CODE });

    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(campaign.id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'completed' });

    expect(response.status).toBe(409);
    expect((response.body as ProblemBody).code).toBe('INVALID_STATE_TRANSITION');
  });

  it('releases active reservations when rescheduling a confirmed campaign', async () => {
    const id = await createCampaign(token, RESCHEDULE_CODE);
    await persistWindows(token, id, 24);

    await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'planned' })
      .expect(200);

    const booked = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/reservations`)
      .set('Authorization', `Bearer ${token}`)
      .send(bookingPayload(24));
    expect(booked.status).toBe(201);

    await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'confirmed' })
      .expect(200);

    const rescheduled = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'needs_reschedule', reason: 'Crece el caudal sobre el umbral' });

    expect(rescheduled.status).toBe(200);
    expect((rescheduled.body as CampaignBody).status).toBe('needs_reschedule');

    const reservations = await request(app.getHttpServer())
      .get(`${campaignsPath(id)}/reservations`)
      .set('Authorization', `Bearer ${token}`);

    expect(reservations.status).toBe(200);
    expect(reservations.body as unknown[]).toHaveLength(0);
  });
});
