import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '../../common/dto/pagination-query.dto';
import { EquipmentSortField } from './dto/list-equipment-query.dto';
import { Equipment } from './entities/equipment.entity';

export interface EquipmentFilters {
  isActive?: boolean;
  q?: string;
  page: number;
  pageSize: number;
  sort: EquipmentSortField;
  order: SortOrder;
}

export interface EquipmentPageResult {
  items: Equipment[];
  total: number;
}

@Injectable()
export class EquipmentRepository {
  constructor(
    @InjectRepository(Equipment)
    private readonly repository: Repository<Equipment>,
  ) {}

  async findPage(filters: EquipmentFilters): Promise<EquipmentPageResult> {
    const queryBuilder = this.repository.createQueryBuilder('equipment');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('equipment.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.q) {
      queryBuilder.andWhere('(equipment.code ILIKE :q OR equipment.name ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    queryBuilder
      .orderBy(`equipment.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  findById(id: string): Promise<Equipment | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Equipment | null> {
    return this.repository.findOne({ where: { code } });
  }

  create(data: Partial<Equipment>): Promise<Equipment> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: Partial<Equipment>): Promise<void> {
    await this.repository.update({ id }, data);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
  }
}
