"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { VehicleSize, Service, Order, Member, Bay, PromoRule, Washer } from "./types";
import { supabase } from "./supabase";
import { handleError, validateRequired, validateNumberRange } from "./errorHandler";
import { useAuth } from "./AuthContext";

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
  const { user, loading: authLoading } = useAuth();

  // Todo el estado inicia vacío: la fuente de verdad es Supabase.
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSizeConfig[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [washers, setWashers] = useState<Washer[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [promoRules, setPromoRules] = useState<PromoRule[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Guards para evitar re-sincronización innecesaria (fix ciclado)
  const lastSyncedUserId = useRef<string | null>(null);
  const syncInProgress = useRef(false);

  // Persistencia y Conexión con Supabase (fuente única de verdad)
  useEffect(() => {
    // Limpieza defensiva de claves legadas (cuando el cliente migra desde versiones previas
    // que aún escribían datos de negocio a localStorage). No toca preferencias de UI.
    [
      "hunger_migrated_to_db", "hunger_vehicle_sizes", "hunger_base_prices",
      "hunger_services", "hunger_washers", "hunger_bays", "hunger_promos",
      "hunger_orders", "hunger_members",
    ].forEach(k => localStorage.removeItem(k));

    // Esperamos a que AuthContext hidrate la sesión antes de leer tablas con RLS.
    // Sin esta guarda, un render temprano (p.ej. tras aceptar invitación) dispara
    // SELECTs sin JWT y deja los catálogos vacíos para siempre.
    if (authLoading || !user) return;

    // Guard anti-ciclado: no re-sincronizar si ya se hizo para este usuario
    // o si hay una sincronización en curso.
    if (lastSyncedUserId.current === user.id || syncInProgress.current) return;
    syncInProgress.current = true;

    const syncWithSupabase = async () => {
      // Rol del usuario actual (ya tenemos user.id desde AuthContext).
      const { data: profile } = await supabase
        .from('perfiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUserRole(profile.role);
      }

      const [
        pricesRes, servicesRes, washersRes, baysRes, promosRes
      ] = await Promise.all([
        supabase.from("precios_base").select("*").order("id"),
        supabase.from("servicios").select("*"),
        supabase.from("lavadores").select("*"),
        supabase.from("cajones").select("*").order("id"),
        supabase.from("reglas_promocion").select("*"),
      ]);

      if (pricesRes.error) console.error("precios_base:", pricesRes.error);
      if (servicesRes.error) console.error("servicios:", servicesRes.error);
      if (washersRes.error) console.error("lavadores:", washersRes.error);
      if (baysRes.error) console.error("cajones:", baysRes.error);
      if (promosRes.error) console.error("reglas_promocion:", promosRes.error);

      let dbPrices = pricesRes.data;
      const dbServices = servicesRes.data;
      let dbWashers = washersRes.data;
      let dbBays = baysRes.data;
      const dbPromos = promosRes.data;

      // Nota: La lógica de auto-sembrado fue eliminada.
      // Los catálogos (lavadores, cajones, precios_base) deben crearse
      // manualmente desde la interfaz de Configuración o directamente en Supabase.

      if (dbPrices) {
        const pb: Record<string, number> = {};
        const sizes: VehicleSizeConfig[] = dbPrices.map((row: any) => {
          pb[row.tamano] = row.precio;
          return {
            value: row.tamano as VehicleSize,
            label: row.label || row.tamano,
            icon: row.icon || "🚗",
            isHidden: row.is_hidden || false,
          };
        });
        setBasePrices(pb);
        setVehicleSizes(sizes);
      }

      if (dbServices) {
        setServices(dbServices.map((s: any) => ({
          id: s.id, name: s.nombre, description: s.descripcion || "",
          basePrice: s.precio_base, isHidden: s.is_hidden || false
        })));
      }

      if (dbWashers) {
        setWashers(dbWashers.map((w: any) => ({
          id: w.id, fullName: w.nombre_completo, isActive: w.activo ?? true,
          createdAt: w.created_at || "", deactivatedAt: w.deactivated_at || undefined
        })));
      }

      if (dbBays) {
        setBays(dbBays.map((b: any) => ({
          id: b.id, label: b.label, defaultWasherId: b.default_lavador_id || undefined
        })));
      }

      if (dbPromos) {
        setPromoRules(dbPromos.map((p: any) => ({
          id: p.id, name: p.nombre, visitThreshold: p.visitas_requeridas,
          benefit: p.beneficio as any, discountPercent: p.porcentaje_descuento || undefined,
          isActive: p.activo ?? true
        })));
      }

      const { data: dbOrders, error: ordersErr } = await supabase
        .from("ordenes_servicio")
        .select("*, vehiculos(*)")
        .neq("estado", "Entregado")
        .order("created_at", { ascending: false });
      if (ordersErr) console.error("ordenes_servicio:", ordersErr);

      if (dbOrders) {
        setOrders(dbOrders.map((o: any) => ({
          id: o.id,
          folio: `${o.folio}`,
          vehicle: {
            placa: o.vehiculos?.placa || "",
            brand: o.vehiculos?.marca || "",
            model: o.vehiculos?.modelo || "",
            size: (o.vehiculos?.tamano || "Carro Chico") as VehicleSize,
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
          turnoId: o.turno_id || undefined,
        })));
      }

      const { data: dbVehiculos, error: vehErr } = await supabase
        .from("vehiculos")
        .select("id, placa, marca, modelo, clientes (nombre), ordenes_servicio (count)")
        .order("created_at", { ascending: false });
      if (vehErr) console.error("vehiculos:", vehErr);

      if (dbVehiculos) {
        setMembers(dbVehiculos.map((v: any) => ({
          id: v.id,
          placa: v.placa,
          name: v.clientes?.nombre || undefined,
          totalWashings: v.ordenes_servicio?.[0]?.count || 0,
          lastVisit: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
        })));
      }
    };

    syncWithSupabase()
      .then(() => {
        lastSyncedUserId.current = user.id;
      })
      .finally(() => {
        syncInProgress.current = false;
      });
  }, [user?.id, authLoading]);

  // --- Catálogos ---
  const addVehicleSize = async (name: string, price: number) => {
    // Validar rol
    if (userRole !== 'admin') {
      alert('Solo administradores pueden agregar tamaños de vehículo');
      return;
    }

    const tamano = name.trim();

    // Validar nombre
    if (!tamano || tamano.length > 50) {
      alert('Nombre debe estar entre 1 y 50 caracteres');
      return;
    }

    // Validar precio
    const priceError = validateNumberRange(price, 1, 50000, 'Precio');
    if (priceError) {
      alert(priceError);
      return;
    }

    const { error } = await supabase
      .from("precios_base")
      .insert({ tamano, label: tamano, icon: "🚗", precio: price, is_hidden: false } as any);

    if (error) {
      const msg = handleError(error, 'addVehicleSize', 'No se pudo guardar el tamaño');
      alert(msg);
      return;
    }

    setVehicleSizes(prev => [...prev, { value: tamano as VehicleSize, label: tamano, icon: "🚗", isHidden: false }]);
    setBasePrices(prev => ({ ...prev, [tamano]: price }));
  };

  const addService = async (name: string, price: number, appliesToAll: boolean) => {
    // Validar rol
    if (userRole !== 'admin') {
      alert('Solo administradores pueden crear servicios');
      return;
    }

    const serviceName = name.trim();

    // Validar nombre
    if (!serviceName || serviceName.length > 100) {
      alert('Nombre debe estar entre 1 y 100 caracteres');
      return;
    }

    // Validar precio
    const priceError = validateNumberRange(price, 1, 50000, 'Precio');
    if (priceError) {
      alert(priceError);
      return;
    }

    const { data, error } = await supabase
      .from("servicios")
      .insert({ nombre: serviceName, descripcion: "Personalizado", precio_base: price, is_hidden: false })
      .select()
      .single();
    if (error) {
      const msg = handleError(error, 'addService', 'No se pudo crear el servicio');
      alert(msg);
      return;
    }
    if (data) {
      setServices(prev => [...prev, {
        id: data.id, name: data.nombre, description: data.descripcion || "",
        basePrice: data.precio_base, isHidden: data.is_hidden || false
      }]);
    }
  };

  const toggleVisibility = async (id: string, type: 'size' | 'service') => {
    if (type === 'size') {
      const target = vehicleSizes.find(s => s.value === id);
      if (!target) return;
      const newHidden = !target.isHidden;
      const { error } = await supabase
        .from('precios_base')
        .update({ is_hidden: newHidden } as any)
        .eq('tamano', id as any);
      if (error) {
        console.error("toggleVisibility size error:", error);
        alert(`No se pudo actualizar visibilidad: ${error.message}`);
        return;
      }
      setVehicleSizes(prev => prev.map(s => s.value === id ? { ...s, isHidden: newHidden } : s));
    } else {
      const target = services.find(s => s.id === id);
      if (!target) return;
      const newHidden = !target.isHidden;
      const { error } = await supabase.from('servicios').update({ is_hidden: newHidden }).eq('id', id);
      if (error) {
        console.error("toggleVisibility service error:", error);
        alert(`No se pudo actualizar visibilidad: ${error.message}`);
        return;
      }
      setServices(prev => prev.map(s => s.id === id ? { ...s, isHidden: newHidden } : s));
    }
  };

  // --- Órdenes ---
  // The row is already inserted in ordenes_servicio by the POS before this runs;
  // this only mirrors the new order into React state for the current tab.
  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
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
    const now = new Date().toISOString();
    setMembers(prev => {
      const existing = prev.find(m => m.placa === placa);
      if (existing) {
        return prev.map(m =>
          m.placa === placa
            ? { ...m, totalWashings: m.totalWashings + 1, lastVisit: now }
            : m
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          placa,
          totalWashings: 1,
          lastVisit: now,
          joinedAt: now,
        },
      ];
    });
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
    const newId = crypto.randomUUID();
    const newWasher: Washer = {
      id: newId,
      fullName: name,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setWashers([...washers, newWasher]);
    // Get actual ID from Supabase
    const { data } = await supabase.from('lavadores').insert({ nombre_completo: name, activo: true }).select().single();
    if (data) {
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
    // Validar rol - CRÍTICO
    if (userRole !== 'admin') {
      alert('Solo administradores pueden aplicar cambios masivos de precios');
      return;
    }

    // Validar porcentaje
    const percentError = validateNumberRange(percent, -50, 50, 'Porcentaje');
    if (percentError) {
      alert(percentError);
      return;
    }

    // Double-check: confirmar acción
    const confirmed = window.confirm(
      `¿Aplicar aumento del ${percent}% a TODOS los precios? Esta acción es irreversible.`
    );
    if (!confirmed) return;

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
