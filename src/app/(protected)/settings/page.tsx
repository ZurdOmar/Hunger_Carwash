"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Plus, 
  Trash2, 
  Car,
  TrendingUp,
  DollarSign,
  ArrowUpCircle,
  Eye,
  EyeOff,
  Percent,
  CheckCircle2,
  Package,
  Sparkles
} from "lucide-react";
import { useConfig } from "@/lib/ConfigContext";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { 
    vehicleSizes, basePrices, addVehicleSize, 
    services, addService, toggleVisibility, 
    applyPercentIncrease 
  } = useConfig();
  
  const [newTypeName, setNewTypeName] = React.useState("");
  const [newTypePrice, setNewTypePrice] = React.useState("");
  const [newServiceName, setNewServiceName] = React.useState("");
  const [newServicePrice, setNewServicePrice] = React.useState("");
  const [percentIncrease, setPercentIncrease] = React.useState("");
  const [showSuccess, setShowSuccess] = React.useState(false);

  const handleAddType = () => {
    if(newTypeName && newTypePrice) { 
        addVehicleSize(newTypeName, parseInt(newTypePrice)); 
        setNewTypeName(""); 
        setNewTypePrice("");
        triggerSuccess();
    }
  };

  const handleAddService = () => {
    if(newServiceName && newServicePrice) {
        addService(newServiceName, parseInt(newServicePrice), false);
        setNewServiceName("");
        setNewServicePrice("");
        triggerSuccess();
    }
  };

  const handleApplyIncrease = () => {
    if(percentIncrease) {
        applyPercentIncrease(parseInt(percentIncrease));
        setPercentIncrease("");
        triggerSuccess();
    }
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="space-y-8 pb-32 px-1 pr-2 relative overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Heading level={2}>Maestro de Precios</Heading>
          <p className="text-muted-foreground text-sm font-medium italic">Configuración Estratégica y Catálogos Hunger Velocity v4.1</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PRECIOS POR TAMAÑO DE AUTO */}
        <Card className="glass border-white/5 shadow-2xl overflow-hidden group">
            <CardHeader className="bg-muted/10 border-b border-white/5 py-8 px-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary text-black">
                        <Car className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Tamaños de Vehículo</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Gestiona los costos base por categoría.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Nueva Categoría</label>
                        <Input 
                            placeholder="Nombre (Ej. Moto)" 
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="h-10 text-xs font-bold bg-background/50 border-white/10 uppercase tracking-widest"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Precio Base $</label>
                            <Input 
                                placeholder="0.00" 
                                type="number"
                                value={newTypePrice}
                                onChange={(e) => setNewTypePrice(e.target.value)}
                                className="h-10 text-xs font-bold bg-background/50 border-white/10"
                            />
                        </div>
                        <Button size="icon" onClick={handleAddType} className="h-10 w-10 shrink-0 bg-primary text-black hover:bg-primary/90">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {vehicleSizes.map(size => (
                        <div key={size.value} className={cn(
                            "p-5 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between group/item hover:bg-white/[0.07] transition-all",
                            size.isHidden && "opacity-40 grayscale"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-background/50 text-2xl shadow-inner">
                                    {size.icon}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-2">{size.label}</p>
                                    <p className="text-2xl font-black italic tracking-tighter text-primary">${basePrices[size.value] || 0}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleVisibility(size.value, 'size')} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                                    {size.isHidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* OTROS SERVICIOS Y AUMENTO MASIVO */}
        <div className="space-y-8">
            {/* AUMENTO MASIVO */}
            <Card className="glass border-primary/20 shadow-2xl overflow-hidden group">
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-6 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Ajuste Global de Precios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6">
                        <p className="text-[10px] font-bold text-primary italic uppercase leading-tight">
                            Atención: Esta acción incrementará los precios de TODOS los tamaños y servicios extras simultáneamente.
                        </p>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Porcentaje de Incremento (%)</label>
                            <Input 
                                type="number"
                                placeholder="Ej: 5 para +5%" 
                                value={percentIncrease}
                                onChange={(e) => setPercentIncrease(e.target.value)}
                                className="h-12 text-sm font-bold bg-background/50 border-primary/10 tracking-widest"
                            />
                        </div>
                        <Button onClick={handleApplyIncrease} className="h-12 px-8 font-black uppercase bg-primary text-black hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
                            <ArrowUpCircle className="w-5 h-5" /> APLICAR CAMBIO
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* SERVICIOS EXTRAS */}
            <Card className="glass border-white/5 shadow-2xl overflow-hidden group">
                <CardHeader className="bg-muted/10 border-b border-white/5 py-6 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> Catálogo de Extras
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {services.map(service => (
                            <div key={service.id} className={cn(
                                "p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between group/srv hover:bg-white/[0.08] transition-all",
                                service.isHidden && "opacity-40 grayscale"
                            )}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-muted-foreground">{service.name}</p>
                                    <p className="text-xl font-black italic text-primary">${service.basePrice}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleVisibility(service.id, 'service')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                        {service.isHidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 mt-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Nuevo Extra</label>
                            <Input 
                                placeholder="Ej. Lustrado" 
                                value={newServiceName}
                                onChange={(e) => setNewServiceName(e.target.value)}
                                className="h-10 text-xs font-bold bg-background/50 border-white/10 uppercase tracking-widest"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Precio $</label>
                                <Input 
                                    placeholder="0.00" 
                                    type="number"
                                    value={newServicePrice}
                                    onChange={(e) => setNewServicePrice(e.target.value)}
                                    className="h-10 text-xs font-bold bg-background/50 border-white/10"
                                />
                            </div>
                            <Button size="icon" onClick={handleAddService} className="h-10 w-10 shrink-0 bg-primary text-black hover:bg-primary/90">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* FEEDBACK SUCCESS */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed bottom-10 right-10 z-[200] glass p-6 border-green-500/30 flex shadow-2xl items-center gap-4 bg-green-500/10 backdrop-blur-xl"
            >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/50">
                    <CheckCircle2 className="w-6 h-6 text-black" />
                </div>
                <div>
                    <h4 className="text-lg font-black italic uppercase text-green-500 leading-none tracking-tighter">Sincronización HUNGER</h4>
                    <p className="text-[10px] font-bold text-white/50 uppercase mt-1 tracking-widest">Los precios han sido actualizados globalmente.</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
