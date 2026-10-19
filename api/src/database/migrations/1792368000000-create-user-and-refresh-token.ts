import { MigrationInterface, QueryRunner } from 'typeorm';

const CREATE_SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'coordinator', 'field_technician', 'viewer')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_app_user_role ON app_user (role) WHERE is_active;

  CREATE TABLE refresh_token (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_refresh_token_user ON refresh_token (user_id) WHERE revoked_at IS NULL;
`;

const DROP_SCHEMA = `
  DROP TABLE refresh_token;
  DROP TABLE app_user;
`;

export class CreateUserAndRefreshToken1792368000000 implements MigrationInterface {
  name = 'CreateUserAndRefreshToken1792368000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_SCHEMA);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(DROP_SCHEMA);
  }
}
