import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { computeSignals, simulateTrades } from "@/lib/tradingEngine";
import { Shield, AlertTriangle, Play, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const RobustnessLab = () => {
  const { candles, activeSymbol, isConnected, currentPrice } = useLiveData();
  const isMobile = useIsMobile();
  const [isRunning, setIsRunning] = useState(false);
  const [numFolds, setNumFolds] = useState(10);
  const [results, setResults] = useState<{ period: string; inSample: number; outOfSample: number }[]>([]);
  const [stats, setStats] = useState({ stability: 0, overfitRisk: 0, wfEfficiency: 0, degradation: 0 });

  const runWalkForward = useCallback(() => {
    if (candles.length < 100) return;
    setIsRunning(true);

    setTimeout(() => {
      const foldSize = Math.floor(candles.length / numFolds);
      const wfData: { period: string; inSample: number; outOfSample: number }[] = [];
      const inSharpes: number[] = [];
      const outSharpes: number[] = [];

      for (let i = 0; i < numFolds; i++) {
        const start = i * foldSize;
        const mid = start + Math.floor(foldSize * 0.7);
        const end = start + foldSize;

        const inSampleCandles = candles.slice(start, mid);
        const outSampleCandles = candles.slice(mid, end);

        if (inSampleCandles.length < 30 || outSampleCandles.length < 10) continue;

        const inSignals = computeSignals(inSampleCandles);
        const outSignals = computeSignals(outSampleCandles);
        const inStats = simulateTrades(inSampleCandles, inSignals);
        const outStats = simulateTrades(outSampleCandles, outSignals);

        inSharpes.push(inStats.sharpe);
        outSharpes.push(outStats.sharpe);

        wfData.push({
          period: `P${i + 1}`,
          inSample: +inStats.sharpe.toFixed(2),
          outOfSample: +outStats.sharpe.toFixed(2),
        });
      }

      const avgIn = inSharpes.length > 0 ? inSharpes.reduce((a, b) => a + b, 0) / inSharpes.length : 0;
      const avgOut = outSharpes.length > 0 ? outSharpes.reduce((a, b) => a + b, 0) / outSharpes.length : 0;
      const efficiency = avgIn > 0 ? avgOut / avgIn : 0;
      const degradation = avgIn > 0 ? ((avgOut - avgIn) / Math.abs(avgIn)) * 100 : 0;
      const stability = Math.min(100, Math.max(0, efficiency * 100));
      const overfitRisk = Math.max(0, Math.min(100, (1 - efficiency) * 100));

      setResults(wfData);
      setStats({
        stability: +stability.toFixed(0),
        overfitRisk: +overfitRisk.toFixed(0),
        wfEfficiency: +efficiency.toFixed(2),
        degradation: +degradation.toFixed(1),
      });
      setIsRunning(false);
    }, 300);
  }, [candles, numFolds]);

  const sensitivityMap = useMemo(() => {
    if (candles.length < 60) return Array.from({ length: isMobile ? 64 : 100 }, () => Math.random());
    const cells = isMobile ? 64 : 100;
    return Array.from({ length: cells }, (_, i) => {
      const start = Math.floor((i / cells) * (candles.length - 50));
      const slice = candles.slice(start, start + 50);
      const signals = computeSignals(slice);
      const stats = simulateTrades(slice, signals);
      return Math.max(0, Math.min(1, (stats.sharpe + 1) / 4));
    });
  }, [candles, isMobile]);

  return (
    <DashboardLayout>
      <PageHeader title="Robustness Lab" description={`Walk-forward analysis on live ${SYMBOL_LABELS[activeSymbol]} data`} />

      {/* Connection + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-mono ${isConnected ? "text-success" : "text-destructive"}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Live" : "Reconnecting…"}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{candles.length} bars</span>
          {currentPrice > 0 && (
            <span className="text-xs font-mono text-foreground">
              ${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <label className="text-xs text-muted-foreground">Folds</label>
          <input type="number" value={numFolds} onChange={(e) => setNumFolds(+e.target.value)} min={3} max={20}
            className="w-16 bg-background border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <button onClick={runWalkForward} disabled={isRunning || candles.length < 100}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Analyzing…" : "Run"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Stability" value={`${stats.stability}%`} subValue={stats.stability > 60 ? "High" : "Low"} trend={stats.stability > 60 ? "up" : "down"} icon={<Shield className="w-4 h-4" />} />
        <StatCard label="Overfit Risk" value={`${stats.overfitRisk}%`} subValue={stats.overfitRisk < 30 ? "Low" : "High"} trend={stats.overfitRisk < 30 ? "up" : "down"} />
        <StatCard label="WF Efficiency" value={stats.wfEfficiency.toFixed(2)} subValue={stats.wfEfficiency > 0.5 ? "Good" : "Poor"} trend={stats.wfEfficiency > 0.5 ? "up" : "down"} />
        <StatCard label="Degradation" value={`${stats.degradation}%`} subValue={Math.abs(stats.degradation) < 20 ? "OK" : "Bad"} trend={Math.abs(stats.degradation) < 20 ? "neutral" : "down"} icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <div className="card-sharp rounded-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Walk-Forward Analysis {results.length > 0 && <span className="text-primary ml-1">LIVE DATA</span>}
        </h3>
        {results.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <BarChart data={results}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} width={35} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inSample" fill="hsl(217 91% 60%)" name="In-Sample" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outOfSample" fill="hsl(157 100% 48%)" name="Out-of-Sample" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 sm:h-64 flex items-center justify-center text-sm text-muted-foreground font-mono text-center px-4">
            {candles.length < 100
              ? `Loading live data… (${candles.length}/100 bars needed)`
              : 'Click "Run" to analyze strategy robustness'}
          </div>
        )}
      </div>

      <div className="card-sharp rounded-sm p-3 sm:p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Parameter Sensitivity <span className="text-primary ml-1">LIVE</span>
        </h3>
        <div className={`grid gap-1 ${isMobile ? "grid-cols-8" : "grid-cols-10"}`}>
          {sensitivityMap.map((val, i) => (
            <div key={i} className="aspect-square rounded-sm"
              style={{ backgroundColor: `hsl(${val > 0.5 ? 157 : 0} ${val > 0.5 ? 80 : 60}% ${30 + val * 30}% / ${0.4 + val * 0.6})` }}
              title={`Sharpe: ${(val * 3).toFixed(2)}`} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Window Position →</span>
          <span>Poor ← → Good</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RobustnessLab;
