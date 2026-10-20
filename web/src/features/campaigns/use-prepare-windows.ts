import { useMutation, useQueryClient } from '@tanstack/react-query';

import { computeFeasibleWindows, persistWindows } from './api';
import type { FeasibleWindowsPayload } from './api';
import type { CampaignWindow } from './types';

interface PrepareWindowsInput {
  campaignId: string;
  payload: FeasibleWindowsPayload;
}

export interface PreparedWindows {
  windows: CampaignWindow[];
  minHoldingTimeHours: number | 'Infinity';
}

const MAX_WIZARD_WINDOWS = 8;
const FIRST_WORKING_HOUR = 8;
const LAST_WORKING_HOUR = 16;

/**
 * The API marks a slot feasible based on the holding time only, so a week of 2-hour slots returns
 * night slots too. The wizard offers the first working-hour windows instead of the whole week.
 */
function isWorkingHour(isoStart: string): boolean {
  const hour = new Date(isoStart).getHours();
  return hour >= FIRST_WORKING_HOUR && hour < LAST_WORKING_HOUR;
}

/**
 * Computes the feasible windows and persists the feasible ones so they get ids the user can
 * select. Returning both steps keeps the wizard in a single loading state.
 */
export function usePrepareWindows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, payload }: PrepareWindowsInput): Promise<PreparedWindows> => {
      const result = await computeFeasibleWindows(campaignId, payload);
      const feasible = result.windows
        .filter((window) => window.isFeasible && isWorkingHour(window.samplingStart))
        .slice(0, MAX_WIZARD_WINDOWS);

      if (feasible.length === 0) {
        return { windows: [], minHoldingTimeHours: result.minHoldingTimeHours };
      }

      const detail = await persistWindows(
        campaignId,
        feasible.map((window) => ({
          startsAt: window.samplingStart,
          endsAt: window.samplingEnd,
          transportMinutes: payload.transportMinutes,
          holdingDeadline: window.holdingDeadline,
        })),
      );

      return {
        windows: detail.windows,
        minHoldingTimeHours: result.minHoldingTimeHours,
      };
    },
    onSuccess: async (_result, { campaignId }) => {
      await queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}
