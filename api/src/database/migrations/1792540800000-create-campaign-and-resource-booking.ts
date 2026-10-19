import { MigrationInterface, QueryRunner } from 'typeorm';

const CREATE_SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS btree_gist;

  CREATE TABLE campaign (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'planned', 'confirmed', 'in_field', 'completed', 'needs_reschedule', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_campaign_status ON campaign (status);

  CREATE TABLE resource_booking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    resource_type text NOT NULL CHECK (resource_type IN ('technician', 'equipment', 'vehicle')),
    resource_id uuid NOT NULL,
    during tstzrange NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_double_booking
      EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (status = 'active')
  );

  CREATE INDEX idx_resource_booking_campaign ON resource_booking (campaign_id);
  CREATE INDEX idx_resource_booking_resource ON resource_booking (resource_id, status);
`;

// btree_gist is left installed: upcoming migrations rely on it for the same exclusion pattern.
const DROP_SCHEMA = `
  DROP TABLE resource_booking;
  DROP TABLE campaign;
`;

export class CreateCampaignAndResourceBooking1792540800000 implements MigrationInterface {
  name = 'CreateCampaignAndResourceBooking1792540800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_SCHEMA);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(DROP_SCHEMA);
  }
}
