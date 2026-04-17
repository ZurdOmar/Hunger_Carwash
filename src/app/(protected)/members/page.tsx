"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import { 
  Users, 
  Search, 
  Star, 
  Calendar, 
  Car,
  TrendingUp,
  UserPlus,
  Gift,
  Trash2,
  Plus
} from "lucide-react";
import { useConfig } from "@/lib/ConfigContext";
import { cn } from "@/lib/utils";

export default function MembersPage() {
  const { members, promoRules, addPromoRule, removePromoRule } = useConfig();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [newPromo, setNewPromo] = React.useState({
    visitThreshold: 5,
    benefit: 'free' as 'free' | 'discount' | 'premium_upgrade',
    name: '',
    discountPercent: 0
  });

  const filteredMembers = members.filter(m => 
    m.placa.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.totalWashings - a.totalWashings);

  const totalWashings = members.reduce((acc, m) => acc + m.totalWashings, 0);

  const handleAddPromo = () => {
    if(newPromo.name) {
        addPromoRule({
            ...newPromo,
            id: Math.random().toString(36).substr(2, 9),
            isActive: true
        });
        setNewPromo({ visitThreshold: 5, benefit: 'free', name: '', discountPercent: 0 });
    }
  };

  return (
    <div className="space-y-8 pb-32 overflow-y-auto px-1 pr-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Heading level={2}>Membresías y Fidelidad</Heading>
          <p className="text-muted-foreground text-sm font-medium italic">Configuración de Promociones y Gestión de Socios Hunger v4.1</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar socio por placa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-background/50 border-white/5 font-bold tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/50 transition-all uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CONFIGURACIÓN DE PROMOCIONES */}
        <Card className="glass border-green-500/20 shadow-2xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-all">
                <Gift className="w-24 h-24 text-green-500" />
            </div>
            <CardHeader className="bg-green-500/5 border-b border-green-500/10 py-8 px-8">
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                    <Gift className="w-6 h-6 text-green-500" /> Configuración de Promociones
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-green-500/60 leading-none">Diseña tu estrategia de lealtad Hunger.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Nombre de la Promo</label>
                            <Input 
                                placeholder="Ej: Bienvenida o Lealtad" 
                                className="bg-white/5 border-white/10 h-10 font-bold text-xs uppercase"
                                value={newPromo.name}
                                onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Número de Visita</label>
                            <Input 
                                type="number"
                                className="bg-white/5 border-white/10 h-10 font-bold text-xs"
                                value={newPromo.visitThreshold}
                                onChange={(e) => setNewPromo({...newPromo, visitThreshold: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 bg-white/5 border border-white/10 h-10 rounded-md text-[10px] font-bold px-3 focus:outline-none uppercase"
                            value={newPromo.benefit}
                            onChange={(e) => setNewPromo({...newPromo, benefit: e.target.value as any})}
                        >
                            <option value="free" className="bg-background">Lavado Gratis</option>
                            <option value="discount" className="bg-background">Descuento (%)</option>
                            <option value="premium_upgrade" className="bg-background">Upgrade Premium</option>
                        </select>
                        {(newPromo.benefit as string) === 'discount' && (
                            <Input 
                                type="number"
                                placeholder="%" 
                                className="w-16 bg-white/5 h-10 text-xs font-bold border-white/10 text-center"
                                value={newPromo.discountPercent || ""}
                                onChange={(e) => setNewPromo({...newPromo, discountPercent: parseInt(e.target.value) || 0})}
                            />
                        )}
                        <Button className="h-10 px-6 text-[10px] font-black bg-green-500 text-black hover:bg-green-600" onClick={handleAddPromo}>
                            <Plus className="w-4 h-4 mr-2" /> CREAR REGLA
                        </Button>
                    </div>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {promoRules.map(rule => (
                        <div key={rule.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group/rule hover:bg-white/[0.08] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                    <Star className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 leading-none mb-1">{rule.name}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Aplica en visita #{rule.visitThreshold} • {rule.benefit === 'free' ? 'COSTO CERO' : rule.benefit === 'discount' ? `${rule.discountPercent || 0}% DESC` : 'PREMIUM UPGRADE'}</p>
                                </div>
                            </div>
                            <button onClick={() => removePromoRule(rule.id)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover/rule:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* QUICK STATS SOCIOS */}
        <div className="flex flex-col gap-6">
            {[
                { label: "Socios Registrados", value: members.length, icon: Users, color: "text-primary" },
                { label: "Visitas de Lealtad", value: totalWashings, icon: Star, color: "text-green-500" },
                { label: "Tasa de Retorno", value: members.length > 0 ? `${(totalWashings / members.length).toFixed(1)}x` : "0x", icon: TrendingUp, color: "text-blue-500" },
            ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="glass border-white/5">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={cn("p-3 rounded-2xl bg-white/5", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">{stat.label}</p>
                                <p className="text-4xl font-black italic tracking-tighter text-glow leading-none">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
      </div>

      {/* LISTA DE SOCIOS */}
      <Card className="glass border-white/5 shadow-2xl overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-white/5 py-6">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Directorio de Clientes
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-muted-foreground divide-x divide-white/5 border-b border-white/5">
                            <th className="px-6 py-4">Socio / Placa</th>
                            <th className="px-6 py-4">Total Visitas</th>
                            <th className="px-6 py-4">Última Visita</th>
                            <th className="px-6 py-4">Estatus de Fidelidad</th>
                            <th className="px-6 py-4 text-right">Desde</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredMembers.map(member => (
                            <tr key={member.id} className="hover:bg-primary/5 transition-all group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs text-primary group-hover:bg-primary/20 transition-all border border-white/5">
                                            {member.placa.substring(0,2)}
                                        </div>
                                        <div>
                                            <p className="font-black text-xl italic tracking-tighter tracking-widest">{member.placa}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Cliente Registrado</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black italic">{member.totalWashings}</span>
                                        <div className="flex gap-0.5">
                                            {[...Array(Math.min(member.totalWashings, 5))].map((_, i) => (
                                                <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                                            ))}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-bold uppercase">{new Date(member.lastVisit).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 font-black italic tracking-widest text-[9px]">
                                        ACTIVO
                                    </Badge>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Registrado en: {new Date(member.joinedAt).toLocaleDateString()}</span>
                                </td>
                            </tr>
                        ))}
                        {filteredMembers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center opacity-40 italic font-medium">
                                    No se encontraron socios con esa placa...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
