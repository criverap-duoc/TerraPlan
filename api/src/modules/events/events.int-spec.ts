import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongoDBContainer } from '@testcontainers/mongodb';
import type { StartedMongoDBContainer } from '@testcontainers/mongodb';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignParameter } from '../campaigns/entities/campaign-parameter.entity';
import { CampaignWindow } from '../campaigns/entities/campaign-window.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStatus } from '../campaigns/types/campaign-status.enum';
import { ResourceBooking } from '../reservations/entities/resource-booking.entity';
import { Site } from '../sites/entities/site.entity';
import { EventsModule } from './events.module';
import { EventsService } from './events.service';
import { CampaignEventType } from './types/campaign-event-type.enum';

const USER_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const REQUEST_ID = 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b';
const WINDOW = { startsAt: '2026-11-20T13:00:00Z', endsAt: '2026-11-20T17:00:00Z' };

describe('Events (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let mongo: StartedMongoDBContainer;
  let dataSource: DataSource;
  let moduleRef: TestingModule;
  let campaignsService: CampaignsService;
  let eventsService: EventsService;
  let siteId: string;

  jest.setTimeout(240_000);

  beforeAll(async () => {
    [postgres, mongo] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').start(),
      new MongoDBContainer('mongo:7').start(),
    ]);

    dataSource = new DataSource({
      type: 'postgres',
      url: postgres.getConnectionUri(),
      entities: [Campaign, CampaignParameter, CampaignWindow, ResourceBooking, Site],
      migrations: [join(__dirname, '..', '..', 'database', 'migrations', '*.{ts,js}')],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    // campaign.created_by is a foreign key; the event log stores the same id as actorId.
    await dataSource.query(
      `INSERT INTO app_user (id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [USER_ID, 'int-events@terraplan.local', 'not-used', 'Integración Eventos', 'coordinator'],
    );

    const siteRepository = dataSource.getRepository(Site);
    const site = await siteRepository.save(
      siteRepository.create({
        code: 'INT-EVENTS-SITE',
        name: 'Sitio de integración',
        waterBodyType: 'river',
        latitude: '-33.610000',
        longitude: '-70.580000',
        isActive: true,
      }),
    );
    siteId = site.id;

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: postgres.getConnectionUri(),
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
        }),
        MongooseModule.forRoot(
          // The container advertises its own id as the replica-set member, so the host maps to
          // 127.0.0.1 and the driver connects directly instead of following the advertised host.
          `mongodb://127.0.0.1:${mongo.getMappedPort(27017)}?directConnection=true`,
          {
            serverSelectionTimeoutMS: 5_000,
            retryAttempts: 0,
          },
        ),
        CampaignsModule,
        EventsModule,
      ],
    }).compile();

    await moduleRef.init();

    campaignsService = moduleRef.get(CampaignsService);
    eventsService = moduleRef.get(EventsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await dataSource?.destroy();
    await postgres?.stop();

    try {
      await mongo?.stop();
    } catch {
      // The Mongo-down test already stopped the container.
    }
  });

  it('writes a created event after the campaign is committed', async () => {
    const campaign = await campaignsService.create(
      { code: 'INT-EVENTS-01', siteId, parameterCodes: ['PH'] },
      USER_ID,
      REQUEST_ID,
    );

    const events = await eventsService.listByCampaign(campaign.id, { limit: 50 });

    expect(events.data).toHaveLength(1);
    expect(events.data[0]).toMatchObject({
      campaignId: campaign.id,
      type: CampaignEventType.Created,
      actorId: USER_ID,
      requestId: REQUEST_ID,
    });
  });

  it('writes status_changed on top of the created event when the campaign advances', async () => {
    const campaign = await campaignsService.create(
      { code: 'INT-EVENTS-02', siteId, parameterCodes: ['PH'] },
      USER_ID,
      REQUEST_ID,
    );

    await dataSource.query(
      `INSERT INTO campaign_window (campaign_id, starts_at, ends_at, transport_minutes, is_selected)
       VALUES ($1, $2, $3, 60, false)`,
      [campaign.id, WINDOW.startsAt, WINDOW.endsAt],
    );

    await campaignsService.transition(
      campaign.id,
      CampaignStatus.Planned,
      undefined,
      USER_ID,
      REQUEST_ID,
    );

    const events = await eventsService.listByCampaign(campaign.id, { limit: 50 });
    const types = events.data.map((event) => event.type);
    const statusChanged = events.data.find(
      (event) => event.type === CampaignEventType.StatusChanged,
    );

    expect(types).toHaveLength(2);
    expect(types).toEqual(
      expect.arrayContaining([CampaignEventType.Created, CampaignEventType.StatusChanged]),
    );
    expect(statusChanged?.payload).toEqual({ from: 'draft', to: 'planned', reason: null });
    expect(events.data[0].at >= events.data[1].at).toBe(true);
  });

  // Runs last: it stops the Mongo container for the rest of the suite.
  it('keeps the campaign committed when Mongo is unreachable', async () => {
    await mongo.stop();

    const campaign = await campaignsService.create(
      { code: 'INT-EVENTS-MONGO-DOWN', siteId, parameterCodes: ['PH'] },
      USER_ID,
      REQUEST_ID,
    );

    const rows = (await dataSource.query('SELECT id FROM campaign WHERE id = $1', [
      campaign.id,
    ])) as { id: string }[];

    expect(rows).toHaveLength(1);

    await expect(
      eventsService.record({
        campaignId: campaign.id,
        type: CampaignEventType.Created,
        payload: { code: campaign.code },
        actorId: USER_ID,
        requestId: REQUEST_ID,
      }),
    ).resolves.toEqual({ recorded: false });
  });
});
