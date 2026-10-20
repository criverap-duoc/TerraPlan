import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignStatus } from '../types/campaign-status.enum';

@Entity({ name: 'campaign' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ type: 'text', default: CampaignStatus.Draft })
  status!: CampaignStatus;

  // Nullable at the database level for the pre-R7 seed rows; the service always requires a site.
  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId!: string | null;

  @Column({ name: 'earliest_start', type: 'timestamptz', nullable: true })
  earliestStart!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

