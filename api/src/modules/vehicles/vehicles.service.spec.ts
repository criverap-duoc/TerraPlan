import { ConflictException } from '@nestjs/common';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';

const VEHICLE_ID = '0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b';

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: VEHICLE_ID,
    code: 'VH-01',
    name: 'Camioneta Toyota Hilux',
    plate: 'ABCD-12',
    capacityKg: 800,
    isActive: true,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}

const CREATE_DTO = {
  code: 'VH-09',
  name: 'Camioneta Chevrolet D-Max',
  plate: 'MNOP-78',
  capacityKg: 900,
};

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repository: {
    findPage: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findByPlate: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findPage: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByPlate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    service = new VehiclesService(repository as unknown as VehiclesRepository);
  });

  it('creates a vehicle with its plate and capacity', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.findByPlate.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<Vehicle>) => buildVehicle(data));

    const result = await service.create(CREATE_DTO);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ plate: 'MNOP-78', capacityKg: 900 }),
    );
    expect(result.code).toBe('VH-09');
  });

  it('returns 409 when the plate already belongs to another vehicle', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.findByPlate.mockResolvedValue(buildVehicle());

    await expect(service.create({ ...CREATE_DTO, plate: 'ABCD-12' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the vehicle code already exists', async () => {
    repository.findByCode.mockResolvedValue(buildVehicle());

    await expect(service.create({ ...CREATE_DTO, code: 'VH-01' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('soft deletes by deactivating the vehicle', async () => {
    repository.findById.mockResolvedValue(buildVehicle());

    await service.remove(VEHICLE_ID);

    expect(repository.deactivate).toHaveBeenCalledWith(VEHICLE_ID);
  });
});
