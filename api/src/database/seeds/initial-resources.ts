import { DataSource } from 'typeorm';
import { AppUser } from '../../modules/users/entities/app-user.entity';
import { Equipment } from '../../modules/equipment/entities/equipment.entity';
import { Technician } from '../../modules/technicians/entities/technician.entity';
import { Vehicle } from '../../modules/vehicles/entities/vehicle.entity';
import dataSource from '../data-source';

export interface SeedTechnician {
  code: string;
  fullName: string;
  phone: string;
  skills: string[];
  userEmail?: string;
}

export interface SeedEquipment {
  code: string;
  name: string;
  category: string;
  serialNumber: string;
}

export interface SeedVehicle {
  code: string;
  name: string;
  plate: string;
  capacityKg: number;
}

export const SEED_TECHNICIANS: SeedTechnician[] = [
  {
    code: 'TECH-01',
    fullName: 'Camila Rojas',
    phone: '+56 9 8123 4567',
    skills: ['pH', 'OD', 'conductividad'],
    userEmail: 'technician@terraplan.local',
  },
  {
    code: 'TECH-02',
    fullName: 'Diego Fuentes',
    phone: '+56 9 8234 5678',
    skills: ['nutrientes', 'turbidez'],
  },
  {
    code: 'TECH-03',
    fullName: 'Valentina Soto',
    phone: '+56 9 8345 6789',
    skills: ['pH', 'turbidez', 'muestreo compuesto'],
  },
  {
    code: 'TECH-04',
    fullName: 'Matías Herrera',
    phone: '+56 9 8456 7890',
    skills: ['OD', 'conductividad'],
  },
];

export const SEED_EQUIPMENT: SeedEquipment[] = [
  {
    code: 'EQ-SONDA-01',
    name: 'Sonda multiparamétrica YSI ProDSS',
    category: 'multiparametric_probe',
    serialNumber: 'YSI-PDSS-2411',
  },
  {
    code: 'EQ-TURB-01',
    name: 'Turbidímetro HACH 2100Q',
    category: 'turbidimeter',
    serialNumber: 'HACH-2100Q-1187',
  },
  {
    code: 'EQ-NUTRI-01',
    name: 'Kit de nutrientes HACH DR3900',
    category: 'spectrophotometer',
    serialNumber: 'HACH-DR3900-0423',
  },
];

export const SEED_VEHICLES: SeedVehicle[] = [
  { code: 'VH-01', name: 'Camioneta Toyota Hilux', plate: 'ABCD-12', capacityKg: 800 },
  { code: 'VH-02', name: 'Furgón Renault Kangoo', plate: 'EFGH-34', capacityKg: 500 },
  { code: 'VH-03', name: 'Camioneta Nissan Navara', plate: 'IJKL-56', capacityKg: 1000 },
];

// Idempotent: existing codes are left untouched so re-running never duplicates rows.
export async function seedInitialResources(dataSource: DataSource): Promise<void> {
  const usersRepository = dataSource.getRepository(AppUser);
  const techniciansRepository = dataSource.getRepository(Technician);
  const equipmentRepository = dataSource.getRepository(Equipment);
  const vehiclesRepository = dataSource.getRepository(Vehicle);

  for (const seedTechnician of SEED_TECHNICIANS) {
    if (await techniciansRepository.findOne({ where: { code: seedTechnician.code } })) {
      continue;
    }

    const linkedUser = seedTechnician.userEmail
      ? await usersRepository.findOne({ where: { email: seedTechnician.userEmail } })
      : null;

    await techniciansRepository.save(
      techniciansRepository.create({
        code: seedTechnician.code,
        fullName: seedTechnician.fullName,
        phone: seedTechnician.phone,
        skills: seedTechnician.skills,
        userId: linkedUser?.id ?? null,
        isActive: true,
      }),
    );
  }

  for (const seedEquipment of SEED_EQUIPMENT) {
    if (await equipmentRepository.findOne({ where: { code: seedEquipment.code } })) {
      continue;
    }

    await equipmentRepository.save(
      equipmentRepository.create({
        code: seedEquipment.code,
        name: seedEquipment.name,
        category: seedEquipment.category,
        serialNumber: seedEquipment.serialNumber,
        isActive: true,
      }),
    );
  }

  for (const seedVehicle of SEED_VEHICLES) {
    if (await vehiclesRepository.findOne({ where: { code: seedVehicle.code } })) {
      continue;
    }

    await vehiclesRepository.save(
      vehiclesRepository.create({
        code: seedVehicle.code,
        name: seedVehicle.name,
        plate: seedVehicle.plate,
        capacityKg: seedVehicle.capacityKg,
        isActive: true,
      }),
    );
  }

  console.log('Seeded 4 technicians + 3 equipment + 3 vehicles (or existing)');
}

async function main(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await seedInitialResources(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
