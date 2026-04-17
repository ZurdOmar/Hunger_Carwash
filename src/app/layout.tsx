import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
