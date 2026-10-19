import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../../common/database/is-unique-violation';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { ListSitesQueryDto } from './dto/list-sites-query.dto';
import { SiteResponseDto } from './dto/site-response.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { Site } from './entities/site.entity';
import { SitesRepository } from './sites.repository';

const DUPLICATE_CODE = 'Ya existe un sitio con ese código.';
const SITE_NOT_FOUND = 'Sitio no encontrado.';

@Injectable()
export class SitesService {
  constructor(private readonly sitesRepository: SitesRepository) {}

  async list(query: ListSitesQueryDto): Promise<{
    data: SiteResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const { items, total } = await this.sitesRepository.findPage({
      waterBodyType: query.waterBodyType,
      isActive: query.isActive ?? true,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: items.map((site) => this.toResponse(site)),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findById(id: string): Promise<SiteResponseDto> {
    return this.toResponse(await this.getSiteOrFail(id));
  }

  async create(dto: CreateSiteDto): Promise<SiteResponseDto> {
    await this.ensureCodeAvailable(dto.code);

    try {
      const site = await this.sitesRepository.create({
        code: dto.code,
        name: dto.name,
        waterBodyType: dto.waterBodyType,
        latitude: dto.latitude.toFixed(6),
        longitude: dto.longitude.toFixed(6),
        isActive: dto.isActive ?? true,
      });

      return this.toResponse(site);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateSiteDto): Promise<SiteResponseDto> {
    const site = await this.getSiteOrFail(id);

    if (dto.code && dto.code !== site.code) {
      await this.ensureCodeAvailable(dto.code);
    }

    const patch: Partial<Site> = {};

    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.waterBodyType !== undefined) patch.waterBodyType = dto.waterBodyType;
    if (dto.latitude !== undefined) patch.latitude = dto.latitude.toFixed(6);
    if (dto.longitude !== undefined) patch.longitude = dto.longitude.toFixed(6);
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    try {
      await this.sitesRepository.update(id, patch);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_CODE);
      }

      throw error;
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.getSiteOrFail(id);
    await this.sitesRepository.deactivate(id);
  }

  private async getSiteOrFail(id: string): Promise<Site> {
    const site = await this.sitesRepository.findById(id);

    if (!site) {
      throw new NotFoundException(SITE_NOT_FOUND);
    }

    return site;
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    if (await this.sitesRepository.findByCode(code)) {
      throw new ConflictException(DUPLICATE_CODE);
    }
  }

  private toResponse(site: Site): SiteResponseDto {
    return {
      id: site.id,
      code: site.code,
      name: site.name,
      waterBodyType: site.waterBodyType,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      isActive: site.isActive,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }
}
