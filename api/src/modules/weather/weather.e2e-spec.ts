import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestIdMiddleware } from '../../common/request-id/request-id.middleware';
import { seedInitialResources } from '../../database/seeds/initial-resources';
import { seedInitialSites } from '../../database/seeds/initial-sites';
import { seedInitialUsers } from '../../database/seeds/initial-users';
import { Equipment } from '../equipment/entities/equipment.entity';
import { Site } from '../sites/entities/site.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import type { ForecastRange, SiteRef } from './ports/weather-provider.interface';
import { WEATHER_PROVIDER } from './weather.tokens';

const API_PREFIX = 'api/v1';
const UNKNOWN_CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';

const DRAFT_CODE = 'TEST-WEATHER-DRAFT';
const CONFIRMED_CODE = 'TEST-WEATHER-CONF';
const NO_WINDOWS_CODE = 'TEST-WEATHER-NOWIN';

const USERS = {
  coordinator: { email: 'coordinator@terraplan.local', password: 'Coord1234!' },
  viewer: { email: 'viewer@terraplan.local', password: 'Viewer1234!' },
};

const HOUR = 3_600_000;

// Unique per run: bookings never overlap those of an earlier execution or another suite.
const BASE = new Date(Date.now() + 20 * 24 * HOUR);
BASE.setUTCHours(13, 0, 0, 0);

function at(offsetHours: number): string {
  return new Date(BASE.getTime() + offsetHours * HOUR).toISOString();
}

interface CampaignBody {
  id: string;
  status: string;
}

interface WeatherAssessmentBody {
  windowId: string | null;
  windowStart: string;
  windowEnd: string;
  isFeasible: boolean;
  precipitationMmH: number;
  flowM3s: number;
  reason: string | null;
}

interface WeatherCheckBody {
  campaignId: string;
  allFeasible: boolean;
  transitioned: boolean;
  assessments: WeatherAssessmentBody[];
}

interface ProblemBody {
  code: string;
}

describe('Weather (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let siteId: string;
  let resourceIds: { technicianId: string; equipmentId: string; vehicleId: string };
  let token: string;
  let precipitationMmH = 0;

  const weatherProvider = {
    getForecast: jest.fn((_site: SiteRef, range: ForecastRange) =>
      Promise.resolve([{ at: range.start, precipitationMmH, temperatureC: 18 }]),
    ),
  };

  jest.setTimeout(60_000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WEATHER_PROVIDER)
      .useValue(weatherProvider)
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

    await dataSource.query("DELETE FROM campaign WHERE code LIKE 'TEST-WEATHER%'");
    await seedInitialUsers(dataSource);
    await seedInitialSites(dataSource);
    await seedInitialResources(dataSource);

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

    let ipCounter = 0;
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

    const login = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(USERS.coordinator);
    expect(login.status).toBe(200);
    token = (login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await dataSource.query("DELETE FROM campaign WHERE code LIKE 'TEST-WEATHER%'");
    await app.close();
  });

  beforeEach(() => {
    precipitationMmH = 0;
    weatherProvider.getForecast.mockClear();
  });

  function campaignsPath(id?: string): string {
    const suffix = id === undefined ? '' : `/${id}`;
    return `/${API_PREFIX}/campaigns${suffix}`;
  }

  function checkWeatherPath(campaignId: string): string {
    return `${campaignsPath(campaignId)}/check-weather`;
  }

  async function loginAs(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);

    expect(response.status).toBe(200);

    return (response.body as { accessToken: string }).accessToken;
  }

  async function createCampaign(code: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(campaignsPath())
      .set('Authorization', `Bearer ${token}`)
      .send({ code, siteId, earliestStart: at(0), parameterCodes: ['PH', 'TURB'] });

    expect(response.status).toBe(201);

    return (response.body as CampaignBody).id;
  }

  async function persistWindow(id: string, offsetHours: number): Promise<void> {
    const response = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/windows`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        windows: [
          { startsAt: at(offsetHours), endsAt: at(offsetHours + 2), transportMinutes: 60 },
        ],
      });

    expect(response.status).toBe(200);
  }

  it('rejects the check without a token', async () => {
    const response = await request(app.getHttpServer()).post(
      checkWeatherPath(UNKNOWN_CAMPAIGN_ID),
    );

    expect(response.status).toBe(401);
  });

  it('rejects the check as viewer', async () => {
    const viewerToken = await loginAs(USERS.viewer);
    const response = await request(app.getHttpServer())
      .post(checkWeatherPath(UNKNOWN_CAMPAIGN_ID))
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  it('rejects a campaign without windows', async () => {
    const id = await createCampaign(NO_WINDOWS_CODE);

    const response = await request(app.getHttpServer())
      .post(checkWeatherPath(id))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect((response.body as ProblemBody).code).toBe('NO_WINDOWS_TO_CHECK');
  });

  it('reports a draft campaign as feasible without transitioning it', async () => {
    const id = await createCampaign(DRAFT_CODE);
    await persistWindow(id, 0);

    const response = await request(app.getHttpServer())
      .post(checkWeatherPath(id))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const body = response.body as WeatherCheckBody;
    expect(body.campaignId).toBe(id);
    expect(body.allFeasible).toBe(true);
    expect(body.transitioned).toBe(false);
    expect(body.assessments).toHaveLength(1);
    expect(body.assessments[0].isFeasible).toBe(true);
    expect(body.assessments[0].reason).toBeNull();
    expect(body.assessments[0].flowM3s).toBeGreaterThanOrEqual(0.5);
  });

  it('reschedules a confirmed campaign and releases its bookings when it rains', async () => {
    const id = await createCampaign(CONFIRMED_CODE);
    await persistWindow(id, 24);

    await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'planned' })
      .expect(200);

    const booked = await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/reservations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...resourceIds,
        startsAt: at(24),
        endsAt: at(26),
      });

    expect(booked.status).toBe(201);

    await request(app.getHttpServer())
      .post(`${campaignsPath(id)}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'confirmed' })
      .expect(200);

    precipitationMmH = 12;

    const checked = await request(app.getHttpServer())
      .post(checkWeatherPath(id))
      .set('Authorization', `Bearer ${token}`);

    expect(checked.status).toBe(200);

    const body = checked.body as WeatherCheckBody;
    expect(body.allFeasible).toBe(false);
    expect(body.transitioned).toBe(true);
    expect(body.assessments[0].reason).toBe('precipitation_exceeded');
    expect(body.assessments[0].precipitationMmH).toBe(12);

    const campaign = await request(app.getHttpServer())
      .get(campaignsPath(id))
      .set('Authorization', `Bearer ${token}`);

    expect(campaign.status).toBe(200);
    expect((campaign.body as CampaignBody).status).toBe('needs_reschedule');
    expect((campaign.body as { notes: string | null }).notes).toContain('Clima adverso');

    const reservations = await request(app.getHttpServer())
      .get(`${campaignsPath(id)}/reservations`)
      .set('Authorization', `Bearer ${token}`);

    expect(reservations.status).toBe(200);
    expect(reservations.body as unknown[]).toHaveLength(0);
  });
});
