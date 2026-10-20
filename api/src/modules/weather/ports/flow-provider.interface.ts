import type { SiteRef } from './weather-provider.interface';

export interface FlowReading {
  at: Date;
  flowM3s: number;
}

export interface FlowProvider {
  getFlow(site: SiteRef, at: Date): Promise<FlowReading>;
}
