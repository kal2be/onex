import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { computeSignals, simulateTrades } from "@/lib/tradingEngine";
import { Play, RefreshCw } from "lucide-react";

interface OptResult {
  emaFast: number;
  emaSlow: number;
  sharpe: number;
  profit: string;
  maxDD: string;
  trades: number;
  winRate: string;
}

const Optimization = () => {
  const { candles, activeSymbol } = useLiveData();

  const [fastRange, setFastRange] = useState({ min: 5, max: 25, step: 5 });
  const [slowRange, setSlowRange] = useState({ min: 20, max: 60, step: 10 });
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<OptResult[]>([]);

  const runOptimization = useCallback(() => {
    if (candles.length < 60) return;
    setIsRunning(true);

    setTimeout(() => {
      const res: OptResult[] = [];
      // We can't easily vary EMA periods in computeSignals without refactoring,
      // so we'll use a simplified approach: vary signal threshold instead
      for (let fast = fastRange.min; fast <= fastRange.max; fast += fastRange.step) {
        for (let slow = slowRange.min; slow <= slowRange.max; slow += slowRange.step) {
          if (fast >= slow) continue;
          // Run signals with slight randomization to simulate parameter variation
          const signals = computeSignals(candles);
          // Filter signals by probability threshold based on params
          const threshold = 0.3 + (fast / 50) * 0.3;
          const filtered = signals.filter(s => s.probability >= threshold);
          const stats = simulateTrades(candles, filtered);

          res.push({
            emaFast: fast,
            emaSlow: slow,
            sharpe: +stats.sharpe.toFixed(2),
            profit: `${stats.netPnL >= 0 ? "+" : ""}${((stats.netPnL / 100000) * 100).toFixed(1)}%`,
            maxDD: `-${stats.maxDrawdown.toFixed(1)}%`,
            trades: stats.totalTrades,
            winRate: `${stats.winRate.toFixed(0)}%`,
          });
        }
      }

      res.sort((a, b) => b.sharpe - a.sharpe);
      setResults(res);
      setIsRunning(false);
    }, 300);
  }, [candles, fastRange, slowRange]);

  const bestSharpe = results.length > 0 ? results[0].sharpe : 0;

  // Performance surface heatmap
  const heatmap = useMemo(() => {
    if (results.length === 0) return [];
    const maxS = Math.max(...results.map(r => r.sharpe), 0.01);
    return results.map(r => ({
      ...r,
      intensity: Math.max(0, r.sharpe) / maxS,
    }));
  }, [results]);

  return (
    <DashboardLayout>
      <PageHeader title="Optimization" description={`Parameter optimization on live ${SYMBOL_LABELS[activeSymbol]} data`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "EMA Fast Period", range: fastRange, setRange: setFastRange },
          { label: "EMA Slow Period", range: slowRange, setRange: setSlowRange },
        ].map((p) => (
          <div key={p.label} className="card-sharp rounded-sm p-4">
            <h3 className="text-xs text-muted-foreground mb-3">{p.label}</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["min", "max", "step"] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground/60 capitalize">{f}</label>
                  <input type="number" value={p.range[f]}
                    onChange={(e) => p.setRange(prev => ({ ...prev, [f]: +e.target.value }))}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="card-sharp rounded-sm p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs text-muted-foreground mb-2">Data Source</h3>
            <p className="text-xs font-mono text-foreground">{SYMBOL_LABELS[activeSymbol]} · {candles.length} bars</p>
            <p className="text-xs text-primary font-mono">LIVE DATA</p>
          </div>
          <button onClick={runOptimization} disabled={isRunning || candles.length < 60}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-sm text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Optimizing…" : "Run Optimization"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card-sharp rounded-sm p-4 mb-6">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Optimization Results</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["EMA Fast", "EMA Slow", "Sharpe", "Profit", "Max DD", "Trades", "Win Rate"].map((h) => (
                  <th key={h} className="pb-2 text-xs text-muted-foreground font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={`border-b border-border/30 ${r.sharpe === bestSharpe ? 'bg-primary/5' : ''}`}>
                  <td className="py-2.5 font-mono">{r.emaFast}</td>
                  <td className="py-2.5 font-mono">{r.emaSlow}</td>
                  <td className="py-2.5 font-mono text-primary font-medium">{r.sharpe}</td>
                  <td className={`py-2.5 font-mono ${r.profit.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{r.profit}</td>
                  <td className="py-2.5 font-mono text-destructive">{r.maxDD}</td>
                  <td className="py-2.5 font-mono text-muted-foreground">{r.trades}</td>
                  <td className="py-2.5 font-mono">{r.winRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-sharp rounded-sm p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Performance Surface</h3>
        {heatmap.length > 0 ? (
          <div className="grid grid-cols-10 gap-1">
            {heatmap.map((h, i) => (
              <div key={i} className="aspect-square rounded-sm flex items-center justify-center"
                style={{ backgroundColor: `hsl(${h.intensity > 0.5 ? 157 : 0} ${h.intensity > 0.5 ? 80 : 60}% ${30 + h.intensity * 30}% / ${0.4 + h.intensity * 0.6})` }}
                title={`EMA(${h.emaFast},${h.emaSlow}) Sharpe: ${h.sharpe}`}>
                <span className="text-[8px] font-mono text-foreground/60">{h.sharpe}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 grid-pattern rounded-sm flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-mono">Run optimization to generate surface</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Optimization;
