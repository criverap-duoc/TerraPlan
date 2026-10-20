import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { UpstreamUnavailableError } from '../../common/errors/upstream-unavailable.error';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestIdMiddleware } from '../../common/request-id/request-id.middleware';
import { seedInitialResources } from '../../database/seeds/initial-resources';
import { seedInitialSites } from '../../database/seeds/initial-sites';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Equipment } from '../equipment/entities/equipment.entity';
import { Site } from '../sites/entities/site.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { AQUAMETRIC_CLIENT } from './ports/aquametric-client.interface';

const API_PREFIX = 'api/v1';

const PUBLISH_CODE = 'TEST-INTEGRATION-PUBLISH';
const DRAFT_CODE = 'TEST-INTEGRATION-DRAFT';
const FAIL_CODE = 'TEST-INTEGRATION-FAIL';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

// Unique per run: bookings from a previous execution never collide with this one.
const BASE = new Date(Date.now() + 14 * 24 * 3_600_000);
BASE.setUTCHours(13, 0, 0, 0);

const HOUR = 3_600_000;

function at(offsetHours: number): string {
  return new Date(BASE.getTime() + offsetHours * HOUR).toISOString();
}

interface CampaignBody {
  id: string;
  code: string;
  status: string;
}

interface CampaignDetailBody extends CampaignBody {
  parameters: string[];
  windows: { id: string; isSelected: boolean }[];
}

interface ProblemBody {
  code: string;
  detail: string;
}

interface PublishBody {
  campaignId: string;
  published: boolean;
  catalogVersion: string;
  idempotencyKey: string;
  observationCount: number;
  siteCode: string;
  payload: {
    catalogVersion: string;
    site: { code: string };
    samples: { id: string; collectedAt: string; labReceivedAt: string }[];
    observations: { parameterCode: string; value: number | null; unitCode: string }[];
  };
}

interface EventsBody {
  data: { type: string }[];
  meta: { count: number; nextCursor: string | null };
}

