import { CampaignStatus } from './types/campaign-status.enum';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error';

export { CampaignStatus };

// Single source of truth for the campaign lifecycle. Every other pair is rejected.
const TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
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

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(
      `No se puede pasar una campaña de "${from}" a "${to}".`,
    );
  }
}
