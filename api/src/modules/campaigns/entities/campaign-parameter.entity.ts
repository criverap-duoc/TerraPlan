import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// Catalog codes are free text: the catalog is JSON, not a PostgreSQL table.
@Entity({ name: 'campaign_parameter' })
export class CampaignParameter {
  @PrimaryColumn({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @PrimaryColumn({ name: 'parameter_code', type: 'text' })
  parameterCode!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
