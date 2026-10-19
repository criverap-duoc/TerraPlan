import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.repository.save(this.repository.create(data));
  }

  findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository
      .createQueryBuilder('token')
      .where('token.tokenHash = :tokenHash', { tokenHash })
      .andWhere('token.revokedAt IS NULL')
      .andWhere('token.expiresAt > now()')
      .getOne();
  }

  async revokeById(id: string): Promise<void> {
    await this.repository.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async purgeExpired(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('expires_at < now()')
      .execute();
  }
}
