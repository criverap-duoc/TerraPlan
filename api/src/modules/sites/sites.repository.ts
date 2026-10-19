import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '../../common/dto/pagination-query.dto';
import { Site, WaterBodyType } from './entities/site.entity';
import { SiteSortField } from './dto/list-sites-query.dto';

export interface SiteFilters {
  waterBodyType?: WaterBodyType;
  isActive?: boolean;
  q?: string;
  page: number;
  pageSize: number;
  sort: SiteSortField;
  order: SortOrder;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class SitesRepository {
  constructor(
    @InjectRepository(Site)
    private readonly repository: Repository<Site>,
  ) {}

  async findPage(filters: SiteFilters): Promise<PageResult<Site>> {
    const queryBuilder = this.repository.createQueryBuilder('site');

    if (filters.waterBodyType) {
      queryBuilder.andWhere('site.waterBodyType = :waterBodyType', {
        waterBodyType: filters.waterBodyType,
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('site.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.q) {
      queryBuilder.andWhere('(site.code ILIKE :q OR site.name ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    queryBuilder
      .orderBy(`site.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  findById(id: string): Promise<Site | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Site | null> {
    return this.repository.findOne({ where: { code } });
  }

  create(data: Partial<Site>): Promise<Site> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: Partial<Site>): Promise<void> {
    await this.repository.update({ id }, data);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
  }
}
