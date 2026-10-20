import type { Role } from './types';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  coordinator: 'Coordinador',
  field_technician: 'Técnico de terreno',
  viewer: 'Observador',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
