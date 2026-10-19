import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports the service as healthy', () => {
    const response = new HealthController().check();

    expect(response.status).toBe('ok');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
    expect(response.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
