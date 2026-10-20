import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CAMPAIGN_EVENT_TYPES } from '../types/campaign-event-type.enum';
import type { CampaignEventType } from '../types/campaign-event-type.enum';

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60;

/**
 * Append-only audit log in MongoDB (ADR-002). It is never a source of truth: Postgres commits
 * first and a lost event only weakens the audit trail, never the campaign state.
 */
@Schema({ collection: 'campaign_events', timestamps: { createdAt: 'at', updatedAt: false } })
export class CampaignEvent {
  @Prop({ required: true, index: true })
  campaignId!: string;

  @Prop({ type: String, required: true, enum: CAMPAIGN_EVENT_TYPES })
  type!: CampaignEventType;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: String, default: null })
  actorId!: string | null;

  @Prop({ type: String, required: true, index: true })
  requestId!: string;

  @Prop({ type: Date, required: true })
  at!: Date;
}

export const CampaignEventSchema = SchemaFactory.createForClass(CampaignEvent);

CampaignEventSchema.index({ campaignId: 1, at: -1 });
CampaignEventSchema.index({ type: 1, at: -1 });
// The log is operational audit, not history: entries expire after 90 days.
CampaignEventSchema.index({ at: 1 }, { expireAfterSeconds: NINETY_DAYS_IN_SECONDS });
