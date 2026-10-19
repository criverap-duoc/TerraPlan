import { DataSource } from 'typeorm';
import { Site, WaterBodyType } from '../../modules/sites/entities/site.entity';
import dataSource from '../data-source';

export interface SeedSite {
  code: string;
  name: string;
  waterBodyType: WaterBodyType;
  latitude: number;
  longitude: number;
}

// Approximate WGS84 coordinates from the Maipo basin; useful for demos, not survey-grade.
export const SEED_SITES: SeedSite[] = [
  {
    code: 'RIO-MAIPO-01',
    name: 'Río Maipo en Puente Maipo',
    waterBodyType: 'river',
    latitude: -33.61,
    longitude: -70.58,
  },
  {
    code: 'RIO-MAIPO-02',
    name: 'Río Maipo en Las Vizcachas',
    waterBodyType: 'river',
    latitude: -33.6,
    longitude: -70.52,
  },
  {
    code: 'RIO-MAPOCHO-01',
    name: 'Río Mapocho en Puente Bulnes',
    waterBodyType: 'river',
    latitude: -33.43,
    longitude: -70.65,
  },
  {
    code: 'EMB-ELYES-01',
    name: 'Embalse El Yeso',
    waterBodyType: 'lake',
    latitude: -33.68,
    longitude: -70.09,
  },
  {
    code: 'EST-LAMPA-01',
    name: 'Estero Lampa en Puente Lampa',
    waterBodyType: 'river',
    latitude: -33.28,
    longitude: -70.79,
  },
  {
    code: 'RIO-MAIPO-EST-01',
    name: 'Río Maipo en desembocadura',
    waterBodyType: 'estuary',
    latitude: -33.61,
    longitude: -71.62,
  },
];

// Idempotent: existing codes are left untouched so re-running never overwrites edits.
export async function seedInitialSites(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Site);

  for (const seedSite of SEED_SITES) {
    if (await repository.findOne({ where: { code: seedSite.code } })) {
      continue;
    }

    await repository.save(
      repository.create({
        code: seedSite.code,
        name: seedSite.name,
        waterBodyType: seedSite.waterBodyType,
        latitude: seedSite.latitude.toFixed(6),
        longitude: seedSite.longitude.toFixed(6),
        isActive: true,
      }),
    );
  }

  console.log('Seeded 6 sites (or existing)');
}

async function main(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await seedInitialSites(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
