import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestIdMiddleware } from '../../common/request-id/request-id.middleware';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Campaign } from '../campaigns/entities/campaign.entity';

const API_PREFIX = 'api/v1';
const TEST_CAMPAIGN_CODE = 'TEST-CAMP-SCHED-01';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

const BODY = {
  slotMinutes: 120,
  transportMinutes: 90,
};

// Monday 10:00-19:00 in America/Santiago (UTC-3): every slot arrives while the lab is open.
const LAB_WINDOW = {
  ...BODY,
  earliestStart: '2026-11-16T13:00:00Z',
  latestEnd: '2026-11-16T22:00:00Z',
};

// Friday 11:00 to Monday 18:00 in America/Santiago: weekend slots cannot reach the lab in time.
const WEEKEND_WINDOW = {
  ...BODY,
  earliestStart: '2026-11-20T14:00:00Z',
  latestEnd: '2026-11-23T21:00:00Z',
};

interface WindowsBody {
  campaignId: string;
  minHoldingTimeHours: number | 'Infinity';
  windows: { isFeasible: boolean; infeasibilityReason?: string }[];
}

describe('Feasible windows (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let campaignId: string;
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

    const campaignRepository = dataSource.getRepository(Campaign);
    await campaignRepository.delete({ code: TEST_CAMPAIGN_CODE });
    const campaign = await campaignRepository.save(
      campaignRepository.create({ code: TEST_CAMPAIGN_CODE }),
    );
    campaignId = campaign.id;

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
        req.headers['x-forwarded-for'] = `10.31.0.${ipCounter}`;
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

  function windowsPath(id: string = campaignId): string {
    return `/${API_PREFIX}/campaigns/${id}/feasible-windows`;
  }

  it('rejects requests without a token', async () => {
    const response = await request(app.getHttpServer())
      .post(windowsPath())
      .send({ ...LAB_WINDOW, parameterCodes: ['PH', 'DO'] });

    expect(response.status).toBe(401);
  });

  it('rejects viewers', async () => {
    const accessToken = await loginAs(USERS.viewer);
    const response = await request(app.getHttpServer())
      .post(windowsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...LAB_WINDOW, parameterCodes: ['PH', 'DO'] });

    expect(response.status).toBe(403);
  });

  it('returns every window as feasible when all parameters are measured in situ', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(windowsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...LAB_WINDOW, parameterCodes: ['PH', 'DO'] });

    expect(response.status).toBe(200);

    const body = response.body as WindowsBody;
    expect(body.campaignId).toBe(campaignId);
    expect(body.minHoldingTimeHours).toBe('Infinity');
    expect(body.windows).toHaveLength(4);
    expect(body.windows.every((window) => window.isFeasible)).toBe(true);
  });

  it('marks the weekend slots as infeasible for a 24 h holding time', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(windowsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...WEEKEND_WINDOW, parameterCodes: ['TURB', 'N_NO3', 'P_PO4'] });

    expect(response.status).toBe(200);

    const body = response.body as WindowsBody;
    expect(body.minHoldingTimeHours).toBe(24);
    expect(body.windows.some((window) => window.isFeasible)).toBe(true);
    expect(body.windows.some((window) => !window.isFeasible)).toBe(true);
    expect(body.windows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isFeasible: false, infeasibilityReason: 'holding_exceeded' }),
      ]),
    );
  });

  it('returns 404 for an unknown campaign', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(windowsPath(randomUUID()))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...LAB_WINDOW, parameterCodes: ['PH', 'DO'] });

    expect(response.status).toBe(404);
    expect((response.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('returns 400 for an unknown catalog parameter', async () => {
    const accessToken = await loginAs(USERS.coordinator);
    const response = await request(app.getHttpServer())
      .post(windowsPath())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...LAB_WINDOW, parameterCodes: ['NOPE'] });

    expect(response.status).toBe(400);
    expect((response.body as { code: string }).code).toBe('UNKNOWN_PARAMETER');
  });
});
