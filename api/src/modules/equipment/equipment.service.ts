import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { ListEquipmentQueryDto } from './dto/list-equipment-query.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentRepository } from './equipment.repository';
import { Equipment } from './entities/equipment.entity';

const DUPLICATE_CODE = 'Ya existe un equipo con ese código.';
const EQUIPMENT_NOT_FOUND = 'Equipo no encontrado.';

@Injectable()
export class EquipmentService {
  constructor(private readonly equipmentRepository: EquipmentRepository) {}

  async list(query: ListEquipmentQueryDto): Promise<{
    data: EquipmentResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const { items, total } = await this.equipmentRepository.findPage({
      isActive: query.isActive ?? true,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((equipment) => this.toResponse(equipment)),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findById(id: string): Promise<EquipmentResponseDto> {
    return this.toResponse(await this.getEquipmentOrFail(id));
  }

  async create(dto: CreateEquipmentDto): Promise<EquipmentResponseDto> {
    await this.ensureCodeAvailable(dto.code);

    try {
      const equipment = await this.equipmentRepository.create({
        code: dto.code,
        name: dto.name,
        category: dto.category,
        serialNumber: dto.serialNumber ?? null,
        isActive: dto.isActive ?? true,
      });

      return this.toResponse(equipment);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<EquipmentResponseDto> {
    const equipment = await this.getEquipmentOrFail(id);

    if (dto.code && dto.code !== equipment.code) {
      await this.ensureCodeAvailable(dto.code);
    }

    const patch: Partial<Equipment> = {};

    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.serialNumber !== undefined) patch.serialNumber = dto.serialNumber;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    try {
      await this.equipmentRepository.update(id, patch);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.getEquipmentOrFail(id);
    await this.equipmentRepository.deactivate(id);
  }

  private async getEquipmentOrFail(id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException(EQUIPMENT_NOT_FOUND);
    }

    return equipment;
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    if (await this.equipmentRepository.findByCode(code)) {
      throw new ConflictException(DUPLICATE_CODE);
    }
  }

  private toResponse(equipment: Equipment): EquipmentResponseDto {
    return {
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      category: equipment.category,
      serialNumber: equipment.serialNumber,
      isActive: equipment.isActive,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
    };
  }
}
