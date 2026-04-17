import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
  );
}
