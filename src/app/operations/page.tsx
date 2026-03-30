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

const COLUMNS: OrderStatus[] = ['Recepción', 'Lavado', 'Secado', 'Listo'];

export default function OperationsPage() {
  const { orders, updateOrderStatus, updateOrderAssignment, washers, bays } = useConfig();
  const [filter, setFilter] = React.useState("");
  const [assigningOrder, setAssigningOrder] = React.useState<Order | null>(null);
  const [showCorte, setShowCorte] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState({
    size: 'all',
    washer: 'all',
    onlyPaid: false
  });
  
  const baysCount = bays.length;

  // Órdenes activas (no entregadas)
  const activeOrders = orders.filter(o => o.status !== 'Entregado');
  
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
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] italic opacity-60">Control de flujo Hunger Velocity v4.1</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Placa o Marca..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-11 bg-muted/20 border-white/5 font-bold uppercase tracking-widest text-xs"
            />
          </div>
          <Button variant="outline" className="h-11 border-white/10 glass font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-green-500/10 hover:text-green-500 transition-all" onClick={() => setShowCorte(true)}>
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

                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={() => setAssigningOrder(order)}
                                    className="h-8 flex items-center gap-2 text-[9px] font-black text-muted-foreground bg-white/5 hover:bg-white/10 transition-all px-3 rounded-full border border-white/5"
                                >
                                    <Navigation className="w-2.5 h-2.5 text-primary" />
                                    <span className="tracking-widest capitalize">B{order.bayNumber || "?"}</span>
                                </button>
                                <button 
                                    onClick={() => setAssigningOrder(order)}
                                    className="h-8 flex items-center gap-2 text-[9px] font-black text-muted-foreground bg-white/5 hover:bg-white/10 transition-all px-3 rounded-full border border-white/5"
                                >
                                    <User className="w-2.5 h-2.5 text-primary" />
                                    <span className="tracking-widest capitalize truncate max-w-[70px]">
                                        {order.washerId || "ASIGNAR"}
                                    </span>
                                </button>
                            </div>
                            <button 
                                onClick={() => handleNextStatus(order)}
                                className="h-10 w-10 rounded-2xl bg-primary/10 hover:bg-primary text-primary hover:text-black transition-all flex items-center justify-center group/btn shadow-xl active:scale-90"
                            >
                                <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
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

      {/* MODAL CORTE DE CAJA */}
      <AnimatePresence>
        {showCorte && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCorte(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl glass border-white/10 shadow-velocity overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-primary to-green-500" />
                    <div className="p-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <Heading level={2}>Corte de Caja</Heading>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Resumen Financiero Hunger Velocity</p>
                            </div>
                            <button onClick={() => setShowCorte(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-3xl bg-primary/10 border-2 border-primary/20 relative group overflow-hidden">
                                <DollarSign className="absolute -bottom-4 -right-4 w-24 h-24 text-primary/5 group-hover:rotate-12 transition-transform" />
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-2">Ingreso Total</p>
                                <p className="text-6xl font-black italic tracking-tighter text-glow text-primary">${stats.total}</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-4 tracking-widest">{stats.count} SERVICIOS COMPLETADOS</p>
                            </div>
                            <div className="space-y-3">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Banknote className="w-5 h-5 text-green-500" />
                                        <span className="text-xs font-black uppercase tracking-widest">Efectivo</span>
                                    </div>
                                    <span className="text-xl font-black italic tracking-tighter text-green-500">${stats.efectivo}</span>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-widest">Tarjeta</span>
                                    </div>
                                    <span className="text-xl font-black italic tracking-tighter text-blue-500">${stats.tarjeta}</span>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserRound className="w-5 h-5 text-primary" />
                                        <span className="text-xs font-black uppercase tracking-widest">Membresía</span>
                                    </div>
                                    <span className="text-xl font-black italic tracking-tighter text-primary">${stats.membresia}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button className="flex-1 h-14 bg-white text-black font-black uppercase tracking-widest hover:bg-white/90" onClick={() => window.print()}>
                                <Download className="w-4 h-4 mr-2" /> DESCARGAR REPORTE
                            </Button>
                            <Button className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-widest" onClick={() => setShowCorte(false)}>
                                FINALIZAR TURNO
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

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
                                {washers.map(washer => (
                                    <button 
                                        key={washer}
                                        onClick={() => updateOrderAssignment(assigningOrder.id, washer, assigningOrder.bayNumber)}
                                        className={cn(
                                            "h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                            assigningOrder.washerId === washer ? "bg-primary text-black border-primary shadow-lg shadow-primary/30" : "glass border-white/5 hover:border-primary/20"
                                        )}
                                    >
                                        {washer}
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
                                        onClick={() => updateOrderAssignment(assigningOrder.id, assigningOrder.washerId, bay.id)}
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
