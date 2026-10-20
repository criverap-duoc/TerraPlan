import { DataSource } from 'typeorm';
import { Campaign } from '../../modules/campaigns/entities/campaign.entity';
import { CampaignStatus } from '../../modules/campaigns/types/campaign-status.enum';
import { Site } from '../../modules/sites/entities/site.entity';
import dataSource from '../data-source';

export interface SeedCampaign {
  code: string;
  status: CampaignStatus;
  siteCode: string;
  parameterCodes: string[];
}

const DRAFT_PARAMETERS = ['PH', 'TURB'];
const IN_FIELD_PARAMETERS = ['PH', 'TURB', 'N_NO3'];
const COMPLETED_PARAMETERS = ['PH', 'DO'];
const RESCHEDULE_PARAMETERS = ['PH', 'TURB', 'P_PO4'];

// Mixed statuses and sites so the agenda and campaign screens have realistic data from R11 on.
export const SEED_CAMPAIGNS: SeedCampaign[] = [
  {
    code: 'CAMP-2026-0001',
    status: CampaignStatus.Draft,
    siteCode: 'RIO-MAIPO-01',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0002',
    status: CampaignStatus.Draft,
    siteCode: 'RIO-MAIPO-02',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0003',
    status: CampaignStatus.Draft,
    siteCode: 'RIO-MAPOCHO-01',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0004',
    status: CampaignStatus.Planned,
    siteCode: 'EMB-ELYES-01',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0005',
    status: CampaignStatus.Planned,
    siteCode: 'EST-LAMPA-01',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0006',
    status: CampaignStatus.Planned,
    siteCode: 'RIO-MAIPO-EST-01',
    parameterCodes: DRAFT_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0007',
    status: CampaignStatus.Confirmed,
    siteCode: 'RIO-MAIPO-01',
    parameterCodes: IN_FIELD_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0008',
    status: CampaignStatus.Confirmed,
    siteCode: 'RIO-MAIPO-02',
    parameterCodes: IN_FIELD_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0009',
    status: CampaignStatus.InField,
    siteCode: 'RIO-MAPOCHO-01',
    parameterCodes: IN_FIELD_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0010',
    status: CampaignStatus.InField,
    siteCode: 'EMB-ELYES-01',
    parameterCodes: IN_FIELD_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0011',
    status: CampaignStatus.NeedsReschedule,
    siteCode: 'EST-LAMPA-01',
    parameterCodes: RESCHEDULE_PARAMETERS,
  },
  {
    code: 'CAMP-2026-0012',
    status: CampaignStatus.Completed,
    siteCode: 'RIO-MAIPO-EST-01',
    parameterCodes: COMPLETED_PARAMETERS,
  },
];

const INSERT_PARAMETER = `
  INSERT INTO campaign_parameter (campaign_id, parameter_code)
  VALUES ($1, $2)
  ON CONFLICT DO NOTHING
`;

// Idempotent: existing campaigns keep their data; missing site and parameters are backfilled.
export async function seedInitialCampaigns(dataSource: DataSource): Promise<void> {
  const campaignRepository = dataSource.getRepository(Campaign);
  const siteRepository = dataSource.getRepository(Site);

  for (const seedCampaign of SEED_CAMPAIGNS) {
    const site = await siteRepository.findOne({ where: { code: seedCampaign.siteCode } });
    const siteId = site?.id ?? null;
    const existing = await campaignRepository.findOne({ where: { code: seedCampaign.code } });
    let campaignId: string;

    if (existing) {
      campaignId = existing.id;

      if (existing.siteId === null && siteId !== null) {
        await campaignRepository.update({ id: existing.id }, { siteId });
      }
    } else {
      const created = await campaignRepository.save(
        campaignRepository.create({
          code: seedCampaign.code,
          status: seedCampaign.status,
          siteId,
        }),
      );
      campaignId = created.id;
    }

    for (const parameterCode of seedCampaign.parameterCodes) {
      await dataSource.query(INSERT_PARAMETER, [campaignId, parameterCode]);
    }
  }

  console.log(`Seeded ${SEED_CAMPAIGNS.length} campaigns (or existing) with site and parameters`);
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
