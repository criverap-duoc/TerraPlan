import { simulatedValue } from './simulated-values';

const SEED = '11111111-1111-4111-8111-111111111111';

const CASES: Array<[string, number, number, number]> = [
  ['PH', 6.5, 8.5, 2],
  ['TEMP', 8, 22, 1],
  ['DO', 6, 12, 2],
  ['COND', 200, 1200, 0],
  ['TURB', 1, 30, 1],
  ['N_NO3', 0.1, 5, 3],
  ['N_NO2', 0.005, 0.5, 3],
  ['P_PO4', 0.01, 1, 3],
  ['CL', 10, 200, 2],
];

describe('simulatedValue', () => {
  it.each(CASES)('%s stays inside its plausible range and precision', (code, min, max, decimals) => {
    const value = simulatedValue(code, SEED);

    expect(value).not.toBeNull();
    expect(value as number).toBeGreaterThanOrEqual(min);
    expect(value as number).toBeLessThanOrEqual(max);
    expect(value as number).toBe(Number((value as number).toFixed(decimals)));
  });

  it('returns the same value for the same seed and parameter', () => {
    expect(simulatedValue('PH', SEED)).toBe(simulatedValue('PH', SEED));
  });

  it('returns different values for different seeds', () => {
    expect(simulatedValue('PH', SEED)).not.toBe(simulatedValue('PH', 'another-sample'));
  });

  it('returns null for a parameter the simulator does not know', () => {
    expect(simulatedValue('UNKNOWN_PARAM', SEED)).toBeNull();
  });
});
