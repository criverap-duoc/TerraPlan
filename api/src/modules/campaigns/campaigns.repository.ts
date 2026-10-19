import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignStatus } from './types/campaign-status.enum';

@Injectable()
export class CampaignsRepository {
  constructor(
    @InjectRepository(Campaign)
    private readonly repository: Repository<Campaign>,
  ) {}

  create(data: { code: string; status?: CampaignStatus }): Promise<Campaign> {
    return this.repository.save(this.repository.create(data));
  }

  findById(id: string): Promise<Campaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Campaign | null> {
    return this.repository.findOne({ where: { code } });
  }
}
