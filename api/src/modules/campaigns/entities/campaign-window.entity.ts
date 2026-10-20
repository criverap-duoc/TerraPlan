import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity({ name: 'campaign_window' })
export class CampaignWindow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'transport_minutes', type: 'integer' })
  transportMinutes!: number;

  @Column({ name: 'holding_deadline', type: 'timestamptz', nullable: true })
  holdingDeadline!: Date | null;

  @Column({ name: 'is_selected', type: 'boolean', default: false })
  isSelected!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
