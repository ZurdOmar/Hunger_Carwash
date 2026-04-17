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
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/lib/ConfigContext";

export default function ReportsPage() {
  const { orders, washers } = useConfig();
  const [dateRange, setDateRange] = React.useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Filtrar órdenes por rango de fechas
  const filteredOrders = orders.filter(o => {
    const orderDate = o.createdAt.split('T')[0];
    return orderDate >= dateRange.from && orderDate <= dateRange.to;
  });

  // Datos Reales (filtrados por fecha)
  const totalRevenue = filteredOrders.reduce((acc, curr) => acc + curr.total, 0);
  const deliveredOrders = filteredOrders.filter(o => o.status === 'Entregado').length;
  const avgTicket = deliveredOrders > 0 ? (totalRevenue / deliveredOrders).toFixed(2) : "0.00";
  const premiumOrders = filteredOrders.filter(o => o.isPremium).length;

  // Productividad por Lavador
  const washerStats = washers.map(washer => ({
    id: washer.id,
    name: washer.fullName,
    count: filteredOrders.filter(o => o.washerId === washer.id).length,
    revenue: filteredOrders.filter(o => o.washerId === washer.id).reduce((acc, curr) => acc + curr.total, 0)
  })).sort((a, b) => b.count - a.count);

  // Popularidad de Tamaños
  const sizeStats = Object.entries(
    filteredOrders.reduce((acc, o) => {
        acc[o.vehicle.size] = (acc[o.vehicle.size] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  // Función para exportar CSV
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    let csv = BOM + 'REPORTE DE ÓRDENES\n';
    csv += `Período,${dateRange.from} a ${dateRange.to}\n`;
    csv += `Fecha Generación,${new Date().toLocaleString('es-MX')}\n\n`;

    csv += 'KPIs\n';
    csv += `Ingresos Totales,"$${totalRevenue.toLocaleString()}"\n`;
    csv += `Servicios Finalizados,${deliveredOrders}\n`;
    csv += `Ticket Promedio,"$${avgTicket}"\n`;
    csv += `Ventas Premium,${premiumOrders}\n\n`;

    csv += 'ORDENES\n';
    csv += 'Folio,Placa,Tamaño,Lavador,Total,Estado,Método,Fecha\n';
    filteredOrders.forEach(o => {
      const lavadorName = washers.find(w => w.id === o.washerId)?.fullName || 'N/A';
      csv += `${o.folio},"${o.vehicle.placa}","${o.vehicle.size}","${lavadorName}","$${o.total}","${o.status}","${o.paymentMethod || 'N/A'}","${new Date(o.createdAt).toLocaleDateString('es-MX')}"\n`;
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
          <div className="flex gap-2 items-center bg-surface-container-lowest px-3 rounded-lg border border-white/5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="h-9 bg-transparent text-xs font-bold border-0 outline-none"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="h-9 bg-transparent text-xs font-bold border-0 outline-none"
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
                                <span>{count} unidades • {((count / orders.length) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-3 bg-muted/20 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${(count / orders.length) * 100}%` }}
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
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Revenue: ${stat.revenue.toLocaleString()}</p>
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
