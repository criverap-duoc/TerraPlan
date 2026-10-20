import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const COUNT_WINDOWS = `
  SELECT COUNT(*)::int AS "count" FROM campaign_window WHERE campaign_id = $1
`;

const INSERT_WINDOW = `
  INSERT INTO campaign_window
    (campaign_id, starts_at, ends_at, transport_minutes, holding_deadline, is_selected)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

const TIME_ZONE = 'America/Santiago';
const TRANSPORT_MINUTES = 90;
const WINDOW_HOURS = 2;
const MS_PER_HOUR = 3_600_000;

// Campaigns already past draft need windows so the agenda and the detail tabs are not empty.
const WINDOWED_STATUSES = new Set<CampaignStatus>([
  CampaignStatus.Planned,
  CampaignStatus.Confirmed,
  CampaignStatus.InField,
  CampaignStatus.Completed,
  CampaignStatus.NeedsReschedule,
]);

const SELECTED_WINDOW_STATUSES = new Set<CampaignStatus>([
  CampaignStatus.Confirmed,
  CampaignStatus.InField,
  CampaignStatus.Completed,
]);

const WEEKDAY_BY_NAME: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface SeedCatalogParameter {
  code: string;
  holdingTimeHours: number | null;
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

interface SeedWindow {
  startsAt: Date;
  endsAt: Date;
  holdingDeadline: Date | null;
  isSelected: boolean;
}

// Same resolution as CatalogService: the seed runs from api/ and the catalog lives at the root.
const CATALOG_PARAMETERS_FILE = resolve(process.cwd(), '..', 'catalog', 'parameters.v1.json');

function loadHoldingTimes(): Map<string, number | null> {
  if (!existsSync(CATALOG_PARAMETERS_FILE)) {
    throw new Error(`Catalog not found at ${CATALOG_PARAMETERS_FILE}`);
  }

  const parsed = JSON.parse(readFileSync(CATALOG_PARAMETERS_FILE, 'utf8')) as {
    parameters?: SeedCatalogParameter[];
  };

  return new Map(
    (parsed.parameters ?? []).map((parameter) => [parameter.code, parameter.holdingTimeHours]),
  );
}

function localParts(date: Date): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = WEEKDAY_BY_NAME[read('weekday')];

  if (weekday === undefined) {
    throw new Error(`Unsupported weekday returned by Intl: ${read('weekday')}`);
  }

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
    second: Number(read('second')),
    weekday,
  };
}

function zoneOffsetMs(date: Date): number {
  const parts = localParts(date);

  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    (date.getTime() - date.getUTCMilliseconds())
  );
}

// America/Santiago shifts with DST, so the offset is resolved twice (see compute-feasible-windows).
function localDateTimeToUtc(year: number, month: number, day: number, hour: number): Date {
  const wallClockMs = Date.UTC(year, month - 1, day, hour, 0, 0);
  const guess = new Date(wallClockMs - zoneOffsetMs(new Date(wallClockMs)));

  return new Date(wallClockMs - zoneOffsetMs(guess));
}

function nextCalendarDate(weekday: number): { year: number; month: number; day: number } {
  const today = localParts(new Date());
  const daysAhead = (weekday - today.weekday + 7) % 7 || 7;
  const target = new Date(Date.UTC(today.year, today.month - 1, today.day + daysAhead));

  return {
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: target.getUTCDate(),
  };
}

function buildSeedWindows(
  parameterCodes: string[],
  status: CampaignStatus,
  holdingTimes: Map<string, number | null>,
): SeedWindow[] {
  const holdingHours = parameterCodes
    .map((code) => holdingTimes.get(code))
    .filter((hours): hours is number => typeof hours === 'number');
  const minHoldingHours = holdingHours.length === 0 ? null : Math.min(...holdingHours);
  const isSelected = SELECTED_WINDOW_STATUSES.has(status);

  const monday = nextCalendarDate(1);
  const wednesday = new Date(Date.UTC(monday.year, monday.month - 1, monday.day + 2));
  const starts = [
    localDateTimeToUtc(monday.year, monday.month, monday.day, 8),
    localDateTimeToUtc(
      wednesday.getUTCFullYear(),
      wednesday.getUTCMonth() + 1,
      wednesday.getUTCDate(),
      10,
    ),
  ];

  return starts.map((startsAt, index) => {
    const endsAt = new Date(startsAt.getTime() + WINDOW_HOURS * MS_PER_HOUR);

    return {
      startsAt,
      endsAt,
      holdingDeadline:
        minHoldingHours === null
          ? null
          : new Date(endsAt.getTime() + minHoldingHours * MS_PER_HOUR),
      isSelected: isSelected && index === 0,
    };
  });
}

async function seedWindows(
  dataSource: DataSource,
  campaignId: string,
  parameterCodes: string[],
  status: CampaignStatus,
  holdingTimes: Map<string, number | null>,
): Promise<void> {
  const rows = (await dataSource.query(COUNT_WINDOWS, [campaignId])) as { count: number }[];

  if ((rows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const window of buildSeedWindows(parameterCodes, status, holdingTimes)) {
    await dataSource.query(INSERT_WINDOW, [
      campaignId,
      window.startsAt,
      window.endsAt,
      TRANSPORT_MINUTES,
      window.holdingDeadline,
      window.isSelected,
    ]);
  }
}

// Idempotent: existing campaigns keep their data; missing site and parameters are backfilled.
export async function seedInitialCampaigns(dataSource: DataSource): Promise<void> {
  const campaignRepository = dataSource.getRepository(Campaign);
  const siteRepository = dataSource.getRepository(Site);
  const holdingTimes = loadHoldingTimes();

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

    // The stored status wins: a demo campaign may have moved on since the seed was written.
    const effectiveStatus = existing?.status ?? seedCampaign.status;

    if (WINDOWED_STATUSES.has(effectiveStatus)) {
      await seedWindows(
        dataSource,
        campaignId,
        seedCampaign.parameterCodes,
        effectiveStatus,
        holdingTimes,
      );
    }
  }

  console.log(`Seeded ${SEED_CAMPAIGNS.length} campaigns with site, parameters and demo windows`);
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
