import * as React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
}

export function Heading({ level = 1, className, children, ...props }: HeadingProps) {
  const Tag = `h${level}` as any;
  const levels = {
    1: "text-4xl font-extrabold tracking-tight lg:text-5xl text-glow",
    2: "text-3xl font-bold tracking-tight text-glow",
    3: "text-2xl font-semibold tracking-tight",
    4: "text-xl font-medium tracking-tight",
  };

  return (
    <Tag className={cn(levels[level], "text-primary", className)} {...props}>
      {children}
    </Tag>
  );
}
