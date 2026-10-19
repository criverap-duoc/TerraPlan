import { Injectable } from '@nestjs/common';
import { argon2id, hash } from 'argon2';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { Role } from '../auth/types/role.enum';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AppUser } from './entities/app-user.entity';
import { UsersRepository } from './users.repository';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

const PASSWORD_HASH_OPTIONS = { type: argon2id } as const;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<AppUser | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<AppUser | null> {
    return this.usersRepository.findById(id);
  }

  async list(query: ListUsersQueryDto): Promise<{
    data: UserResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const { items, total } = await this.usersRepository.findPage({
      role: query.role,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    return this.usersRepository.create({
      email: input.email,
      passwordHash: await hash(input.password, PASSWORD_HASH_OPTIONS),
      fullName: input.fullName,
      role: input.role,
    });
  }

  setActive(id: string, isActive: boolean): Promise<void> {
    return this.usersRepository.setActive(id, isActive);
  }

  async updatePassword(id: string, password: string): Promise<void> {
    await this.usersRepository.updatePassword(
      id,
      await hash(password, PASSWORD_HASH_OPTIONS),
    );
  }
}
