import { MigrationInterface, QueryRunner } from 'typeorm';

const CREATE_SCHEMA = `
  CREATE TABLE site (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    water_body_type text NOT NULL CHECK (water_body_type IN ('river', 'lake', 'estuary', 'groundwater', 'effluent', 'drinking')),
    latitude numeric(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_site_water_body_type ON site (water_body_type) WHERE is_active;

  CREATE TABLE technician (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    phone text,
    skills jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_technician_user ON technician (user_id) WHERE user_id IS NOT NULL;
  CREATE INDEX idx_technician_active ON technician (is_active);

  CREATE TABLE equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    category text NOT NULL,
    serial_number text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_equipment_category ON equipment (category) WHERE is_active;

  CREATE TABLE vehicle (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    plate text NOT NULL UNIQUE,
    capacity_kg integer CHECK (capacity_kg IS NULL OR capacity_kg > 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

const DROP_SCHEMA = `
  DROP TABLE vehicle;
  DROP TABLE equipment;
  DROP TABLE technician;
  DROP TABLE site;
`;

export class CreateSitesAndResources1792454400000 implements MigrationInterface {
  name = 'CreateSitesAndResources1792454400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_SCHEMA);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(DROP_SCHEMA);
  }
}
