import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { FlowProvider, FlowReading } from '../ports/flow-provider.interface';
import type { SiteRef } from '../ports/weather-provider.interface';

const FLOW_RANGE_FACTOR = 500;
const FLOW_BASE_M3S = 0.5;

/**
 * Simulated flow provider for the MVP: deterministic hash-based values in [0.5, 50.4] m3/s.
 * Replace with a real DGA API adapter once the integration is approved.
 */
@Injectable()
export class SimulatedFlowProvider implements FlowProvider {
  getFlow(site: SiteRef, at: Date): Promise<FlowReading> {
    const digest = createHash('sha256').update(`${site.id}|${at.toISOString()}`).digest('hex');
    const hash = Number.parseInt(digest.slice(0, 8), 16);
    const flowM3s = FLOW_BASE_M3S + (hash % FLOW_RANGE_FACTOR) / 10;

    return Promise.resolve({ at, flowM3s });
  }
}
