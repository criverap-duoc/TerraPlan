export type WaterBodyType = 'river' | 'lake' | 'estuary' | 'groundwater' | 'effluent' | 'drinking';

export interface Site {
  id: string;
  code: string;
  name: string;
  waterBodyType: WaterBodyType;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
