export type VehicleSize = 'Carro Chico' | 'Carro Mediano' | 'Camioneta Mediana' | 'Camioneta Grande' | 'Van';

export type OrderStatus = 'Recepción' | 'Lavado' | 'Secado' | 'Listo' | 'Entregado';

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isHidden?: boolean;
}

export interface Member {
  id: string;
  placa: string;
  name?: string;
  totalWashings: number;
  lastVisit: string;
  joinedAt: string;
}

export interface Order {
  id: string;
  folio: string;
  vehicle: {
    placa: string;
    brand: string;
    model: string;
    size: VehicleSize;
  };
  services: Service[];
  isPremium: boolean;
  basePrice: number;
  premiumPrice: number;
  total: number;
  status: OrderStatus;
  washerId?: string;
  bayNumber?: number;
  createdAt: string;
  paymentMethod?: 'Efectivo' | 'Tarjeta' | 'Membresía';
  isFree?: boolean; // Indica si se aplicó promoción de lavado gratis
}

export const BASE_PRICES: Record<VehicleSize, number> = {
  'Carro Chico': 110,
  'Carro Mediano': 115,
  'Camioneta Mediana': 120,
  'Camioneta Grande': 140,
  'Van': 180,
};

export const PREMIUM_ADDON_PRICE = 100;

export interface Bay {
  id: number;
  label: string;
  defaultWasherId?: string;
}

export interface PromoRule {
  id: string;
  name: string;
  visitThreshold: number; // Ej. 3, 5, 10
  benefit: 'free' | 'discount' | 'premium_upgrade';
  discountPercent?: number;
  isActive: boolean;
}

export interface GlobalConfig {
  promoRules: PromoRule[];
  bays: Bay[];
  washers: string[];
  services: Service[];
}
