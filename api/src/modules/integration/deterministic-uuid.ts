import { createHash } from 'node:crypto';

/**
 * Stable UUID derived from a namespace so the same campaign/parameter keeps the same identifier
 * across retries and re-publications (the idempotency contract with AquaMetric depends on it).
 */
export function deterministicUuid(namespace: string): string {
  const hex = sha256Hex(namespace);
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(
    17,
    20,
  )}-${hex.slice(20, 32)}`;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
