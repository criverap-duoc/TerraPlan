import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { CatalogMetaResponseDto } from './dto/catalog-meta-response.dto';
import type { LimitResponseDto } from './dto/limit-response.dto';
import type { ParameterResponseDto } from './dto/parameter-response.dto';
import type {
  MonitoringAreaResponseDto,
  RegulationResponseDto,
} from './dto/regulation-response.dto';
import type { UnitResponseDto } from './dto/unit-response.dto';

export interface ParameterFilters {
  category?: string;
  mvpOptional?: boolean;
}

export interface LimitFilters {
  parameterCode?: string;
  regulationCode?: string;
  monitoringAreaCode?: string;
}

interface RawParameter {
  code: string;
  nameEs: string;
  category: string;
  canonicalUnitCode: string;
  decimals: number;
  measurementType: string;
  requiresLabWindow: boolean;
  holdingTimeHours: number | null;
  preservation: string | null;
  container: string | null;
  methodReference: string;
  reportingBasis: string;
  mvpOptional: boolean;
  status: string;
  sourceNote: string;
}

interface RawUnit {
  code: string;
  nameEs: string;
  dimension: string;
  factorToCanonical: number;
  notes?: string | null;
}

interface RawRegulation {
  code: string;
  name: string;
  jurisdiction: string;
  scope: string;
  officialSourceUrl: string;
  version: string;
  effectiveDate: string;
  evaluationWindowYears?: number | null;
  minimumSeasonalCoverage?: number | null;
  samplesPerYearTarget?: number | null;
  monitoringAreas?: MonitoringAreaResponseDto[];
  notes?: string | null;
}

interface RawLimit {
  parameterCode: string;
  regulationCode: string;
  monitoringAreaCode?: string | null;
  qualityLevel?: string | null;
  context?: string | null;
  statistic?: string | null;
  evaluationWindowYears?: number | null;
  minimumSeasonalCoverage?: number | null;
  min?: number | null;
  max?: number | null;
  maxIncreaseOverNatural?: number | null;
  unitCode: string;
  status: string;
  sourceNote: string;
}

interface RawMeta {
  version: string;
  updatedAt: string;
  sha256: string;
  status: string;
  validatedBy?: string | null;
  validatedAt?: string | null;
  sources?: string[];
  notes?: string | null;
}

const META_FILE = 'catalog.meta.json';

// Resolved once per process: start:dev/test run from api/, dist/ lives four levels deeper.
const CATALOG_DIR_CANDIDATES = [
  resolve(process.cwd(), '..', 'catalog'),
  resolve(__dirname, '..', '..', '..', '..', 'catalog'),
];

