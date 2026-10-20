import { createHash } from 'node:crypto';

interface SimulatedRange {
  min: number;
  max: number;
  decimals: number;
}

const SIMULATED_RANGES: Record<string, SimulatedRange> = {
  PH: { min: 6.5, max: 8.5, decimals: 2 },
  TEMP: { min: 8, max: 22, decimals: 1 },
  DO: { min: 6, max: 12, decimals: 2 },
  COND: { min: 200, max: 1200, decimals: 0 },
  TURB: { min: 1, max: 30, decimals: 1 },
  N_NO3: { min: 0.1, max: 5, decimals: 3 },
  N_NO2: { min: 0.005, max: 0.5, decimals: 3 },
  P_PO4: { min: 0.01, max: 1, decimals: 3 },
  CL: { min: 10, max: 200, decimals: 2 },
};

/**
 * Deterministic simulated values for MVP publication. Replace with real observations when data
 * capture is implemented.
 */
export function simulatedValue(parameterCode: string, seed: string): number | null {
  const range = SIMULATED_RANGES[parameterCode];

  if (!range) {
    return null;
  }

  const digest = createHash('sha256').update(seed + parameterCode).digest();
  const fraction = digest.readUInt32BE(0) / 0xffffffff;
  const factor = 10 ** range.decimals;
  const value = range.min + fraction * (range.max - range.min);

  return Math.round(value * factor) / factor;
}
