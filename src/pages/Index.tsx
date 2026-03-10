import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlobalMetricsBar } from "@/components/dashboard/GlobalMetricsBar";
import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { StrategyStatusPanel } from "@/components/dashboard/StrategyStatusPanel";
import { LiveSignalFeed } from "@/components/dashboard/LiveSignalFeed";
import { PerformanceAnalytics } from "@/components/dashboard/PerformanceAnalytics";
import { RiskDashboard } from "@/components/dashboard/RiskDashboard";
import { TradeTimeline } from "@/components/dashboard/TradeTimeline";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const Index = () => {
  const { tickers, tickersLoading, candles, signals, activeSymbol, isConnected, currentPrice } = useLiveData();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const chartHeight = isMobile ? 260 : 400;

  return (
    <DashboardLayout>
      <GlobalMetricsBar />

      <div className="p-2 sm:p-4 lg:p-5 space-y-2.5 sm:space-y-3">
        {/* Market tickers strip */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {!tickersLoading && tickers.slice(0, 8).map((t) => (
            <button key={t.symbol} onClick={() => { navigate("/terminal"); }}
              className="shrink-0 glass-panel rounded-sm px-2.5 sm:px-3 py-1.5 sm:py-2 hover:border-primary/30 transition-all min-w-[120px] sm:min-w-[140px] active:scale-[0.98]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-foreground">{SYMBOL_LABELS[t.symbol]?.split("/")[0]}</span>
                <span className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono ${t.changePct24h >= 0 ? "text-success" : "text-destructive"}`}>
                  {t.changePct24h >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {t.changePct24h >= 0 ? "+" : ""}{t.changePct24h.toFixed(2)}%
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-semibold text-foreground">
                ${t.price < 1 ? t.price.toFixed(4) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className={`grid gap-2.5 sm:gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_320px]"}`}>
          {/* Left column */}
          <div className="space-y-2.5 sm:space-y-3">
            {/* Chart */}
            <div className="glass-panel rounded-sm p-1.5 sm:p-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                  {SYMBOL_LABELS[activeSymbol]} · {candles.length} bars · LIVE
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 mr-2 sm:mr-3"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success" /> Buy</span>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-destructive" /> Sell</span>
                </span>
              </div>
              <TradingViewChart candles={candles} signals={signals} height={chartHeight} />
            </div>

            {/* Signal feed + Strategy status */}
            <div className={`grid gap-2.5 sm:gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
              <LiveSignalFeed />
              <StrategyStatusPanel />
            </div>

            {/* Performance analytics */}
            <PerformanceAnalytics />
          </div>

          {/* Right sidebar */}
          <div className="space-y-2.5 sm:space-y-3">
            <PortfolioTracker />
            <RiskDashboard />
            <TradeTimeline />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
