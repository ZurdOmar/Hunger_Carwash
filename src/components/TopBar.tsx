"use client";

import { Bell, User, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/50 backdrop-blur-sm z-40">
      <div className="flex-1 flex items-center gap-4 max-w-xl">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-glow group-focus-within:text-primary transition-all" />
          <Input 
            placeholder="Buscar por placa o folio..." 
            className="pl-10 h-10 w-full focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-4">
          <span className="text-sm font-semibold">Admin Hunger</span>
          <span className="text-[10px] text-green-400 flex items-center gap-1 uppercase font-bold tracking-tighter">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            En Línea
          </span>
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
        </Button>
        
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center border-primary/20 overflow-hidden">
          <User className="w-6 h-6 text-primary/60" />
        </div>
      </div>
    </header>
  );
}
