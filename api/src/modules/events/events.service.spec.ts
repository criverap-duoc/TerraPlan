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
    expect(sort).toHaveBeenCalledWith({ at: -1, _id: -1 });
    expect(limit).toHaveBeenCalledWith(50);
    expect(result.data.map((event) => event.id)).toEqual(['event-2', 'event-1']);
    expect(result.data[0].at).toBe('2026-10-19T14:10:00.000Z');
    expect(result.meta).toEqual({ count: 2, nextCursor: null });
  });

  it('returns an opaque cursor with the last event instant and id when the page is full', async () => {
    const at = new Date('2026-10-19T14:05:00Z');
    exec.mockResolvedValue([buildDocument({ _id: { toString: () => 'event-9' }, at })]);

    const result = await service.listByCampaign(CAMPAIGN_ID, { limit: 1 });

    expect(result.meta.count).toBe(1);
    expect(result.meta.nextCursor).toEqual(expect.any(String));
    expect(decodeCursor(result.meta.nextCursor as string)).toEqual({
      at: at.toISOString(),
      id: 'event-9',
    });
  });

  it('filters events before the cursor using the id as tiebreaker', async () => {
    exec.mockResolvedValue([]);
    const at = new Date('2026-10-19T14:05:00Z');
    const before = Buffer.from(JSON.stringify({ at: at.toISOString(), id: 'event-9' })).toString(
      'base64',
    );

    await service.listByCampaign(CAMPAIGN_ID, { before, limit: 50 });

    expect(find).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      $or: [{ at: { $lt: at } }, { at, _id: { $lt: 'event-9' } }],
    });
  });

  it('paginates stably when events share the same at', async () => {
    const at = new Date('2026-10-19T14:05:00Z');
    const documents = ['event-a', 'event-b', 'event-c'].map((id) =>
      buildDocument({ _id: { toString: () => id }, at }),
    );
    exec
      .mockResolvedValueOnce(documents.slice(0, 2))
      .mockResolvedValueOnce(documents.slice(2));

    const first = await service.listByCampaign(CAMPAIGN_ID, { limit: 2 });

    expect(first.data.map((event) => event.id)).toEqual(['event-a', 'event-b']);
    expect(decodeCursor(first.meta.nextCursor as string)).toEqual({
      at: at.toISOString(),
      id: 'event-b',
    });

    const second = await service.listByCampaign(CAMPAIGN_ID, {
      limit: 2,
      before: first.meta.nextCursor as string,
    });

    expect(second.data.map((event) => event.id)).toEqual(['event-c']);
    expect(second.meta.nextCursor).toBeNull();
    expect(find).toHaveBeenLastCalledWith({
      campaignId: CAMPAIGN_ID,
      $or: [{ at: { $lt: at } }, { at, _id: { $lt: 'event-b' } }],
    });
    expect(new Set([...first.data, ...second.data].map((event) => event.id)).size).toBe(3);
  });

  it('rejects a cursor that is not a valid encoded { at, id }', async () => {
    const before = Buffer.from('not-json').toString('base64');

    await expect(service.listByCampaign(CAMPAIGN_ID, { before, limit: 2 })).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
    expect(find).not.toHaveBeenCalled();
  });
});

function decodeCursor(cursor: string): { at: string; id: string } {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as { at: string; id: string };
}
