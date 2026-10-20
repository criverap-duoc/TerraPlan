import { canTransition, assertTransition, CampaignStatus } from './campaign-status.domain';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error';

// 7 x 7 table: the only pairs the lifecycle allows. Anything else must be rejected.
const EXPECTED: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.Draft]: [CampaignStatus.Planned, CampaignStatus.Cancelled],
  [CampaignStatus.Planned]: [
    CampaignStatus.Confirmed,
    CampaignStatus.Draft,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.Confirmed]: [
    CampaignStatus.InField,
    CampaignStatus.NeedsReschedule,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.InField]: [CampaignStatus.Completed, CampaignStatus.Cancelled],
  [CampaignStatus.Completed]: [CampaignStatus.Cancelled],
  [CampaignStatus.NeedsReschedule]: [CampaignStatus.Planned, CampaignStatus.Cancelled],
  [CampaignStatus.Cancelled]: [],
};

const ALL_STATUSES = Object.values(CampaignStatus);

describe('campaign-status.domain', () => {
  describe.each(ALL_STATUSES)('from %s', (from) => {
    it.each(ALL_STATUSES)('to %s', (to) => {
      expect(canTransition(from, to)).toBe(EXPECTED[from].includes(to));
    });
  });

  it('throws InvalidStateTransitionError for a rejected pair', () => {
    expect(() => assertTransition(CampaignStatus.Completed, CampaignStatus.Planned)).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('reports 409 and a stable code for a rejected pair', () => {
    const error: unknown = (() => {
      try {
        assertTransition(CampaignStatus.Cancelled, CampaignStatus.Draft);
      } catch (reason: unknown) {
        return reason;
      }
      return null;
    })();

    expect(error).toBeInstanceOf(InvalidStateTransitionError);
    expect((error as InvalidStateTransitionError).code).toBe('INVALID_STATE_TRANSITION');
    expect((error as InvalidStateTransitionError).status).toBe(409);
  });

  it('accepts a valid pair without throwing', () => {
    expect(() => assertTransition(CampaignStatus.Draft, CampaignStatus.Planned)).not.toThrow();
  });
});
