import { ConflictException } from '@nestjs/common';
import { Equipment } from './entities/equipment.entity';
import { EquipmentRepository } from './equipment.repository';
import { EquipmentService } from './equipment.service';

const EQUIPMENT_ID = '9d2ecb1a-1f4a-4c2f-9a6b-3a4b5c6d7e8f';

function buildEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: EQUIPMENT_ID,
    code: 'EQ-SONDA-01',
    name: 'Sonda multiparamétrica YSI ProDSS',
    category: 'multiparametric_probe',
    serialNumber: 'YSI-PDSS-2411',
    isActive: true,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}

const CREATE_DTO = {
  code: 'EQ-NUEVO-01',
  name: 'Medidor de pH Hanna HI2211',
  category: 'ph_meter',
};

describe('EquipmentService', () => {
  let service: EquipmentService;
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
    service = new EquipmentService(repository as unknown as EquipmentRepository);
  });

  it('creates a sampling equipment item', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<Equipment>) => buildEquipment(data));

    const result = await service.create(CREATE_DTO);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EQ-NUEVO-01', serialNumber: null }),
    );
    expect(result.category).toBe('ph_meter');
  });

  it('returns 409 when the equipment code already exists', async () => {
    repository.findByCode.mockResolvedValue(buildEquipment());

    await expect(service.create({ ...CREATE_DTO, code: 'EQ-SONDA-01' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('soft deletes by deactivating the equipment', async () => {
    repository.findById.mockResolvedValue(buildEquipment());

    await service.remove(EQUIPMENT_ID);

    expect(repository.deactivate).toHaveBeenCalledWith(EQUIPMENT_ID);
  });
});
