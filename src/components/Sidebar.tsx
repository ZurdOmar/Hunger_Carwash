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
  UserCog
} from "lucide-react";
import { motion } from "framer-motion";

import { Logo } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useAuth } from "@/lib/AuthContext";
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

  return (
    <div className="w-64 h-full glass border-l-0 rounded-l-none flex flex-col z-50 overflow-hidden">
      <div className="mb-8 w-full px-0">
        <Logo size="full" className="w-full" />
      </div>
      
      <nav className="flex-1 space-y-2 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </motion.div>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <>
            <div className="h-px bg-white/10 my-2" />
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </motion.div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
        <ThemeSwitcher />

        {profile && (
          <div className="space-y-3 px-2">
            <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground truncate">
                {profile.full_name || 'Usuario'}
              </p>
              <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                {profile.role}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2 text-xs"
              onClick={signOut}
            >
              <LogOut className="w-3 h-3" />
              Cerrar sesión
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">Velocity ERP v1.1.0-Branding</p>
      </div>
    </div>
  );
}
