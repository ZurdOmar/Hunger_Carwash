"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  TrendingUp,
  Users,
  Car,
  DollarSign,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Star,
  CheckCircle2,
  X,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/lib/ConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { abrirTurno, cerrarTurno, getTurnoActivo, type Turno } from "@/lib/turnosService";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const stats = [
  { label: "Ingresos Hoy", value: "$4,250", change: "+12.5%", icon: DollarSign, trend: "up" },
  { label: "Autos Lavados", value: "32", change: "+4", icon: Car, trend: "up" },
  { label: "Cajero", value: "Jeran R.", change: "Activo", icon: Users, trend: "neutral" },
  { label: "Ticket Promedio", value: "$132.80", change: "-2.1%", icon: TrendingUp, trend: "down" },
];

export default function DashboardPage() {
  const { orders, members } = useConfig();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showCorteModal, setShowCorteModal] = React.useState(false);
  const [turnoActivo, setTurnoActivo] = React.useState<Turno | null>(null);
  const [montoDeclarado, setMontoDeclarado] = React.useState("");
  const [isClosing, setIsClosing] = React.useState(false);
  const [corteError, setCorteError] = React.useState<string | null>(null);
  const [turnoCerrado, setTurnoCerrado] = React.useState<Turno | null>(null);

  // Cálculos reales de órdenes filtradas por el turno activo
  const activeOrders = React.useMemo(() => {
    if (!turnoActivo) return [];
    return orders.filter(o => o.turnoId === turnoActivo.id);
  }, [orders, turnoActivo]);

  const totalHoy = activeOrders.reduce((acc, curr) => acc + curr.total, 0);
  const autosHoy = activeOrders.length;

  const cashTotal = activeOrders.filter(o => o.paymentMethod === 'Efectivo').reduce((acc, curr) => acc + curr.total, 0);
  const cardTotal = activeOrders.filter(o => o.paymentMethod === 'Tarjeta').reduce((acc, curr) => acc + curr.total, 0);
  const memberTotal = activeOrders.filter(o => o.paymentMethod === 'Membresía').reduce((acc, curr) => acc + curr.total, 0);

  // Garantiza un turno abierto DEL DÍA para la sucursal matriz al cargar el dashboard.
  // Si el turno abierto es de un día anterior, lo cierra con el efectivo del sistema
  // y abre uno nuevo para hoy (evita que cortes crucen días).
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const ensureTurno = async () => {
      const { data: matriz } = await supabase
        .from("sucursales")
        .select("id")
        .eq("es_matriz", true)
        .single();
      if (!matriz || cancelled) return;

      const activo = await getTurnoActivo(matriz.id);
      if (activo?.fecha_apertura) {
        const apertura = new Date(activo.fecha_apertura);
        const hoy = new Date();
        const mismoDia =
          apertura.getFullYear() === hoy.getFullYear() &&
          apertura.getMonth() === hoy.getMonth() &&
          apertura.getDate() === hoy.getDate();
        if (mismoDia) {
          if (!cancelled) setTurnoActivo(activo);
          return;
        }
        try {
          const { data: ords } = await supabase
            .from('ordenes_servicio')
            .select('total, metodo_pago, created_at')
            .eq('turno_id', activo.id);
          const inicio = new Date(activo.fecha_apertura).getTime();
          const fin = inicio + 24 * 60 * 60 * 1000;
          const efectivoSistema = (ords || [])
            .filter((o: any) => {
              if (o.metodo_pago !== 'Efectivo') return false;
              if (!o.created_at) return true;
              const t = new Date(o.created_at).getTime();
              return t >= inicio && t < fin;
            })
            .reduce((s: number, o: any) => s + (o.total || 0), 0);
          await cerrarTurno(activo.id, efectivoSistema, efectivoSistema);
        } catch (e) {
          console.error('No se pudo cerrar turno del día anterior:', e);
        }
      }

      const nuevoId = await abrirTurno(matriz.id, user.id, 0);
      if (!nuevoId || cancelled) return;
      const recien = await getTurnoActivo(matriz.id);
      if (!cancelled) setTurnoActivo(recien);
    };
    ensureTurno();
    return () => { cancelled = true; };
  }, [user]);

  const diferencia = montoDeclarado ? parseFloat(montoDeclarado) - cashTotal : 0;

  const handleFinalizarTurno = async () => {
    setCorteError(null);
    if (!turnoActivo) {
      setCorteError("No hay un turno abierto en este momento.");
      return;
    }
    if (!montoDeclarado) {
      setCorteError("Ingresa el monto declarado en caja.");
      return;
    }
    setIsClosing(true);
    try {
      const cerrado = await cerrarTurno(
        turnoActivo.id,
        parseFloat(montoDeclarado),
        cashTotal
      );
      setTurnoCerrado(cerrado);
      setTurnoActivo(null);
    } catch (err: any) {
      setCorteError(err?.message || "No se pudo cerrar el turno");
    } finally {
      setIsClosing(false);
    }
  };

  const cerrarRecibo = () => {
    setTurnoCerrado(null);
    setShowCorteModal(false);
    setMontoDeclarado("");
    setCorteError(null);
  };

  const realStats = [
    { label: "Ingresos Totales", value: `$${totalHoy.toLocaleString()}.00`, change: `+${autosHoy} vtas`, icon: DollarSign, trend: "up" },
    { label: "Vehículos", value: autosHoy.toString(), change: "En flujo", icon: Car, trend: "up" },
    { label: "Efectivo", value: `$${cashTotal.toLocaleString()}.00`, change: "En caja", icon: Banknote, trend: "neutral" },
    { label: "Ticket Promedio", value: `$${autosHoy > 0 ? (totalHoy / autosHoy).toFixed(1) : 0}`, change: "Global", icon: TrendingUp, trend: "up" },
  ];

  return (
    <div className="space-y-8 pb-20 overflow-y-auto pr-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Heading level={2}>
            <span className="text-gradient">Panel Administrativo</span>
          </Heading>
          <p className="text-muted-foreground text-sm font-medium">Hunger Car Wash • Vista en tiempo real</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowCorteModal(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold tracking-tight uppercase px-6 rounded-xl">
            Realizar Corte de Caja
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {realStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
          >
            <Card className="glass-premium stat-card card-shine group border-white/[0.06] hover:border-primary/20">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                    <stat.icon className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                    stat.trend === "up" ? "text-emerald-400 bg-emerald-500/10" : stat.trend === "down" ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-white/5"
                  )}>
                    {stat.change}
                    {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : stat.trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] mb-1.5 leading-none">{stat.label}</p>
                  <p className="text-3xl font-extrabold tracking-tight text-glow">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-premium border-white/[0.06] shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] pb-6">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Rendimiento Financiero</CardTitle>
              <CardDescription className="text-xs">Ingresos por día y proyección de crecimiento.</CardDescription>
            </div>
            <div className="flex gap-1.5 bg-white/[0.04] p-1 rounded-lg">
              {['7D', '1M', '1Y'].map(t => (
                <button key={t} className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                  t === '7D' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}>{t}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-64 flex items-end gap-3 px-4">
              {[45, 62, 55, 80, 72, 95, 88].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group cursor-pointer">
                    <div className="w-full relative h-full flex items-end">
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: i * 0.1, duration: 1, ease: "circOut" }}
                            className={cn(
                                "w-full rounded-t-xl transition-all duration-500 group-hover:brightness-125",
                                i === 5 ? "chart-bar-active" : "chart-bar-inactive"
                            )}
                        />
                    </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-7 gap-3 border-t border-white/[0.04] pt-5 text-center">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                    <span key={i} className={cn(
                      "text-[10px] font-bold uppercase tracking-widest transition-colors",
                      i === 5 ? "text-primary" : "text-muted-foreground/60"
                    )}>{d}</span>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card className="glass-premium card-shine border-white/[0.06] shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:rotate-12 group-hover:opacity-[0.06] transition-all duration-700">
                    <Star className="w-32 h-32" />
                </div>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2 leading-none">
                        <div className="p-1.5 rounded-lg bg-amber-500/10">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                        Membresías Activas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-5xl font-extrabold tracking-tight text-glow leading-none">{members.length}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vehículos registrados</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl"
                      onClick={() => router.push('/members')}
                    >
                      Ver todos los miembros <ChevronRight className="ml-1 w-3 h-3" />
                    </Button>
                </CardContent>
            </Card>

            <Card className="glass-premium border-primary/15 bg-primary/[0.03] shadow-2xl overflow-hidden relative">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-bold tracking-tight">Sistema Protegido</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Respaldos al día. Sistema operando bajo protocolos seguros.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* MODAL CORTE DE CAJA */}
      <AnimatePresence>
        {showCorteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={turnoCerrado ? cerrarRecibo : () => setShowCorteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl glass border-primary/30 p-10 shadow-[0_0_50px_rgba(var(--primary),0.1)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={turnoCerrado ? cerrarRecibo : () => setShowCorteModal(false)}
                  className="hover:bg-white/10 p-2 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>

              {turnoCerrado ? (
                <ReciboCorte
                  turno={turnoCerrado}
                  cashierName={profile?.full_name || user?.email || "—"}
                  cashTotal={cashTotal}
                  cardTotal={cardTotal}
                  memberTotal={memberTotal}
                  totalHoy={totalHoy}
                  autosHoy={autosHoy}
                  onClose={cerrarRecibo}
                />
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <ShieldCheck className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-primary/30 underline-offset-8">
                      Resumen Operativo
                    </h3>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">
                      Cajero: {profile?.full_name || user?.email || "—"} • {new Date().toLocaleDateString("es-MX")}
                    </p>
                    {turnoActivo?.fecha_apertura && (
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                        Turno abierto: {new Date(turnoActivo.fecha_apertura).toLocaleString("es-MX")}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-5 rounded-2xl border-white/5 space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Efectivo</span>
                      </div>
                      <p className="text-2xl font-black italic tracking-tighter">${cashTotal.toLocaleString()}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-white/5 space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tarjeta</span>
                      </div>
                      <p className="text-2xl font-black italic tracking-tighter">${cardTotal.toLocaleString()}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-white/5 space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Membresía</span>
                      </div>
                      <p className="text-2xl font-black italic tracking-tighter">${memberTotal.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 space-y-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest opacity-60">
                      <span>Balance Neto de Turno</span>
                      <span>{autosHoy} órdenes procesadas</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <p className="text-sm font-bold italic uppercase tracking-tighter text-muted-foreground">Total Recaudado</p>
                      <p className="text-6xl font-black italic tracking-tighter text-glow text-primary">${totalHoy.toLocaleString()}.00</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Monto Declarado en Caja (Efectivo Físico)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={montoDeclarado}
                      onChange={(e) => setMontoDeclarado(e.target.value)}
                      disabled={isClosing}
                      className="w-full h-14 px-4 rounded-2xl bg-muted/20 border border-white/10 text-2xl font-black italic tracking-tighter outline-none focus:border-primary/50 transition-colors"
                    />
                    {montoDeclarado && (
                      <div
                        className={cn(
                          "flex justify-between items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                          diferencia === 0
                            ? "bg-green-500/10 text-green-400"
                            : diferencia > 0
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-red-500/10 text-red-400"
                        )}
                      >
                        <span>Diferencia vs sistema</span>
                        <span>{diferencia > 0 ? "+" : ""}${diferencia.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {corteError && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-bold">
                      {corteError}
                    </div>
                  )}

                  {!turnoActivo && !corteError && (
                    <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 font-bold uppercase tracking-widest">
                      Abriendo turno…
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowCorteModal(false)}
                      disabled={isClosing}
                      className="h-14 font-black italic uppercase tracking-tighter border-white/10 glass"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleFinalizarTurno}
                      disabled={isClosing || !turnoActivo || !montoDeclarado}
                      className="h-14 font-black italic uppercase tracking-tighter bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/10"
                    >
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                      {isClosing ? "Cerrando…" : "Finalizar Turno"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReciboProps {
  turno: Turno;
  cashierName: string;
  cashTotal: number;
  cardTotal: number;
  memberTotal: number;
  totalHoy: number;
  autosHoy: number;
  onClose: () => void;
}

function ReciboCorte({ turno, cashierName, cashTotal, cardTotal, memberTotal, totalHoy, autosHoy, onClose }: ReciboProps) {
  const dif = turno.diferencia ?? 0;
  const difColor =
    dif === 0 ? "text-green-400" : dif > 0 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30"
          >
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </motion.div>
        </div>
        <h3 className="text-3xl font-black italic tracking-tighter uppercase">Corte Realizado</h3>
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">
          Turno cerrado y guardado en Supabase
        </p>
      </div>

      <div className="glass rounded-2xl border border-white/10 p-6 space-y-3">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-3">
          <span>Cajero</span>
          <span className="text-foreground">{cashierName}</span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Apertura</span>
          <span className="text-foreground">
            {turno.fecha_apertura ? new Date(turno.fecha_apertura).toLocaleString("es-MX") : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Cierre</span>
          <span className="text-foreground">
            {turno.fecha_cierre ? new Date(turno.fecha_cierre).toLocaleString("es-MX") : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Órdenes</span>
          <span className="text-foreground">{autosHoy}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4 rounded-xl border-white/5 text-center">
          <Banknote className="w-4 h-4 text-green-500 mx-auto mb-2" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Efectivo</p>
          <p className="text-lg font-black italic tracking-tighter">${cashTotal.toLocaleString()}</p>
        </div>
        <div className="glass p-4 rounded-xl border-white/5 text-center">
          <CreditCard className="w-4 h-4 text-primary mx-auto mb-2" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tarjeta</p>
          <p className="text-lg font-black italic tracking-tighter">${cardTotal.toLocaleString()}</p>
        </div>
        <div className="glass p-4 rounded-xl border-white/5 text-center">
          <Star className="w-4 h-4 text-yellow-500 mx-auto mb-2" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Membresía</p>
          <p className="text-lg font-black italic tracking-tighter">${memberTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-primary/5 rounded-3xl border border-primary/20 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Recaudado</span>
          <span className="text-3xl font-black italic tracking-tighter text-primary">${totalHoy.toLocaleString()}</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inicial</p>
            <p className="text-base font-black italic tracking-tighter">${(turno.monto_inicial ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sistema</p>
            <p className="text-base font-black italic tracking-tighter">${(turno.monto_sistema ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Declarado</p>
            <p className="text-base font-black italic tracking-tighter">${(turno.monto_declarado ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className={cn("flex justify-between items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest", difColor, dif === 0 ? "bg-green-500/10" : dif > 0 ? "bg-yellow-500/10" : "bg-red-500/10")}>
          <span>Diferencia</span>
          <span>{dif > 0 ? "+" : ""}${dif.toLocaleString()}</span>
        </div>
      </div>

      <Button
        onClick={onClose}
        className="w-full h-14 font-black italic uppercase tracking-tighter bg-primary hover:bg-primary/90 text-black"
      >
        Cerrar
      </Button>
    </div>
  );
}
