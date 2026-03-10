import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`flex flex-col min-h-screen transition-all duration-200 ${isMobile ? "ml-0" : "ml-52"}`}>
        <TopNav />
        <main className={`flex-1 min-w-screen w-full overflow-x-hidden overflow-y-auto ${isMobile ? "pb-16" : ""}`}>
          {children}
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
