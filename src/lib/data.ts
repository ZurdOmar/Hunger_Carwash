import { Service, VehicleSize } from "./types";

export const SERVICES: Service[] = [
  { id: "basico", name: "Lavado Básico", description: "Lavado exterior, marcos de puertas y rines.", basePrice: 0 },
  { id: "premium", name: "Paquete Premium", description: "Cera, Armor All plásticos internos y restaurador de plásticos oscuros.", basePrice: 100 },
  { id: "aspirado", name: "Aspirado Profundo", description: "Aspirado de alfombras, asientos y cajuela.", basePrice: 50 },
  { id: "motor", name: "Lavado de Motor", description: "Limpieza detallada de motor a presión y abrillantado.", basePrice: 150 },
];

export const VEHICLE_SIZES: { value: VehicleSize; label: string; icon: string }[] = [
  { value: "Carro Chico", label: "Chico", icon: "🚗" },
  { value: "Carro Mediano", label: "Mediano", icon: "🚘" },
  { value: "Camioneta Mediana", label: "Camioneta M", icon: "🚙" },
  { value: "Camioneta Grande", label: "Camioneta G", icon: "🚐" },
  { value: "Van", label: "Van / XL", icon: "🚌" },
];

export const BASE_PRICES: Record<string, number> = {
  'Carro Chico': 110,
  'Carro Mediano': 115,
  'Camioneta Mediana': 120,
  'Camioneta Grande': 140,
  'Van': 180,
};

export const MEXICO_BRANDS = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "BYD", "Buick", "Cadillac", "Chevrolet", 
  "Chirey", "Chrysler", "Cupra", "Dodge", "FIAT", "Ford", "GMC", "GWM", "Honda", 
  "Hyundai", "Infiniti", "JAC", "Jaguar", "Jeep", "KIA", "Land Rover", "Lexus", 
  "Lincoln", "MG", "Mazda", "Mercedes-Benz", "MINI", "Mitsubishi", "Nissan", 
  "Omoda", "Peugeot", "Porsche", "RAM", "Renault", "SEAT", "Subaru", "Suzuki", 
  "Tesla", "Toyota", "Volkswagen", "Volvo"
].sort();
