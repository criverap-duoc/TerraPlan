import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '../../common/dto/pagination-query.dto';
import { VehicleSortField } from './dto/list-vehicles-query.dto';
import { Vehicle } from './entities/vehicle.entity';

export interface VehicleFilters {
  isActive?: boolean;
  q?: string;
  page: number;
  pageSize: number;
  sort: VehicleSortField;
  order: SortOrder;
}

export interface VehiclePageResult {
  items: Vehicle[];
  total: number;
}

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repository: Repository<Vehicle>,
  ) {}

  async findPage(filters: VehicleFilters): Promise<VehiclePageResult> {
    const queryBuilder = this.repository.createQueryBuilder('vehicle');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('vehicle.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.q) {
      queryBuilder.andWhere(
        '(vehicle.code ILIKE :q OR vehicle.name ILIKE :q OR vehicle.plate ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }

    queryBuilder
      .orderBy(`vehicle.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  findById(id: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { code } });
  }

  findByPlate(plate: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { plate } });
  }

  create(data: Partial<Vehicle>): Promise<Vehicle> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: Partial<Vehicle>): Promise<void> {
    await this.repository.update({ id }, data);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
  }
}
