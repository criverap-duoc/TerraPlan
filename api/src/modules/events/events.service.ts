import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

    const cursor = filters.before ? parseCursor(filters.before) : null;

    if (cursor) {
      // `at` alone is not unique: two events can share the millisecond, so the id breaks the tie.
      query.$or = [{ at: { $lt: cursor.at } }, { at: cursor.at, _id: { $lt: cursor.id } }];
    }

    const documents = (await this.eventModel
      .find(query)
      .sort({ at: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec()) as unknown as CampaignEventDocument[];

    const data = documents.map((document) => toResponseDto(document));

    return {
      data,
      meta: {
        count: data.length,
        nextCursor:
          documents.length === limit ? encodeCursor(documents[documents.length - 1]) : null,
      },
    };
  }
}

interface EventCursor {
  at: Date;
  id: string;
}

function encodeCursor(document: CampaignEventDocument): string {
  const payload = { at: new Date(document.at).toISOString(), id: document._id.toString() };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function parseCursor(value: string): EventCursor {
  let payload: { at?: unknown; id?: unknown } | null = null;

  try {
    payload = JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as {
      at?: unknown;
      id?: unknown;
    };
  } catch {
    payload = null; // Malformed base64 or JSON: handled as an invalid cursor below.
  }

  const at = typeof payload?.at === 'string' ? new Date(payload.at) : null;
  const id = typeof payload?.id === 'string' ? payload.id : '';

  if (at === null || Number.isNaN(at.getTime()) || id.length === 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'El cursor de paginación no es válido.',
    });
  }

  return { at, id };
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
