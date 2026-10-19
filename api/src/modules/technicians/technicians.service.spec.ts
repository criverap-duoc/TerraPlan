import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '../auth/types/role.enum';
import { AppUser } from '../users/entities/app-user.entity';
import { UsersService } from '../users/users.service';
import { Technician } from './entities/technician.entity';
import { TechniciansRepository } from './technicians.repository';
import { TechniciansService } from './technicians.service';

const TECHNICIAN_ID = '5b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d';
const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function buildTechnician(overrides: Partial<Technician> = {}): Technician {
  return {
    id: TECHNICIAN_ID,
    code: 'TECH-01',
    userId: null,
    fullName: 'Camila Rojas',
    phone: '+56 9 8123 4567',
    skills: ['pH', 'OD'],
    isActive: true,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}

const CREATE_DTO = {
  code: 'TECH-09',
  fullName: 'Ana Pérez',
  phone: '+56 9 8999 1111',
  skills: ['pH', 'turbidez'],
};

describe('TechniciansService', () => {
  let service: TechniciansService;
  let repository: {
    findPage: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };
  let users: { findById: jest.Mock };

  beforeEach(() => {
    repository = {
      findPage: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    users = { findById: jest.fn() };
    service = new TechniciansService(
      repository as unknown as TechniciansRepository,
      users as unknown as UsersService,
    );
  });

  it('creates a technician with its skills', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<Technician>) => buildTechnician(data));

    const result = await service.create(CREATE_DTO);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TECH-09', skills: ['pH', 'turbidez'], userId: null }),
    );
    expect(result.fullName).toBe('Ana Pérez');
  });

  it('rejects a linked user that is not a field technician', async () => {
    repository.findByCode.mockResolvedValue(null);
    users.findById.mockResolvedValue({
      id: USER_ID,
      role: Role.Coordinator,
      isActive: true,
    } as AppUser);

    await expect(service.create({ ...CREATE_DTO, userId: USER_ID })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the technician code already exists', async () => {
    repository.findByCode.mockResolvedValue(buildTechnician());

    await expect(service.create({ ...CREATE_DTO, code: 'TECH-01' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('soft deletes by deactivating the technician', async () => {
    repository.findById.mockResolvedValue(buildTechnician());

    await service.remove(TECHNICIAN_ID);

    expect(repository.deactivate).toHaveBeenCalledWith(TECHNICIAN_ID);
  });
});
