import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CLOCK } from '../../common/clock/clock.types';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentModule } from '../equipment/equipment.module';
import { EventsService } from '../events/events.service';
import { Technician } from '../technicians/entities/technician.entity';
import { TechniciansModule } from '../technicians/technicians.module';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ResourceBooking } from './entities/resource-booking.entity';
import { ResourceConflictError } from './errors/resource-conflict.error';
import { ReservationsModule } from './reservations.module';
import { ReservationsService } from './reservations.service';

const WINDOW = { startsAt: '2026-11-15T13:00:00Z', endsAt: '2026-11-15T17:00:00Z' };
const FIXED_NOW = new Date('2026-01-01T00:00:00Z');

describe('Reservations (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let moduleRef: TestingModule;
  let service: ReservationsService;
  let technicianA: Technician;
  let technicianB: Technician;
  let equipmentA: Equipment;
  let equipmentB: Equipment;
  let vehicle: Vehicle;

  jest.setTimeout(180_000);

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: [Campaign, ResourceBooking, Technician, Equipment, Vehicle],
      migrations: [join(__dirname, '..', '..', 'database', 'migrations', '*.{ts,js}')],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    const technicianRepository = dataSource.getRepository(Technician);
    const equipmentRepository = dataSource.getRepository(Equipment);
    const vehicleRepository = dataSource.getRepository(Vehicle);

    technicianA = await technicianRepository.save(
      technicianRepository.create({
        code: 'INT-TECH-A',
        fullName: 'Técnico A',
        skills: [],
        isActive: true,
      }),
    );
    technicianB = await technicianRepository.save(
      technicianRepository.create({
        code: 'INT-TECH-B',
        fullName: 'Técnico B',
        skills: [],
        isActive: true,
      }),
    );
    equipmentA = await equipmentRepository.save(
      equipmentRepository.create({
        code: 'INT-EQ-A',
        name: 'Sonda A',
        category: 'multiparametric_probe',
        isActive: true,
      }),
    );
    equipmentB = await equipmentRepository.save(
      equipmentRepository.create({
        code: 'INT-EQ-B',
        name: 'Sonda B',
        category: 'multiparametric_probe',
        isActive: true,
      }),
    );
    vehicle = await vehicleRepository.save(
      vehicleRepository.create({
        code: 'INT-VH-A',
        name: 'Camioneta A',
        plate: 'INT-AA-11',
        isActive: true,
      }),
    );

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
        }),
        // EventsModule needs a Mongoose connection to build its model; the booking assertions do
        // not touch Mongo, so a lazy (never opened) connection keeps this suite Postgres-only.
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/terraplan_unused', {
          lazyConnection: true,
          serverSelectionTimeoutMS: 500,
          retryAttempts: 0,
        }),
        TechniciansModule,
        EquipmentModule,
        VehiclesModule,
        CampaignsModule,
        ReservationsModule,
      ],
    })
      .overrideProvider(CLOCK)
      .useValue({ now: () => FIXED_NOW })
      // The audit log is covered by events.int-spec.ts; this suite stays Postgres-only.
      .overrideProvider(EventsService)
      .useValue({ record: jest.fn().mockResolvedValue({ recorded: true }) })
      .compile();

    await moduleRef.init();
    service = moduleRef.get(ReservationsService);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE resource_booking, campaign CASCADE');
  });

  afterAll(async () => {
    await moduleRef.close();
    await dataSource.destroy();
    await container.stop();
  });

  async function createCampaign(code: string): Promise<string> {
    const repository = dataSource.getRepository(Campaign);
    const campaign = await repository.save(repository.create({ code }));

    return campaign.id;
  }

  async function countActiveBookings(): Promise<number> {
    const rows = (await dataSource.query(
      "SELECT COUNT(*)::int AS count FROM resource_booking WHERE status = 'active'",
    )) as { count: number }[];

    return rows[0].count;
  }

  async function countBookingsForCampaign(campaignId: string): Promise<number> {
    const rows = (await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM resource_booking WHERE campaign_id = $1',
      [campaignId],
    )) as { count: number }[];

    return rows[0].count;
  }

  it('allows exactly one concurrent triple booking for the same resources and window', async () => {
    const campaignIds = await Promise.all(
      Array.from({ length: 10 }, (_, index) => createCampaign(`RACE-${index}`)),
    );

    const results = await Promise.allSettled(
      campaignIds.map((campaignId) =>
        service.bookTriple(campaignId, {
          technicianId: technicianA.id,
          equipmentId: equipmentA.id,
          vehicleId: vehicle.id,
          ...WINDOW,
        }),
      ),
    );

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(ResourceConflictError);
    }
    expect(await countActiveBookings()).toBe(3);
  });

  it('releases bookings and allows rebooking the same resources and window', async () => {
    const campaignId = await createCampaign('RELEASE-1');

    await service.bookTriple(campaignId, {
      technicianId: technicianA.id,
      equipmentId: equipmentA.id,
      vehicleId: vehicle.id,
      ...WINDOW,
    });

    await expect(service.releaseByCampaign(campaignId)).resolves.toBe(3);
    expect(await countActiveBookings()).toBe(0);

    const released = (await dataSource.query(
      "SELECT COUNT(*)::int AS count FROM resource_booking WHERE status = 'released'",
    )) as { count: number }[];
    expect(released[0].count).toBe(3);

    const rebookingCampaignId = await createCampaign('RELEASE-2');

    await expect(
      service.bookTriple(rebookingCampaignId, {
        technicianId: technicianA.id,
        equipmentId: equipmentA.id,
        vehicleId: vehicle.id,
        ...WINDOW,
      }),
    ).resolves.toMatchObject({ campaignId: rebookingCampaignId });
    expect(await countActiveBookings()).toBe(3);
  });

  it('accepts consecutive time ranges on the same resources', async () => {
    const firstCampaignId = await createCampaign('CONSECUTIVE-1');
    const secondCampaignId = await createCampaign('CONSECUTIVE-2');

    await service.bookTriple(firstCampaignId, {
      technicianId: technicianA.id,
      equipmentId: equipmentA.id,
      vehicleId: vehicle.id,
      startsAt: '2026-11-20T10:00:00Z',
      endsAt: '2026-11-20T12:00:00Z',
    });

    await expect(
      service.bookTriple(secondCampaignId, {
        technicianId: technicianA.id,
        equipmentId: equipmentA.id,
        vehicleId: vehicle.id,
        startsAt: '2026-11-20T12:00:00Z',
        endsAt: '2026-11-20T14:00:00Z',
      }),
    ).resolves.toMatchObject({ campaignId: secondCampaignId });

    expect(await countActiveBookings()).toBe(6);
  });

  it('rejects overlapping time ranges on the same resources', async () => {
    const firstCampaignId = await createCampaign('OVERLAP-1');
    const secondCampaignId = await createCampaign('OVERLAP-2');

    await service.bookTriple(firstCampaignId, {
      technicianId: technicianA.id,
      equipmentId: equipmentA.id,
      vehicleId: vehicle.id,
      startsAt: '2026-11-21T10:00:00Z',
      endsAt: '2026-11-21T12:00:00Z',
    });

    await expect(
      service.bookTriple(secondCampaignId, {
        technicianId: technicianA.id,
        equipmentId: equipmentA.id,
        vehicleId: vehicle.id,
        startsAt: '2026-11-21T11:00:00Z',
        endsAt: '2026-11-21T13:00:00Z',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(await countActiveBookings()).toBe(3);
  });

  it('rolls back all three bookings when any single resource conflicts', async () => {
    const firstCampaignId = await createCampaign('ROLLBACK-1');
    const secondCampaignId = await createCampaign('ROLLBACK-2');

    await service.bookTriple(firstCampaignId, {
      technicianId: technicianA.id,
      equipmentId: equipmentA.id,
      vehicleId: vehicle.id,
      ...WINDOW,
    });

    // The technician and the equipment are free; only the vehicle collides, on the third insert.
    await expect(
      service.bookTriple(secondCampaignId, {
        technicianId: technicianB.id,
        equipmentId: equipmentB.id,
        vehicleId: vehicle.id,
        ...WINDOW,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(await countBookingsForCampaign(secondCampaignId)).toBe(0);
    expect(await countActiveBookings()).toBe(3);
  });
});
