import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

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
      <body className={`${outfit.className} bg-background text-foreground min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
