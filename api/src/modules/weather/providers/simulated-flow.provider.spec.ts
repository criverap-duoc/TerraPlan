import type { SiteRef } from '../ports/weather-provider.interface';
import { SimulatedFlowProvider } from './simulated-flow.provider';

const SITE: SiteRef = {
  id: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d',
  code: 'RIO-MAIPO-01',
  latitude: -33.61,
  longitude: -70.58,
};

const AT = new Date('2026-11-01T10:00:00Z');

describe('SimulatedFlowProvider', () => {
  const provider = new SimulatedFlowProvider();

  it('returns the same flow for the same site and instant', async () => {
    const first = await provider.getFlow(SITE, AT);
    const second = await provider.getFlow(SITE, AT);

    expect(second).toEqual(first);
    expect(first.at).toEqual(AT);
  });

  it('returns a different flow for a different instant', async () => {
    const first = await provider.getFlow(SITE, AT);
    const second = await provider.getFlow(SITE, new Date('2026-11-01T11:00:00Z'));

    expect(second.flowM3s).not.toBe(first.flowM3s);
  });

  it('always stays within the simulated range', async () => {
    for (let hour = 0; hour < 48; hour += 1) {
      const at = new Date(AT.getTime() + hour * 3_600_000);
      const reading = await provider.getFlow(SITE, at);

      expect(reading.flowM3s).toBeGreaterThanOrEqual(0.5);
      expect(reading.flowM3s).toBeLessThanOrEqual(50.5);
    }
  });
});
