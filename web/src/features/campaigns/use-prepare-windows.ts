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

/**
 * Computes the feasible windows and persists the feasible ones so they get ids the user can
 * select. The domain already discards slots outside the lab operating hours, so every returned
 * window is sampleable without client-side filtering.
 */
export function usePrepareWindows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, payload }: PrepareWindowsInput): Promise<PreparedWindows> => {
      const result = await computeFeasibleWindows(campaignId, payload);
      const feasible = result.windows.filter((window) => window.isFeasible);

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
