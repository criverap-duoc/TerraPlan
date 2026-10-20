import type { Equipment, Technician, Vehicle } from './types';

export interface ResourceRow {
  id: string;
  code: string;
  name: string;
  detail: string;
  isActive: boolean;
}

export function toTechnicianRow(technician: Technician): ResourceRow {
  return {
    id: technician.id,
    code: technician.code,
    name: technician.fullName,
    detail: technician.skills.length > 0 ? technician.skills.join(', ') : '—',
    isActive: technician.isActive,
  };
}

export function toEquipmentRow(equipment: Equipment): ResourceRow {
  return {
    id: equipment.id,
    code: equipment.code,
    name: equipment.name,
    detail: equipment.category,
    isActive: equipment.isActive,
  };
}

export function toVehicleRow(vehicle: Vehicle): ResourceRow {
  return {
    id: vehicle.id,
    code: vehicle.code,
    name: vehicle.name,
    detail: vehicle.plate,
    isActive: vehicle.isActive,
  };
}
