"use client";

import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";

export function TopBar() {
  const { profile } = useAuth();
  return (
    <header className="h-16 flex items-center justify-end px-6 border-b border-white/5 bg-background/50 backdrop-blur-sm z-40">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-4">
          <span className="text-sm font-semibold">
            {profile?.full_name || 'Usuario'}
          </span>
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
