import { MigrationInterface, QueryRunner } from 'typeorm';

const EXTEND_SCHEMA = `
  ALTER TABLE campaign
    ADD COLUMN site_id uuid REFERENCES site(id),
    ADD COLUMN earliest_start timestamptz,
    ADD COLUMN notes text,
    ADD COLUMN created_by uuid REFERENCES app_user(id);

  CREATE INDEX idx_campaign_site ON campaign (site_id) WHERE site_id IS NOT NULL;
  CREATE INDEX idx_campaign_created_by ON campaign (created_by) WHERE created_by IS NOT NULL;
  CREATE INDEX idx_campaign_earliest_start ON campaign (earliest_start) WHERE earliest_start IS NOT NULL;

  CREATE TABLE campaign_parameter (
    campaign_id uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    parameter_code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, parameter_code)
  );

  CREATE INDEX idx_campaign_parameter_code ON campaign_parameter (parameter_code);

  CREATE TABLE campaign_window (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    transport_minutes integer NOT NULL CHECK (transport_minutes >= 0),
    holding_deadline timestamptz,
    is_selected boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
  );

  CREATE INDEX idx_campaign_window_campaign ON campaign_window (campaign_id);
  CREATE UNIQUE INDEX uq_campaign_window_selected
    ON campaign_window (campaign_id) WHERE is_selected = true;
`;

// site_id and created_by stay nullable: the 12 seed campaigns predate R7 and are backfilled by the
// seed script. Required values are enforced by the service, not by a NOT NULL constraint.
const DROP_SCHEMA = `
  DROP TABLE campaign_window;
  DROP TABLE campaign_parameter;
  DROP INDEX idx_campaign_earliest_start;
  DROP INDEX idx_campaign_created_by;
  DROP INDEX idx_campaign_site;
  ALTER TABLE campaign
    DROP COLUMN created_by,
    DROP COLUMN notes,
    DROP COLUMN earliest_start,
    DROP COLUMN site_id;
`;

export class ExtendCampaignWithParametersAndWindows1792627200000 implements MigrationInterface {
  name = 'ExtendCampaignWithParametersAndWindows1792627200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(EXTEND_SCHEMA);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(DROP_SCHEMA);
  }
}
