import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Shield, AlertTriangle } from "lucide-react";

export function RiskDashboard() {
  const { drawdownData, signals, tickers, activeSymbol, volatilityData } = useLiveData();

  const maxDD = drawdownData.reduce((min, d) => Math.min(min, d.drawdown), 0);
  const avgVol = volatilityData.length > 0
    ? volatilityData.reduce((s, v) => s + v.volatility, 0) / volatilityData.length
    : 0;

  const riskPerTrade = 2;
  const maxDDLimit = 15;
  const ddUsed = Math.abs(maxDD);
  const ddPct = Math.min((ddUsed / maxDDLimit) * 100, 100);

  const riskScore = Math.min(100, Math.round(ddUsed * 2 + avgVol * 0.5));
  const riskLabel = riskScore < 30 ? "LOW" : riskScore < 60 ? "MODERATE" : "HIGH";
  const riskColor = riskScore < 30 ? "text-success" : riskScore < 60 ? "text-warning" : "text-destructive";

  return (
    <div className="glass-panel rounded-sm p-3 sm:p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-warning" /> Risk Dashboard
      </h3>

      <div className="space-y-2.5 sm:space-y-3">
        {/* Risk score */}
        <div className="bg-secondary/30 rounded-sm p-2.5 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Risk Score</span>
            <span className={`text-xs sm:text-sm font-mono font-bold ${riskColor}`}>{riskScore}/100 · {riskLabel}</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${riskScore < 30 ? "bg-success" : riskScore < 60 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${riskScore}%` }} />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/30 rounded-sm p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase">Risk/Trade</span>
            <p className="text-sm font-mono font-semibold text-foreground">{riskPerTrade}%</p>
          </div>
          <div className="bg-secondary/30 rounded-sm p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase">Avg Volatility</span>
            <p className="text-sm font-mono font-semibold text-foreground">{avgVol.toFixed(1)}%</p>
          </div>
        </div>

        {/* Max drawdown gauge */}
        <div className="bg-secondary/30 rounded-sm p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">Max DD Limit</span>
            <span className="text-[11px] sm:text-xs font-mono text-foreground">{ddUsed.toFixed(1)}% / {maxDDLimit}%</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${ddPct > 80 ? "bg-destructive" : ddPct > 50 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${ddPct}%` }} />
          </div>
        </div>

        {/* Current exposure */}
        <div className="bg-secondary/30 rounded-sm p-2.5">
          <span className="text-[10px] text-muted-foreground uppercase">Current Exposure</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-mono text-foreground">{SYMBOL_LABELS[activeSymbol]}</span>
            <span className="text-xs font-mono text-primary">100%</span>
          </div>
        </div>

        {ddUsed > maxDDLimit * 0.8 && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-sm p-2 text-[11px] sm:text-xs text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Approaching max drawdown limit
          </div>
        )}
      </div>
    </div>
  );
}
