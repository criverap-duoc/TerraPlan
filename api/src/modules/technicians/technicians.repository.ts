import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '../../common/dto/pagination-query.dto';
import { TechnicianSortField } from './dto/list-technicians-query.dto';
import { Technician } from './entities/technician.entity';

export interface TechnicianFilters {
  isActive?: boolean;
  q?: string;
  page: number;
  pageSize: number;
  sort: TechnicianSortField;
  order: SortOrder;
}

export interface TechnicianPageResult {
  items: Technician[];
  total: number;
}

@Injectable()
export class TechniciansRepository {
  constructor(
    @InjectRepository(Technician)
    private readonly repository: Repository<Technician>,
  ) {}

  async findPage(filters: TechnicianFilters): Promise<TechnicianPageResult> {
    const queryBuilder = this.repository.createQueryBuilder('technician');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('technician.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.q) {
      queryBuilder.andWhere('(technician.code ILIKE :q OR technician.fullName ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    queryBuilder
      .orderBy(`technician.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  findById(id: string): Promise<Technician | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Technician | null> {
    return this.repository.findOne({ where: { code } });
  }

  create(data: Partial<Technician>): Promise<Technician> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: Partial<Technician>): Promise<void> {
    await this.repository.update({ id }, data);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
  }
}
