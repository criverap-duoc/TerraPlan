import { DataSource } from 'typeorm';
import { Campaign } from '../../modules/campaigns/entities/campaign.entity';
import { CampaignStatus } from '../../modules/campaigns/types/campaign-status.enum';
import dataSource from '../data-source';

export interface SeedCampaign {
  code: string;
  status: CampaignStatus;
}

// Mixed statuses so the agenda and campaign screens have realistic data from R11 on.
export const SEED_CAMPAIGNS: SeedCampaign[] = [
  { code: 'CAMP-2026-0001', status: CampaignStatus.Draft },
  { code: 'CAMP-2026-0002', status: CampaignStatus.Draft },
  { code: 'CAMP-2026-0003', status: CampaignStatus.Draft },
  { code: 'CAMP-2026-0004', status: CampaignStatus.Planned },
  { code: 'CAMP-2026-0005', status: CampaignStatus.Planned },
  { code: 'CAMP-2026-0006', status: CampaignStatus.Planned },
  { code: 'CAMP-2026-0007', status: CampaignStatus.Confirmed },
  { code: 'CAMP-2026-0008', status: CampaignStatus.Confirmed },
  { code: 'CAMP-2026-0009', status: CampaignStatus.InField },
  { code: 'CAMP-2026-0010', status: CampaignStatus.InField },
  { code: 'CAMP-2026-0011', status: CampaignStatus.NeedsReschedule },
  { code: 'CAMP-2026-0012', status: CampaignStatus.Completed },
];

// Idempotent: existing codes are left untouched so re-running never duplicates rows.
export async function seedInitialCampaigns(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Campaign);

  for (const seedCampaign of SEED_CAMPAIGNS) {
    if (await repository.findOne({ where: { code: seedCampaign.code } })) {
      continue;
    }

    await repository.save(repository.create(seedCampaign));
  }

  console.log('Seeded 12 campaigns (or existing)');
}

async function main(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await seedInitialCampaigns(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
