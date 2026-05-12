"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Filter, 
  Search, 
  Clock, 
  User, 
  Navigation, 
  CheckCircle2, 
  ArrowRight,
  ChevronRight,
  Timer,
  X,
  UserPlus,
  LayoutGrid,
  Banknote,
  TrendingUp,
  CreditCard,
  UserRound,
  Download,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderStatus, Order } from "@/lib/types";
import { useConfig } from "@/lib/ConfigContext";
import { useRouter } from "next/navigation";
import { getTurnoActivo } from "@/lib/turnosService";
import { supabase } from "@/lib/supabase";

const COLUMNS: OrderStatus[] = ['Recepción', 'Lavado', 'Secado', 'Listo'];

export default function OperationsPage() {
  const { orders, updateOrderStatus, updateOrderAssignment, washers, bays } = useConfig();
  const router = useRouter();
  const [filter, setFilter] = React.useState("");
  const [assigningOrder, setAssigningOrder] = React.useState<Order | null>(null);
  const [activeFilters, setActiveFilters] = React.useState({
    size: 'all',
    washer: 'all',
    onlyPaid: false
  });
  
  const baysCount = bays.length;

  // Carga el turno activo: el Kanban solo muestra órdenes del turno actual,
  // no las acumuladas de turnos anteriores ya cerrados.
  const [turnoActivoId, setTurnoActivoId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: matriz } = await supabase.from("sucursales").select("id").eq("es_matriz", true).single();
      if (!matriz || cancelled) return;
      const t = await getTurnoActivo(matriz.id);
      if (cancelled) return;
      setTurnoActivoId(t?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  // Órdenes activas (no entregadas) del turno actual
  const activeOrders = orders.filter(o =>
    o.status !== 'Entregado' &&
    turnoActivoId !== null &&
    o.turnoId === turnoActivoId
  );
  
  const filteredOrders = activeOrders.filter(order => {
    const matchesSearch = order.vehicle.placa.toLowerCase().includes(filter.toLowerCase()) ||
                         order.vehicle.brand.toLowerCase().includes(filter.toLowerCase());
    const matchesSize = activeFilters.size === 'all' || order.vehicle.size === activeFilters.size;
    const matchesWasher = activeFilters.washer === 'all' || order.washerId === activeFilters.washer;
    
    return matchesSearch && matchesSize && matchesWasher;
  });

  // Cálculos para Corte de Caja
  const stats = orders.reduce((acc, order) => {
    acc.total += order.total;
    if (order.paymentMethod === 'Efectivo') acc.efectivo += order.total;
    if (order.paymentMethod === 'Tarjeta') acc.tarjeta += order.total;
    if (order.paymentMethod === 'Membresía') acc.membresia += order.total;
    acc.count += 1;
    return acc;
  }, { total: 0, efectivo: 0, tarjeta: 0, membresia: 0, count: 0 });

  const handleNextStatus = (order: Order) => {
    const currentIndex = COLUMNS.indexOf(order.status);
    if (currentIndex < COLUMNS.length - 1) {
        updateOrderStatus(order.id, COLUMNS[currentIndex + 1]);
    } else if (order.status === 'Listo') {
        updateOrderStatus(order.id, 'Entregado');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden pb-4 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
        <div>
          <Heading level={2}>Seguimiento Operativo</Heading>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] italic opacity-60">Control operativo en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filtrar por placa o marca (en vivo)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-11 bg-muted/20 border-white/5 font-bold uppercase tracking-widest text-xs"
            />
          </div>
          <Button variant="outline" className="h-11 border-white/10 glass font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-green-500/10 hover:text-green-500 transition-all" onClick={() => router.push('/dashboard')}>
            <Banknote className="w-4 h-4 text-green-500" /> Corte de Caja
          </Button>
          <Button variant="outline" size="icon" className={cn("h-11 w-11 border-white/10 glass", (activeFilters.size !== 'all' || activeFilters.washer !== 'all') && "border-primary text-primary")}>
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-0 px-1">
        {COLUMNS.map((status) => (
          <div key={status} className="flex-col min-w-[320px] max-w-[320px] flex h-full">
            <div className="flex items-center justify-between mb-4 px-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  status === 'Recepción' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" :
                  status === 'Lavado' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" :
                  status === 'Secado' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                )} />
                <h3 className="font-black italic tracking-tight uppercase text-[11px] text-white/80">{status}</h3>
              </div>
              <Badge variant="secondary" className="bg-white/5 border border-white/5 text-white/40 font-mono text-[9px] px-2">
                {filteredOrders.filter(o => o.status === status).length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 pt-1 transition-all custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredOrders
                  .filter(o => o.status === status)
                  .map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="glass border-white/5 hover:border-primary/30 transition-all cursor-default group overflow-hidden relative">
                        {order.isPremium && (
                            <div className="absolute top-0 right-0 h-1 w-20 bg-primary" />
                        )}
                        <CardContent className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="bg-background/50 px-3 py-1.5 rounded-xl border border-white/5">
                              <span className="font-black tracking-[0.25em] text-xs uppercase text-primary font-mono">{order.vehicle.placa}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 leading-none mb-1">{order.folio}</p>
                                <p className="text-[9px] font-bold text-primary italic uppercase leading-none">{order.paymentMethod}</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-black text-sm tracking-tighter italic uppercase truncate text-white/90">{order.vehicle.brand} • {order.vehicle.size}</p>
                            <div className="flex flex-wrap gap-1">
                                {order.isPremium && (
                                    <Badge className="bg-primary text-black text-[8px] px-1.5 font-black italic tracking-widest h-4">PREMIUM</Badge>
                                )}
                                {order.isFree && (
                                    <Badge className="bg-green-500 text-white text-[8px] px-1.5 font-black italic tracking-widest h-4">GRATIS</Badge>
                                )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                                    <button 
                                        onClick={() => setAssigningOrder(order)}
                                        className="h-8 flex shrink-0 items-center gap-2 text-[9px] font-black text-muted-foreground bg-white/5 hover:bg-white/10 transition-all px-3 rounded-full border border-white/5"
                                    >
                                        <Navigation className="w-2.5 h-2.5 text-primary" />
                                        <span className="tracking-widest capitalize">B{order.bayNumber || "?"}</span>
                                    </button>
                                    <button 
                                        onClick={() => setAssigningOrder(order)}
                                        className="h-8 flex shrink-0 items-center gap-2 text-[9px] font-black text-muted-foreground bg-white/5 hover:bg-white/10 transition-all px-3 rounded-full border border-white/5"
                                    >
                                        <User className="w-2.5 h-2.5 text-primary" />
                                        <span className="tracking-widest capitalize truncate max-w-[80px]">
                                            {washers.find(w => w.id === order.washerId)?.fullName || "ASIGNAR LAVADOR"}
                                        </span>
                                    </button>
                                </div>
                                
                                {order.status !== 'Listo' && (
                                    <button 
                                        onClick={() => handleNextStatus(order)}
                                        className="h-8 w-8 shrink-0 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-black transition-all flex items-center justify-center group/btn shadow-xl active:scale-90 ml-2"
                                        title="Siguiente estatus"
                                    >
                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                            </div>
                            
                            {order.status === 'Listo' && (
                                <Button 
                                    onClick={() => handleNextStatus(order)}
                                    className="w-full h-10 mt-1 bg-green-500 hover:bg-green-600 text-black font-black uppercase italic tracking-widest text-xs gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Vehículo Entregado
                                </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>


      {/* MODAL DE ASIGNACIÓN (Mantener funcionalidad existente) */}
      <AnimatePresence>
        {assigningOrder && (
            <div className="fixed inset-0 z-[200] flex items-center justify-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssigningOrder(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <motion.div 
                    initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                    className="relative w-full max-w-sm h-full bg-background border-l border-white/10 p-10 shadow-2xl flex flex-col"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <Heading level={3}>Asignación</Heading>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{assigningOrder.vehicle.placa}</p>
                        </div>
                        <button onClick={() => setAssigningOrder(null)} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <section className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-primary" /> Seleccionar Lavador
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {washers.filter(w => w.isActive || w.id === assigningOrder.washerId).map(washer => (
                                    <button 
                                        key={washer.id}
                                        onClick={() => {
                                            updateOrderAssignment(assigningOrder.id, washer.id, assigningOrder.bayNumber);
                                            setAssigningOrder(prev => prev ? { ...prev, washerId: washer.id } : null);
                                        }}
                                        className={cn(
                                            "h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all px-2 truncate",
                                            assigningOrder.washerId === washer.id ? "bg-primary text-black border-primary shadow-lg shadow-primary/30" : "glass border-white/5 hover:border-primary/20"
                                        )}
                                        title={washer.fullName}
                                    >
                                        {washer.fullName}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-primary" /> Seleccionar Bahía
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {bays.map(bay => (
                                    <button 
                                        key={bay.id}
                                        onClick={() => {
                                            updateOrderAssignment(assigningOrder.id, assigningOrder.washerId, bay.id);
                                            setAssigningOrder(prev => prev ? { ...prev, bayNumber: bay.id } : null);
                                        }}
                                        className={cn(
                                            "h-12 rounded-2xl border text-xs font-black transition-all",
                                            assigningOrder.bayNumber === bay.id ? "bg-primary text-black border-primary shadow-lg shadow-primary/30" : "glass border-white/5 hover:border-primary/20"
                                        )}
                                    >
                                        B{bay.id}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    <Button className="w-full h-16 mt-10 font-black italic tracking-widest bg-primary text-black hover:bg-primary/90" onClick={() => setAssigningOrder(null)}>
                        CONFIRMAR CAMBIOS
                    </Button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
