"use client";

import { Bell, User, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { profile } = useAuth();
  
  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n: string) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-card/40 backdrop-blur-xl z-40">
      {/* Left side — breadcrumb / greeting */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground/60">Hunger Car Wash</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-semibold text-foreground">
            {profile?.full_name ? `Hola, ${profile.full_name.split(' ')[0]}` : 'Panel'}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            En Línea
          </span>
        </div>

        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative hover:bg-white/[0.04] rounded-xl">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-card shadow-lg shadow-primary/30" />
        </Button>
        
        {/* Avatar */}
        <div className="avatar-ring w-9 h-9 rounded-full flex items-center justify-center shrink-0">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
