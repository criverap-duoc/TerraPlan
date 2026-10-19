import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../auth/types/role.enum';
import { AppUser } from './entities/app-user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
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
