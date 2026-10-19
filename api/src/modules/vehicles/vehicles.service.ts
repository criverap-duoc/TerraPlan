import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesRepository } from './vehicles.repository';

const DUPLICATE_CODE = 'Ya existe un vehículo con ese código.';
const DUPLICATE_PLATE = 'Ya existe un vehículo con esa patente.';
// Unique constraints can also fire on a concurrent insert, where the field is unknown.
const DUPLICATE_VEHICLE = 'Ya existe un vehículo con ese código o patente.';
const VEHICLE_NOT_FOUND = 'Vehículo no encontrado.';

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async list(query: ListVehiclesQueryDto): Promise<{
    data: VehicleResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const { items, total } = await this.vehiclesRepository.findPage({
      isActive: query.isActive ?? true,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((vehicle) => this.toResponse(vehicle)),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findById(id: string): Promise<VehicleResponseDto> {
    return this.toResponse(await this.getVehicleOrFail(id));
  }

  async create(dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    await this.ensureUnique(dto.code, dto.plate);

    try {
      const vehicle = await this.vehiclesRepository.create({
        code: dto.code,
        name: dto.name,
        plate: dto.plate,
        capacityKg: dto.capacityKg ?? null,
        isActive: dto.isActive ?? true,
      });

      return this.toResponse(vehicle);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_VEHICLE);
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await this.getVehicleOrFail(id);

    if (dto.code && dto.code !== vehicle.code) {
      await this.ensureCodeAvailable(dto.code);
    }

    if (dto.plate && dto.plate !== vehicle.plate) {
      await this.ensurePlateAvailable(dto.plate);
    }

    const patch: Partial<Vehicle> = {};

    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.plate !== undefined) patch.plate = dto.plate;
    if (dto.capacityKg !== undefined) patch.capacityKg = dto.capacityKg;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    try {
      await this.vehiclesRepository.update(id, patch);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_VEHICLE);
      }

      throw error;
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.getVehicleOrFail(id);
    await this.vehiclesRepository.deactivate(id);
  }

  private async getVehicleOrFail(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundException(VEHICLE_NOT_FOUND);
    }

    return vehicle;
  }

  private async ensureUnique(code: string, plate: string): Promise<void> {
    await this.ensureCodeAvailable(code);
    await this.ensurePlateAvailable(plate);
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    if (await this.vehiclesRepository.findByCode(code)) {
      throw new ConflictException(DUPLICATE_CODE);
    }
  }

  private async ensurePlateAvailable(plate: string): Promise<void> {
    if (await this.vehiclesRepository.findByPlate(plate)) {
      throw new ConflictException(DUPLICATE_PLATE);
    }
  }

  private toResponse(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      plate: vehicle.plate,
      capacityKg: vehicle.capacityKg,
      isActive: vehicle.isActive,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
