export type CatalogStatus = 'draft' | 'draft-verified' | 'validated' | string;

export interface CatalogParameter {
  code: string;
  nameEs: string;
  category: string;
  canonicalUnitCode: string;
  decimals: number;
  measurementType: 'in_situ' | 'lab';
  requiresLabWindow: boolean;
  holdingTimeHours: number | null;
  preservation: string | null;
  container: string | null;
  methodReference: string;
  reportingBasis: string;
  mvpOptional: boolean;
  status: CatalogStatus;
  sourceNote: string;
}

export interface CatalogUnit {
  code: string;
  nameEs: string;
  dimension: string;
  factorToCanonical: number;
  notes: string | null;
}

export interface MonitoringArea {
  code: string;
  description: string;
}

export interface CatalogRegulation {
  code: string;
  name: string;
  jurisdiction: string;
  scope: string;
  officialSourceUrl: string;
  version: string;
  effectiveDate: string;
  evaluationWindowYears: number | null;
  minimumSeasonalCoverage: number | null;
  samplesPerYearTarget: number | null;
  monitoringAreas: MonitoringArea[];
  notes: string | null;
}

export interface CatalogLimit {
  parameterCode: string;
  regulationCode: string;
  monitoringAreaCode: string | null;
  qualityLevel: string | null;
  context: string | null;
  statistic: string | null;
  evaluationWindowYears: number | null;
  minimumSeasonalCoverage: number | null;
  min: number | null;
  max: number | null;
  maxIncreaseOverNatural: number | null;
  unitCode: string;
  status: CatalogStatus;
  sourceNote: string;
}

export interface CatalogMeta {
  version: string;
  updatedAt: string;
  sha256: string;
  status: CatalogStatus;
  validatedBy: string | null;
  validatedAt: string | null;
  sources: string[];
  notes: string | null;
}

export interface CatalogLimitFilters {
  parameterCode?: string;
  regulationCode?: string;
  monitoringAreaCode?: string;
}
