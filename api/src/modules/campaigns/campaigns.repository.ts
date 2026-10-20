import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SortOrder } from '../../common/dto/pagination-query.dto';
import type { CampaignSortField } from './dto/list-campaigns-query.dto';
import { CampaignParameter } from './entities/campaign-parameter.entity';
import { CampaignWindow } from './entities/campaign-window.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignStatus } from './types/campaign-status.enum';

export interface CampaignFilters {
  status?: CampaignStatus;
  siteId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
  sort: CampaignSortField;
  order: SortOrder;
}

export interface CreateCampaignData {
  code: string;
  siteId: string;
  earliestStart: Date | null;
  notes: string | null;
  createdBy: string | null;
  status?: CampaignStatus;
}

export interface CampaignWindowInput {
  startsAt: Date;
  endsAt: Date;
  transportMinutes: number;
  holdingDeadline: Date | null;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

const SELECT_PARAMETER_CODES = `
  SELECT parameter_code AS "parameterCode"
  FROM campaign_parameter
  WHERE campaign_id = $1
  ORDER BY parameter_code
`;

const SELECT_ACTIVE_RESERVATIONS = `
  SELECT EXISTS (
    SELECT 1 FROM resource_booking WHERE campaign_id = $1 AND status = 'active'
  ) AS "exists"
`;

@Injectable()
export class CampaignsRepository {
  constructor(
    @InjectRepository(Campaign)
    private readonly repository: Repository<Campaign>,
    @InjectRepository(CampaignWindow)
    private readonly windows: Repository<CampaignWindow>,
  ) {}

  async createWithParameters(
    data: CreateCampaignData,
    parameterCodes: string[],
  ): Promise<Campaign> {
    return this.repository.manager.transaction(async (manager) => {
      const campaign = await manager.save(
        manager.create(Campaign, { ...data, status: data.status ?? CampaignStatus.Draft }),
      );

      if (parameterCodes.length > 0) {
        await manager.insert(
          CampaignParameter,
          parameterCodes.map((parameterCode) => ({
            campaignId: campaign.id,
            parameterCode,
          })),
        );
      }

      return campaign;
    });
  }

  async findPage(filters: CampaignFilters): Promise<PageResult<Campaign>> {
    const queryBuilder = this.repository.createQueryBuilder('campaign');

    if (filters.status) {
      queryBuilder.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters.siteId) {
      queryBuilder.andWhere('campaign.siteId = :siteId', { siteId: filters.siteId });
    }

    if (filters.from) {
      queryBuilder.andWhere('campaign.earliestStart >= :from', { from: filters.from });
    }

    if (filters.to) {
      queryBuilder.andWhere('campaign.earliestStart <= :to', { to: filters.to });
    }

    queryBuilder
      .orderBy(`campaign.${filters.sort}`, filters.order === 'desc' ? 'DESC' : 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  findById(id: string): Promise<Campaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Campaign | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findParameterCodes(campaignId: string): Promise<string[]> {
    const rows = (await this.repository.query(SELECT_PARAMETER_CODES, [
      campaignId,
    ])) as { parameterCode: string }[];

    return rows.map((row) => row.parameterCode);
  }

  findWindows(campaignId: string): Promise<CampaignWindow[]> {
    return this.windows.find({ where: { campaignId }, order: { startsAt: 'ASC' } });
  }

  async hasWindows(campaignId: string): Promise<boolean> {
    return (await this.windows.count({ where: { campaignId } })) > 0;
  }

  async hasSelectedWindow(campaignId: string): Promise<boolean> {
    return (await this.windows.count({ where: { campaignId, isSelected: true } })) > 0;
  }

  async hasActiveReservations(campaignId: string): Promise<boolean> {
    const rows = (await this.repository.query(SELECT_ACTIVE_RESERVATIONS, [
      campaignId,
    ])) as { exists: boolean }[];

    return rows[0]?.exists === true;
  }

  // The row lock plus the status predicate make the patch and the parameter swap atomic: a
  // concurrent transition either waits for this transaction or makes it update 0 rows.
  updateWithParameters(
    id: string,
    patch: Partial<Campaign>,
    parameterCodes?: string[],
  ): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const campaign = await manager.findOne(Campaign, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!campaign || campaign.status !== CampaignStatus.Draft) {
        return false;
      }

      if (Object.keys(patch).length > 0) {
        const result = await manager
          .createQueryBuilder()
          .update(Campaign)
          .set(patch)
          .where('id = :id AND status = :status', { id, status: CampaignStatus.Draft })
          .execute();

        if (result.affected !== 1) {
          return false;
        }
      }

      if (parameterCodes !== undefined) {
        await manager.delete(CampaignParameter, { campaignId: id });

        if (parameterCodes.length > 0) {
          await manager.insert(
            CampaignParameter,
            parameterCodes.map((parameterCode) => ({ campaignId: id, parameterCode })),
          );
        }
      }

      return true;
    });
  }

  // The status predicate makes concurrent transitions race-safe: the losing request updates 0 rows.
  async transitionStatus(
    id: string,
    from: CampaignStatus,
    to: CampaignStatus,
    notes?: string,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Campaign)
      .set({ status: to, ...(notes === undefined ? {} : { notes }) })
      .where('id = :id AND status = :from', { id, from })
      .execute();

    return result.affected === 1;
  }

  async persistWindows(campaignId: string, windows: CampaignWindowInput[]): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(CampaignWindow, { campaignId });

      await manager.insert(
        CampaignWindow,
        windows.map((window) => ({
          campaignId,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          transportMinutes: window.transportMinutes,
          holdingDeadline: window.holdingDeadline,
          isSelected: false,
        })),
      );
    });
  }

  async selectWindow(campaignId: string, windowId: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const window = await manager.findOne(CampaignWindow, { where: { id: windowId, campaignId } });

      if (!window) {
        return false;
      }

      await manager.update(CampaignWindow, { campaignId }, { isSelected: false });
      await manager.update(CampaignWindow, { id: windowId, campaignId }, { isSelected: true });

      return true;
    });
  }
}

