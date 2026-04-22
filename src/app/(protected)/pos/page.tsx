"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PREMIUM_ADDON_PRICE, VehicleSize, Order, Member, Bay, PromoRule } from "@/lib/types";
import { MEXICO_BRANDS } from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { getTurnoActivo } from "@/lib/turnosService";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  CreditCard, 
  Banknote, 
  UserRound,
  ShieldCheck,
  Zap,
  Star,
  Gift,
  AlertCircle,
  LayoutGrid,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";

type Step = "vehicle" | "size" | "services" | "checkout";

export default function POSPage() {
  const router = useRouter();
  const { vehicleSizes, basePrices, services: dynamicServices, addOrder, getMemberInfo, bays, washers, promoRules, members } = useConfig();
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>("vehicle");
  const [vehicle, setVehicle] = React.useState({ placa: "", brand: "", model: "" });
  const [selectedSize, setSelectedSize] = React.useState<string | null>(null);
  const [selectedServices, setSelectedServices] = React.useState<string[]>(["basico"]);
  const [isPremiumPackage, setIsPremiumPackage] = React.useState(false);
  const [selectedBayId, setSelectedBayId] = React.useState<number | null>(null);
  const [assignedWasher, setAssignedWasher] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'Efectivo' | 'Tarjeta' | 'Membresía' | null>(null);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentVehicleId, setCurrentVehicleId] = React.useState<string | null>(null);

  // Inteligencia de Fidelización
  const [memberData, setMemberData] = React.useState<Member | undefined>(undefined);
  const [appliedPromo, setAppliedPromo] = React.useState<PromoRule | null>(null);
  const [detectedPromo, setDetectedPromo] = React.useState<PromoRule | null>(null);

  // Historial del vehículo (búsqueda en vivo mientras escriben la placa)
  type PlacaHistoryItem = {
    id: string;
    folio: number;
    created_at: string | null;
    total: number;
    metodo_pago: string | null;
    estado: string;
    tamano: string | null;
  };
  const [placaHistory, setPlacaHistory] = React.useState<PlacaHistoryItem[]>([]);
  const [placaHistoryLoading, setPlacaHistoryLoading] = React.useState(false);

  React.useEffect(() => {
    const placa = vehicle.placa.trim().toUpperCase();
    if (placa.length < 3) {
      setPlacaHistory([]);
      return;
    }
    let cancelled = false;
    setPlacaHistoryLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data: veh } = await supabase
          .from('vehiculos')
          .select('id, tamano')
          .eq('placa', placa)
          .maybeSingle();
        if (cancelled) return;
        if (!veh) {
          setPlacaHistory([]);
          return;
        }
        const { data: ords } = await supabase
          .from('ordenes_servicio')
          .select('id, folio, created_at, total, metodo_pago, estado')
          .eq('vehiculo_id', veh.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (cancelled) return;
        setPlacaHistory(
          (ords || []).map((o: any) => ({
            id: o.id,
            folio: o.folio,
            created_at: o.created_at,
            total: o.total || 0,
            metodo_pago: o.metodo_pago,
            estado: o.estado,
            tamano: veh.tamano || null,
          }))
        );
      } catch (e) {
        console.error('Error cargando historial de placa:', e);
      } finally {
        if (!cancelled) setPlacaHistoryLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [vehicle.placa]);

  const visibleSizes = vehicleSizes.filter(s => !s.isHidden);

  const calculateTotal = () => {
    if (!selectedSize) return 0;
    let total = basePrices[selectedSize as string] || 0;
    
    if (isPremiumPackage) total += PREMIUM_ADDON_PRICE;
    
    selectedServices.filter(s => s !== "basico" && s !== "premium").forEach(sId => {
      const s = dynamicServices.find(sv => sv.id === sId);
      if (s) total += s.basePrice;
    });

    // Aplicar Promoción si existe
    if (appliedPromo) {
        if (appliedPromo.benefit === 'free') return 0;
        if (appliedPromo.benefit === 'discount' && appliedPromo.discountPercent) {
            total = Math.round(total * (1 - appliedPromo.discountPercent / 100));
        }
    }

    if (memberData && paymentMethod === 'Membresía' && !appliedPromo) {
        total = Math.round(total * 0.90); // 10% Descuento Membresía estándar si no hay promo
    }
    return total;
  };

  const handleNextStep = async () => {
    if (step === "vehicle" && vehicle.placa) {
        setIsLoading(true);
        try {
            const placa = vehicle.placa.trim().toUpperCase();
            const lookup = supabase
                .from("vehiculos")
                .select("id, placa, marca, modelo, tamano")
                .eq("placa", placa)
                .maybeSingle();
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Tiempo de espera agotado al buscar el vehículo")), 10000)
            );
            const { data: existingVehicle, error: vehLookupErr } = (await Promise.race([lookup, timeout])) as any;

            if (vehLookupErr) throw vehLookupErr;

            let previousWashings = 0;
            if (existingVehicle) {
                setCurrentVehicleId(existingVehicle.id);
                setVehicle({
                    placa: existingVehicle.placa,
                    brand: existingVehicle.marca || vehicle.brand,
                    model: existingVehicle.modelo || vehicle.model
                });
                if (existingVehicle.tamano) setSelectedSize(existingVehicle.tamano);
                const cached = members.find(m => m.placa === existingVehicle.placa);
                previousWashings = cached?.totalWashings || 0;
            } else {
                setCurrentVehicleId(null);
            }

            const info = getMemberInfo(placa);
            const mergedInfo = { ...info, totalWashings: previousWashings };
            setMemberData(mergedInfo as any);

            const currentVisit = previousWashings + 1;
            const promo = promoRules.find(p => p.isActive && p.visitThreshold === currentVisit);
            setDetectedPromo(promo || null);
            setAppliedPromo(null);

            setStep("size");
        } catch (error: any) {
            console.error("Error buscando vehículo:", error);
            alert(`No se pudo buscar el vehículo: ${error?.message || error}`);
        } finally {
            setIsLoading(false);
        }
    }
    else if (step === "size" && selectedSize) setStep("services");
    else if (step === "services") setStep("checkout");
  };

  const handleBayChange = (bayId: number) => {
    setSelectedBayId(bayId);
    const bay = bays.find(b => b.id === bayId);
    if (bay?.defaultWasherId) {
        setAssignedWasher(bay.defaultWasherId);
    }
  };

  const handleFinishOrder = async () => {
    if (!selectedSize || !paymentMethod) return;
    setIsFinishing(true);
    
    let vehId = currentVehicleId;
    try {
        // Upsert por placa: idempotente ante reintentos. Si el primer submit crea
        // la fila pero algo posterior falla, el segundo intento reutiliza esa misma
        // fila en vez de chocar con vehiculos_placa_key.
        const { data: savedVeh, error: vehErr } = await supabase
            .from("vehiculos")
            .upsert({
                placa: vehicle.placa,
                marca: vehicle.brand,
                modelo: vehicle.model || "N/A",
                tamano: selectedSize as any,
            }, { onConflict: 'placa' })
            .select()
            .single();
        if (vehErr) throw vehErr;
        if (savedVeh) {
            vehId = savedVeh.id;
            setCurrentVehicleId(savedVeh.id);
        }

        if (vehId) {
            // Obtener matriz para tener un sucursal_id válido
            const { data: matriz, error: matrizErr } = await supabase.from('sucursales').select('id').eq('es_matriz', true).single();
            if (matrizErr) throw matrizErr;
            if (matriz) {
                const turnoActivo = await getTurnoActivo(matriz.id);
                const { data: newOrderData, error: orderErr } = await supabase.from("ordenes_servicio").insert({
                    vehiculo_id: vehId,
                    servicios: dynamicServices.filter(s => selectedServices.includes(s.id)) as any,
                    es_premium: isPremiumPackage,
                    total: calculateTotal(),
                    estado: 'Recepción',
                    metodo_pago: paymentMethod,
                    sucursal_id: matriz.id,
                    cajon_id: selectedBayId ?? null,
                    lavador_id: assignedWasher ?? null,
                    cajero_id: user?.id ?? null,
                    turno_id: turnoActivo?.id ?? null,
                }).select().single();

                if (orderErr) throw orderErr;
                console.log('[POS] Orden creada OK — vehId:', vehId, 'orderId:', newOrderData?.id, 'folio:', newOrderData?.folio);
                if (newOrderData) {
                    const newOrder: Order = {
                        id: newOrderData.id,
                        folio: `${newOrderData.folio}`,
                        vehicle: {
                            placa: vehicle.placa,
                            brand: vehicle.brand,
                            model: vehicle.model || "Modelo no especificado",
                            size: selectedSize as any
                        },
                        services: dynamicServices.filter(s => selectedServices.includes(s.id)),
                        isPremium: isPremiumPackage,
                        basePrice: basePrices[selectedSize as string] || 0,
                        premiumPrice: PREMIUM_ADDON_PRICE,
                        total: calculateTotal(),
                        status: 'Recepción',
                        bayNumber: selectedBayId ?? undefined,
                        washerId: assignedWasher ?? undefined,
                        createdAt: new Date().toISOString(),
                        paymentMethod: paymentMethod,
                        isFree: appliedPromo?.benefit === 'free'
                    };

                    setTimeout(() => {
                        console.log('[POS] setTimeout fired — invocando addOrder + router.push');
                        addOrder(newOrder);
                        setIsFinishing(false);
                        router.push('/operations');
                    }, 1000);
                    return;
                }
            }
        }
    } catch (err: any) {
        console.error("Error saving order to Supabase:", err);
        const msg = err?.message || err?.error_description || JSON.stringify(err);
        alert(`No se pudo registrar la orden: ${msg}`);
        setIsFinishing(false);
        return;
    }

    // Reached only if the happy-path above fell through without throwing (e.g. no matriz sucursal).
    alert("No se pudo registrar la orden: no hay sucursal matriz configurada en Supabase.");
    setIsFinishing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Heading level={2}>Nuevo Servicio</Heading>
        <div className="flex gap-2">
          {["vehicle", "size", "services", "checkout"].map((s, i) => (
            <div key={s} className={cn("w-12 h-1.5 rounded-full", step === s ? "bg-primary w-20" : (i < ["vehicle", "size", "services", "checkout"].indexOf(step) ? "bg-primary/40" : "bg-muted"))} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "vehicle" && (
          <motion.div key="vehicle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="glass shadow-2xl overflow-hidden group">
              <div className="h-1 bg-primary/20 group-focus-within:bg-primary transition-all duration-700" />
              <CardHeader><CardTitle>Información Obligatoria</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block mb-2">Número de Placa</label>
                    <Input placeholder="ABC-1234" value={vehicle.placa} onChange={(e) => setVehicle({ ...vehicle, placa: e.target.value.toUpperCase() })} className="text-3xl font-black tracking-[0.3em] h-16 text-center bg-primary/5 border-primary/20 focus:border-primary transition-all uppercase" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block mb-2">Asignación de Espacio</label>
                    <div className="grid grid-cols-5 gap-2">
                        {bays.map(bay => (
                            <button key={bay.id} onClick={() => handleBayChange(bay.id)} className={cn("h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all", selectedBayId === bay.id ? "bg-primary text-black border-primary font-black" : "glass border-white/5 hover:border-primary/20")}>
                                <LayoutGrid className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">{bay.id}</span>
                            </button>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block mb-2">Marca</label>
                        <Input placeholder="Ej: Toyota" list="pos-brands" value={vehicle.brand} onChange={(e) => setVehicle({...vehicle, brand: e.target.value})} className="h-14 font-bold bg-muted/30" />
                        <datalist id="pos-brands">{MEXICO_BRANDS.map(b => <option key={b} value={b} />)}</datalist>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none block mb-2">Personal Asignado</label>
                        <select className="w-full h-14 rounded-xl glass border-white/10 px-4 text-xs font-black uppercase tracking-widest outline-none focus:border-primary" value={assignedWasher || ""} onChange={(e) => setAssignedWasher(e.target.value)}>
                            <option value="">SIN ASIGNAR</option>
                            {washers.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                        </select>
                    </div>
                </div>
                {(placaHistoryLoading || placaHistory.length > 0) && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Historial del vehículo
                      </p>
                      {placaHistory.length > 0 && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[9px] font-black tracking-widest">
                          {placaHistory.length} {placaHistory.length === 1 ? 'visita' : 'visitas'}
                        </Badge>
                      )}
                    </div>
                    {placaHistoryLoading ? (
                      <div className="p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                        Buscando…
                      </div>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {placaHistory.map((h) => (
                          <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex flex-col">
                              <span className="font-black tracking-widest">#{h.folio}</span>
                              <span className="text-[10px] text-muted-foreground font-bold">
                                {h.created_at ? new Date(h.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {h.metodo_pago || 'N/A'}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                {h.estado}
                              </span>
                              <span className="font-black italic tracking-tighter">${h.total.toLocaleString()}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <Button className="w-full h-16 text-lg font-black italic tracking-tighter shadow-primary/20 shadow-xl" size="lg" disabled={!vehicle.placa || isLoading} onClick={handleNextStep}>
                   {isLoading ? "BUSCANDO VEHÍCULO..." : <div className="flex items-center justify-center">CONTINUAR PROCESO <ChevronRight className="ml-2 w-5 h-5" /></div>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "size" && (
          <motion.div key="size" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass shadow-2xl overflow-hidden relative">
              {detectedPromo && !appliedPromo && (
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-primary/20 border-b border-primary/30 p-4 flex items-center justify-between"
                  >
                      <div className="flex items-center gap-3">
                          <Gift className="w-5 h-5 text-primary animate-bounce" />
                          <div>
                              <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">PROMOCIÓN DETECTADA</p>
                              <p className="text-xs font-bold text-white uppercase italic">{detectedPromo.name} / Visita #{ (memberData?.totalWashings || 0) + 1 }</p>
                          </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-8 px-4 bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg"
                        onClick={() => setAppliedPromo(detectedPromo)}
                      >
                          APLICAR BENEFICIO
                      </Button>
                  </motion.div>
              )}
              {appliedPromo && (
                  <div className="bg-green-500 py-2 text-center text-black font-black italic tracking-widest text-[9px] uppercase shadow-lg flex items-center justify-center gap-2">
                      <Star className="w-3 h-3 fill-black" /> ¡BENEFICIO APLICADO CON ÉXITO! <Star className="w-3 h-3 fill-black" />
                      <button onClick={() => setAppliedPromo(null)} className="ml-4 underline opacity-60 hover:opacity-100">DESHACER</button>
                  </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Tamaño del Vehículo</CardTitle>
                    {memberData && <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary italic font-black text-[10px]">{memberData.totalWashings} LAVADOS PREVIOS</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  {visibleSizes.map(s => (
                    <button key={s.value} onClick={() => setSelectedSize(s.value)} className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all", selectedSize === s.value ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" : "glass border-white/5 hover:border-primary/20")}>
                        <span className="text-4xl group-hover:scale-110 transition-transform">{s.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-center">{s.label}</span>
                        <div className="flex flex-col items-center">
                            {appliedPromo?.benefit === 'free' ? <span className="text-sm font-black text-green-500 uppercase italic">GRATIS</span> : (
                                <>
                                    {appliedPromo?.benefit === 'discount' && <span className="text-[8px] line-through text-muted-foreground">${basePrices[s.value] || 0}</span>}
                                    <span className={cn("text-xs font-mono font-black", appliedPromo?.benefit === 'discount' ? "text-green-500" : "text-primary")}>
                                        ${appliedPromo?.benefit === 'discount' ? (basePrices[s.value as string] || 0) * (1 - appliedPromo.discountPercent!/100) : basePrices[s.value as string] || 0}
                                    </span>
                                </>
                            )}
                        </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-14 font-black uppercase tracking-widest opacity-60" onClick={() => setStep("vehicle")}>ATRÁS</Button>
                  <Button className="flex-[3] h-14 font-black italic tracking-tight uppercase" disabled={!selectedSize} onClick={handleNextStep}>ELEGIR PAQUETE <ChevronRight className="ml-2 w-5 h-5" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "services" && (
            <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                 <Card className="glass shadow-2xl overflow-hidden">
                    <CardHeader><CardTitle>Configurar Servicio</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button onClick={() => setIsPremiumPackage(false)} className={cn("p-8 rounded-3xl border-2 transition-all flex flex-col gap-4 relative", !isPremiumPackage ? "border-primary bg-primary/10" : "glass border-white/10 hover:border-primary/30")}>
                                <Zap className={cn("w-8 h-8", !isPremiumPackage ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-2xl font-black italic uppercase tracking-tighter">Normal</span>
                                <p className="text-xs text-muted-foreground leading-relaxed">Exterior a presión + rines + aspirado básico.</p>
                            </button>
                            <button onClick={() => setIsPremiumPackage(true)} className={cn("p-8 rounded-3xl border-2 transition-all flex flex-col gap-4 relative group overflow-hidden", isPremiumPackage ? "border-primary bg-primary/10 shadow-2xl" : "glass border-white/10 hover:border-primary/30")}>
                                <div className="absolute top-0 right-0 bg-primary px-4 py-1.5 rounded-bl-2xl shadow-lg ring-2 ring-primary/20">
                                    <span className="text-[10px] font-black text-black uppercase tracking-tight">V-VELOCITY</span>
                                </div>
                                <ShieldCheck className="w-8 h-8 text-primary shadow-glow" />
                                <span className="text-2xl font-black italic uppercase tracking-tighter text-glow">Premium</span>
                                <p className="text-xs text-muted-foreground leading-relaxed pr-8">Cera protectora, Armor All, restaurador de plásticos y brillo total.</p>
                            </button>
                        </div>
                        <div className="bg-primary/5 p-8 rounded-3xl border-2 border-primary/20 shadow-inner flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resumen de Cargo</p>
                                <p className="text-sm font-bold text-primary italic uppercase">{selectedSize} + {isPremiumPackage ? 'PREMIUM' : 'NORMAL'}</p>
                            </div>
                            <span className={cn("text-6xl font-black text-glow", appliedPromo ? "text-green-500" : "text-primary")}>${calculateTotal()}</span>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1 h-14 font-black uppercase tracking-widest opacity-60" onClick={() => setStep("size")}>ATRÁS</Button>
                            <Button className="flex-[3] h-14 font-black italic tracking-tight uppercase shadow-primary/20 shadow-xl" onClick={handleNextStep}>FINALIZAR TICKET <ChevronRight className="ml-2 w-5 h-5" /></Button>
                        </div>
                    </CardContent>
                 </Card>
            </motion.div>
        )}

        {step === "checkout" && (
            <motion.div key="checkout" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="glass border-primary/40 shadow-2xl overflow-hidden pb-10">
                    <CardHeader className="text-center pt-10">
                        <CardTitle className="text-5xl font-black italic tracking-tighter uppercase whitespace-nowrap">ORDEN DE PAGO</CardTitle>
                        {appliedPromo && <Badge className="bg-green-500 text-black font-black uppercase tracking-[0.3em] font-mono mt-2 px-6 h-6 mx-auto">#{appliedPromo.name}</Badge>}
                    </CardHeader>
                    <CardContent className="space-y-8 px-10">
                        <div className="flex justify-center mt-4">
                            <Logo size="lg" />
                        </div>
                        <div className="divide-y divide-white/5 space-y-6">
                            <div className="flex justify-between items-end pt-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vehículo & Bahía</p>
                                    <p className="text-3xl font-black tracking-[0.2em]">{vehicle.placa}</p>
                                    <p className="text-xs font-bold text-primary italic uppercase">{vehicle.brand} • BA{selectedBayId || "X"} • {washers.find(w => w.id === assignedWasher)?.fullName || "SIN ASIGNAR"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                                    <p className={cn("text-7xl font-black text-glow", appliedPromo ? "text-green-500" : "text-primary")}>${calculateTotal()}</p>
                                </div>
                            </div>
                            <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['Efectivo', 'Tarjeta', 'Membresía'].map(method => (
                                    <button key={method} onClick={() => setPaymentMethod(method as any)} className={cn("p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all", paymentMethod === method ? "bg-primary text-black border-primary scale-105" : "glass border-white/10 opacity-50")}>
                                        {method === 'Efectivo' ? <Banknote /> : method === 'Tarjeta' ? <CreditCard /> : <UserRound />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{method}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button className="w-full h-20 text-2xl font-black italic uppercase tracking-widest shadow-primary/40 shadow-2xl" disabled={!paymentMethod || isFinishing} onClick={handleFinishOrder}>
                            {isFinishing ? "REGISTRANDO..." : "CONFIRMAR VENTA"}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
