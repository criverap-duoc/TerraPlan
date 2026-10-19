import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '../../common/dto/pagination-query.dto';
import { Role } from '../auth/types/role.enum';
import { UserSortField } from './dto/list-users-query.dto';
import { AppUser } from './entities/app-user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}

export interface UserFilters {
  role?: Role;
  q?: string;
  page: number;
  pageSize: number;
  sort: UserSortField;
  order: SortOrder;
}

export interface UserPageResult {
  items: AppUser[];
  total: number;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(AppUser)
    private readonly repository: Repository<AppUser>,
  ) {}

  findByEmail(email: string): Promise<AppUser | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: string): Promise<AppUser | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findPage(filters: UserFilters): Promise<UserPageResult> {
    const queryBuilder = this.repository.createQueryBuilder('appUser');

    if (filters.role) {
      queryBuilder.andWhere('appUser.role = :role', { role: filters.role });
    }

    if (filters.q) {
      queryBuilder.andWhere('(appUser.email ILIKE :q OR appUser.fullName ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    queryBuilder
      .orderBy(`appUser.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  create(data: CreateUserData): Promise<AppUser> {
    return this.repository.save(this.repository.create(data));
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.repository.update({ id }, { isActive });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repository.update({ id }, { passwordHash });
  }
}
