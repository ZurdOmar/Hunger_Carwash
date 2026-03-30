"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { VehicleSize, Service, Order, Member, Bay, PromoRule } from "./types";
import { VEHICLE_SIZES, SERVICES, BASE_PRICES } from "./data";

interface VehicleSizeConfig {
  value: VehicleSize;
  label: string;
  icon: string;
  isHidden?: boolean;
}

interface ConfigContextType {
  // Configuración de Catálogos
  vehicleSizes: VehicleSizeConfig[];
  services: Service[];
  basePrices: Record<string, number>;
  
  // Operativa y Recursos
  orders: Order[];
  washers: string[];
  bays: Bay[];
  
  // Fidelización y Promociones
  members: Member[];
  promoRules: PromoRule[];
  
  // Acciones de Catálogo
  addVehicleSize: (name: string, price: number) => void;
  addService: (name: string, price: number, appliesToAll: boolean) => void;
  toggleVisibility: (id: string, type: 'size' | 'service') => void;
  
  // Gestión de Órdenes (Kanban)
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  updateOrderAssignment: (orderId: string, washerId?: string, bayNumber?: number) => void;
  
  // Gestión de Fidelización
  addOrUpdateMember: (placa: string) => void;
  getMemberInfo: (placa: string) => Member | undefined;
  addPromoRule: (rule: PromoRule) => void;
  removePromoRule: (id: string) => void;
  
  // Gestión de Recursos
  addWasher: (name: string) => void;
  removeWasher: (name: string) => void;
  addBay: (label: string) => void;
  removeBay: (id: number) => void;
  updateBayDefaultWasher: (bayId: number, washerId?: string) => void;
  applyPercentIncrease: (percent: number) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSizeConfig[]>(VEHICLE_SIZES);
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [basePrices, setBasePrices] = useState(BASE_PRICES);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Recursos e Infraestructura
  const [washers, setWashers] = useState<string[]>(["Jeran", "Omar", "Zurd", "Velocity"]);
  const [bays, setBays] = useState<Bay[]>([
    { id: 1, label: "Cajón 1", defaultWasherId: "Jeran" },
    { id: 2, label: "Cajón 2", defaultWasherId: "Omar" },
    { id: 3, label: "Cajón 3", defaultWasherId: "Zurd" },
    { id: 4, label: "Cajón 4" },
    { id: 5, label: "Cajón 5" }
  ]);

  // Fidelización
  const [members, setMembers] = useState<Member[]>([]);
  const [promoRules, setPromoRules] = useState<PromoRule[]>([
    { id: 'welcome-promo', name: 'Bienvenida Hunger', visitThreshold: 1, benefit: 'discount', discountPercent: 10, isActive: true },
    { id: 'free-wash-5', name: '5to Lavado Gratis', visitThreshold: 5, benefit: 'free', isActive: true }
  ]);

  // Persistencia
  useEffect(() => {
    const saved = {
        sizes: localStorage.getItem("hunger_vehicle_sizes"),
        prices: localStorage.getItem("hunger_base_prices"),
        services: localStorage.getItem("hunger_services"),
        orders: localStorage.getItem("hunger_orders"),
        washers: localStorage.getItem("hunger_washers"),
        bays: localStorage.getItem("hunger_bays"),
        members: localStorage.getItem("hunger_members"),
        promos: localStorage.getItem("hunger_promos")
    };

    if (saved.sizes) setVehicleSizes(JSON.parse(saved.sizes));
    if (saved.prices) setBasePrices(JSON.parse(saved.prices));
    if (saved.services) setServices(JSON.parse(saved.services));
    if (saved.orders) setOrders(JSON.parse(saved.orders));
    if (saved.washers) setWashers(JSON.parse(saved.washers));
    if (saved.bays) setBays(JSON.parse(saved.bays));
    if (saved.members) setMembers(JSON.parse(saved.members));
    if (saved.promos) setPromoRules(JSON.parse(saved.promos));
  }, []);

  // --- Catálogos ---
  const addVehicleSize = (name: string, price: number) => {
    const newSize: VehicleSizeConfig = { label: name.toUpperCase(), value: name as VehicleSize, icon: "🚗", isHidden: false };
    const updated = [...vehicleSizes, newSize];
    setVehicleSizes(updated);
    setBasePrices({ ...basePrices, [name]: price });
    localStorage.setItem("hunger_vehicle_sizes", JSON.stringify(updated));
    localStorage.setItem("hunger_base_prices", JSON.stringify({ ...basePrices, [name]: price }));
  };

  const addService = (name: string, price: number, appliesToAll: boolean) => {
    const newS = { id: name.toLowerCase().replace(/\s+/g, "_"), name, description: "Personalizado", basePrice: price, isHidden: false };
    const updated = [...services, newS];
    setServices(updated);
    localStorage.setItem("hunger_services", JSON.stringify(updated));
  };

