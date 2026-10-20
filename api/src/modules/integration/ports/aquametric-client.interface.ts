import type { AquaMetricPublishPayloadDto } from '../dto/aquametric/aquametric-publish-payload.dto';

export type AquaMetricPublishPayload = AquaMetricPublishPayloadDto;

export interface AquaMetricPublishResult {
  statusCode: number;
  responseBody: unknown;
}

export interface AquaMetricClient {
  publish(
    payload: AquaMetricPublishPayload,
    idempotencyKey: string,
  ): Promise<AquaMetricPublishResult>;
}

export const AQUAMETRIC_CLIENT = Symbol('AQUAMETRIC_CLIENT');
