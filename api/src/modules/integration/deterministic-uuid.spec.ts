import { deterministicUuid } from './deterministic-uuid';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('deterministicUuid', () => {
  it('returns the same UUID for the same namespace', () => {
    expect(deterministicUuid('campaign:site:2026-11-02T13:00:00Z')).toBe(
      deterministicUuid('campaign:site:2026-11-02T13:00:00Z'),
    );
  });

  it('returns different UUIDs for different namespaces', () => {
    expect(deterministicUuid('sample:PH')).not.toBe(deterministicUuid('sample:TURB'));
    expect(deterministicUuid('sample:PH')).not.toBe(deterministicUuid('sample:PH '));
  });

  it('formats the result as a v4-like UUID', () => {
    expect(deterministicUuid('sample:PH')).toMatch(UUID_V4_PATTERN);
    expect(deterministicUuid('')).toMatch(UUID_V4_PATTERN);
  });
});
