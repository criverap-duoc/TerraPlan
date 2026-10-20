import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter, Types } from 'mongoose';
import { EventResponseDto } from './dto/event-response.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { ListEventsResponseDto } from './dto/list-events-response.dto';
import { CampaignEvent } from './schemas/campaign-event.schema';
import { CampaignEventType } from './types/campaign-event-type.enum';

const MAX_RETRIES = 1;
const BACKOFF_MS = 500;

export interface RecordEventInput {
  campaignId: string;
  type: CampaignEventType;
  payload: Record<string, unknown>;
  actorId: string | null;
  requestId: string;
}

export interface RecordEventResult {
  recorded: boolean;
}

type CampaignEventDocument = CampaignEvent & { _id: Types.ObjectId };

/**
 * Best-effort append-only log (ADR-006): callers emit after the Postgres commit and never fail
 * because the log could not be written. `record` always resolves, with `recorded: false` on loss.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(CampaignEvent.name)
    private readonly eventModel: Model<CampaignEvent>,
  ) {}

  async record(input: RecordEventInput): Promise<RecordEventResult> {
    const document = {
      campaignId: input.campaignId,
      type: input.type,
      payload: input.payload,
      actorId: input.actorId,
      requestId: input.requestId,
      at: new Date(),
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        await this.eventModel.create(document);

        return { recorded: true };
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          this.logger.warn(
            {
              err: error,
              campaignId: input.campaignId,
              type: input.type,
              attempt: attempt + 1,
            },
            'Failed to record campaign event, retrying',
          );
          await delay(BACKOFF_MS);
        } else {
          this.logger.error(
            {
              err: error,
              campaignId: input.campaignId,
              type: input.type,
            },
            'Failed to record campaign event after retries; the operation succeeded without it',
          );
        }
      }
    }

    return { recorded: false };
  }

  async listByCampaign(
    campaignId: string,
    filters: ListEventsQueryDto,
  ): Promise<ListEventsResponseDto> {
    const limit = filters.limit;
    const query: QueryFilter<CampaignEvent> = { campaignId };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.before) {
      query.at = { $lt: new Date(filters.before) };
    }

    const documents = (await this.eventModel
      .find(query)
      .sort({ at: -1 })
      .limit(limit)
      .lean()
      .exec()) as unknown as CampaignEventDocument[];

    const data = documents.map((document) => toResponseDto(document));

    return {
      data,
      meta: {
        count: data.length,
        nextCursor: data.length === limit ? data[data.length - 1].at : null,
      },
    };
  }
}

function toResponseDto(document: CampaignEventDocument): EventResponseDto {
  return {
    id: document._id.toString(),
    campaignId: document.campaignId,
    type: document.type,
    payload: document.payload,
    actorId: document.actorId,
    requestId: document.requestId,
    at: new Date(document.at).toISOString(),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
