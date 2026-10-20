import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Model } from 'mongoose';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestIdMiddleware } from '../../common/request-id/request-id.middleware';
import { seedInitialSites } from '../../database/seeds/initial-sites';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Site } from '../sites/entities/site.entity';
import { CampaignEvent } from './schemas/campaign-event.schema';

const API_PREFIX = 'api/v1';
const UNKNOWN_CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const CODE_PREFIX = 'TEST-EVENTS-E2E';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

const HOUR = 3_600_000;
const BASE = new Date(Date.now() + 15 * 24 * HOUR);
BASE.setUTCHours(13, 0, 0, 0);

interface CampaignBody {
  id: string;
  status: string;
}

interface EventBody {
  id: string;
  campaignId: string;
  type: string;
  payload: Record<string, unknown>;
  actorId: string | null;
  requestId: string;
  at: string;
}

interface ListEventsBody {
  data: EventBody[];
  meta: { count: number; nextCursor: string | null };
}

describe('Events (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let eventModel: Model<CampaignEvent>;
  let siteId: string;
  let coordinatorToken: string;
  let viewerToken: string;
  let ipCounter = 0;
  let campaignCounter = 0;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    dataSource = moduleRef.get(DataSource);
    eventModel = moduleRef.get<Model<CampaignEvent>>(getModelToken(CampaignEvent.name));

    try {
      await dataSource.query('SELECT 1');
    } catch {
      throw new Error(
        'Postgres is not reachable. Start it with "docker compose up -d postgres" and re-run ' +
          '"pnpm --filter api test:e2e" (the migrations must be applied first).',
      );
    }

    await dataSource.query(`DELETE FROM campaign WHERE code LIKE '${CODE_PREFIX}%'`);
    await seedInitialUsers(dataSource);
    await seedInitialSites(dataSource);

    const site = await dataSource.getRepository(Site).findOneByOrFail({ code: 'RIO-MAIPO-01' });
    siteId = site.id;

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
      (req: { headers: Record<string, string | undefined> }, _res: unknown, next: () => void) => {
        ipCounter += 1;
        req.headers['x-forwarded-for'] = `10.43.0.${ipCounter}`;
        next();
      },
    );

    await app.init();

    coordinatorToken = await loginAs(USERS.coordinator);
    viewerToken = await loginAs(USERS.viewer);
  });

  afterAll(async () => {
    const campaigns = (await dataSource.query(
      `SELECT id FROM campaign WHERE code LIKE '${CODE_PREFIX}%'`,
    )) as { id: string }[];

    if (campaigns.length > 0) {
      await eventModel.deleteMany({ campaignId: { $in: campaigns.map((row) => row.id) } });
    }

    await dataSource.query(`DELETE FROM campaign WHERE code LIKE '${CODE_PREFIX}%'`);
    await app.close();
  });

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  async function createPlannedCampaign(): Promise<string> {
    campaignCounter += 1;
    const code = `${CODE_PREFIX}-${campaignCounter}`;

    const created = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/campaigns`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ code, siteId, parameterCodes: ['PH'] });

    expect(created.status).toBe(201);
    const campaignId = (created.body as CampaignBody).id;
    const startsAt = new Date(BASE.getTime() + campaignCounter * 6 * HOUR).toISOString();
    const endsAt = new Date(
      BASE.getTime() + campaignCounter * 6 * HOUR + 2 * HOUR,
    ).toISOString();

    const windows = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/campaigns/${campaignId}/windows`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ windows: [{ startsAt, endsAt, transportMinutes: 60 }] });

    expect(windows.status).toBe(200);

    const transition = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/campaigns/${campaignId}/transition`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ to: 'planned' });

    expect(transition.status).toBe(200);

    return campaignId;
  }

  it('returns the created and status_changed events newest first', async () => {
    const campaignId = await createPlannedCampaign();

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/campaigns/${campaignId}/events`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(200);

    const body = response.body as ListEventsBody;

    expect(body.data).toHaveLength(2);
    expect(body.data.map((event) => event.type)).toEqual(['status_changed', 'created']);
    expect(body.data[0].payload).toEqual({ from: 'draft', to: 'planned', reason: null });
    expect(body.data[1].payload).toEqual({ code: expect.any(String), siteId });
    expect(body.data[0].requestId).toBeTruthy();
    expect(body.meta).toEqual({ count: 2, nextCursor: null });
  });

  it('filters the log by event type', async () => {
    const campaignId = await createPlannedCampaign();

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/campaigns/${campaignId}/events?type=status_changed`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(200);

    const body = response.body as ListEventsBody;

    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('status_changed');
  });

  it('paginates with the nextCursor of a full page', async () => {
    const campaignId = await createPlannedCampaign();

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/campaigns/${campaignId}/events?limit=1`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(200);

    const body = response.body as ListEventsBody;

    expect(body.data).toHaveLength(1);
    expect(body.meta.count).toBe(1);
    expect(body.meta.nextCursor).toBe(body.data[0].at);
  });

  it('rejects a request without a token', async () => {
    const response = await request(app.getHttpServer()).get(
      `/${API_PREFIX}/campaigns/${UNKNOWN_CAMPAIGN_ID}/events`,
    );

    expect(response.status).toBe(401);
  });

  it('allows a viewer to read the event log', async () => {
    const campaignId = await createPlannedCampaign();

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/campaigns/${campaignId}/events`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect((response.body as ListEventsBody).data.length).toBeGreaterThanOrEqual(2);
  });
});
