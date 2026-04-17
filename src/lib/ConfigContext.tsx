"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { VehicleSize, Service, Order, Member, Bay, PromoRule, Washer } from "./types";
import { VEHICLE_SIZES, SERVICES, BASE_PRICES } from "./data";
import { supabase } from "./supabase";

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
  washers: Washer[];
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
  toggleWasherStatus: (id: string) => void;
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
  const [washers, setWashers] = useState<Washer[]>([
    { id: "w1", fullName: "Jeran", isActive: true, createdAt: new Date().toISOString() },
    { id: "w2", fullName: "Omar", isActive: true, createdAt: new Date().toISOString() },
    { id: "w3", fullName: "Zurd", isActive: true, createdAt: new Date().toISOString() },
    { id: "w4", fullName: "Velocity", isActive: true, createdAt: new Date().toISOString() }
  ]);
  const [bays, setBays] = useState<Bay[]>([
    { id: 1, label: "Cajón 1", defaultWasherId: "w1" },
    { id: 2, label: "Cajón 2", defaultWasherId: "w2" },
    { id: 3, label: "Cajón 3", defaultWasherId: "w3" },
    { id: 4, label: "Cajón 4" },
    { id: 5, label: "Cajón 5" }
  ]);

  // Fidelización
  const [members, setMembers] = useState<Member[]>([]);
  const [promoRules, setPromoRules] = useState<PromoRule[]>([
    { id: 'welcome-promo', name: 'Bienvenida Hunger', visitThreshold: 1, benefit: 'discount', discountPercent: 10, isActive: true },
    { id: 'free-wash-5', name: '5to Lavado Gratis', visitThreshold: 5, benefit: 'free', isActive: true }
  ]);

  // Persistencia y Conexión con Supabase
  useEffect(() => {
    const syncWithSupabase = async () => {
      const migrated = localStorage.getItem("hunger_migrated_to_db");
      
      if (!migrated) {
        // --- ONE-TIME MIGRATION FROM LOCALSTORAGE ---
        const saved = {
            sizes: localStorage.getItem("hunger_vehicle_sizes"),
            prices: localStorage.getItem("hunger_base_prices"),
            services: localStorage.getItem("hunger_services"),
            washers: localStorage.getItem("hunger_washers"),
            bays: localStorage.getItem("hunger_bays"),
            promos: localStorage.getItem("hunger_promos")
        };

        if (saved.prices) {
            const prices = JSON.parse(saved.prices);
            for (const [key, val] of Object.entries(prices)) {
                await supabase.from("precios_base").insert({ tamano: key as any, precio: val as number });
            }
        }
        if (saved.services) {
            const svcs = JSON.parse(saved.services);
            for (const s of svcs) {
                await supabase.from("servicios").insert({ nombre: s.name, descripcion: s.description, precio_base: s.basePrice, is_hidden: s.isHidden });
            }
        }
        if (saved.washers) {
            const ws = JSON.parse(saved.washers);
            for (const w of ws) {
                await supabase.from("lavadores").insert({ id: w.id, nombre_completo: w.fullName, activo: w.isActive, created_at: w.createdAt, deactivated_at: w.deactivatedAt });
            }
        }
        if (saved.bays) {
            const bs = JSON.parse(saved.bays);
            for (const b of bs) {
                await supabase.from("cajones").insert({ label: b.label, default_lavador_id: b.defaultWasherId || null });
            }
        }
        if (saved.promos) {
            const ps = JSON.parse(saved.promos);
            for (const p of ps) {
                await supabase.from("reglas_promocion").insert({ id: p.id, nombre: p.name, visitas_requeridas: p.visitThreshold, beneficio: p.benefit, porcentaje_descuento: p.discountPercent || null, activo: p.isActive });
            }
        }
        
        localStorage.setItem("hunger_migrated_to_db", "true");
        // Clear local storage copies so they don't get out of sync
        localStorage.removeItem("hunger_base_prices");
        localStorage.removeItem("hunger_services");
        localStorage.removeItem("hunger_washers");
        localStorage.removeItem("hunger_bays");
        localStorage.removeItem("hunger_promos");
      }

      // --- FETCH FROM DB ---
      const { data: dbPrices } = await supabase.from("precios_base").select("*");
      const { data: dbServices } = await supabase.from("servicios").select("*");
      const { data: dbWashers } = await supabase.from("lavadores").select("*");
      const { data: dbBays } = await supabase.from("cajones").select("*");
      const { data: dbPromos } = await supabase.from("reglas_promocion").select("*");

      if (dbPrices && dbPrices.length > 0) {
          const pb: Record<string, number> = {};
          dbPrices.forEach(row => pb[row.tamano] = row.precio);
          setBasePrices(pb);
      }
      
      if (dbServices && dbServices.length > 0) {
          setServices(dbServices.map(s => ({
              id: s.id, name: s.nombre, description: s.descripcion || "", basePrice: s.precio_base, isHidden: s.is_hidden || false
          })));
      }

      if (dbWashers && dbWashers.length > 0) {
          setWashers(dbWashers.map(w => ({
              id: w.id, fullName: w.nombre_completo, isActive: w.activo ?? true, createdAt: w.created_at || "", deactivatedAt: w.deactivated_at || undefined
          })));
      }

      if (dbBays && dbBays.length > 0) {
          setBays(dbBays.map(b => ({
              id: b.id, label: b.label, defaultWasherId: b.default_lavador_id || undefined
          })));
      }

      if (dbPromos && dbPromos.length > 0) {
          setPromoRules(dbPromos.map(p => ({
              id: p.id, name: p.nombre, visitThreshold: p.visitas_requeridas, benefit: p.beneficio as any, discountPercent: p.porcentaje_descuento || undefined, isActive: p.activo ?? true
          })));
      }

      // Load orders from Supabase (not localStorage)
      const { data: dbOrders } = await supabase
        .from("ordenes_servicio")
        .select("*")
        .neq("estado", "Entregado")
        .order("created_at", { ascending: false });

      if (dbOrders && dbOrders.length > 0) {
        const mapped = dbOrders.map((o: any) => ({
          id: o.id,
          folio: o.folio,
          vehicle: {
            placa: o.vehiculos?.placa || "",
            brand: o.vehiculos?.marca || "",
            model: o.vehiculos?.modelo || "",
            size: o.vehiculos?.tamano || "Carro Chico" as VehicleSize,
          },
          services: o.servicios || [],
          isPremium: o.es_premium || false,
          basePrice: o.total || 0,
          premiumPrice: o.premium_extra_cost || 0,
          total: o.total || 0,
          status: o.estado as Order['status'],
          washerId: o.lavador_id || undefined,
          bayNumber: o.cajon_id || undefined,
          createdAt: o.created_at || new Date().toISOString(),
          paymentMethod: o.metodo_pago || undefined,
        }));
        setOrders(mapped);
      } else {
        // If no orders in DB, try to migrate from localStorage
        const o = localStorage.getItem("hunger_orders");
        if (o) setOrders(JSON.parse(o));
      }

      // Load members from Supabase (vehiculos + count ordenes)
      const { data: dbVehiculos } = await supabase
        .from("vehiculos")
        .select("id, placa, marca, modelo, clientes (nombre), ordenes_servicio (count)")
        .order("created_at", { ascending: false });

      if (dbVehiculos && dbVehiculos.length > 0) {
        const mapped = dbVehiculos.map((v: any) => ({
          id: v.id,
          placa: v.placa,
          name: v.clientes?.nombre || undefined,
          totalWashings: v.ordenes_servicio?.[0]?.count || 0,
          lastVisit: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
        }));
        setMembers(mapped);
      } else {
        // If no vehicles in DB, try to migrate from localStorage
        const m = localStorage.getItem("hunger_members");
        if (m) setMembers(JSON.parse(m));
      }

      // Clear old localStorage data
      localStorage.removeItem("hunger_orders");
      localStorage.removeItem("hunger_members");
    };

    syncWithSupabase();
  }, []);

  // --- Catálogos ---
  const addVehicleSize = async (name: string, price: number) => {
    const newSize: VehicleSizeConfig = { label: name.toUpperCase(), value: name as VehicleSize, icon: "🚗", isHidden: false };
    const updated = [...vehicleSizes, newSize];
    setVehicleSizes(updated);
    
    const newPrices = { ...basePrices, [name]: price };
    setBasePrices(newPrices);
    localStorage.setItem("hunger_vehicle_sizes", JSON.stringify(updated));
    await supabase.from("precios_base").insert({ tamano: name as any, precio: price });
  };

  const addService = async (name: string, price: number, appliesToAll: boolean) => {
    // Generate UUID or let Supabase insert returning
    const { data } = await supabase.from("servicios").insert({ nombre: name, descripcion: "Personalizado", precio_base: price, is_hidden: false }).select().single();
    if(data) {
        const newS = { id: data.id, name: data.nombre, description: data.descripcion || "", basePrice: data.precio_base, isHidden: data.is_hidden || false };
        setServices([...services, newS]);
    }
  };

  const toggleVisibility = async (id: string, type: 'size' | 'service') => {
    if (type === 'size') {
        const u = vehicleSizes.map(s => s.value === id ? { ...s, isHidden: !s.isHidden } : s);
        setVehicleSizes(u);
        localStorage.setItem("hunger_vehicle_sizes", JSON.stringify(u));
    } else {
        const target = services.find(s => s.id === id);
        if (target) {
            const newHidden = !target.isHidden;
            setServices(services.map(s => s.id === id ? { ...s, isHidden: newHidden } : s));
            await supabase.from('servicios').update({ is_hidden: newHidden }).eq('id', id);
        }
    }
  };

  // --- Órdenes ---
  const addOrder = (order: Order) => {
    const updated = [order, ...orders];
    setOrders(updated);
    localStorage.setItem("hunger_orders", JSON.stringify(updated));
    addOrUpdateMember(order.vehicle.placa);
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
    // Update optimistically in memory
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    setOrders(updated);

    // Sync with Supabase
    const fechaCierre = newStatus === 'Entregado' ? new Date().toISOString() : null;
    await supabase
      .from("ordenes_servicio")
      .update({
        estado: newStatus,
        fecha_cierre: fechaCierre
      })
      .eq("id", id);
  };

  const updateOrderAssignment = async (id: string, wId?: string, bNum?: number) => {
    // Update optimistically in memory
    const updated = orders.map(o => o.id === id ? { ...o, washerId: wId ?? o.washerId, bayNumber: bNum ?? o.bayNumber } : o);
    setOrders(updated);

    // Sync with Supabase
    await supabase
      .from("ordenes_servicio")
      .update({
        lavador_id: wId || null,
        cajon_id: bNum || null
      })
      .eq("id", id);
  };

  // --- Fidelización ---
  const addOrUpdateMember = async (placa: string) => {
    // For now, members are loaded from vehiculos in Supabase
    // This function can be extended if needed to update cliente data
    const existing = members.find(m => m.placa === placa);
    if (!existing) {
      // Create a new vehicle/client if needed
      // This would happen in the POS when creating an order
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        placa,
        totalWashings: 1,
        lastVisit: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
      };
      setMembers([...members, newMember]);
    }
  };

  const addPromoRule = async (rule: PromoRule) => {
    const updated = [...promoRules, rule];
    setPromoRules(updated);
    await supabase.from("reglas_promocion").insert({
        id: rule.id, nombre: rule.name, visitas_requeridas: rule.visitThreshold,
        beneficio: rule.benefit, porcentaje_descuento: rule.discountPercent, activo: rule.isActive
    });
  };

  const removePromoRule = async (id: string) => {
    const updated = promoRules.filter(p => p.id !== id);
    setPromoRules(updated);
    await supabase.from("reglas_promocion").delete().eq("id", id);
  };

  // --- Recursos ---
  const addWasher = async (name: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newWasher: Washer = {
      id: newId,
      fullName: name,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setWashers([...washers, newWasher]);
    // Supabase will ignore id type mismatch if it strictly needs uuid, wait, uuid is generated by DB.
    // Let's use returning to get true ID
    const { data } = await supabase.from('lavadores').insert({ nombre_completo: name, activo: true }).select().single();
    if(data) {
        setWashers(prev => prev.map(w => w.id === newId ? { ...w, id: data.id } : w));
    }
  };

  const toggleWasherStatus = async (id: string) => {
    let newStatus = false;
    let deactDate: string | undefined = undefined;
    
    setWashers(prev => prev.map(w => {
      if (w.id === id) {
        newStatus = !w.isActive;
        deactDate = newStatus ? undefined : new Date().toISOString();
        return { ...w, isActive: newStatus, deactivatedAt: deactDate };
      }
      return w;
    }));

    await supabase.from('lavadores').update({ 
        activo: newStatus, 
        deactivated_at: deactDate 
    }).eq('id', id);
  };

  const addBay = async (label: string) => {
    const { data } = await supabase.from('cajones').insert({ label }).select().single();
    if (data) {
        setBays([...bays, { id: data.id, label: data.label, defaultWasherId: data.default_lavador_id || undefined }]);
    }
  };

  const removeBay = async (id: number) => {
    setBays(prev => prev.filter(b => b.id !== id));
    await supabase.from('cajones').delete().eq('id', id);
  };

  const updateBayDefaultWasher = async (bayId: number, washerId?: string) => {
    setBays(prev => prev.map(b => b.id === bayId ? { ...b, defaultWasherId: washerId } : b));
    await supabase.from('cajones').update({ default_lavador_id: washerId || null }).eq('id', bayId);
  };

  const applyPercentIncrease = async (percent: number) => {
    const factor = 1 + (percent / 100);
    
    // Actualizar Precios Base (Tamaños)
    const newPrices = { ...basePrices };
    Object.keys(newPrices).forEach(async key => {
        newPrices[key] = Math.round(newPrices[key] * factor);
        await supabase.from('precios_base').update({ precio: newPrices[key] }).eq('tamano', key as any);
    });
    setBasePrices(newPrices);

    // Actualizar Servicios Extras
    const newServices = services.map(s => ({
        ...s,
        basePrice: Math.round(s.basePrice * factor)
    }));
    setServices(newServices);
    
    for (const s of newServices) {
        await supabase.from('servicios').update({ precio_base: s.basePrice }).eq('id', s.id);
    }
  };

  return (
    <ConfigContext.Provider value={{
        vehicleSizes, services, basePrices, orders, washers, bays, members, promoRules,
        addVehicleSize, addService, toggleVisibility, addOrder, updateOrderStatus, updateOrderAssignment,
        addOrUpdateMember, getMemberInfo: (p) => members.find(m => m.placa === p), addPromoRule, removePromoRule,
        addWasher, toggleWasherStatus, addBay, removeBay, updateBayDefaultWasher, applyPercentIncrease
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
