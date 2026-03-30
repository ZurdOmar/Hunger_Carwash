"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Users, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2,
  Server,
  UserPlus,
  ArrowRightLeft
} from "lucide-react";
import { useConfig } from "@/lib/ConfigContext";
import { cn } from "@/lib/utils";

export default function ResourcesPage() {
  const { 
    washers, addWasher, toggleWasherStatus, 
    bays, addBay, removeBay, updateBayDefaultWasher 
  } = useConfig();
  
  const [newWasherName, setNewWasherName] = React.useState("");
  const [newBayLabel, setNewBayLabel] = React.useState("");
  const [showSuccess, setShowSuccess] = React.useState(false);

  const handleAddWasher = () => {
    if(newWasherName) { 
        addWasher(newWasherName); 
        setNewWasherName(""); 
        triggerSuccess();
    }
  };

  const handleAddBay = () => {
    if(newBayLabel) { 
        addBay(newBayLabel); 
        setNewBayLabel(""); 
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
          <Heading level={2}>Gestión de Recursos</Heading>
          <p className="text-muted-foreground text-sm font-medium italic">Control de Equipo e Infraestructura Hunger Velocity v4.0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EQUIPO DE TRABAJO */}
        <Card className="glass border-white/5 shadow-2xl overflow-hidden group">
            <CardHeader className="bg-muted/10 border-b border-white/5 py-8 px-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary text-black">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Equipo de Lavado</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Gestión de personal operativo Hunger Wash.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Nombre completo" 
                        value={newWasherName}
                        onChange={(e) => setNewWasherName(e.target.value)}
                        className="h-12 text-sm font-bold bg-background/50 border-white/10 uppercase tracking-widest"
                    />
                    <Button size="icon" onClick={handleAddWasher} className="h-12 w-12 shrink-0 bg-primary text-black hover:bg-primary/90">
                        <UserPlus className="w-5 h-5" />
                    </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {washers.map(w => (
                        <div key={w.id} className={cn("p-4 rounded-xl border flex items-center justify-between group/item transition-all", w.isActive ? "border-white/5 bg-white/5 hover:border-primary/20" : "border-red-500/20 bg-red-500/5 opacity-60")}>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none block">{w.fullName}</span>
                                {!w.isActive && w.deactivatedAt && (
                                    <span className="text-[8px] tracking-widest text-red-400/80 uppercase mt-1 block">
                                        Baja: {new Date(w.deactivatedAt).toLocaleDateString('es-MX')}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => toggleWasherStatus(w.id)} className={cn("p-2 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100", w.isActive ? "hover:bg-red-500/10 hover:text-red-500" : "hover:bg-green-500/10 hover:text-green-500")}>
                                {w.isActive ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* ÁREAS DE TRABAJO (BAHÍAS) */}
        <Card className="glass border-white/5 shadow-2xl overflow-hidden group">
            <CardHeader className="bg-muted/10 border-b border-white/5 py-8 px-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/20 text-primary">
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Infraestructura</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Cajones y bahías con responsables fijos.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="flex gap-2">
                    <Input 
                        placeholder="ID de Cajón (Ej. B1)" 
                        value={newBayLabel}
                        onChange={(e) => setNewBayLabel(e.target.value)}
                        className="h-12 text-sm font-bold bg-background/50 border-white/10 uppercase tracking-widest"
                    />
                    <Button size="icon" onClick={handleAddBay} variant="outline" className="h-12 w-12 shrink-0 border-white/20 glass hover:bg-white/5">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {bays.map(bay => (
                        <div key={bay.id} className="p-5 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between group/bay hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center gap-5">
                                <div className="p-2.5 rounded-xl bg-primary text-black text-[10px] font-black">
                                    BA-{bay.id}
                                </div>
                                <div className="leading-none">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">{bay.label}</p>
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft className="w-2.5 h-2.5 text-muted-foreground" />
                                        <select 
                                            className="bg-transparent text-[9px] font-bold text-primary uppercase tracking-widest focus:outline-none cursor-pointer"
                                            value={bay.defaultWasherId || ""}
                                            onChange={(e) => updateBayDefaultWasher(bay.id, e.target.value || undefined)}
                                        >
                                            <option value="" className="bg-background">Elegir Lavador Fijo</option>
                                            {washers.filter(w => w.isActive).map(w => <option key={w.id} value={w.id} className="bg-background">{w.fullName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeBay(bay.id)} className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover/bay:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* FEEDBACK SUCCESS */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-10 right-10 z-[200] glass p-6 border-green-500/30 flex items-center gap-4 bg-green-500/5 shadow-2xl"
            >
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-xs font-black uppercase tracking-widest text-green-500">Recurso Actualizado</span>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
