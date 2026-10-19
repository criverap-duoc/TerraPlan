import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { CampaignsRepository } from './campaigns.repository';
import { Campaign } from './entities/campaign.entity';
import { CampaignStatus } from './types/campaign-status.enum';

const DUPLICATE_CODE = 'Ya existe una campaña con ese código.';

@Injectable()
export class CampaignsService {
  constructor(private readonly campaignsRepository: CampaignsRepository) {}

  // Minimal surface for R5: the state machine, site and parameters arrive in R7.
  async create(data: { code: string; status?: CampaignStatus }): Promise<Campaign> {
    try {
      return await this.campaignsRepository.create(data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }
  }

  findById(id: string): Promise<Campaign | null> {
    return this.campaignsRepository.findById(id);
  }
}