  const toggleVisibility = (id: string, type: 'size' | 'service') => {
    if (type === 'size') {
        const u = vehicleSizes.map(s => s.value === id ? { ...s, isHidden: !s.isHidden } : s);
        setVehicleSizes(u);
        localStorage.setItem("hunger_vehicle_sizes", JSON.stringify(u));
    } else {
        const u = services.map(s => s.id === id ? { ...s, isHidden: !s.isHidden } : s);
        setServices(u);
        localStorage.setItem("hunger_services", JSON.stringify(u));
    }
  };

  // --- Órdenes ---
  const addOrder = (order: Order) => {
    const updated = [order, ...orders];
    setOrders(updated);
    localStorage.setItem("hunger_orders", JSON.stringify(updated));
    addOrUpdateMember(order.vehicle.placa);
  };

  const updateOrderStatus = (id: string, newStatus: Order['status']) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem("hunger_orders", JSON.stringify(updated));
  };

  const updateOrderAssignment = (id: string, wId?: string, bNum?: number) => {
    const updated = orders.map(o => o.id === id ? { ...o, washerId: wId ?? o.washerId, bayNumber: bNum ?? o.bayNumber } : o);
    setOrders(updated);
    localStorage.setItem("hunger_orders", JSON.stringify(updated));
  };

  // --- Fidelización ---
  const addOrUpdateMember = (placa: string) => {
    const existing = members.find(m => m.placa === placa);
    let updated;
    if (existing) {
        updated = members.map(m => m.placa === placa ? { ...m, totalWashings: m.totalWashings + 1, lastVisit: new Date().toISOString() } : m);
    } else {
        updated = [...members, { id: Math.random().toString(36).substr(2,9), placa, totalWashings: 1, lastVisit: new Date().toISOString(), joinedAt: new Date().toISOString() }];
    }
    setMembers(updated);
    localStorage.setItem("hunger_members", JSON.stringify(updated));
  };

  const addPromoRule = (rule: PromoRule) => {
    const updated = [...promoRules, rule];
    setPromoRules(updated);
    localStorage.setItem("hunger_promos", JSON.stringify(updated));
  };

  const removePromoRule = (id: string) => {
    const updated = promoRules.filter(p => p.id !== id);
    setPromoRules(updated);
    localStorage.setItem("hunger_promos", JSON.stringify(updated));
  };

  // --- Recursos ---
  const addWasher = (name: string) => {
    const updated = [...washers, name];
    setWashers(updated);
    localStorage.setItem("hunger_washers", JSON.stringify(updated));
  };

  const removeWasher = (name: string) => {
    const updated = washers.filter(w => w !== name);
    setWashers(updated);
    localStorage.setItem("hunger_washers", JSON.stringify(updated));
  };

  const addBay = (label: string) => {
    const updated = [...bays, { id: bays.length + 1, label }];
    setBays(updated);
    localStorage.setItem("hunger_bays", JSON.stringify(updated));
  };

  const removeBay = (id: number) => {
    const updated = bays.filter(b => b.id !== id);
    setBays(updated);
    localStorage.setItem("hunger_bays", JSON.stringify(updated));
  };

  const updateBayDefaultWasher = (bayId: number, washerId?: string) => {
    const updated = bays.map(b => b.id === bayId ? { ...b, defaultWasherId: washerId } : b);
    setBays(updated);
    localStorage.setItem("hunger_bays", JSON.stringify(updated));
  };

  const applyPercentIncrease = (percent: number) => {
    const factor = 1 + (percent / 100);
    
    // Actualizar Precios Base (Tamaños)
    const newPrices = { ...basePrices };
    Object.keys(newPrices).forEach(key => {
        newPrices[key] = Math.round(newPrices[key] * factor);
    });
    setBasePrices(newPrices);
    localStorage.setItem("hunger_base_prices", JSON.stringify(newPrices));

    // Actualizar Servicios Extras
    const newServices = services.map(s => ({
        ...s,
        basePrice: Math.round(s.basePrice * factor)
    }));
    setServices(newServices);
    localStorage.setItem("hunger_services", JSON.stringify(newServices));
  };

  return (
    <ConfigContext.Provider value={{
        vehicleSizes, services, basePrices, orders, washers, bays, members, promoRules,
        addVehicleSize, addService, toggleVisibility, addOrder, updateOrderStatus, updateOrderAssignment,
        addOrUpdateMember, getMemberInfo: (p) => members.find(m => m.placa === p), addPromoRule, removePromoRule,
        addWasher, removeWasher, addBay, removeBay, updateBayDefaultWasher, applyPercentIncrease
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const c = useContext(ConfigContext);
  if (!c) throw new Error("useConfig must be used within a ConfigProvider");
  return c;
}