describe('Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let siteId: string;
  let resourceIds: { technicianId: string; equipmentId: string; vehicleId: string };
  let coordinatorToken: string;
  let viewerToken: string;
  let ipCounter = 0;
  const aquametricClient = { publish: jest.fn() };

  jest.setTimeout(60_000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AQUAMETRIC_CLIENT)
      .useValue(aquametricClient)
      .compile();

    dataSource = moduleRef.get(DataSource);

    try {
      await dataSource.query('SELECT 1');
    } catch {
      throw new Error(
        'Postgres is not reachable. Start it with "docker compose up -d postgres" and re-run ' +
          '"pnpm --filter api test:e2e" (the migrations must be applied first).',
      );
    }

    await dataSource.query("DELETE FROM campaign WHERE code LIKE 'TEST-INTEGRATION-%'");
    await seedInitialUsers(dataSource);
    await seedInitialSites(dataSource);
    await seedInitialResources(dataSource);

    const site = await dataSource.getRepository(Site).findOneByOrFail({ code: 'RIO-MAIPO-01' });
    siteId = site.id;

    const technician = await dataSource
      .getRepository(Technician)
      .findOneByOrFail({ code: 'TECH-02' });
    const equipment = await dataSource
      .getRepository(Equipment)
      .findOneByOrFail({ code: 'EQ-TURB-01' });
    const vehicle = await dataSource.getRepository(Vehicle).findOneByOrFail({ code: 'VH-02' });
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
        req.headers['x-forwarded-for'] = `10.42.0.${ipCounter}`;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await dataSource.query("DELETE FROM campaign WHERE code LIKE 'TEST-INTEGRATION-%'");
    await app.close();
  });

  afterEach(() => {
    aquametricClient.publish.mockReset();
  });

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  function campaignPath(id?: string, suffix = ''): string {
    return id === undefined
      ? `/${API_PREFIX}/campaigns`
      : `/${API_PREFIX}/campaigns/${id}${suffix}`;
  }

  async function createCampaign(code: string, offsetHours = 0): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(campaignPath())
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        code,
        siteId,
        earliestStart: at(offsetHours),
        parameterCodes: ['PH', 'TURB'],
      });

    expect(response.status).toBe(201);

    return (response.body as CampaignBody).id;
  }

  async function createWindow(campaignId: string, offsetHours: number): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(campaignPath(campaignId, '/windows'))
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        windows: [
          { startsAt: at(offsetHours), endsAt: at(offsetHours + 2), transportMinutes: 60 },
          { startsAt: at(offsetHours + 2), endsAt: at(offsetHours + 4), transportMinutes: 60 },
        ],
      });

    expect(response.status).toBe(200);

    const windows = (response.body as CampaignDetailBody).windows;

    return windows[0].id;
  }

  async function transition(campaignId: string, to: string): Promise<void> {
    const response = await request(app.getHttpServer())
      .post(campaignPath(campaignId, '/transition'))
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ to });

    expect(response.status).toBe(200);
    expect((response.body as CampaignBody).status).toBe(to);
  }

  async function createInFieldCampaign(code: string, offsetHours: number): Promise<string> {
    const campaignId = await createCampaign(code, offsetHours);
    const windowId = await createWindow(campaignId, offsetHours);

    const selected = await request(app.getHttpServer())
      .post(campaignPath(campaignId, '/select-window'))
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ windowId });

    expect(selected.status).toBe(200);

    await transition(campaignId, 'planned');

    const booking = await request(app.getHttpServer())
      .post(campaignPath(campaignId, '/reservations'))
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        ...resourceIds,
        startsAt: at(offsetHours),
        endsAt: at(offsetHours + 2),
      });

    expect(booking.status).toBe(201);

    await transition(campaignId, 'confirmed');
    await transition(campaignId, 'in_field');

    return campaignId;
  }

  function publishedEventCount(events: EventsBody): number {
    return events.data.filter((event) => event.type === 'observations_published').length;
  }

  let publishCampaignId: string;

  it('rejects publishing without a token', async () => {
    const response = await request(app.getHttpServer()).post(
      campaignPath('5c1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f', '/publish'),
    );

    expect(response.status).toBe(401);
  });

  it('rejects publishing as viewer', async () => {
    viewerToken = await loginAs(USERS.viewer);

    const response = await request(app.getHttpServer())
      .post(campaignPath('5c1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f', '/publish'))
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  it('publishes an in_field campaign and records observations_published', async () => {
    coordinatorToken = await loginAs(USERS.coordinator);
    publishCampaignId = await createInFieldCampaign(PUBLISH_CODE, 0);

    aquametricClient.publish.mockResolvedValue({
      statusCode: 200,
      responseBody: { accepted: 2 },
    });

    const response = await request(app.getHttpServer())
      .post(campaignPath(publishCampaignId, '/publish'))
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(200);

    const body = response.body as PublishBody;

    expect(body.published).toBe(true);
    expect(body.campaignId).toBe(publishCampaignId);
    expect(body.catalogVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
    expect(body.observationCount).toBe(2);
    expect(body.siteCode).toBe('RIO-MAIPO-01');
    expect(body.payload.site.code).toBe('RIO-MAIPO-01');
    expect(body.payload.samples).toHaveLength(1);
    expect(body.payload.observations.map((observation) => observation.parameterCode)).toEqual([
      'PH',
      'TURB',
    ]);
    expect(aquametricClient.publish).toHaveBeenCalledWith(body.payload, body.idempotencyKey);

    const events = await request(app.getHttpServer())
      .get(campaignPath(publishCampaignId, '/events'))
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(events.status).toBe(200);
    expect(publishedEventCount(events.body as EventsBody)).toBe(1);
  });

  it('rejects publishing a draft campaign', async () => {
    const draftId = await createCampaign(DRAFT_CODE, 6);

    aquametricClient.publish.mockResolvedValue({ statusCode: 200, responseBody: {} });

    const response = await request(app.getHttpServer())
      .post(campaignPath(draftId, '/publish'))
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(400);
    expect((response.body as ProblemBody).code).toBe('PUBLISH_INVALID_STATE');
    expect(aquametricClient.publish).not.toHaveBeenCalled();
  });

  it('returns 502 and skips the event when AquaMetric is unavailable', async () => {
    const campaignId = await createInFieldCampaign(FAIL_CODE, 8);

    aquametricClient.publish.mockRejectedValue(
      new UpstreamUnavailableError('AquaMetric caído.', { cause: new Error('timeout') }),
    );

    const response = await request(app.getHttpServer())
      .post(campaignPath(campaignId, '/publish'))
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(response.status).toBe(502);
    expect((response.body as ProblemBody).code).toBe('UPSTREAM_UNAVAILABLE');

    const events = await request(app.getHttpServer())
      .get(campaignPath(campaignId, '/events'))
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(events.status).toBe(200);
    expect(publishedEventCount(events.body as EventsBody)).toBe(0);
  });
});
