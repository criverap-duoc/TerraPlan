import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

// Code and site are immutable after creation; the remaining fields are optional.
export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['code', 'siteId'] as const),
) {}
