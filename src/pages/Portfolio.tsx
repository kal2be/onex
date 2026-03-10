import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlobalMetricsBar } from "@/components/dashboard/GlobalMetricsBar";
import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { RiskDashboard } from "@/components/dashboard/RiskDashboard";
import { PerformanceAnalytics } from "@/components/dashboard/PerformanceAnalytics";
import { TradeTimeline } from "@/components/dashboard/TradeTimeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { Briefcase } from "lucide-react";

const Portfolio = () => {
  const isMobile = useIsMobile();

  return (
    <DashboardLayout>
      <GlobalMetricsBar />
      <div className="p-2 sm:p-4 lg:p-5 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Portfolio</h1>
        </div>

        <div className={`grid gap-2.5 sm:gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_340px]"}`}>
          <div className="space-y-2.5 sm:space-y-3">
            <PortfolioTracker />
            <PerformanceAnalytics />
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            <RiskDashboard />
            <TradeTimeline />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
