export interface Technician {
  id: string;
  code: string;
  fullName: string;
  userId: string | null;
  phone: string | null;
  skills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  serialNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  code: string;
  name: string;
  plate: string;
  capacityKg: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilters {
  q?: string;
  page: number;
  pageSize: number;
}