// Checksum input order is part of the contract with AquaMetric: never reorder.
const CHECKSUM_FILES = [
  'regulations.v1.json',
  'units.v1.json',
  'parameters.v1.json',
  'limits.v1.json',
];

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);
  private catalogDir = '';
  private meta!: CatalogMetaResponseDto;
  private parameters: ParameterResponseDto[] = [];
  private units: UnitResponseDto[] = [];
  private regulations: RegulationResponseDto[] = [];
  private limits: LimitResponseDto[] = [];

  onModuleInit(): void {
    this.catalogDir = this.resolveCatalogDir();
    this.meta = this.loadMeta();
    this.parameters = this.loadParameters();
    this.units = this.loadUnits();
    this.regulations = this.loadRegulations();
    this.limits = this.loadLimits();
    this.verifyChecksum();

    this.logger.log(
      `Catalog loaded: ${this.parameters.length} parameters, ${this.units.length} units, ` +
        `${this.regulations.length} regulations, ${this.limits.length} limits`,
    );
  }

  getMeta(): CatalogMetaResponseDto {
    return this.meta;
  }

  getParameters(filters: ParameterFilters = {}): ParameterResponseDto[] {
    return this.parameters.filter(
      (parameter) =>
        (filters.category === undefined || parameter.category === filters.category) &&
        (filters.mvpOptional === undefined || parameter.mvpOptional === filters.mvpOptional),
    );
  }

  getUnits(): UnitResponseDto[] {
    return this.units;
  }

  getRegulations(): RegulationResponseDto[] {
    return this.regulations;
  }

  getLimits(filters: LimitFilters = {}): LimitResponseDto[] {
    return this.limits.filter(
      (limit) =>
        (filters.parameterCode === undefined || limit.parameterCode === filters.parameterCode) &&
        (filters.regulationCode === undefined || limit.regulationCode === filters.regulationCode) &&
        (filters.monitoringAreaCode === undefined ||
          limit.monitoringAreaCode === filters.monitoringAreaCode),
    );
  }

  private resolveCatalogDir(): string {
    const found = CATALOG_DIR_CANDIDATES.find((candidate) =>
      existsSync(join(candidate, META_FILE)),
    );

    if (found === undefined) {
      throw new Error(
        `Catalog directory not found. Looked in: ${CATALOG_DIR_CANDIDATES.join(', ')}`,
      );
    }

    return found;
  }

  private readJson(fileName: string): unknown {
    const filePath = join(this.catalogDir, fileName);

    if (!existsSync(filePath)) {
      throw new Error(`Catalog file not found: ${filePath}`);
    }

    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      throw new Error(`Catalog file is not valid JSON: ${filePath}`);
    }
  }

  private readCollection<T>(
    fileName: string,
    collectionKey: string,
    validateItem: (item: unknown, index: number) => void,
  ): T[] {
    const parsed = this.readJson(fileName);
    const collection =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)[collectionKey]
        : undefined;

    if (!Array.isArray(collection) || collection.length === 0) {
      throw new Error(`Catalog file ${fileName} must contain a non-empty "${collectionKey}" array`);
    }

    const items = collection as unknown[];
    items.forEach(validateItem);

    return items as T[];
  }

  private assertRecord(item: unknown, fileName: string, index: number): Record<string, unknown> {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Catalog file ${fileName}: item at index ${index} is not an object`);
    }

    return item as Record<string, unknown>;
  }

  private assertStringField(
    record: Record<string, unknown>,
    field: string,
    fileName: string,
    index: number,
  ): void {
    const value = record[field];

    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `Catalog file ${fileName}: item at index ${index} is missing a valid "${field}" field`,
      );
    }
  }

  private loadMeta(): CatalogMetaResponseDto {
    const parsed = this.readJson(META_FILE);
    const record = this.assertRecord(parsed, META_FILE, 0);

    for (const field of ['version', 'updatedAt', 'sha256', 'status']) {
      this.assertStringField(record, field, META_FILE, 0);
    }

    const meta = record as unknown as RawMeta;

    return {
      version: meta.version,
      updatedAt: meta.updatedAt,
      sha256: meta.sha256,
      status: meta.status,
      validatedBy: meta.validatedBy ?? null,
      validatedAt: meta.validatedAt ?? null,
      sources: meta.sources ?? [],
      notes: meta.notes ?? null,
    };
  }

  private loadParameters(): ParameterResponseDto[] {
    const fileName = 'parameters.v1.json';

    return this.readCollection<RawParameter>(fileName, 'parameters', (item, index) => {
      const record = this.assertRecord(item, fileName, index);
      this.assertStringField(record, 'code', fileName, index);
      this.assertStringField(record, 'canonicalUnitCode', fileName, index);
    }).map((raw) => this.toParameter(raw));
  }

  private loadUnits(): UnitResponseDto[] {
    const fileName = 'units.v1.json';

    return this.readCollection<RawUnit>(fileName, 'units', (item, index) => {
      const record = this.assertRecord(item, fileName, index);
      this.assertStringField(record, 'code', fileName, index);
    }).map((raw) => this.toUnit(raw));
  }

  private loadRegulations(): RegulationResponseDto[] {
    const fileName = 'regulations.v1.json';

    return this.readCollection<RawRegulation>(fileName, 'regulations', (item, index) => {
      const record = this.assertRecord(item, fileName, index);
      this.assertStringField(record, 'code', fileName, index);
    }).map((raw) => this.toRegulation(raw));
  }

  private loadLimits(): LimitResponseDto[] {
    const fileName = 'limits.v1.json';

    return this.readCollection<RawLimit>(fileName, 'limits', (item, index) => {
      const record = this.assertRecord(item, fileName, index);
      this.assertStringField(record, 'parameterCode', fileName, index);
      this.assertStringField(record, 'regulationCode', fileName, index);
    }).map((raw) => this.toLimit(raw));
  }

  private toParameter(raw: RawParameter): ParameterResponseDto {
    return {
      code: raw.code,
      nameEs: raw.nameEs,
      category: raw.category,
      canonicalUnitCode: raw.canonicalUnitCode,
      decimals: raw.decimals,
      measurementType: raw.measurementType,
      requiresLabWindow: raw.requiresLabWindow,
      holdingTimeHours: raw.holdingTimeHours ?? null,
      preservation: raw.preservation ?? null,
      container: raw.container ?? null,
      methodReference: raw.methodReference,
      reportingBasis: raw.reportingBasis,
      mvpOptional: raw.mvpOptional,
      status: raw.status,
      sourceNote: raw.sourceNote,
    };
  }

  private toUnit(raw: RawUnit): UnitResponseDto {
    return {
      code: raw.code,
      nameEs: raw.nameEs,
      dimension: raw.dimension,
      factorToCanonical: raw.factorToCanonical,
      notes: raw.notes ?? null,
    };
  }

  private toRegulation(raw: RawRegulation): RegulationResponseDto {
    return {
      code: raw.code,
      name: raw.name,
      jurisdiction: raw.jurisdiction,
      scope: raw.scope,
      officialSourceUrl: raw.officialSourceUrl,
      version: raw.version,
      effectiveDate: raw.effectiveDate,
      evaluationWindowYears: raw.evaluationWindowYears ?? null,
      minimumSeasonalCoverage: raw.minimumSeasonalCoverage ?? null,
      samplesPerYearTarget: raw.samplesPerYearTarget ?? null,
      monitoringAreas: (raw.monitoringAreas ?? []).map((area) => ({
        code: area.code,
        description: area.description,
      })),
      notes: raw.notes ?? null,
    };
  }

  private toLimit(raw: RawLimit): LimitResponseDto {
    return {
      parameterCode: raw.parameterCode,
      regulationCode: raw.regulationCode,
      monitoringAreaCode: raw.monitoringAreaCode ?? null,
      qualityLevel: raw.qualityLevel ?? null,
      context: raw.context ?? null,
      statistic: raw.statistic ?? null,
      evaluationWindowYears: raw.evaluationWindowYears ?? null,
      minimumSeasonalCoverage: raw.minimumSeasonalCoverage ?? null,
      min: raw.min ?? null,
      max: raw.max ?? null,
      maxIncreaseOverNatural: raw.maxIncreaseOverNatural ?? null,
      unitCode: raw.unitCode,
      status: raw.status,
      sourceNote: raw.sourceNote,
    };
  }

  private verifyChecksum(): void {
    const computed = this.computeChecksum();
    const declared = this.meta.sha256;

    if (!SHA256_PATTERN.test(declared)) {
      this.logger.warn(
        `catalog.meta.json sha256 is not a finalized hash; computed checksum: ${computed}`,
      );
      return;
    }

    if (declared.toLowerCase() !== computed) {
      throw new Error(
        `Catalog checksum mismatch: catalog.meta.json declares ${declared}, computed ${computed}`,
      );
    }
  }

  private computeChecksum(): string {
    const hash = createHash('sha256');

    for (const fileName of CHECKSUM_FILES) {
      hash.update(readFileSync(join(this.catalogDir, fileName)));
    }

    return hash.digest('hex');
  }
}
