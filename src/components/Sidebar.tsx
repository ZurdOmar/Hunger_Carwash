"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Kanban,
  Settings,
  ChevronRight,
  Car,
  BarChart3,
  Users,
  Package,
  LogOut,
  UserCog,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import { motion } from "framer-motion";

import { Logo } from "./Logo";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/Button";

const navItems = [
  { icon: CreditCard, label: "Punto de Venta", href: "/pos" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Kanban, label: "Seguimiento", href: "/operations" },
  { icon: BarChart3, label: "Reportes", href: "/reports" },
  { icon: Package, label: "Membresías", href: "/members" },
  { icon: Car, label: "Recursos", href: "/resources" },
];

const adminNavItems = [
  { icon: UserCog, label: "Usuarios", href: "/users" },
  { icon: Settings, label: "Configuración", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-64 h-full flex flex-col z-50 overflow-hidden relative
      bg-card/80 backdrop-blur-xl border-r border-white/[0.06]"
    >
      {/* Subtle gradient overlay at the top */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent pointer-events-none" />

      <div className="mb-4 mt-2 w-full px-0 relative z-10 flex justify-center">
        <Logo size="full" className="w-full" />
      </div>
      
      <nav className="flex-1 space-y-1 px-3 relative z-10 overflow-y-auto custom-scrollbar pb-4">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl transition-all duration-300 group relative",
                  isActive
                    ? "sidebar-active text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-300",
                    isActive
                      ? "bg-white/20"
                      : "group-hover:bg-primary/10"
                  )}>
                    <item.icon className={cn(
                      "w-4 h-4 transition-all duration-300",
                      isActive ? "text-white" : "group-hover:text-primary group-hover:scale-110"
                    )} />
                  </div>
                  <span className={cn(
                    "font-medium text-sm tracking-tight",
                    isActive ? "font-semibold text-white" : ""
                  )}>{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  </motion.div>
                )}
              </motion.div>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <>
            <div className="relative my-3">
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="flex items-center gap-2 px-3 mb-1">
              <Sparkles className="w-3 h-3 text-accent/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Admin</span>
            </div>
            {adminNavItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navItems.length + index) * 0.04, duration: 0.3 }}
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all duration-300 group relative",
                      isActive
                        ? "sidebar-active text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-all duration-300",
                        isActive ? "bg-white/20" : "group-hover:bg-primary/10"
                      )}>
                        <item.icon className={cn(
                          "w-4 h-4 transition-all duration-300",
                          isActive ? "text-white" : "group-hover:text-primary group-hover:scale-110"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium text-sm tracking-tight",
                        isActive ? "font-semibold text-white" : ""
                      )}>{item.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <ChevronRight className="w-4 h-4 text-white/70" />
                      </motion.div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="mt-auto space-y-3 pt-4 relative z-10">
        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-3" />

        <div className="space-y-3 px-3 pb-4">
          <div className="glass-premium p-3 space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/20 shrink-0">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate leading-tight">
                  {profile ? (profile.full_name || `(${profile.role})`) : 'Cargando…'}
                </p>
                <p className="text-muted-foreground uppercase tracking-[0.15em] text-[9px] font-bold">
                  {profile?.role || '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center gap-2 text-xs border-white/[0.06] bg-white/[0.02] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-300"
              onClick={signOut}
            >
              <LogOut className="w-3 h-3" />
              Salir
            </Button>
            <div className="flex gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-md shrink-0">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  theme === "light" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  theme === "dark" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
