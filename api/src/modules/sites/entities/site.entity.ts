import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const WATER_BODY_TYPES = [
  'river',
  'lake',
  'estuary',
  'groundwater',
  'effluent',
  'drinking',
] as const;

export type WaterBodyType = (typeof WATER_BODY_TYPES)[number];

@Entity({ name: 'site' })
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ type: 'text' })
  name!: string;

  // Stored as text: allowed values are enforced by the site_water_body_type_check constraint.
  @Column({ name: 'water_body_type', type: 'text' })
  waterBodyType!: WaterBodyType;

  // numeric(9,6) arrives as string; the service converts it explicitly to avoid float drift.
  @Column({ type: 'numeric', precision: 9, scale: 6 })
  latitude!: string;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  longitude!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
