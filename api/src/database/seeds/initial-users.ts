import { argon2id, hash } from 'argon2';
import { DataSource } from 'typeorm';
import { Role } from '../../modules/auth/types/role.enum';
import { AppUser } from '../../modules/users/entities/app-user.entity';
import dataSource from '../data-source';

export interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@terraplan.local',
    password: 'Admin1234!',
    fullName: 'Admin TerraPlan',
    role: Role.Admin,
  },
  {
    email: 'coordinator@terraplan.local',
    password: 'Coord1234!',
    fullName: 'Coordinador Demo',
    role: Role.Coordinator,
  },
  {
    email: 'technician@terraplan.local',
    password: 'Tech1234!',
    fullName: 'Técnico Demo',
    role: Role.FieldTechnician,
  },
  {
    email: 'viewer@terraplan.local',
    password: 'Viewer1234!',
    fullName: 'Viewer Demo',
    role: Role.Viewer,
  },
];

// Idempotent: existing emails are left untouched so re-running never resets passwords.
export async function seedInitialUsers(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(AppUser);

  for (const seedUser of SEED_USERS) {
    const existing = await repository.findOne({ where: { email: seedUser.email } });

    if (existing) {
      continue;
    }

    await repository.save(
      repository.create({
        email: seedUser.email,
        passwordHash: await hash(seedUser.password, { type: argon2id }),
        fullName: seedUser.fullName,
        role: seedUser.role,
        isActive: true,
      }),
    );
  }

  console.log('Seeded 4 users (or existing)');
}

async function main(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await seedInitialUsers(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
