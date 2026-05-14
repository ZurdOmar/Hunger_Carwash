"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TrendingUp,
  Users,
  Car,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Star,
  PieChart,
  BarChart3,
  ArrowUpRight,
  UserCheck,
  UserCog,
  Wallet,
  Wrench,
  History,
  Printer,
} from "lucide-react";
import { imprimirCorte } from "@/lib/printService";
import { cn } from "@/lib/utils";
import { useConfig } from "@/lib/ConfigContext";
import { getHistorialCortes, type Turno } from "@/lib/turnosService";
import { supabase } from "@/lib/supabase";

type RangeOrder = {
  id: string;
  folio: number;
  total: number;
  estado: string;
  metodo_pago: string | null;
  es_premium: boolean | null;
  cajero_id: string | null;
  lavador_id: string | null;
  turno_id: string | null;
  created_at: string | null;
  servicios: any;
  vehiculos: { placa: string; tamano: string } | null;
};

type Cajero = { id: string; full_name: string | null };

export default function ReportsPage() {
  const { washers } = useConfig();
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fromDateRef = React.useRef<HTMLInputElement>(null);
  const toDateRef = React.useRef<HTMLInputElement>(null);

  const applyPreset = (preset: 'hoy' | 'semana' | 'mes' | 'año') => {
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];
    let from = new Date(today);
    if (preset === 'hoy') {
      // from = today
    } else if (preset === 'semana') {
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1; // lunes como inicio
      from.setDate(today.getDate() - diff);
    } else if (preset === 'mes') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'año') {
      from = new Date(today.getFullYear(), 0, 1);
    }
    setDateRange({ from: from.toISOString().split('T')[0], to: toStr });
  };
  const [historial, setHistorial] = React.useState<Turno[]>([]);
  const [loadingHistorial, setLoadingHistorial] = React.useState(true);
  const [rangeOrders, setRangeOrders] = React.useState<RangeOrder[]>([]);
  const [cajeros, setCajeros] = React.useState<Cajero[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  React.useEffect(() => {
    const loadHistorial = async () => {
      try {
        const { data: matriz } = await supabase
          .from('sucursales')
          .select('id')
          .eq('es_matriz', true)
          .single();
        if (matriz?.id) {
          const cortes = await getHistorialCortes(matriz.id);
          setHistorial(cortes);
        }
      } finally {
        setLoadingHistorial(false);
      }
    };
    loadHistorial();
  }, []);

  // Fetch orders in range (incluye Entregadas) + cajeros
  React.useEffect(() => {
    const loadRangeData = async () => {
      setLoadingOrders(true);
      try {
        const fromISO = `${dateRange.from}T00:00:00.000Z`;
        const toISO = `${dateRange.to}T23:59:59.999Z`;
        const [ordsRes, perfilesRes] = await Promise.all([
          supabase
            .from("ordenes_servicio")
            .select("id, folio, total, estado, metodo_pago, es_premium, cajero_id, lavador_id, turno_id, created_at, servicios, vehiculos(placa, tamano)")
            .gte("created_at", fromISO)
            .lte("created_at", toISO)
            .order("created_at", { ascending: false }),
          supabase.from("perfiles").select("id, full_name"),
        ]);
        if (ordsRes.error) console.error("Error cargando órdenes:", ordsRes.error);
        if (perfilesRes.error) console.error("Error cargando perfiles:", perfilesRes.error);
        setRangeOrders((ordsRes.data || []) as unknown as RangeOrder[]);
        setCajeros((perfilesRes.data || []) as Cajero[]);
      } catch (err) {
        console.error("Error inesperado cargando reportes:", err);
        setRangeOrders([]);
        setCajeros([]);
      } finally {
        setLoadingOrders(false);
      }
    };
    loadRangeData();
  }, [dateRange.from, dateRange.to]);

  // --- Modal de detalle de corte ---
  const [selectedTurno, setSelectedTurno] = React.useState<Turno | null>(null);

  // --- Indicadores globales del rango ---
  const totalRevenue = rangeOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const deliveredOrders = rangeOrders.filter(o => o.estado === 'Entregado').length;
  const avgTicket = rangeOrders.length > 0 ? (totalRevenue / rangeOrders.length).toFixed(2) : "0.00";
  const premiumOrders = rangeOrders.filter(o => o.es_premium).length;

  // --- Productividad por Lavador ---
  const washerStats = washers.map(washer => {
    const ownOrders = rangeOrders.filter(o => o.lavador_id === washer.id);
    return {
      id: washer.id,
      name: washer.fullName,
      count: ownOrders.length,
      revenue: ownOrders.reduce((acc, curr) => acc + (curr.total || 0), 0),
    };
  }).sort((a, b) => b.count - a.count);

  // --- Popularidad por Tamaño ---
  const sizeStats = Object.entries(
    rangeOrders.reduce((acc, o) => {
      const size = o.vehiculos?.tamano || 'Sin datos';
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  // --- Productividad por Cajero ---
  const cajeroStats = (() => {
    const byId = new Map<string, { name: string; count: number; revenue: number }>();
    for (const o of rangeOrders) {
      if (!o.cajero_id) continue;
      const current = byId.get(o.cajero_id) ?? {
        name: cajeros.find(c => c.id === o.cajero_id)?.full_name || 'Sin nombre',
        count: 0,
        revenue: 0,
      };
      current.count += 1;
      current.revenue += o.total || 0;
      byId.set(o.cajero_id, current);
    }
    return Array.from(byId.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  })();

  // --- Desglose por Método de Pago ---
  const metodoPagoStats = (() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of rangeOrders) {
      const key = o.metodo_pago || 'Sin método';
      if (!map[key]) map[key] = { count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += o.total || 0;
    }
    return Object.entries(map)
      .map(([method, v]) => ({ method, ...v, pct: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  })();

  // --- Servicios más vendidos ---
  const servicioStats = (() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of rangeOrders) {
      const arr = Array.isArray(o.servicios) ? o.servicios : [];
      for (const s of arr) {
        const name = s?.name || s?.nombre || 'Servicio sin nombre';
        const price = typeof s?.basePrice === 'number' ? s.basePrice : typeof s?.precio_base === 'number' ? s.precio_base : 0;
        if (!map[name]) map[name] = { count: 0, revenue: 0 };
        map[name].count += 1;
        map[name].revenue += price;
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  })();

  // --- Ingresos por día ---
  const dailyStats = (() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of rangeOrders) {
      if (!o.created_at) continue;
      const day = o.created_at.split('T')[0];
      if (!map[day]) map[day] = { count: 0, revenue: 0 };
      map[day].count += 1;
      map[day].revenue += o.total || 0;
    }
    return Object.entries(map)
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));
  })();
  const maxDailyRevenue = Math.max(1, ...dailyStats.map(d => d.revenue));

  // --- Historial con conteo de órdenes por turno ---
  // Órdenes con turno_id se asignan directo; órdenes huérfanas (turno_id=null)
  // se asignan al turno cuya ventana fecha_apertura..fecha_cierre las contenga.
  const ordersByTurno = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of rangeOrders) {
      if (o.turno_id) {
        map[o.turno_id] = (map[o.turno_id] || 0) + 1;
        continue;
      }
      if (!o.created_at) continue;
      const ms = new Date(o.created_at).getTime();
      for (const t of historial) {
        const start = t.fecha_apertura ? new Date(t.fecha_apertura).getTime() : 0;
        const end = t.fecha_cierre
          ? new Date(t.fecha_cierre).getTime()
          : start + 24 * 60 * 60 * 1000;
        if (ms >= start && ms <= end) {
          map[t.id] = (map[t.id] || 0) + 1;
          break;
        }
      }
    }
    return map;
  }, [rangeOrders, historial]);

  // Función para exportar CSV
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    let csv = BOM + 'REPORTE DE ÓRDENES\n';
    csv += `Período,${dateRange.from} a ${dateRange.to}\n`;
    csv += `Fecha Generación,${new Date().toLocaleString('es-MX')}\n\n`;

    csv += 'INDICADORES\n';
    csv += `Ingresos Totales,"$${totalRevenue.toLocaleString()}"\n`;
    csv += `Servicios Finalizados,${deliveredOrders}\n`;
    csv += `Ticket Promedio,"$${avgTicket}"\n`;
    csv += `Ventas Paquete Premium,${premiumOrders}\n\n`;

    csv += 'PRODUCTIVIDAD POR CAJERO\n';
    csv += 'Cajero,Órdenes,Ingresos\n';
    cajeroStats.forEach(c => {
      csv += `"${c.name}",${c.count},"$${c.revenue.toLocaleString()}"\n`;
    });
    csv += '\n';

    csv += 'DESGLOSE POR MÉTODO DE PAGO\n';
    csv += 'Método,Órdenes,Ingresos,Porcentaje\n';
    metodoPagoStats.forEach(m => {
      csv += `"${m.method}",${m.count},"$${m.revenue.toLocaleString()}","${m.pct.toFixed(1)}%"\n`;
    });
    csv += '\n';

    csv += 'SERVICIOS MÁS VENDIDOS\n';
    csv += 'Servicio,Veces Vendido,Ingresos\n';
    servicioStats.forEach(s => {
      csv += `"${s.name}",${s.count},"$${s.revenue.toLocaleString()}"\n`;
    });
    csv += '\n';

    csv += 'INGRESOS POR DÍA\n';
    csv += 'Fecha,Órdenes,Ingresos\n';
    dailyStats.forEach(d => {
      csv += `${d.day},${d.count},"$${d.revenue.toLocaleString()}"\n`;
    });
    csv += '\n';

    csv += 'ÓRDENES\n';
    csv += 'Folio,Placa,Tamaño,Cajero,Lavador,Total,Estado,Método,Fecha\n';
    rangeOrders.forEach(o => {
      const lavadorName = washers.find(w => w.id === o.lavador_id)?.fullName || 'N/A';
      const cajeroName = cajeros.find(c => c.id === o.cajero_id)?.full_name || 'N/A';
      const placa = o.vehiculos?.placa || '';
      const tamano = o.vehiculos?.tamano || '';
      csv += `${o.folio},"${placa}","${tamano}","${cajeroName}","${lavadorName}","$${o.total}","${o.estado}","${o.metodo_pago || 'N/A'}","${o.created_at ? new Date(o.created_at).toLocaleDateString('es-MX') : ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-${dateRange.from}-${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-32 pr-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Heading level={2}>Reportes Analíticos</Heading>
          <p className="text-muted-foreground text-sm font-medium italic">Inteligencia de Negocio Hunger Velocity v1.2</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 items-center bg-surface-container-lowest p-1 rounded-lg border border-white/5">
            {([
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'año', label: 'Año' },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-3 h-7 rounded-md text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center bg-surface-container-lowest px-3 rounded-lg border border-white/5" style={{ colorScheme: 'dark' }}>
            <button
              type="button"
              onClick={() => fromDateRef.current?.showPicker?.()}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Abrir calendario de fecha inicial"
            >
              <Calendar className="w-3 h-3" />
            </button>
            <input
              ref={fromDateRef}
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              onClick={() => fromDateRef.current?.showPicker?.()}
              className="h-9 bg-transparent text-xs font-bold border-0 outline-none text-foreground cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              ref={toDateRef}
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              onClick={() => toDateRef.current?.showPicker?.()}
              className="h-9 bg-transparent text-xs font-bold border-0 outline-none text-foreground cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <Button
            variant="outline"
            className="glass border-white/5 font-bold uppercase tracking-widest text-[10px]"
            onClick={handleExportCSV}
          >
            <Download className="mr-2 w-3 h-3" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
            { label: "Ingresos Totales", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
            { label: "Servicios Finalizados", value: deliveredOrders, icon: CheckCircle2, color: "text-primary" },
            { label: "Ticket Promedio", value: `$${avgTicket}`, icon: TrendingUp, color: "text-blue-500" },
            { label: "Ventas Premium", value: premiumOrders, icon: Star, color: "text-yellow-500" },
        ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="glass border-white/5 group hover:border-primary/20 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-2 rounded-xl bg-white/5", kpi.color)}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-30" />
                        </div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{kpi.label}</p>
                        <p className="text-3xl font-black italic tracking-tighter text-glow">{kpi.value}</p>
                    </CardContent>
                </Card>
            </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfica de Demanda por Tamaño */}
        <Card className="lg:col-span-2 glass border-white/5 overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Popularidad por Tipo de Auto
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
                <div className="space-y-6">
                    {sizeStats.map(([size, count], i) => (
                        <div key={size} className="space-y-2">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                <span>{size}</span>
                                <span>{count} unidades • {((count / rangeOrders.length) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-3 bg-muted/20 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${(count / rangeOrders.length) * 100}%` }}
                                    transition={{ duration: 1.5, ease: "circOut", delay: i * 0.1 }}
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Productividad del Equipo */}
        <Card className="glass border-white/5 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b border-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" /> Productividad del Equipo
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-white/5">
                    {washerStats.map((stat, i) => (
                        <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                    #{i+1}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{stat.name}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Ingresos: ${stat.revenue.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black italic tracking-tighter leading-none">{stat.count}</p>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Autos</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Ingresos por día (timeseries) */}
      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Ingresos por Día
          </CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Tendencia del rango seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loadingOrders ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Cargando…</div>
          ) : dailyStats.length === 0 ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Sin datos en el rango</div>
          ) : (
            <div className="flex items-end gap-2 h-48 overflow-x-auto">
              {dailyStats.map((d, i) => (
                <div key={d.day} className="flex-1 min-w-[32px] flex flex-col items-center gap-2 group">
                  <div className="flex-1 w-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.revenue / maxDailyRevenue) * 100}%` }}
                      transition={{ delay: i * 0.03, duration: 0.8, ease: "circOut" }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary),0.2)] relative group-hover:brightness-125 transition-all"
                      title={`${d.day}: $${d.revenue.toLocaleString()} (${d.count} órdenes)`}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-2 py-1 rounded">
                        ${d.revenue.toLocaleString()}
                      </span>
                    </motion.div>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productividad por Cajero */}
        <Card className="glass border-white/5 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" /> Productividad por Cajero
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Órdenes cobradas e ingresos por usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingOrders ? (
              <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Cargando…</div>
            ) : cajeroStats.length === 0 ? (
              <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Sin órdenes con cajero asignado</div>
            ) : (
              <div className="divide-y divide-white/5">
                {cajeroStats.map((stat, i) => (
                  <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{stat.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Ingresos: ${stat.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black italic tracking-tighter leading-none">{stat.count}</p>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Órdenes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desglose por Método de Pago */}
        <Card className="glass border-white/5 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Desglose por Método de Pago
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Distribución de ingresos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loadingOrders ? (
              <div className="p-4 text-center text-xs uppercase tracking-widest text-muted-foreground">Cargando…</div>
            ) : metodoPagoStats.length === 0 ? (
              <div className="p-4 text-center text-xs uppercase tracking-widest text-muted-foreground">Sin datos</div>
            ) : (
              metodoPagoStats.map((m, i) => (
                <div key={m.method} className="space-y-2">
                  <div className="flex justify-between items-baseline text-[10px] font-black uppercase tracking-widest">
                    <span>{m.method}</span>
                    <span className="text-muted-foreground">{m.count} órdenes • ${m.revenue.toLocaleString()} • {m.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-muted/20 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.pct}%` }}
                      transition={{ duration: 1.2, ease: "circOut", delay: i * 0.1 }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Servicios más vendidos */}
      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Servicios Más Vendidos
          </CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Top 10 del rango seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOrders ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Cargando…</div>
          ) : servicioStats.length === 0 ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Sin servicios vendidos</div>
          ) : (
            <div className="divide-y divide-white/5">
              {servicioStats.map((s, i) => (
                <div key={s.name} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                      #{i + 1}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black italic tracking-tighter leading-none">{s.count}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">${s.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Cortes de Caja */}
      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Historial de Cortes de Caja
          </CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Últimos 50 turnos registrados · Doble click para ver detalle
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistorial ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
              Cargando historial…
            </div>
          ) : historial.length === 0 ? (
            <div className="p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
              Sin cortes registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/5 border-b border-white/5">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-3 text-left">Apertura</th>
                    <th className="p-3 text-left">Cierre</th>
                    <th className="p-3 text-right">Órdenes</th>
                    <th className="p-3 text-right">Monto Inicial</th>
                    <th className="p-3 text-right">Sistema</th>
                    <th className="p-3 text-right">Declarado</th>
                    <th className="p-3 text-right">Diferencia</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historial.map((t) => {
                    const dif = t.diferencia ?? 0;
                    const difColor =
                      t.estado !== 'cerrado'
                        ? 'text-muted-foreground'
                        : dif === 0
                          ? 'text-green-400'
                          : dif > 0
                            ? 'text-yellow-400'
                            : 'text-red-400';
                    return (
                      <tr
                        key={t.id}
                        onDoubleClick={() => setSelectedTurno(t)}
                        className="hover:bg-white/5 transition-all cursor-pointer select-none"
                      >
                        <td className="p-3">
                          {t.fecha_apertura
                            ? new Date(t.fecha_apertura).toLocaleString('es-MX')
                            : '—'}
                        </td>
                        <td className="p-3">
                          {t.fecha_cierre
                            ? new Date(t.fecha_cierre).toLocaleString('es-MX')
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-bold">
                          {ordersByTurno[t.id] ?? 0}
                        </td>
                        <td className="p-3 text-right font-bold">
                          ${(t.monto_inicial ?? 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold">
                          ${(t.monto_sistema ?? 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold">
                          ${(t.monto_declarado ?? 0).toLocaleString()}
                        </td>
                        <td className={cn('p-3 text-right font-black', difColor)}>
                          {t.estado === 'cerrado'
                            ? `${dif > 0 ? '+' : ''}$${dif.toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                              t.estado === 'cerrado'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-yellow-500/10 text-yellow-400'
                            )}
                          >
                            {t.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle de corte */}
      {selectedTurno && (() => {
        const t = selectedTurno;
        const dif = t.diferencia ?? 0;
        const difColor = t.estado !== 'cerrado'
          ? 'text-muted-foreground'
          : dif === 0 ? 'text-green-400' : dif > 0 ? 'text-yellow-400' : 'text-red-400';
        const turnoStartMs = t.fecha_apertura ? new Date(t.fecha_apertura).getTime() : 0;
        const turnoEndMs = t.fecha_cierre
          ? new Date(t.fecha_cierre).getTime()
          : turnoStartMs + 24 * 60 * 60 * 1000;
        const turnoOrders = rangeOrders.filter(o => {
          if (o.turno_id === t.id) return true;
          if (o.turno_id && o.turno_id !== t.id) return false;
          if (!o.created_at) return false;
          const ms = new Date(o.created_at).getTime();
          return ms >= turnoStartMs && ms <= turnoEndMs;
        });
        const ordersCount = turnoOrders.length;
        // "Cajero" del corte = quien ejecutó el cierre (cerrado_por). Para
        // turnos antiguos sin ese dato, cae al usuario_id (quien lo abrió)
        // como mejor aproximación disponible.
        const cajeroId = t.cerrado_por ?? t.usuario_id;
        const cajeroNombre = cajeros.find(c => c.id === cajeroId)?.full_name || '—';
        const efectivo = turnoOrders.filter(o => o.metodo_pago === 'Efectivo').reduce((s, o) => s + (o.total || 0), 0);
        const tarjeta = turnoOrders.filter(o => o.metodo_pago === 'Tarjeta').reduce((s, o) => s + (o.total || 0), 0);
        const membresia = turnoOrders.filter(o => o.metodo_pago === 'Membresía').reduce((s, o) => s + (o.total || 0), 0);
        return (
          <div
            onClick={() => setSelectedTurno(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detalle de corte</p>
                  <h3 className="text-2xl font-black italic tracking-tighter">
                    {t.fecha_apertura ? new Date(t.fecha_apertura).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => imprimirCorte({
                      turno: t,
                      cajeroNombre,
                      cashTotal: efectivo,
                      cardTotal: tarjeta,
                      memberTotal: membresia,
                      totalHoy: efectivo + tarjeta + membresia,
                      autosHoy: ordersCount,
                      orders: turnoOrders.map((o) => ({
                        folio: o.folio,
                        placa: o.vehiculos?.placa || '—',
                        total: o.total || 0,
                        metodo: o.metodo_pago || '—',
                      })),
                    })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest"
                    aria-label="Imprimir"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setSelectedTurno(null)}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
                    aria-label="Cerrar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Apertura</p>
                    <p className="text-sm font-bold">{t.fecha_apertura ? new Date(t.fecha_apertura).toLocaleString('es-MX') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cierre</p>
                    <p className="text-sm font-bold">{t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleString('es-MX') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cajero</p>
                    <p className="text-sm font-bold">{cajeroNombre}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estado</p>
                    <span className={cn(
                      'inline-block px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                      t.estado === 'cerrado' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    )}>
                      {t.estado}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="glass border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Efectivo</p>
                    <p className="text-lg font-black italic tracking-tighter">${efectivo.toLocaleString()}</p>
                  </div>
                  <div className="glass border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tarjeta</p>
                    <p className="text-lg font-black italic tracking-tighter">${tarjeta.toLocaleString()}</p>
                  </div>
                  <div className="glass border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Membresía</p>
                    <p className="text-lg font-black italic tracking-tighter">${membresia.toLocaleString()}</p>
                  </div>
                </div>

                <div className="glass border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Monto inicial</span>
                    <span className="font-black">${(t.monto_inicial ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Sistema</span>
                    <span className="font-black">${(t.monto_sistema ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Declarado</span>
                    <span className="font-black">${(t.monto_declarado ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base pt-3 border-t border-white/5">
                    <span className="font-black uppercase text-[10px] tracking-widest">Diferencia</span>
                    <span className={cn('font-black italic tracking-tighter', difColor)}>
                      {t.estado === 'cerrado' ? `${dif > 0 ? '+' : ''}$${dif.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-white/5">
                    <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Órdenes en el turno</span>
                    <span className="font-black">{ordersCount}</span>
                  </div>
                </div>

                {turnoOrders.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Órdenes</p>
                    <div className="glass border border-white/5 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/5 border-b border-white/5">
                          <tr className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <th className="p-2 text-left">Folio</th>
                            <th className="p-2 text-left">Placa</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-left">Método</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {turnoOrders.map(o => (
                            <tr key={o.id}>
                              <td className="p-2 font-bold">#{o.folio}</td>
                              <td className="p-2">{o.vehiculos?.placa || '—'}</td>
                              <td className="p-2 text-right font-bold">${(o.total || 0).toLocaleString()}</td>
                              <td className="p-2 text-muted-foreground">{o.metodo_pago || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Mock de CheckCircle2 que faltó (de lucide-react debería estar pero por precaución)
function CheckCircle2(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
