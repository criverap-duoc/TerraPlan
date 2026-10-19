import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { Role } from '../auth/types/role.enum';
import { UsersService } from '../users/users.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto';
import { TechnicianResponseDto } from './dto/technician-response.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { Technician } from './entities/technician.entity';
import { TechniciansRepository } from './technicians.repository';

const DUPLICATE_CODE = 'Ya existe un técnico con ese código.';
const TECHNICIAN_NOT_FOUND = 'Técnico no encontrado.';
const INVALID_USER = 'El usuario indicado no existe o no tiene rol de técnico de terreno.';

@Injectable()
export class TechniciansService {
  constructor(
    private readonly techniciansRepository: TechniciansRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(query: ListTechniciansQueryDto): Promise<{
    data: TechnicianResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const { items, total } = await this.techniciansRepository.findPage({
      isActive: query.isActive ?? true,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((technician) => this.toResponse(technician)),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findById(id: string): Promise<TechnicianResponseDto> {
    return this.toResponse(await this.getTechnicianOrFail(id));
  }

  async create(dto: CreateTechnicianDto): Promise<TechnicianResponseDto> {
    await this.ensureCodeAvailable(dto.code);
    await this.ensureUserIsTechnician(dto.userId);

    try {
      const technician = await this.techniciansRepository.create({
        code: dto.code,
        fullName: dto.fullName,
        userId: dto.userId ?? null,
        phone: dto.phone ?? null,
        skills: dto.skills ?? [],
        isActive: dto.isActive ?? true,
      });

      return this.toResponse(technician);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateTechnicianDto): Promise<TechnicianResponseDto> {
    const technician = await this.getTechnicianOrFail(id);

    if (dto.code && dto.code !== technician.code) {
      await this.ensureCodeAvailable(dto.code);
    }

    if (dto.userId !== undefined) {
      await this.ensureUserIsTechnician(dto.userId);
    }

    const patch: Partial<Technician> = {};

    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.userId !== undefined) patch.userId = dto.userId;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.skills !== undefined) patch.skills = dto.skills;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    try {
      await this.techniciansRepository.update(id, patch);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.getTechnicianOrFail(id);
    await this.techniciansRepository.deactivate(id);
  }

  private async getTechnicianOrFail(id: string): Promise<Technician> {
    const technician = await this.techniciansRepository.findById(id);

    if (!technician) {
      throw new NotFoundException(TECHNICIAN_NOT_FOUND);
    }

    return technician;
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    if (await this.techniciansRepository.findByCode(code)) {
      throw new ConflictException(DUPLICATE_CODE);
    }
  }

  private async ensureUserIsTechnician(userId: string | undefined): Promise<void> {
    if (!userId) {
      return;
    }

    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive || user.role !== Role.FieldTechnician) {
      throw new BadRequestException(INVALID_USER);
    }
  }

  private toResponse(technician: Technician): TechnicianResponseDto {
    return {
      id: technician.id,
      code: technician.code,
      fullName: technician.fullName,
      userId: technician.userId,
      phone: technician.phone,
      skills: technician.skills,
      isActive: technician.isActive,
      createdAt: technician.createdAt,
      updatedAt: technician.updatedAt,
    };
  }
}
