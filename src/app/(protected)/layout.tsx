import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full relative overflow-hidden">
      {/* Ambient glow — top right */}
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px]
        bg-primary/15 blur-[150px] rounded-full pointer-events-none z-0
        animate-[gradient-shift_8s_ease-in-out_infinite]"
        style={{ backgroundSize: '200% 200%' }}
      />
      {/* Ambient glow — bottom left */}
      <div className="absolute bottom-[-150px] left-[-50px] w-[400px] h-[400px]
        bg-blue-600/8 blur-[120px] rounded-full pointer-events-none z-0" />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Sidebar />

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
