import { Order, OrderStatus, VehicleSize } from "./types";

const RANDOM_PLACAS = ["ABC-1234", "XYZ-9876", "GHR-4455", "LMN-1122", "JJK-3321", "OPQ-4456", "WRT-5567"];
const RANDOM_MODELS = ["Toyota Corolla", "Ford Lobo", "Honda Civic", "BMW M3", "Nissan Sentra", "Tesla Model 3", "Audi A4"];
const STATUSES: OrderStatus[] = ["Recepción", "Lavado", "Secado", "Listo"];
const SIZES: VehicleSize[] = ["Carro Chico", "Carro Mediano", "Camioneta Mediana", "Camioneta Grande", "Van"];

export function generateMockOrders(count: number): Order[] {
  return Array.from({ length: count }).map((_, i) => {
    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const isPremium = Math.random() > 0.5;
    const basePrice = 120 + (Math.random() * 50);
    const premiumPrice = isPremium ? 80 : 0;
    
    return {
      id: `ord-${i}`,
      folio: `H-${1000 + i}`,
      vehicle: {
        placa: RANDOM_PLACAS[Math.floor(Math.random() * RANDOM_PLACAS.length)],
        brand: RANDOM_MODELS[Math.floor(Math.random() * RANDOM_MODELS.length)].split(" ")[0],
        model: RANDOM_MODELS[Math.floor(Math.random() * RANDOM_MODELS.length)],
        size,
      },
      services: [{ id: "basico", name: "Lavado Básico", description: "", basePrice: 0 }],
      isPremium,
      basePrice,
      premiumPrice,
      total: basePrice + premiumPrice,
      status,
      createdAt: new Date().toISOString(),
    };
  });
}
