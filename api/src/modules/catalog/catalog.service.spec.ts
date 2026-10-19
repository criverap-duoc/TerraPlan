import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeAll(() => {
    service = new CatalogService();
    service.onModuleInit();
  });

  it('loads every catalog collection from the shared catalog folder', () => {
    expect(service.getParameters().length).toBeGreaterThanOrEqual(9);
    expect(service.getUnits()).toHaveLength(8);
    expect(service.getRegulations()).toHaveLength(2);
    expect(service.getLimits()).toHaveLength(60);
    expect(service.getParameters().map((parameter) => parameter.code)).toContain('CL');
  });

  it('filters limits by parameter code and monitoring area', () => {
    const limits = service.getLimits({ parameterCode: 'N_NO3', monitoringAreaCode: 'MA-4' });

    expect(limits).toHaveLength(1);
    expect(limits[0]?.max).toBe(4.0);
  });

  it('filters optional-for-MVP parameters', () => {
    const codes = service
      .getParameters({ mvpOptional: true })
      .map((parameter) => parameter.code)
      .sort();

    expect(codes).toEqual(['CL', 'N_NO2']);
  });

  it('exposes catalog metadata', () => {
    const meta = service.getMeta();

    expect(meta.version).toBe('1.0.0');
    expect(meta.status).toBe('draft-verified');
  });

  it('recomputes the catalog checksum from the four JSON files and matches catalog.meta.json', () => {
    const freshService = new CatalogService();
    freshService.onModuleInit();

    const computed = freshService.getComputedChecksum();
    const declared = freshService.getMeta().sha256.toLowerCase();

    if (computed !== declared) {
      throw new Error(
        `Catalog checksum mismatch: catalog.meta.json declares ${declared}, computed ${computed}`,
      );
    }

    expect(computed).toBe(declared);
  });
});
