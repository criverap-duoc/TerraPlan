import { ConflictException } from '@nestjs/common';
import { Site } from './entities/site.entity';
import { SitesRepository } from './sites.repository';
import { SitesService } from './sites.service';

const SITE_ID = '3f0d4a52-8f6b-4b6e-9b9f-1c2d3e4f5a6b';

function buildSite(overrides: Partial<Site> = {}): Site {
  return {
    id: SITE_ID,
    code: 'RIO-MAIPO-01',
    name: 'Río Maipo en Puente Maipo',
    waterBodyType: 'river',
    latitude: '-33.610000',
    longitude: '-70.580000',
    isActive: true,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}

const CREATE_DTO = {
  code: 'TEST-01',
  name: 'Sitio de prueba',
  waterBodyType: 'river' as const,
  latitude: -33.5,
  longitude: -70.6,
};

describe('SitesService', () => {
  let service: SitesService;
  let repository: {
    findPage: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findPage: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    service = new SitesService(repository as unknown as SitesRepository);
  });

  it('creates a site and converts numeric coordinates to numbers', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<Site>) => buildSite(data));

    const result = await service.create(CREATE_DTO);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: '-33.500000', longitude: '-70.600000' }),
    );
    expect(result.code).toBe(CREATE_DTO.code);
    expect(result.latitude).toBe(-33.5);
    expect(result.longitude).toBe(-70.6);
  });

  it('returns 409 when the site code already exists', async () => {
    repository.findByCode.mockResolvedValue(buildSite());

    await expect(service.create({ ...CREATE_DTO, code: 'RIO-MAIPO-01' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the database reports a concurrent duplicate', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockRejectedValue(
      Object.assign(new Error('duplicate key value'), { driverError: { code: '23505' } }),
    );

    await expect(service.create(CREATE_DTO)).rejects.toThrow(ConflictException);
  });

  it('soft deletes by deactivating the site', async () => {
    repository.findById.mockResolvedValue(buildSite());

    await service.remove(SITE_ID);

    expect(repository.deactivate).toHaveBeenCalledWith(SITE_ID);
  });
});
