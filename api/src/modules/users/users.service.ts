import { Injectable } from '@nestjs/common';
import { argon2id, hash } from 'argon2';
import { Role } from '../auth/types/role.enum';
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
