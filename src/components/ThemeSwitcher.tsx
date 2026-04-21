"use client";

import * as React from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const palettes = [
  { id: "blue", color: "#38BDF8", label: "Velocity" },
  { id: "purple", color: "#A855F7", label: "Neon" },
  { id: "green", color: "#22C55E", label: "Emerald" },
  { id: "orange", color: "#F97316", label: "Sunset" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [palette, setPalette] = React.useState("blue");

  React.useEffect(() => {
    setMounted(true);
    const savedPalette = localStorage.getItem("hunger-palette") || "blue";
    setPalette(savedPalette);
    document.documentElement.setAttribute("data-palette", savedPalette);
  }, []);

  const togglePalette = (id: string) => {
    setPalette(id);
    localStorage.setItem("hunger-palette", id);
    document.documentElement.setAttribute("data-palette", id);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 p-4 glass border-white/5 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Apariencia</span>
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              theme === "light" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              theme === "dark" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
