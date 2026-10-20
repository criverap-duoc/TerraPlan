import { Logger } from '@nestjs/common';
import type { Model } from 'mongoose';
import { EventsService } from './events.service';
import type { CampaignEvent } from './schemas/campaign-event.schema';
import { CampaignEventType } from './types/campaign-event-type.enum';

const CAMPAIGN_ID = '8a1f3c2e-4b5d-4c6e-9f70-1a2b3c4d5e6f';
const USER_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';
const REQUEST_ID = 'c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b';

interface EventDocumentFixture {
  _id: { toString: () => string };
  campaignId: string;
  type: CampaignEventType;
  payload: Record<string, unknown>;
  actorId: string | null;
  requestId: string;
  at: Date;
}

function buildDocument(overrides: Partial<EventDocumentFixture> = {}): EventDocumentFixture {
  return {
    _id: { toString: () => 'event-1' },
    campaignId: CAMPAIGN_ID,
    type: CampaignEventType.Created,
    payload: { code: 'CAMP-2026-0100', siteId: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d' },
    actorId: USER_ID,
    requestId: REQUEST_ID,
    at: new Date('2026-10-19T14:05:00Z'),
    ...overrides,
  };
}

describe('EventsService', () => {
  let create: jest.Mock;
  let exec: jest.Mock;
  let limit: jest.Mock;
  let sort: jest.Mock;
  let find: jest.Mock;
  let service: EventsService;

  const input = {
    campaignId: CAMPAIGN_ID,
    type: CampaignEventType.Created,
    payload: { code: 'CAMP-2026-0100' },
    actorId: USER_ID,
    requestId: REQUEST_ID,
  };

  beforeEach(() => {
    create = jest.fn();
    exec = jest.fn();
    limit = jest.fn().mockReturnValue({ lean: () => ({ exec }) });
    sort = jest.fn().mockReturnValue({ limit });
    find = jest.fn().mockReturnValue({ sort });

    service = new EventsService({ create, find } as unknown as Model<CampaignEvent>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records an event and reports it as recorded', async () => {
    create.mockResolvedValue(buildDocument());

    await expect(service.record(input)).resolves.toEqual({ recorded: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        type: CampaignEventType.Created,
        payload: { code: 'CAMP-2026-0100' },
        actorId: USER_ID,
        requestId: REQUEST_ID,
        at: expect.any(Date),
      }),
    );
  });

  it('retries once and succeeds after a transient failure', async () => {
    create.mockRejectedValueOnce(new Error('connection reset')).mockResolvedValueOnce(buildDocument());

    await expect(service.record(input)).resolves.toEqual({ recorded: true });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('never throws and logs an error after both attempts fail', async () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    create.mockRejectedValue(new Error('mongo is down'));

    await expect(service.record(input)).resolves.toEqual({ recorded: false });
    expect(create).toHaveBeenCalledTimes(2);
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: CAMPAIGN_ID, type: CampaignEventType.Created }),
      expect.stringContaining('after retries'),
    );
  });

  it('lists the events of a campaign newest first and applies the filters', async () => {
    exec.mockResolvedValue([
      buildDocument({
        _id: { toString: () => 'event-2' },
        type: CampaignEventType.StatusChanged,
        at: new Date('2026-10-19T14:10:00Z'),
      }),
      buildDocument(),
    ]);

    const result = await service.listByCampaign(CAMPAIGN_ID, {
      type: CampaignEventType.StatusChanged,
      limit: 50,
    });

    expect(find).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      type: CampaignEventType.StatusChanged,
    });
    expect(sort).toHaveBeenCalledWith({ at: -1 });
    expect(limit).toHaveBeenCalledWith(50);
    expect(result.data.map((event) => event.id)).toEqual(['event-2', 'event-1']);
    expect(result.data[0].at).toBe('2026-10-19T14:10:00.000Z');
    expect(result.meta).toEqual({ count: 2, nextCursor: null });
  });

  it('returns the last event instant as the cursor when the page is full', async () => {
    exec.mockResolvedValue([buildDocument({ at: new Date('2026-10-19T14:05:00Z') })]);

    const result = await service.listByCampaign(CAMPAIGN_ID, { limit: 1 });

    expect(result.meta).toEqual({ count: 1, nextCursor: '2026-10-19T14:05:00.000Z' });
  });

  it('filters events recorded before the given cursor', async () => {
    exec.mockResolvedValue([]);

    await service.listByCampaign(CAMPAIGN_ID, {
      before: '2026-10-19T14:05:00Z',
      limit: 50,
    });

    expect(find).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      at: { $lt: new Date('2026-10-19T14:05:00Z') },
    });
  });
});
