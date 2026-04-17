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
  Calendar, 
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

const stats = [
  { label: "Ingresos Hoy", value: "$4,250", change: "+12.5%", icon: DollarSign, trend: "up" },
  { label: "Autos Lavados", value: "32", change: "+4", icon: Car, trend: "up" },
  { label: "Cajero", value: "Jeran R.", change: "Activo", icon: Users, trend: "neutral" },
  { label: "Ticket Promedio", value: "$132.80", change: "-2.1%", icon: TrendingUp, trend: "down" },
];

export default function DashboardPage() {
  const { orders } = useConfig();
  const [showCorteModal, setShowCorteModal] = React.useState(false);

  // Cálculos reales de órdenes
  const totalHoy = orders.reduce((acc, curr) => acc + curr.total, 0);
  const autosHoy = orders.length;
  
  const cashTotal = orders.filter(o => o.paymentMethod === 'Efectivo').reduce((acc, curr) => acc + curr.total, 0);
  const cardTotal = orders.filter(o => o.paymentMethod === 'Tarjeta').reduce((acc, curr) => acc + curr.total, 0);
  const memberTotal = orders.filter(o => o.paymentMethod === 'Membresía').reduce((acc, curr) => acc + curr.total, 0);

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
          <Heading level={2}>Panel Administrativo</Heading>
          <p className="text-muted-foreground text-sm font-medium italic">Hunger Car Wash • Vista en tiempo real</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="glass border-white/5 font-bold uppercase tracking-widest text-[10px]">
            <Calendar className="mr-2 w-3 h-3" /> Reportes
          </Button>
          <Button onClick={() => setShowCorteModal(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-black italic tracking-tighter uppercase px-6">
            Realizar Corte de Caja
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {realStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass group overflow-hidden border-white/5 hover:border-primary/20 transition-all">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <stat.icon className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                    stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {stat.change}
                    {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : stat.trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1 leading-none">{stat.label}</p>
                  <p className="text-3xl font-black italic tracking-tighter text-glow">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
            <div>
              <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Rendimiento Financiero</CardTitle>
              <CardDescription className="text-xs">Ingresos por día y proyección de crecimiento.</CardDescription>
            </div>
            <div className="flex gap-2">
              {['7D', '1M', '1Y'].map(t => (
                <button key={t} className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  t === '7D' ? "bg-primary text-black" : "glass hover:bg-white/5"
                )}>{t}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-64 flex items-end gap-3 px-4">
              {[45, 62, 55, 80, 72, 95, 88].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                    <div className="w-full relative">
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: i * 0.1, duration: 1, ease: "circOut" }}
                            className={cn(
                                "w-full rounded-t-xl transition-all duration-500 group-hover:brightness-125 mb-1 bg-gradient-to-t",
                                i === 6 ? "from-primary to-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "from-muted/40 to-muted/10"
                            )}
                        />
                    </div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-7 gap-3 border-t border-white/5 pt-6 text-center">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i} className={cn("text-[10px] font-black uppercase tracking-widest", i === 6 ? "text-primary" : "text-muted-foreground")}>{d}</span>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card className="glass border-white/5 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-500">
                    <Star className="w-32 h-32" />
                </div>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-black italic tracking-tighter uppercase flex items-center gap-2 leading-none">
                        <Star className="w-5 h-5 text-primary fill-primary" />
                        Membresías Activas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-between items-baseline">
                        <span className="text-6xl font-black italic tracking-tighter leading-none tracking-glow">12</span>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-widest">+2 este mes</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                            <span>Meta Mensual</span>
                            <span>60%</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "60%" }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            />
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">Ver todos los miembros <ChevronRight className="ml-1 w-3 h-3" /></Button>
                </CardContent>
            </Card>

            <Card className="glass border-primary/20 bg-primary/5 shadow-2xl overflow-hidden relative">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black italic uppercase tracking-tight">Security Check</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-widest">Respaldos al día. Sistema operando bajo protocolos Velocity v2.4.</p>
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
              onClick={() => setShowCorteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl glass border-primary/30 p-10 shadow-[0_0_50px_rgba(var(--primary),0.1)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowCorteModal(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <ShieldCheck className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-primary/30 underline-offset-8">Resumen Operativo</h3>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Corte de Caja Directo • {new Date().toLocaleDateString()}</p>
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
                        <p className="text-6xl font-black italic tracking-tighter text-glow text-primary animate-pulse">${totalHoy.toLocaleString()}.00</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-14 font-black italic uppercase tracking-tighter border-white/10 glass">
                        <FileText className="mr-2 w-4 h-4" /> Exportar PDF
                    </Button>
                    <Button 
                        onClick={() => {
                            alert('Corte Realizado y Enviado!');
                            setShowCorteModal(false);
                        }} 
                        className="h-14 font-black italic uppercase tracking-tighter bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/10"
                    >
                        <CheckCircle2 className="mr-2 w-4 h-4" /> Finalizar Turno
                    </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
