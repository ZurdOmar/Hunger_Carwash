import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hunger Car Wash | ERP & POS",
  description: "Aerodynamic precision for your car wash operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark h-full" suppressHydrationWarning>
      <body className={cn(inter.className, "bg-background text-foreground min-h-screen overflow-hidden")}>
        <Providers>
          <div className="flex h-screen w-full relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none z-0" />
            
            <Sidebar />
            
            <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
              <TopBar />
              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
