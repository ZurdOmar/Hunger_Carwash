"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const dimensions = {
    sm: { width: 64, height: 64 },
    md: { width: 160, height: 160 },
    lg: { width: 240, height: 240 },
    full: { width: 256, height: 256 },
  };

  const isFull = size === "full";

  return (
    <div className={cn("flex items-center justify-center w-full px-4", className)}>
      <div className={cn(
        "relative flex items-center justify-center transition-all duration-500",
        isFull ? "w-full h-28" : size === "sm" ? "w-16 h-16" : size === "md" ? "w-40 h-40" : "w-60 h-60"
      )}>
        <Image 
          src="/logo.png" 
          alt="Hunger Car Wash Logo" 
          width={isFull ? 240 : dimensions[size as keyof typeof dimensions].width} 
          height={isFull ? 240 : dimensions[size as keyof typeof dimensions].height}
          className={cn(
            "object-contain transition-transform", 
            isFull ? "scale-75 group-hover:scale-80" : "scale-100"
          )}
          priority
        />
      </div>
    </div>
  );
}
